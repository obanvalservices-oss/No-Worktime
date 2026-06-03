"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useCompany } from "@/context/CompanyContext";
import { axiosErrorMessage } from "@/lib/axiosErrorMessage";
import type { InvoiceReport } from "@/lib/invoice-report/types";

interface DepartmentOption {
  id: string;
  name: string;
}

function fmtHours(n: number | null): string {
  if (n == null) return "—";
  return n.toFixed(2);
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return `$${n.toFixed(2)}`;
}

export default function InvoiceReportPage() {
  const { company } = useCompany();
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("0");
  const [report, setReport] = useState<InvoiceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!company?.id) {
      setDepartments([]);
      return;
    }
    void api
      .get<DepartmentOption[]>(`/api/departments/company/${company.id}`)
      .then((r) => setDepartments(r.data))
      .catch(() => setDepartments([]));
  }, [company?.id]);

  const generate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!company?.id || !dateFrom || !dateTo) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const params = new URLSearchParams({
        dateFrom,
        dateTo,
        commissionPercent: String(Number(commissionPercent) || 0),
      });
      if (departmentId) params.set("departmentId", departmentId);
      const { data } = await api.get<InvoiceReport>(
        `/api/companies/${company.id}/invoice-report?${params}`
      );
      setReport(data);
    } catch (err) {
      setError(axiosErrorMessage(err, "Could not generate invoicing report."));
    } finally {
      setLoading(false);
    }
  };

  const print = () => window.print();

  if (!company) {
    return <p className="text-[var(--muted)]">Select a company from the header.</p>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="no-print">
        <Link href="/reports" className="text-sm link-brand hover:underline">
          ← Reports
        </Link>
        <h1 className="text-2xl font-semibold text-[var(--text)] mt-4 tracking-tight">
          Invoicing Report
        </h1>
        <p className="text-sm text-[var(--muted)] mt-2">
          Uses finalized payroll runs that overlap your date range. Draft runs are excluded.
        </p>
      </div>

      <form
        onSubmit={generate}
        className="no-print rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="text-sm flex flex-col gap-1.5">
            <span className="text-[var(--muted)]">From</span>
            <input
              type="date"
              required
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
            />
          </label>
          <label className="text-sm flex flex-col gap-1.5">
            <span className="text-[var(--muted)]">To</span>
            <input
              type="date"
              required
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
            />
          </label>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="text-sm flex flex-col gap-1.5">
            <span className="text-[var(--muted)]">Department (optional)</span>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
            >
              <option value="">All departments (grouped)</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm flex flex-col gap-1.5">
            <span className="text-[var(--muted)]">Commission % (optional)</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={commissionPercent}
              onChange={(e) => setCommissionPercent(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={loading}
            className="btn-brand px-5 py-2.5 text-sm font-medium rounded-xl cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? "Generating…" : "Generate"}
          </button>
          {report && (
            <button
              type="button"
              onClick={print}
              className="rounded-xl border border-[var(--border)] px-5 py-2.5 text-sm font-medium cursor-pointer"
            >
              Print / Save PDF
            </button>
          )}
        </div>
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      {report && (
        <div className="payroll-report-root space-y-8">
          {report.draftRunsExcluded > 0 && (
            <p className="no-print text-sm text-amber-800 dark:text-amber-200 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              {report.draftRunsExcluded} draft payroll run
              {report.draftRunsExcluded === 1 ? "" : "s"} in this period were not included.
            </p>
          )}

          <header className="border-b border-[var(--border)] pb-4">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)] mb-1">
              Invoicing Report
            </p>
            <h2 className="text-2xl font-semibold text-[var(--text)]">
              {report.company.name}
            </h2>
            <p className="text-[var(--muted)] mt-1">
              {report.departmentFilter
                ? report.departmentFilter.name
                : "All departments"}
            </p>
            <p className="text-sm mt-1 text-[var(--muted)]">
              Period {report.period.dateFrom} — {report.period.dateTo}
            </p>
          </header>

          {report.departments.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              No finalized payroll data for this period and filters.
            </p>
          ) : (
            report.departments.map((dept) => (
              <section key={dept.id} className="space-y-4 print:break-inside-avoid">
                {!report.departmentFilter && (
                  <h3 className="text-lg font-semibold text-[var(--text)] border-b border-[var(--border)] pb-2">
                    {dept.name}
                  </h3>
                )}
                {dept.employees.map((emp) => (
                  <div key={emp.id} className="space-y-2">
                    <div className="font-medium text-[var(--text)]">{emp.name}</div>
                    <div className="payroll-report-table-wrap overflow-x-auto print:overflow-visible">
                      <table className="payroll-report-table w-full min-w-[480px] print:min-w-0 text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted)]">
                            <th className="py-2 pr-2">Week</th>
                            <th className="py-2 pr-2 text-right">Reg h</th>
                            <th className="py-2 pr-2 text-right">OT h</th>
                            <th className="py-2 text-right">Total paid</th>
                          </tr>
                        </thead>
                        <tbody>
                          {emp.weeks.map((w) => (
                            <tr key={w.runId} className="border-b border-[var(--border)]">
                              <td className="py-2 pr-2 whitespace-nowrap">
                                {w.startDate} → {w.endDate}
                              </td>
                              <td className="py-2 pr-2 text-right font-mono tabular-nums">
                                {fmtHours(w.regularHours)}
                              </td>
                              <td className="py-2 pr-2 text-right font-mono tabular-nums">
                                {fmtHours(w.overtimeHours)}
                              </td>
                              <td className="py-2 text-right font-mono tabular-nums font-medium">
                                {fmtMoney(w.grossPay)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="font-medium">
                            <td colSpan={3} className="py-2 text-right pr-2 text-[var(--muted)]">
                              Employee subtotal
                            </td>
                            <td className="py-2 text-right font-mono tabular-nums">
                              {fmtMoney(emp.employeeSubtotal)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ))}
                {!report.departmentFilter && (
                  <p className="text-sm font-semibold text-right text-[var(--text)]">
                    Department subtotal: {fmtMoney(dept.subtotal)}
                  </p>
                )}
              </section>
            ))
          )}

          <footer className="border-t-2 border-[var(--border)] pt-4 space-y-2 text-right max-w-xs ml-auto">
            <div className="flex justify-between gap-8 text-sm">
              <span className="text-[var(--muted)]">Subtotal</span>
              <span className="font-mono font-semibold tabular-nums">
                {fmtMoney(report.subtotal)}
              </span>
            </div>
            {report.commissionAmount != null && report.commissionPercent > 0 && (
              <div className="flex justify-between gap-8 text-sm">
                <span className="text-[var(--muted)]">
                  Commission ({report.commissionPercent}%)
                </span>
                <span className="font-mono tabular-nums">
                  {fmtMoney(report.commissionAmount)}
                </span>
              </div>
            )}
            <div className="flex justify-between gap-8 text-base font-semibold pt-1">
              <span>Total</span>
              <span className="font-mono tabular-nums">{fmtMoney(report.grandTotal)}</span>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}
