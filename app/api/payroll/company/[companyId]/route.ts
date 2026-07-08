import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagementAccess } from "@/lib/auth/api-session";
import { assertSevenDayPeriod, enumerateInclusiveDates } from "@/lib/dates";
import { payrollRunLinesArgs } from "@/lib/payrollLineInclude";
import { canAccessCompany } from "@/lib/auth/company-access";

const runListInclude = {
  _count: { select: { lines: true } },
  department: { select: { id: true, name: true } },
} as const;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const auth = await requireManagementAccess(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, role } = auth;
  const { companyId } = await params;

  if (!(await canAccessCompany(userId, role, companyId))) {
    return NextResponse.json({ message: "Company not found" }, { status: 404 });
  }
  const runs = await prisma.payrollRun.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: runListInclude,
  });
  return NextResponse.json(runs);
}

const createRunSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
  departmentId: z.string().uuid().optional().nullable(),
  payTypeFilter: z.enum(["HOURLY", "SALARY"]).optional().nullable(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const auth = await requireManagementAccess(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, role } = auth;
  const { companyId } = await params;

  if (!(await canAccessCompany(userId, role, companyId))) {
    return NextResponse.json({ message: "Company not found" }, { status: 404 });
  }
  const body = await request.json();
  const parsed = createRunSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });
  }
  try {
    assertSevenDayPeriod(parsed.data.startDate, parsed.data.endDate);
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 400 });
  }

  const departmentId = parsed.data.departmentId || null;
  const payTypeFilter = parsed.data.payTypeFilter || null;

  if (departmentId) {
    const dept = await prisma.department.findFirst({
      where: { id: departmentId, companyId },
      select: { id: true },
    });
    if (!dept) {
      return NextResponse.json({ message: "Department not found" }, { status: 404 });
    }
  }

  const dates = enumerateInclusiveDates(parsed.data.startDate, parsed.data.endDate);
  const employees = await prisma.employee.findMany({
    where: {
      companyId,
      isActive: true,
      ...(departmentId ? { departmentId } : {}),
      ...(payTypeFilter ? { payType: payTypeFilter } : {}),
    },
  });

  if (employees.length === 0) {
    return NextResponse.json(
      {
        message:
          "No active employees match this payroll scope (department / pay type).",
      },
      { status: 400 }
    );
  }

  const run = await prisma.$transaction(async (tx) => {
    const r = await tx.payrollRun.create({
      data: {
        companyId,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        notes: parsed.data.notes?.trim() || null,
        payTypeFilter,
        departmentId,
        status: "DRAFT",
      },
    });

    for (const emp of employees) {
      const line = await tx.payrollLine.create({
        data: {
          runId: r.id,
          employeeId: emp.id,
          hourlyRateSnapshot: emp.payType === "HOURLY" ? emp.hourlyRate : null,
          weeklySalaryAmount: emp.payType === "SALARY" ? emp.weeklyBaseSalary : null,
          overtimeThreshold: emp.overtimeThreshold,
          overtimeMultiplier: emp.overtimeMultiplier,
        },
      });

      if (emp.payType === "HOURLY") {
        for (const workDate of dates) {
          await tx.timeEntry.create({
            data: { lineId: line.id, workDate },
          });
        }
      }
    }

    return r;
  });

  const full = await prisma.payrollRun.findUnique({
    where: { id: run.id },
    include: {
      company: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      lines: payrollRunLinesArgs,
    },
  });
  return NextResponse.json(full, { status: 201 });
}
