import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagementAccess } from "@/lib/auth/api-session";
import type { UserRole } from "@/lib/auth/roles";
import { canAccessCompany } from "@/lib/auth/company-access";
import { enumerateInclusiveDates } from "@/lib/dates";
import { payrollRunLinesArgs } from "@/lib/payrollLineInclude";

async function assertRun(userId: string, role: UserRole, runId: string) {
  const run = await prisma.payrollRun.findUnique({
    where: { id: runId },
    include: { company: true },
  });
  if (!run || !(await canAccessCompany(userId, role, run.companyId))) return null;
  return run;
}

const addEmployeeSchema = z.object({
  employeeId: z.string().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const auth = await requireManagementAccess(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, role } = auth;
  const { runId } = await params;

  const run = await assertRun(userId, role, runId);
  if (!run) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (run.status === "FINALIZED") {
    return NextResponse.json(
      { message: "Cannot edit finalized payroll" },
      { status: 400 }
    );
  }

  const parsed = addEmployeeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });
  }

  const employee = await prisma.employee.findFirst({
    where: {
      id: parsed.data.employeeId,
      companyId: run.companyId,
      isActive: true,
    },
  });
  if (!employee) {
    return NextResponse.json(
      { message: "Employee not found in this company or inactive" },
      { status: 404 }
    );
  }

  const exists = await prisma.payrollLine.findFirst({
    where: { runId: run.id, employeeId: employee.id },
    select: { id: true },
  });
  if (exists) {
    return NextResponse.json(
      { message: "Employee already in this payroll run" },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    const line = await tx.payrollLine.create({
      data: {
        runId: run.id,
        employeeId: employee.id,
        hourlyRateSnapshot: employee.payType === "HOURLY" ? employee.hourlyRate : null,
        weeklySalaryAmount: employee.payType === "SALARY" ? employee.weeklyBaseSalary : null,
        overtimeThreshold: employee.overtimeThreshold,
        overtimeMultiplier: employee.overtimeMultiplier,
      },
    });

    if (employee.payType === "HOURLY") {
      for (const workDate of enumerateInclusiveDates(run.startDate, run.endDate)) {
        await tx.timeEntry.create({ data: { lineId: line.id, workDate } });
      }
    }
  });

  const full = await prisma.payrollRun.findUnique({
    where: { id: run.id },
    include: {
      company: { select: { id: true, name: true } },
      lines: payrollRunLinesArgs,
    },
  });
  return NextResponse.json(full, { status: 201 });
}
