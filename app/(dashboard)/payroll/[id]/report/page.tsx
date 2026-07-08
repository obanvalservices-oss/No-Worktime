"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import { sumDayHours } from "@/lib/time";
import { formatDecimal } from "@/lib/decimalPrecision";

type ReportType = "detailed" | "summary" | "paystubs";

interface TimeEntry {
  workDate: string;
  clockIn: string | null;
  clockOut: string | null;
  clockIn2: string | null;
  clockOut2: string | null;
}

interface Line {
  id: string;
  memo: string | null;
  employee: { name: string; payType: string; department: { name: string } };
  regularHours: number | null;
  overtimeHours: number | null;
  regularPay: number | null;
  overtimePay: number | null;
  grossPay: number | null;
  timeEntries: TimeEntry[];
}

interface Run {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  payTypeFilter: "HOURLY" | "SALARY" | null;
  department: { id: string; name: string } | null;
  company: { name: string };
  lines: Line[];
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return `$${formatDecimal(n, 2)}`;
}

function dayHasHours(te: TimeEntry): boolean {
  return sumDayHours(te) > 0;
}

export default function PayrollReportPage() {
  const params = useParams();
  const runId = params.id as string;
  const [run, setRun] = useState<Run | null>(null);
  const [reportType, setReportType] = useState<ReportType>("detailed");

  useEffect(() => {
    if (!runId) return;
    void api.get<Run>(`/api/payroll/${runId}`).then((r) => setRun(r.data));
  }, [runId]);

  const totals = useMemo(() => {
    if (!run) return { regH: 0, reg: 0, otH: 0, ot: 0, gross: 0 };
    return run.lines.reduce(
      (a, l) => ({
        regH: a.regH + (l.regularHours ?? 0),
        reg: a.reg + (l.regularPay ?? 0),
        otH: a.otH + (l.overtimeHours ?? 0),
        ot: a.ot + (l.overtimePay ?? 0),
        gross: a.gross + (l.grossPay ?? 0),
      }),
      { regH: 0, reg: 0, otH: 0, ot: 0, gross: 0 }
    );
  }, [run]);

  const print = () => window.print();

  if (!run) {
    return <div className="text-[var(--muted)] p-8">Loading…</div>;
  }

  const scopeBits: string[] = [];
  if (run.payTypeFilter === "HOURLY") scopeBits.push("Hourly");
  else if (run.payTypeFilter === "SALARY") scopeBits.push("Salary");
  if (run.department?.name) scopeBits.push(run.department.name);

  const stubChunks: Line[][] = [];
  for (let i = 0; i < run.lines.length; i += 5) {
    stubChunks.push(run.lines.slice(i, i + 5));
  }

  return (
    <div
      className={`payroll-report-root max-w-4xl mx-auto print:max-w-none print:mx-0 ${
        reportType === "paystubs" ? "report-paystubs" : ""
      } ${reportType === "summary" ? "report-summary" : ""}`}
    >
      <div className="no-print mb-6 flex flex-wrap items-center gap-3">
        <Link
          href={`/payroll/${run.id}`}
          className="text-sm link-brand hover:underline cursor-pointer"
        >
          ← Back to payroll run
        </Link>
        <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
          Report type
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] cursor-pointer"
          >
            <option value="detailed">Detailed</option>
            <option value="summary">Summary</option>
            <option value="paystubs">Paystubs</option>
          </select>
        </label>
        <button
          type="button"
          onClick={print}
          className="btn-brand px-4 py-2 text-sm font-medium cursor-pointer"
        >
          Print / Save PDF
        </button>
      </div>

      {/* ── DETAILED ── */}
      {reportType === "detailed" && (
        <div className="report-layout-detailed space-y-8">
          <header className="mb-2 border-b border-[var(--border)] pb-4">
            <h1 className="text-2xl font-semibold">Payroll detailed</h1>
            <p className="text-[var(--muted)]">{run.company.name}</p>
            <p className="text-sm mt-1">
              Period {run.startDate} — {run.endDate} · {run.status}
              {scopeBits.length ? ` · ${scopeBits.join(" · ")}` : ""}
            </p>
          </header>

          <div className="payroll-report-table-wrap overflow-x-auto print:overflow-visible">
            <table className="payroll-report-table w-full min-w-[720px] print:min-w-0 text-sm border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-left">
                  <th className="py-2 pr-2">Employee</th>
                  <th className="py-2 pr-2">Dept</th>
                  <th className="py-2 pr-2">Type</th>
                  <th className="py-2 pr-2 text-right whitespace-nowrap">Reg. h</th>
                  <th className="py-2 pr-2 text-right whitespace-nowrap">Reg. pay</th>
                  <th className="py-2 pr-2 text-right whitespace-nowrap">OT h</th>
                  <th className="py-2 pr-2 text-right whitespace-nowrap">OT pay</th>
                  <th className="py-2 pr-2 text-right whitespace-nowrap">Gross</th>
                  <th className="py-2">Memo</th>
                </tr>
              </thead>
              <tbody>
                {run.lines.map((l) => (
                  <tr key={l.id} className="border-b border-[var(--border)]">
                    <td className="py-2 pr-2">{l.employee.name}</td>
                    <td className="py-2 pr-2 text-[var(--muted)]">
                      {l.employee.department.name}
                    </td>
                    <td className="py-2 pr-2">{l.employee.payType}</td>
                    <td className="py-2 pr-2 text-right font-mono tabular-nums">
                      {formatDecimal(l.regularHours, 2)}
                    </td>
                    <td className="py-2 pr-2 text-right font-mono tabular-nums">
                      {fmtMoney(l.regularPay)}
                    </td>
                    <td className="py-2 pr-2 text-right font-mono tabular-nums">
                      {formatDecimal(l.overtimeHours, 2)}
                    </td>
                    <td className="py-2 pr-2 text-right font-mono tabular-nums">
                      {fmtMoney(l.overtimePay)}
                    </td>
                    <td className="py-2 pr-2 text-right font-mono font-medium tabular-nums">
                      {fmtMoney(l.grossPay)}
                    </td>
                    <td className="py-2 text-xs text-[var(--muted)] max-w-[10rem]">
                      {l.memo?.trim() || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold border-t-2 border-[var(--border)]">
                  <td colSpan={3} className="py-3 text-right pr-2">
                    Totals
                  </td>
                  <td className="py-3 text-right pr-2 font-mono tabular-nums">
                    {formatDecimal(totals.regH, 2)}
                  </td>
                  <td className="py-3 text-right pr-2 font-mono tabular-nums">
                    {fmtMoney(totals.reg)}
                  </td>
                  <td className="py-3 text-right pr-2 font-mono tabular-nums">
                    {formatDecimal(totals.otH, 2)}
                  </td>
                  <td className="py-3 text-right pr-2 font-mono tabular-nums">
                    {fmtMoney(totals.ot)}
                  </td>
                  <td className="py-3 text-right pr-2 font-mono tabular-nums">
                    {fmtMoney(totals.gross)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <section className="text-sm space-y-6 print:break-inside-avoid">
            <h2 className="font-semibold text-lg">Hourly detail</h2>
            {run.lines
              .filter((l) => l.employee.payType === "HOURLY")
              .map((l) => {
                const days = l.timeEntries.filter(dayHasHours);
                if (days.length === 0) return null;
                return (
                  <div key={l.id} className="mb-4">
                    <div className="font-medium mb-2">
                      {l.employee.name}
                      {l.memo?.trim() ? (
                        <span className="ml-2 text-xs font-normal text-[var(--muted)]">
                          · {l.memo}
                        </span>
                      ) : null}
                    </div>
                    <table className="w-full text-xs border border-[var(--border)]">
                      <thead>
                        <tr className="bg-[var(--bg)]">
                          <th className="text-left p-2">Date</th>
                          <th className="text-right p-2">Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {days.map((te) => (
                          <tr
                            key={te.workDate}
                            className="border-t border-[var(--border)]"
                          >
                            <td className="p-2">{te.workDate}</td>
                            <td className="p-2 text-right font-mono">
                              {formatDecimal(sumDayHours(te), 2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
          </section>
        </div>
      )}

      {/* ── SUMMARY ── */}
      {reportType === "summary" && (
        <div className="report-layout-summary">
          <header className="border-b border-[var(--border)] pb-2 mb-3">
            <p className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
              Payroll summary
            </p>
            <h1 className="text-lg font-semibold leading-tight">
              {run.company.name}
            </h1>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              {run.startDate} — {run.endDate} · {run.status}
              {scopeBits.length ? ` · ${scopeBits.join(" · ")}` : ""}
            </p>
          </header>

          <table className="payroll-report-table w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-left">
                <th className="py-1.5 pr-2">Employee</th>
                <th className="py-1.5 pr-2">Dept</th>
                <th className="py-1.5 pr-2 text-right">Amount</th>
                <th className="py-1.5">Memo</th>
              </tr>
            </thead>
            <tbody>
              {run.lines.map((l) => (
                <tr key={l.id} className="border-b border-[var(--border)]">
                  <td className="py-1 pr-2 font-medium">{l.employee.name}</td>
                  <td className="py-1 pr-2 text-[var(--muted)]">
                    {l.employee.department.name}
                  </td>
                  <td className="py-1 pr-2 text-right font-mono tabular-nums font-semibold">
                    {fmtMoney(l.grossPay)}
                  </td>
                  <td className="py-1 text-[var(--muted)]">
                    {l.memo?.trim() || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold border-t-2 border-[var(--border)]">
                <td colSpan={2} className="py-2 text-right pr-2">
                  Total
                </td>
                <td className="py-2 text-right font-mono tabular-nums">
                  {fmtMoney(totals.gross)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ── PAYSTUBS (5 per letter page) ── */}
      {reportType === "paystubs" && (
        <div className="report-layout-paystubs">
          {stubChunks.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No employees on this run.</p>
          ) : (
            stubChunks.map((chunk, pageIdx) => (
              <div
                key={pageIdx}
                className={`paystub-page ${
                  pageIdx < stubChunks.length - 1 ? "paystub-page-break" : ""
                }`}
              >
                {chunk.map((l) => (
                  <div key={l.id} className="paystub-slot">
                    <div className="paystub-inner">
                      <div className="text-[10px] uppercase tracking-wide text-[var(--muted)]">
                        {l.employee.department.name}
                      </div>
                      <div className="font-semibold text-sm mt-0.5">
                        {l.employee.name}
                      </div>
                      <div className="text-xs text-[var(--muted)] mt-1">
                        Period {run.startDate} — {run.endDate}
                      </div>
                      <div className="text-base font-semibold font-mono mt-2 tabular-nums">
                        {fmtMoney(l.grossPay)}
                      </div>
                      {l.memo?.trim() ? (
                        <div className="text-[10px] text-[var(--muted)] mt-1 leading-snug">
                          {l.memo}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
                {/* Fill empty slots to keep cut lines consistent on last page */}
                {Array.from({ length: Math.max(0, 5 - chunk.length) }).map(
                  (_, i) => (
                    <div key={`empty-${i}`} className="paystub-slot paystub-empty" />
                  )
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
