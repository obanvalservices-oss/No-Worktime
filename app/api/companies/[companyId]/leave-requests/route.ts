import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireManagementAccess } from "@/lib/auth/api-session";
import { compareIsoDates } from "@/lib/leave-requests/dates";

async function assertCompany(userId: string, companyId: string) {
  return prisma.company.findFirst({
    where: { id: companyId, ownerId: userId },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const auth = await requireManagementAccess(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const { companyId } = await params;

  if (!(await assertCompany(userId, companyId))) {
    return NextResponse.json({ message: "Company not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId") || undefined;
  const type = searchParams.get("type") as "VACATION" | "SICK" | null;
  const status = searchParams.get("status") as
    | "PENDING"
    | "REJECTED"
    | "AWAITING_SIGNATURE"
    | "COMPLETED"
    | null;
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const dateTo = searchParams.get("dateTo") || undefined;

  const typeFilter =
    type === "VACATION" || type === "SICK" ? { type } : {};
  const statusFilter =
    status &&
    ["PENDING", "REJECTED", "AWAITING_SIGNATURE", "COMPLETED"].includes(status)
      ? { status }
      : {};

  const employeeFilter = employeeId ? { employeeId } : {};

  /** Requests whose date range overlaps [dateFrom, dateTo] (inclusive), when both set. */
  let dateOverlap: Prisma.LeaveRequestWhereInput = {};
  if (dateFrom && dateTo) {
    if (compareIsoDates(dateFrom, dateTo) > 0) {
      return NextResponse.json(
        { message: "dateFrom must be <= dateTo" },
        { status: 400 }
      );
    }
    dateOverlap = {
      AND: [{ startDate: { lte: dateTo } }, { endDate: { gte: dateFrom } }],
    };
  } else if (dateFrom) {
    dateOverlap = { endDate: { gte: dateFrom } };
  } else if (dateTo) {
    dateOverlap = { startDate: { lte: dateTo } };
  }

  const rows = await prisma.leaveRequest.findMany({
    where: {
      companyId,
      ...employeeFilter,
      ...typeFilter,
      ...statusFilter,
      ...dateOverlap,
    },
    orderBy: { createdAt: "desc" },
    include: {
      employee: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, email: true } },
      document: {
        select: {
          id: true,
          title: true,
          status: true,
          signedAt: true,
        },
      },
    },
  });

  return NextResponse.json(rows);
}
