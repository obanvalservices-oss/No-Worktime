import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagementAccess } from "@/lib/auth/api-session";
import { recalculatePayrollLine } from "@/lib/payrollLineRecalc";
import { payrollRunLinesArgs } from "@/lib/payrollLineInclude";
import type { UserRole } from "@/lib/auth/roles";
import { canAccessCompany } from "@/lib/auth/company-access";

async function assertRun(userId: string, role: UserRole, runId: string) {
  const run = await prisma.payrollRun.findUnique({
    where: { id: runId },
    include: { company: true },
  });
  if (!run || !(await canAccessCompany(userId, role, run.companyId))) return null;
  return run;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const auth = await requireManagementAccess(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, role } = auth;
  const { runId } = await params;

  const run = await assertRun(userId, role, runId);
  if (!run) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  if (run.status === "FINALIZED") {
    return NextResponse.json({ message: "Payroll is finalized" }, { status: 400 });
  }

  const full = await prisma.payrollRun.findUnique({
    where: { id: run.id },
    include: {
      lines: payrollRunLinesArgs,
    },
  });
  if (!full) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  for (const line of full.lines) {
    await recalculatePayrollLine(line.id);
  }

  const result = await prisma.payrollRun.findUnique({
    where: { id: run.id },
    include: {
      company: { select: { id: true, name: true } },
      lines: payrollRunLinesArgs,
    },
  });
  return NextResponse.json(result);
}
