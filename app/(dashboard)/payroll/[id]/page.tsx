"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import api from "@/lib/api";
import {
  decimalHoursToHHMM,
  normalizeClockString,
  sumDayHours,
  sumWeekHours,
} from "@/lib/time";
import { motion } from "framer-motion";
import { Calculator, Lock, Printer } from "lucide-react";

interface TimeEntry {
  id: string;
  workDate: string;
  clockIn: string | null;
  clockOut: string | null;
  clockIn2: string | null;
  clockOut2: string | null;
}

interface Line {
  id: string;
  hourlyRateSnapshot: number | null;
  weeklySalaryAmount: number | null;
  overtimeThreshold: number;
  overtimeMultiplier: number;
  regularHours: number | null;
  overtimeHours: number | null;
  regularPay: number | null;
  overtimePay: number | null;
  grossPay: number | null;
  employee: {
    id: string;
    name: string;
    payType: "HOURLY" | "SALARY";
    department: { name: string };
  };
  timeEntries: TimeEntry[];
}

interface Run {
  id: string;
  startDate: string;
  endDate: string;
  status: "DRAFT" | "FINALIZED";
  lines: Line[];
}

export default function PayrollRunPage() {
  const params = useParams();
  const runId = params.id as string;
  const [run, setRun] = useState<Run | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!runId) return;
    const { data } = await api.get<Run>(`/api/payroll/${runId}`);
    setRun(data);
  }, [runId]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchDay = async (
    lineId: string,
    workDate: string,
    body: Partial<TimeEntry>
  ) => {
    if (!runId || run?.status !== "DRAFT") return;
    try {
      await api.patch(
        `/api/payroll/${runId}/lines/${lineId}/day/${workDate}`,
        body
      );
      setMsg("");
      await load();
    } catch {
      setMsg("Could not save time. Use HH:mm, 0905, or 930 for 9:30.");
      await load();
    }
  };

  const patchSalary = async (lineId: string, weeklySalaryAmount: number) => {
    if (!runId || run?.status !== "DRAFT") return;
    await api.patch(`/api/payroll/${runId}/lines/${lineId}`, {
      weeklySalaryAmount,
    });
    await load();
  };

  const calculate = async () => {
    if (!runId) return;
    setBusy(true);
    setMsg("");
    try {
      const { data } = await api.post<Run>(`/api/payroll/${runId}/calculate`);
      setRun(data);
      setMsg("Totals updated.");
    } catch {
      setMsg("Calculate failed.");
    } finally {
      setBusy(false);
    }
  };

  const finalize = async () => {
    if (!runId || !confirm("Finalize? You will not be able to edit times.")) return;
    setBusy(true);
    try {
      const { data } = await api.post<Run>(`/api/payroll/${runId}/finalize`);
      setRun(data);
    } finally {
      setBusy(false);
    }
  };

  if (!run) {
    return <div className="text-[var(--muted)]">Loading…</div>;
  }

  const draft = run.status === "DRAFT";

  return (
    <div className="max-w-6xl mx-auto">
      <div className="no-print flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Payroll</h1>
          <p className="text-sm text-[var(--muted)]">
            {run.startDate} → {run.endDate} · {run.status}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/payroll/${run.id}/report`}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
          >
            <Printer className="w-4 h-4" />
            Print report
          </Link>
          {draft && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => calculate()}
                className="inline-flex items-center gap-2 btn-brand px-4 py-2 text-sm font-medium"
              >
                <Calculator className="w-4 h-4" />
                Calculate
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => finalize()}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
              >
                <Lock className="w-4 h-4" />
                Finalize
              </button>
            </>
          )}
        </div>
      </div>
      {msg && <p className="no-print text-sm text-brand-msg mb-4">{msg}</p>}

      <div className="space-y-10">
        {run.lines.map((line, idx) => (
          <motion.section
            key={line.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-[var(--border)] flex flex-wrap justify-between gap-2">
              <div>
                <div className="font-medium">{line.employee.name}</div>
                <div className="text-xs text-[var(--muted)]">
                  {line.employee.department.name} · {line.employee.payType}
                </div>
              </div>
              {line.employee.payType === "HOURLY" && (
                <div className="text-sm text-[var(--muted)]">
                  Rate ${line.hourlyRateSnapshot?.toFixed(2) ?? "—"}/hr · OT over{" "}
                  {line.overtimeThreshold}h @ {line.overtimeMultiplier}×
                </div>
              )}
            </div>

            {line.employee.payType === "HOURLY" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--bg)] text-left text-xs text-[var(--muted)]">
                      <th className="px-3 py-2">Date</th>
                      <th className="px-2 py-2">In</th>
                      <th className="px-2 py-2">Out</th>
                      <th className="px-2 py-2">In 2</th>
                      <th className="px-2 py-2">Out 2</th>
                      <th className="px-3 py-2 text-right">Day</th>
                    </tr>
                  </thead>
                  <tbody>
                    {line.timeEntries.map((te) => (
                      <tr key={te.id} className="border-t border-[var(--border)]">
                        <td className="px-3 py-2 whitespace-nowrap">{te.workDate}</td>
                        {(["clockIn", "clockOut", "clockIn2", "clockOut2"] as const).map(
                          (k) => (
                            <td key={k} className="px-1 py-1">
                              <input
                                key={`${te.id}-${k}-${te[k] ?? ""}`}
                                disabled={!draft}
                                defaultValue={te[k] ?? ""}
                                placeholder="HH:mm"
                                className="w-[72px] rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs font-mono disabled:opacity-60"
                                onBlur={(e) => {
                                  const raw = e.target.value.trim();
                                  const cur = te[k];
                                  const normalized =
                                    raw === "" ? null : normalizeClockString(raw);
                                  if (raw !== "" && normalized === null) {
                                    e.target.value = cur ?? "";
                                    return;
                                  }
                                  if (normalized != null) {
                                    e.target.value = normalized;
                                  }
                                  const next = normalized;
                                  if ((next ?? "") === (cur ?? "")) return;
                                  void patchDay(line.id, te.workDate, {
                                    [k]: next,
                                  });
                                }}
                              />
                            </td>
                          )
                        )}
                        <td className="px-3 py-2 text-right font-mono text-xs">
                          {decimalHoursToHHMM(sumDayHours(te))} (
                          {sumDayHours(te).toFixed(2)}h)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[var(--border)] font-medium">
                      <td colSpan={5} className="px-3 py-2 text-right">
                        Week total
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {decimalHoursToHHMM(sumWeekHours(line.timeEntries))} (
                        {sumWeekHours(line.timeEntries).toFixed(2)}h)
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {line.employee.payType === "SALARY" && (
              <div className="p-4 flex flex-wrap items-center gap-4">
                <label className="text-sm text-[var(--muted)]">
                  Weekly gross (this period)
                </label>
                <input
                  key={`${line.id}-${line.weeklySalaryAmount ?? ""}`}
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={!draft}
                  defaultValue={line.weeklySalaryAmount ?? ""}
                  className="w-36 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm disabled:opacity-60"
                  onBlur={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n) && n >= 0) {
                      void patchSalary(line.id, n);
                    }
                  }}
                />
              </div>
            )}

            <div className="px-4 py-3 bg-[var(--bg)] text-sm grid sm:grid-cols-2 md:grid-cols-4 gap-2 border-t border-[var(--border)]">
              <div>
                <span className="text-[var(--muted)]">Regular h</span>{" "}
                {line.regularHours?.toFixed(2) ?? "—"}
              </div>
              <div>
                <span className="text-[var(--muted)]">OT h</span>{" "}
                {line.overtimeHours?.toFixed(2) ?? "—"}
              </div>
              <div>
                <span className="text-[var(--muted)]">Regular pay</span>{" "}
                {line.regularPay != null ? `$${line.regularPay.toFixed(2)}` : "—"}
              </div>
              <div>
                <span className="text-[var(--muted)]">OT pay</span>{" "}
                {line.overtimePay != null ? `$${line.overtimePay.toFixed(2)}` : "—"}
              </div>
              <div className="sm:col-span-2 md:col-span-4 font-semibold">
                Gross pay:{" "}
                {line.grossPay != null ? `$${line.grossPay.toFixed(2)}` : "—"}
              </div>
            </div>
          </motion.section>
        ))}
      </div>
    </div>
  );
}
