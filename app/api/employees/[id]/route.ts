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
  inactiveAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  specialNote: z.string().max(500).nullable().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireManagementAccess(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, role } = auth;
  const { id } = await params;

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      department: { select: { id: true, name: true, kind: true } },
      company: { select: { id: true, name: true } },
      user: { select: { id: true, email: true } },
    },
  });
  if (!employee || !(await canAccessCompany(userId, role, employee.companyId))) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json(employee);
}

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
  const hourlyRate =
    parsed.data.hourlyRate !== undefined ? parsed.data.hourlyRate : existing.hourlyRate;
  const weeklyBaseSalary =
    parsed.data.weeklyBaseSalary !== undefined
      ? parsed.data.weeklyBaseSalary
      : existing.weeklyBaseSalary;
  if (payType === "HOURLY" && parsed.data.hourlyRate !== undefined) {
    if (hourlyRate == null || hourlyRate <= 0) {
      return NextResponse.json(
        { message: "Hourly employees need hourlyRate > 0" },
        { status: 400 }
      );
    }
  }
  if (payType === "SALARY" && parsed.data.weeklyBaseSalary !== undefined) {
    if (weeklyBaseSalary == null || weeklyBaseSalary < 0) {
      return NextResponse.json(
        { message: "Salary employees need weeklyBaseSalary" },
        { status: 400 }
      );
    }
  }
  const today = new Date().toISOString().slice(0, 10);
  let inactiveAtUpdate: string | null | undefined;
  if (parsed.data.isActive === true) {
    inactiveAtUpdate = null;
  } else if (parsed.data.isActive === false) {
    inactiveAtUpdate =
      parsed.data.inactiveAt !== undefined
        ? parsed.data.inactiveAt
        : existing.inactiveAt ?? today;
  } else if (parsed.data.inactiveAt !== undefined) {
    inactiveAtUpdate = parsed.data.inactiveAt;
  }

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
      ...(inactiveAtUpdate !== undefined ? { inactiveAt: inactiveAtUpdate } : {}),
      ...(parsed.data.specialNote !== undefined
        ? {
            specialNote: parsed.data.specialNote?.trim()
              ? parsed.data.specialNote.trim()
              : null,
          }
        : {}),
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
