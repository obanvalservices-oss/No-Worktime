import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId, jsonUnauthorized } from "@/lib/jwt-auth";

async function assertCompany(userId: string, companyId: string) {
  return prisma.company.findFirst({
    where: { id: companyId, ownerId: userId },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return jsonUnauthorized();
  const { companyId } = await params;

  if (!(await assertCompany(userId, companyId))) {
    return NextResponse.json({ message: "Company not found" }, { status: 404 });
  }
  const rows = await prisma.employee.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    include: { department: { select: { id: true, name: true, kind: true } } },
  });
  return NextResponse.json(rows);
}

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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return jsonUnauthorized();
  const { companyId } = await params;

  if (!(await assertCompany(userId, companyId))) {
    return NextResponse.json({ message: "Company not found" }, { status: 404 });
  }
  const body = await request.json();
  const parsed = employeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid body", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const dep = await prisma.department.findFirst({
    where: { id: parsed.data.departmentId, companyId },
  });
  if (!dep) {
    return NextResponse.json({ message: "Invalid department" }, { status: 400 });
  }
  if (
    parsed.data.payType === "HOURLY" &&
    (parsed.data.hourlyRate == null || parsed.data.hourlyRate <= 0)
  ) {
    return NextResponse.json(
      { message: "Hourly employees need hourlyRate > 0" },
      { status: 400 }
    );
  }
  if (
    parsed.data.payType === "SALARY" &&
    (parsed.data.weeklyBaseSalary == null || parsed.data.weeklyBaseSalary < 0)
  ) {
    return NextResponse.json(
      { message: "Salary employees need weeklyBaseSalary" },
      { status: 400 }
    );
  }
  const e = await prisma.employee.create({
    data: {
      companyId,
      departmentId: parsed.data.departmentId,
      name: parsed.data.name.trim(),
      payType: parsed.data.payType,
      hourlyRate: parsed.data.payType === "HOURLY" ? parsed.data.hourlyRate : null,
      weeklyBaseSalary:
        parsed.data.payType === "SALARY" ? parsed.data.weeklyBaseSalary : null,
      overtimeThreshold: parsed.data.overtimeThreshold ?? 40,
      overtimeMultiplier: parsed.data.overtimeMultiplier ?? 1.5,
      isActive: parsed.data.isActive ?? true,
    },
    include: { department: true },
  });
  return NextResponse.json(e, { status: 201 });
}
