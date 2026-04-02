import { prisma } from "@/lib/prisma";
import { computeLineTotals } from "@/lib/payrollCalculator";

/** Recompute stored totals for one payroll line from its time entries. */
export async function recalculatePayrollLine(lineId: string) {
  const line = await prisma.payrollLine.findUnique({
    where: { id: lineId },
    include: {
      employee: true,
      timeEntries: { orderBy: { workDate: "asc" } },
    },
  });
  if (!line) return;
  const totals = computeLineTotals(line.employee.payType, line.timeEntries, line);
  await prisma.payrollLine.update({
    where: { id: lineId },
    data: {
      regularHours: totals.regularHours,
      overtimeHours: totals.overtimeHours,
      regularPay: totals.regularPay,
      overtimePay: totals.overtimePay,
      grossPay: totals.grossPay,
    },
  });
}
