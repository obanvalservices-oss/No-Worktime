import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/auth/api-session";
import { getEmployeeForUser } from "@/lib/employee-record";
import { assertValidLeaveRange } from "@/lib/leave-requests/dates";

const createSchema = z.object({
  type: z.enum(["VACATION", "SICK"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(1).max(2000).trim(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function GET(request: Request) {
  const auth = await requireRoles(request, ["EMPLOYEE"]);
  if (auth instanceof NextResponse) return auth;

  const emp = await getEmployeeForUser(auth.userId);
  if (!emp) {
    return NextResponse.json({ linked: false, requests: [] });
  }

  const requests = await prisma.leaveRequest.findMany({
    where: { employeeId: emp.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      startDate: true,
      endDate: true,
      reason: true,
      notes: true,
      status: true,
      reviewNote: true,
      reviewedAt: true,
      documentId: true,
      createdAt: true,
      company: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ linked: true, requests });
}

export async function POST(request: Request) {
  const auth = await requireRoles(request, ["EMPLOYEE"]);
  if (auth instanceof NextResponse) return auth;

  const emp = await getEmployeeForUser(auth.userId);
  if (!emp) {
    return NextResponse.json({ message: "No linked employee profile" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });
  }

  const { startDate, endDate, type, reason, notes } = parsed.data;
  if (!assertValidLeaveRange(startDate, endDate)) {
    return NextResponse.json(
      { message: "End date must be on or after start date (use YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  const row = await prisma.leaveRequest.create({
    data: {
      employeeId: emp.id,
      companyId: emp.companyId,
      type,
      startDate,
      endDate,
      reason,
      notes: notes?.trim() || null,
    },
    select: {
      id: true,
      type: true,
      startDate: true,
      endDate: true,
      reason: true,
      notes: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json(row, { status: 201 });
}
