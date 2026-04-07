import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagementAccess } from "@/lib/auth/api-session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireManagementAccess(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const { id: employeeId } = await params;

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { company: true },
  });
  if (!employee || employee.company.ownerId !== userId) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const updated = await prisma.employee.update({
    where: { id: employeeId },
    data: { userId: null },
    include: {
      department: true,
      user: { select: { id: true, email: true } },
    },
  });

  return NextResponse.json(updated);
}
