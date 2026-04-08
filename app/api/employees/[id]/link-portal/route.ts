import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagementAccess } from "@/lib/auth/api-session";
import { canAccessCompany } from "@/lib/auth/company-access";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireManagementAccess(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, role } = auth;
  const { id: employeeId } = await params;

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { company: true },
  });
  if (!employee || !(await canAccessCompany(userId, role, employee.companyId))) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Valid email required" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();

  const portalUser = await prisma.user.findUnique({
    where: { email },
  });
  if (!portalUser) {
    return NextResponse.json(
      { message: "No user registered with that email" },
      { status: 404 }
    );
  }
  if (portalUser.role !== "EMPLOYEE") {
    return NextResponse.json(
      { message: "That account is not an employee portal user" },
      { status: 400 }
    );
  }

  const existingLink = await prisma.employee.findFirst({
    where: { userId: portalUser.id },
  });
  if (existingLink && existingLink.id !== employeeId) {
    return NextResponse.json(
      { message: "That account is already linked to another employee" },
      { status: 409 }
    );
  }

  const updated = await prisma.employee.update({
    where: { id: employeeId },
    data: { userId: portalUser.id },
    include: {
      department: true,
      user: { select: { id: true, email: true } },
    },
  });

  return NextResponse.json(updated);
}
