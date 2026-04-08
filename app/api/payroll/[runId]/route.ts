import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagementAccess } from "@/lib/auth/api-session";
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

export async function GET(
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
  const full = await prisma.payrollRun.findUnique({
    where: { id: run.id },
    include: {
      company: { select: { id: true, name: true } },
      lines: payrollRunLinesArgs,
    },
  });
  return NextResponse.json(full);
}

const patchRunSchema = z.object({
  notes: z.string().optional().nullable(),
});

export async function PATCH(
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
    return NextResponse.json({ message: "Cannot edit a finalized payroll" }, { status: 400 });
  }
  const body = await request.json();
  const parsed = patchRunSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });
  }
  const updated = await prisma.payrollRun.update({
    where: { id: run.id },
    data: {
      ...(parsed.data.notes !== undefined
        ? { notes: parsed.data.notes?.trim() || null }
        : {}),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
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
    return NextResponse.json({ message: "Cannot delete finalized payroll" }, { status: 400 });
  }
  await prisma.payrollRun.delete({ where: { id: run.id } });
  return new NextResponse(null, { status: 204 });
}
