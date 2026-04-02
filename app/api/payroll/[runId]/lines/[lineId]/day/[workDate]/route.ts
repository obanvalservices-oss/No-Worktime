import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId, jsonUnauthorized } from "@/lib/jwt-auth";
import { normalizeClockString } from "@/lib/time";
import { recalculatePayrollLine } from "@/lib/payrollLineRecalc";

async function assertRun(userId: string, runId: string) {
  const run = await prisma.payrollRun.findUnique({
    where: { id: runId },
    include: { company: true },
  });
  if (!run || run.company.ownerId !== userId) return null;
  return run;
}

const timeEntrySchema = z.object({
  clockIn: z.string().nullable().optional(),
  clockOut: z.string().nullable().optional(),
  clockIn2: z.string().nullable().optional(),
  clockOut2: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ runId: string; lineId: string; workDate: string }> }
) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return jsonUnauthorized();
  const { runId, lineId, workDate } = await params;

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
  if (!line || line.employee.payType !== "HOURLY") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const body = await request.json();
  const parsed = timeEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });
  }

  type Patch = { kind: "omit" } | { kind: "set"; value: string | null };
  const normField = (v: string | null | undefined): Patch | "invalid" => {
    if (v === undefined) return { kind: "omit" };
    if (v === null || v.trim() === "") return { kind: "set", value: null };
    const n = normalizeClockString(v);
    if (n === null) return "invalid";
    return { kind: "set", value: n };
  };

  const d = parsed.data;
  const data: Record<string, string | null> = {};
  for (const key of ["clockIn", "clockOut", "clockIn2", "clockOut2"] as const) {
    const r = normField(d[key]);
    if (r === "invalid") {
      return NextResponse.json(
        { message: `Invalid time for ${key}. Use HH:mm or 4 digits (e.g. 0905).` },
        { status: 400 }
      );
    }
    if (r.kind === "set") {
      data[key] = r.value;
    }
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ message: "No fields to update" }, { status: 400 });
  }

  const entry = await prisma.timeEntry.update({
    where: { lineId_workDate: { lineId: line.id, workDate } },
    data,
  });
  await recalculatePayrollLine(line.id);
  return NextResponse.json(entry);
}
