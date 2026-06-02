import type { InvoiceReport } from "./types";

type LineInput = {
  id: string;
  regularHours: number | null;
  overtimeHours: number | null;
  grossPay: number | null;
  employee: {
    id: string;
    name: string;
    department: { id: string; name: string };
  };
};

type RunInput = {
  id: string;
  startDate: string;
  endDate: string;
  lines: LineInput[];
};

export function buildInvoiceReport(params: {
  company: { id: string; name: string };
  dateFrom: string;
  dateTo: string;
  departmentFilter: { id: string; name: string } | null;
  commissionPercent: number;
  draftRunsExcluded: number;
  runs: RunInput[];
}): InvoiceReport {
  const { company, dateFrom, dateTo, departmentFilter, commissionPercent, draftRunsExcluded, runs } =
    params;

  const deptMap = new Map<
    string,
    {
      id: string;
      name: string;
      employees: Map<
        string,
        {
          id: string;
          name: string;
          weeks: InvoiceReport["departments"][0]["employees"][0]["weeks"];
          employeeSubtotal: number;
        }
      >;
      subtotal: number;
    }
  >();

  for (const run of runs) {
    for (const line of run.lines) {
      const dept = line.employee.department;
      if (departmentFilter && dept.id !== departmentFilter.id) continue;

      let deptBlock = deptMap.get(dept.id);
      if (!deptBlock) {
        deptBlock = {
          id: dept.id,
          name: dept.name,
          employees: new Map(),
          subtotal: 0,
        };
        deptMap.set(dept.id, deptBlock);
      }

      let empBlock = deptBlock.employees.get(line.employee.id);
      if (!empBlock) {
        empBlock = {
          id: line.employee.id,
          name: line.employee.name,
          weeks: [],
          employeeSubtotal: 0,
        };
        deptBlock.employees.set(line.employee.id, empBlock);
      }

      const gross = line.grossPay ?? 0;
      empBlock.weeks.push({
        runId: run.id,
        startDate: run.startDate,
        endDate: run.endDate,
        regularHours: line.regularHours,
        overtimeHours: line.overtimeHours,
        grossPay: line.grossPay,
      });
      empBlock.employeeSubtotal += gross;
      deptBlock.subtotal += gross;
    }
  }

  const departments = [...deptMap.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((d) => ({
      id: d.id,
      name: d.name,
      subtotal: d.subtotal,
      employees: [...d.employees.values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((e) => ({
          ...e,
          weeks: e.weeks.sort((a, b) => a.startDate.localeCompare(b.startDate)),
        })),
    }));

  const subtotal = departments.reduce((sum, d) => sum + d.subtotal, 0);
  const commissionAmount =
    commissionPercent > 0 ? (subtotal * commissionPercent) / 100 : null;
  const grandTotal = subtotal + (commissionAmount ?? 0);

  return {
    company,
    period: { dateFrom, dateTo },
    departmentFilter,
    commissionPercent,
    draftRunsExcluded,
    departments,
    subtotal,
    commissionAmount,
    grandTotal,
  };
}
