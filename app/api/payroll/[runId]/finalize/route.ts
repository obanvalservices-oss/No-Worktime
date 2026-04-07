import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagementAccess } from "@/lib/auth/api-session";
import { payrollRunLinesArgs } from "@/lib/payrollLineInclude";

async function assertRun(userId: string, runId: string) {
  const run = await prisma.payrollRun.findUnique({
    where: { id: runId },
    include: { company: true },
  });
  if (!run || run.company.ownerId !== userId) return null;
  return run;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const auth = await requireManagementAccess(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const { runId } = await params;

  const run = await assertRun(userId, runId);
  if (!run) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  if (run.status === "FINALIZED") {
    return NextResponse.json({ message: "Already finalized" }, { status: 400 });
  }

  await prisma.payrollRun.update({
    where: { id: run.id },
    data: { status: "FINALIZED" },
  });

  const result = await prisma.payrollRun.findUnique({
    where: { id: run.id },
    include: {
      company: { select: { id: true, name: true } },
      lines: payrollRunLinesArgs,
    },
  });
  return NextResponse.json(result);
}
