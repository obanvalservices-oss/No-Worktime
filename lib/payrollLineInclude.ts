import type { Prisma } from "@prisma/client";

/** Stable ordering for payroll run lines (avoids UI reordering on updates). */
export const payrollRunLinesArgs = {
  orderBy: [{ employee: { name: "asc" as const } }, { id: "asc" as const }],
  include: {
    employee: { include: { department: true } },
    timeEntries: { orderBy: { workDate: "asc" as const } },
  },
} satisfies Prisma.PayrollLineFindManyArgs;
