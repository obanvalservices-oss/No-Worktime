import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId, jsonUnauthorized } from "@/lib/jwt-auth";
import { roundMoney } from "@/lib/payrollCalculator";

async function assertRun(userId: string, runId: string) {
  const run = await prisma.payrollRun.findUnique({
    where: { id: runId },
    include: { company: true },
  });
  if (!run || run.company.ownerId !== userId) return null;
  return run;
}

const patchLineSchema = z.object({
  weeklySalaryAmount: z.number().nonnegative().optional().nullable(),
  hourlyRateSnapshot: z.number().nonnegative().optional().nullable(),
  overtimeThreshold: z.number().positive().optional(),
  overtimeMultiplier: z.number().positive().optional(),
  regularHours: z.number().nonnegative().optional().nullable(),
  overtimeHours: z.number().nonnegative().optional().nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ runId: string; lineId: string }> }
) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return jsonUnauthorized();
  const { runId, lineId } = await params;

  const run = await assertRun(userId, runId);
  if (!run || run.status === "FINALIZED") {
    return NextResponse.json(
      { message: run ? "Cannot edit finalized payroll" : "Not found" },
      { status: run ? 400 : 404 }
    );
  }
  const line = await prisma.payrollLine.findFirst({
    where: { id: lineId, runId: run.id },
    include: { employee: true },
  });
  if (!line) {
    return NextResponse.json({ message: "Line not found" }, { status: 404 });
  }
  const body = await request.json();
  const parsed = patchLineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.weeklySalaryAmount !== undefined) {
    data.weeklySalaryAmount = parsed.data.weeklySalaryAmount;
  }
  if (parsed.data.hourlyRateSnapshot !== undefined) {
    data.hourlyRateSnapshot = parsed.data.hourlyRateSnapshot;
  }
  if (parsed.data.overtimeThreshold != null) {
    data.overtimeThreshold = parsed.data.overtimeThreshold;
  }
  if (parsed.data.overtimeMultiplier != null) {
    data.overtimeMultiplier = parsed.data.overtimeMultiplier;
  }

  if (
    parsed.data.regularHours !== undefined ||
    parsed.data.overtimeHours !== undefined
  ) {
    if (line.employee.payType !== "HOURLY") {
      return NextResponse.json(
        { message: "Manual hours are only available for hourly employees" },
        { status: 400 }
      );
    }
    const regularHours = parsed.data.regularHours ?? line.regularHours ?? 0;
    const overtimeHours = parsed.data.overtimeHours ?? line.overtimeHours ?? 0;
    const hourlyRate = line.hourlyRateSnapshot ?? 0;
    const regularPay = roundMoney(regularHours * hourlyRate);
    const overtimePay = roundMoney(
      overtimeHours * hourlyRate * line.overtimeMultiplier
    );
    data.regularHours = regularHours;
    data.overtimeHours = overtimeHours;
    data.regularPay = regularPay;
    data.overtimePay = overtimePay;
    data.grossPay = roundMoney(regularPay + overtimePay);
  }

  const updated = await prisma.payrollLine.update({
    where: { id: line.id },
    data,
    include: {
      employee: { include: { department: true } },
      timeEntries: { orderBy: { workDate: "asc" } },
    },
  });
  return NextResponse.json(updated);
}
