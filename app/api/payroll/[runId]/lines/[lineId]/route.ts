import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagementAccess } from "@/lib/auth/api-session";
import { recalculatePayrollLine } from "@/lib/payrollLineRecalc";
import type { UserRole } from "@/lib/auth/roles";
import { canAccessCompany } from "@/lib/auth/company-access";

const rateBucketSchema = z.enum(["REGULAR", "OVERTIME"]);

async function assertRun(userId: string, role: UserRole, runId: string) {
  const run = await prisma.payrollRun.findUnique({
    where: { id: runId },
    include: { company: true },
  });
  if (!run || !(await canAccessCompany(userId, role, run.companyId))) return null;
  return run;
}

const patchLineSchema = z.object({
  weeklySalaryAmount: z.number().nonnegative().optional().nullable(),
  hourlyRateSnapshot: z.number().nonnegative().optional().nullable(),
  overtimeThreshold: z.number().positive().optional(),
  overtimeMultiplier: z.number().positive().optional(),
  manualRegularHours: z.number().nonnegative().optional().nullable(),
  manualOvertimeHours: z.number().nonnegative().optional().nullable(),
  extraRateSegments: z
    .array(
      z.object({
        rate: z.number().nonnegative(),
        hours: z.number().nonnegative(),
        bucket: rateBucketSchema,
      })
    )
    .optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ runId: string; lineId: string }> }
) {
  const auth = await requireManagementAccess(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, role } = auth;
  const { runId, lineId } = await params;

  const run = await assertRun(userId, role, runId);
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
    Object.prototype.hasOwnProperty.call(raw, "manualOvertimeHours");

  const d = parsed.data;
  if (manualKeysTouched) {
    if (
      !Object.prototype.hasOwnProperty.call(raw, "manualRegularHours") ||
      !Object.prototype.hasOwnProperty.call(raw, "manualOvertimeHours")
    ) {
      return NextResponse.json(
        {
          message:
            "Include both manualRegularHours and manualOvertimeHours (use null,null to clear).",
        },
        { status: 400 }
      );
    }
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
    data.manualOvertimeHours = d.manualOvertimeHours;
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ runId: string; lineId: string }> }
) {
  const auth = await requireManagementAccess(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, role } = auth;
  const { runId, lineId } = await params;

  const run = await assertRun(userId, role, runId);
  if (!run || run.status === "FINALIZED") {
    return NextResponse.json(
      { message: run ? "Cannot edit finalized payroll" : "Not found" },
      { status: run ? 400 : 404 }
    );
  }

  const line = await prisma.payrollLine.findFirst({
    where: { id: lineId, runId: run.id },
    select: { id: true },
  });
  if (!line) {
    return NextResponse.json({ message: "Line not found" }, { status: 404 });
  }

  await prisma.payrollLine.delete({ where: { id: line.id } });
  return new NextResponse(null, { status: 204 });
}
