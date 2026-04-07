import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId, jsonUnauthorized } from "@/lib/jwt-auth";
import { recalculatePayrollLine } from "@/lib/payrollLineRecalc";

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
  manualRegularHours: z.number().nonnegative().optional().nullable(),
  manualTotalHours: z.number().nonnegative().optional().nullable(),
  extraRateSegments: z
    .array(
      z.object({
        rate: z.number().nonnegative(),
        hours: z.number().nonnegative(),
      })
    )
    .optional(),
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

  const raw = body as Record<string, unknown>;
  const manualKeysTouched =
    Object.prototype.hasOwnProperty.call(raw, "manualRegularHours") ||
    Object.prototype.hasOwnProperty.call(raw, "manualTotalHours");

  const d = parsed.data;
  if (manualKeysTouched) {
    if (
      !Object.prototype.hasOwnProperty.call(raw, "manualRegularHours") ||
      !Object.prototype.hasOwnProperty.call(raw, "manualTotalHours")
    ) {
      return NextResponse.json(
        {
          message:
            "Include both manualRegularHours and manualTotalHours (use null,null to clear).",
        },
        { status: 400 }
      );
    }
  }
  if (
    d.manualRegularHours != null &&
    d.manualTotalHours != null &&
    d.manualTotalHours < d.manualRegularHours
  ) {
    return NextResponse.json(
      { message: "manualTotalHours must be >= manualRegularHours" },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = {};
  if (d.weeklySalaryAmount !== undefined) {
    data.weeklySalaryAmount = d.weeklySalaryAmount;
  }
  if (d.hourlyRateSnapshot !== undefined) {
    data.hourlyRateSnapshot = d.hourlyRateSnapshot;
  }
  if (d.overtimeThreshold != null) {
    data.overtimeThreshold = d.overtimeThreshold;
  }
  if (d.overtimeMultiplier != null) {
    data.overtimeMultiplier = d.overtimeMultiplier;
  }
  if (manualKeysTouched) {
    data.manualRegularHours = d.manualRegularHours;
    data.manualTotalHours = d.manualTotalHours;
  }
  if (d.extraRateSegments !== undefined) {
    data.extraRateSegments = d.extraRateSegments;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ message: "No fields to update" }, { status: 400 });
  }

  await prisma.payrollLine.update({
    where: { id: line.id },
    data,
  });

  await recalculatePayrollLine(line.id);

  const updated = await prisma.payrollLine.findUnique({
    where: { id: line.id },
    include: {
      employee: { include: { department: true } },
      timeEntries: { orderBy: { workDate: "asc" } },
    },
  });
  return NextResponse.json(updated);
}
