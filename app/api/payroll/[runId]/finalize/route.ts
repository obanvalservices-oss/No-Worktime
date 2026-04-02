import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId, jsonUnauthorized } from "@/lib/jwt-auth";

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
  const userId = getAuthenticatedUserId(request);
  if (!userId) return jsonUnauthorized();
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
      lines: {
        include: {
          employee: { include: { department: true } },
          timeEntries: { orderBy: { workDate: "asc" } },
        },
      },
    },
  });
  return NextResponse.json(result);
}
