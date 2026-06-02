export interface InvoiceWeekRow {
  runId: string;
  startDate: string;
  endDate: string;
  regularHours: number | null;
  overtimeHours: number | null;
  grossPay: number | null;
}

export interface InvoiceEmployeeBlock {
  id: string;
  name: string;
  weeks: InvoiceWeekRow[];
  employeeSubtotal: number;
}

export interface InvoiceDepartmentBlock {
  id: string;
  name: string;
  employees: InvoiceEmployeeBlock[];
  subtotal: number;
}

export interface InvoiceReport {
  company: { id: string; name: string };
  period: { dateFrom: string; dateTo: string };
  departmentFilter: { id: string; name: string } | null;
  commissionPercent: number;
  draftRunsExcluded: number;
  departments: InvoiceDepartmentBlock[];
  subtotal: number;
  commissionAmount: number | null;
  grandTotal: number;
}
