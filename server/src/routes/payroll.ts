import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { assertSevenDayPeriod, enumerateInclusiveDates } from "../lib/dates.js";
import { computeLineTotals } from "../services/payrollCalculator.js";

const router = Router();
router.use(requireAuth);

async function assertRun(userId: string, runId: string) {
  const run = await prisma.payrollRun.findUnique({
    where: { id: runId },
    include: { company: true },
  });
  if (!run || run.company.ownerId !== userId) return null;
  return run;
}

router.get("/company/:companyId", async (req: AuthRequest, res) => {
  const companyId = req.params.companyId;
  const c = await prisma.company.findFirst({
    where: { id: companyId, ownerId: req.userId! },
  });
  if (!c) {
    res.status(404).json({ message: "Company not found" });
    return;
  }
  const runs = await prisma.payrollRun.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { lines: true } },
    },
  });
  res.json(runs);
});

const createRunSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
});

router.post("/company/:companyId", async (req: AuthRequest, res) => {
  const companyId = req.params.companyId;
  const c = await prisma.company.findFirst({
    where: { id: companyId, ownerId: req.userId! },
  });
  if (!c) {
    res.status(404).json({ message: "Company not found" });
    return;
  }
  const parsed = createRunSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }
  try {
    assertSevenDayPeriod(parsed.data.startDate, parsed.data.endDate);
  } catch (e) {
    res.status(400).json({ message: (e as Error).message });
    return;
  }

  const dates = enumerateInclusiveDates(parsed.data.startDate, parsed.data.endDate);
  const employees = await prisma.employee.findMany({
    where: { companyId, isActive: true },
  });

  if (employees.length === 0) {
    res.status(400).json({ message: "No active employees in this company" });
    return;
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
          hourlyRateSnapshot:
            emp.payType === "HOURLY" ? emp.hourlyRate : null,
          weeklySalaryAmount:
            emp.payType === "SALARY" ? emp.weeklyBaseSalary : null,
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
      lines: {
        include: {
          employee: { include: { department: true } },
          timeEntries: { orderBy: { workDate: "asc" } },
        },
      },
    },
  });
  res.status(201).json(full);
});

router.get("/:runId", async (req: AuthRequest, res) => {
  const run = await assertRun(req.userId!, req.params.runId);
  if (!run) {
    res.status(404).json({ message: "Not found" });
    return;
  }
  const full = await prisma.payrollRun.findUnique({
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
  res.json(full);
});

const patchRunSchema = z.object({
  notes: z.string().optional().nullable(),
});

router.patch("/:runId", async (req: AuthRequest, res) => {
  const run = await assertRun(req.userId!, req.params.runId);
  if (!run) {
    res.status(404).json({ message: "Not found" });
    return;
  }
  if (run.status === "FINALIZED") {
    res.status(400).json({ message: "Cannot edit a finalized payroll" });
    return;
  }
  const parsed = patchRunSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }
  const updated = await prisma.payrollRun.update({
    where: { id: run.id },
    data: {
      ...(parsed.data.notes !== undefined
        ? { notes: parsed.data.notes?.trim() || null }
        : {}),
    },
  });
  res.json(updated);
});

const patchLineSchema = z.object({
  weeklySalaryAmount: z.number().nonnegative().optional().nullable(),
  hourlyRateSnapshot: z.number().nonnegative().optional().nullable(),
  overtimeThreshold: z.number().positive().optional(),
  overtimeMultiplier: z.number().positive().optional(),
});

router.patch("/:runId/lines/:lineId", async (req: AuthRequest, res) => {
  const run = await assertRun(req.userId!, req.params.runId);
  if (!run || run.status === "FINALIZED") {
    res.status(run ? 400 : 404).json({
      message: run ? "Cannot edit finalized payroll" : "Not found",
    });
    return;
  }
  const line = await prisma.payrollLine.findFirst({
    where: { id: req.params.lineId, runId: run.id },
    include: { employee: true },
  });
  if (!line) {
    res.status(404).json({ message: "Line not found" });
    return;
  }
  const parsed = patchLineSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
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

  const updated = await prisma.payrollLine.update({
    where: { id: line.id },
    data,
    include: {
      employee: { include: { department: true } },
      timeEntries: { orderBy: { workDate: "asc" } },
    },
  });
  res.json(updated);
});

const timeEntrySchema = z.object({
  clockIn: z.string().nullable().optional(),
  clockOut: z.string().nullable().optional(),
  clockIn2: z.string().nullable().optional(),
  clockOut2: z.string().nullable().optional(),
});

router.patch("/:runId/lines/:lineId/day/:workDate", async (req: AuthRequest, res) => {
  const run = await assertRun(req.userId!, req.params.runId);
  if (!run || run.status === "FINALIZED") {
    res.status(run ? 400 : 404).json({
      message: run ? "Cannot edit finalized payroll" : "Not found",
    });
    return;
  }
  const line = await prisma.payrollLine.findFirst({
    where: { id: req.params.lineId, runId: run.id },
    include: { employee: true },
  });
  if (!line || line.employee.payType !== "HOURLY") {
    res.status(404).json({ message: "Not found" });
    return;
  }
  const parsed = timeEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }
  const workDate = req.params.workDate;
  const entry = await prisma.timeEntry.update({
    where: { lineId_workDate: { lineId: line.id, workDate } },
    data: {
      clockIn: parsed.data.clockIn ?? null,
      clockOut: parsed.data.clockOut ?? null,
      clockIn2: parsed.data.clockIn2 ?? null,
      clockOut2: parsed.data.clockOut2 ?? null,
    },
  });
  res.json(entry);
});

router.post("/:runId/calculate", async (req: AuthRequest, res) => {
  const run = await assertRun(req.userId!, req.params.runId);
  if (!run) {
    res.status(404).json({ message: "Not found" });
    return;
  }
  if (run.status === "FINALIZED") {
    res.status(400).json({ message: "Payroll is finalized" });
    return;
  }

  const full = await prisma.payrollRun.findUnique({
    where: { id: run.id },
    include: {
      lines: {
        include: {
          employee: true,
          timeEntries: { orderBy: { workDate: "asc" } },
        },
      },
    },
  });
  if (!full) {
    res.status(404).json({ message: "Not found" });
    return;
  }

  for (const line of full.lines) {
    const totals = computeLineTotals(line.employee.payType, line.timeEntries, line);
    await prisma.payrollLine.update({
      where: { id: line.id },
      data: {
        regularHours: totals.regularHours,
        overtimeHours: totals.overtimeHours,
        regularPay: totals.regularPay,
        overtimePay: totals.overtimePay,
        grossPay: totals.grossPay,
      },
    });
  }

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
  res.json(result);
});

router.post("/:runId/finalize", async (req: AuthRequest, res) => {
  const run = await assertRun(req.userId!, req.params.runId);
  if (!run) {
    res.status(404).json({ message: "Not found" });
    return;
  }
  if (run.status === "FINALIZED") {
    res.status(400).json({ message: "Already finalized" });
    return;
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
  res.json(result);
});

router.delete("/:runId", async (req: AuthRequest, res) => {
  const run = await assertRun(req.userId!, req.params.runId);
  if (!run) {
    res.status(404).json({ message: "Not found" });
    return;
  }
  if (run.status === "FINALIZED") {
    res.status(400).json({ message: "Cannot delete finalized payroll" });
    return;
  }
  await prisma.payrollRun.delete({ where: { id: run.id } });
  res.status(204).send();
});

export default router;
