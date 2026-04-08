import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagementAccess } from "@/lib/auth/api-session";
import { canAccessCompany } from "@/lib/auth/company-access";

const employeeSchema = z.object({
  departmentId: z.string().min(1),
  name: z.string().min(1),
  payType: z.enum(["HOURLY", "SALARY"]),
  hourlyRate: z.number().nonnegative().optional().nullable(),
  weeklyBaseSalary: z.number().nonnegative().optional().nullable(),
  overtimeThreshold: z.number().positive().optional(),
  overtimeMultiplier: z.number().positive().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireManagementAccess(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, role } = auth;
  const { id } = await params;

  const existing = await prisma.employee.findUnique({
    where: { id },
    include: { company: true },
  });
  if (!existing || !(await canAccessCompany(userId, role, existing.companyId))) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const body = await request.json();
  const parsed = employeeSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });
  }
  if (parsed.data.departmentId) {
    const dep = await prisma.department.findFirst({
      where: { id: parsed.data.departmentId, companyId: existing.companyId },
    });
    if (!dep) {
      return NextResponse.json({ message: "Invalid department" }, { status: 400 });
    }
  }
  const payType = parsed.data.payType ?? existing.payType;
  const e = await prisma.employee.update({
    where: { id },
    data: {
      ...(parsed.data.departmentId ? { departmentId: parsed.data.departmentId } : {}),
      ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.payType ? { payType: parsed.data.payType } : {}),
      ...(parsed.data.hourlyRate !== undefined
        ? { hourlyRate: payType === "HOURLY" ? parsed.data.hourlyRate : null }
        : {}),
      ...(parsed.data.weeklyBaseSalary !== undefined
        ? {
            weeklyBaseSalary:
              payType === "SALARY" ? parsed.data.weeklyBaseSalary : null,
          }
        : {}),
      ...(parsed.data.overtimeThreshold != null
        ? { overtimeThreshold: parsed.data.overtimeThreshold }
        : {}),
      ...(parsed.data.overtimeMultiplier != null
        ? { overtimeMultiplier: parsed.data.overtimeMultiplier }
        : {}),
      ...(parsed.data.isActive != null ? { isActive: parsed.data.isActive } : {}),
    },
    include: { department: true },
  });
  return NextResponse.json(e);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireManagementAccess(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, role } = auth;
  const { id } = await params;

  const existing = await prisma.employee.findUnique({
    where: { id },
    include: { company: true },
  });
  if (!existing || !(await canAccessCompany(userId, role, existing.companyId))) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  await prisma.employee.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
