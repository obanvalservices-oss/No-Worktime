import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId, jsonUnauthorized } from "@/lib/jwt-auth";
import { assertSevenDayPeriod, enumerateInclusiveDates } from "@/lib/dates";
import { payrollRunLinesArgs } from "@/lib/payrollLineInclude";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return jsonUnauthorized();
  const { companyId } = await params;

  const c = await prisma.company.findFirst({
    where: { id: companyId, ownerId: userId },
  });
  if (!c) {
    return NextResponse.json({ message: "Company not found" }, { status: 404 });
  }
  const runs = await prisma.payrollRun.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { lines: true } } },
  });
  return NextResponse.json(runs);
}

const createRunSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return jsonUnauthorized();
  const { companyId } = await params;

  const c = await prisma.company.findFirst({
    where: { id: companyId, ownerId: userId },
  });
  if (!c) {
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

  const dates = enumerateInclusiveDates(parsed.data.startDate, parsed.data.endDate);
  const employees = await prisma.employee.findMany({
    where: { companyId, isActive: true },
  });

  if (employees.length === 0) {
    return NextResponse.json(
      { message: "No active employees in this company" },
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
      lines: payrollRunLinesArgs,
    },
  });
  return NextResponse.json(full, { status: 201 });
}
