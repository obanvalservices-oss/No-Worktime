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
import {
  parseExtraRateSegments,
  type ExtraRateSegment,
} from "@/lib/payrollCalculator";
import { motion } from "framer-motion";
import { Calculator, Lock, Plus, Printer, Trash2 } from "lucide-react";

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
  manualRegularHours: number | null;
  manualOvertimeHours: number | null;
  extraRateSegments: unknown;
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
  company: { id: string; name: string };
  lines: Line[];
}

interface EmployeeOption {
  id: string;
  name: string;
  payType: "HOURLY" | "SALARY";
  isActive: boolean;
}

function HourlyManualTools({
  line,
  onPatch,
}: {
  line: Line;
  onPatch: (body: Record<string, unknown>) => void;
}) {
  const weekClock = sumWeekHours(line.timeEntries);
  const manualActive =
    line.manualRegularHours != null && line.manualOvertimeHours != null;

  const [segments, setSegments] = useState<ExtraRateSegment[]>(() =>
    parseExtraRateSegments(line.extraRateSegments)
  );

  const segmentsKey = JSON.stringify(line.extraRateSegments ?? null);
  useEffect(() => {
    setSegments(parseExtraRateSegments(line.extraRateSegments));
  }, [line.id, segmentsKey]);

  const commitSegments = (next: ExtraRateSegment[]) => {
    setSegments(next);
    void onPatch({ extraRateSegments: next });
  };

  const saveManualFromInputs = (
    regEl: HTMLInputElement | null,
    otEl: HTMLInputElement | null
  ) => {
    const rs = regEl?.value?.trim() ?? "";
    const os = otEl?.value?.trim() ?? "";
    if (rs === "" && os === "") {
      void onPatch({ manualRegularHours: null, manualOvertimeHours: null });
      return;
    }
    const r = Number(rs);
    const o = Number(os);
    if (!Number.isFinite(r) || !Number.isFinite(o) || r < 0 || o < 0) {
      return;
    }
    void onPatch({ manualRegularHours: r, manualOvertimeHours: o });
  };

  const baseRate = line.hourlyRateSnapshot ?? 0;

  return (
    <div className="border-t border-[var(--border)] bg-[var(--bg)]/80 px-4 py-3 space-y-4">
      <div>
        <p className="text-xs font-medium text-[var(--text)] mb-0.5">
          Manual hour override (optional)
        </p>
        <p className="text-xs text-[var(--muted)] mb-2 leading-relaxed">
          Clock week total: {decimalHoursToHHMM(weekClock)} ({weekClock.toFixed(2)} h).
          Leave both fields empty to use clocks for the reg/OT split. To override, enter{" "}
          <strong>regular</strong> and <strong>OT</strong> hours (both required together).
        </p>
        <div className="flex flex-wrap items-end gap-3" data-manual-wrap>
          <label className="text-xs text-[var(--muted)] flex flex-col gap-1">
            Regular h
            <input
              key={`mr-${line.id}-${String(line.manualRegularHours)}-${String(line.manualOvertimeHours)}`}
              type="number"
              step="0.01"
              min="0"
              defaultValue={line.manualRegularHours ?? ""}
              className="w-28 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm font-mono"
              data-manual-reg
              onBlur={(e) => {
                const form = e.currentTarget.closest("[data-manual-wrap]");
                const ot = form?.querySelector<HTMLInputElement>("[data-manual-ot]");
                saveManualFromInputs(e.currentTarget, ot ?? null);
              }}
            />
          </label>
          <label className="text-xs text-[var(--muted)] flex flex-col gap-1">
            OT h
            <input
              key={`mo-${line.id}-${String(line.manualRegularHours)}-${String(line.manualOvertimeHours)}`}
              type="number"
              step="0.01"
              min="0"
              defaultValue={line.manualOvertimeHours ?? ""}
              className="w-28 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm font-mono"
              data-manual-ot
              onBlur={(e) => {
                const form = e.currentTarget.closest("[data-manual-wrap]");
                const reg = form?.querySelector<HTMLInputElement>("[data-manual-reg]");
                saveManualFromInputs(reg ?? null, e.currentTarget);
              }}
            />
          </label>
          {manualActive && (
            <span className="text-xs text-[var(--muted)] pb-1">
              Manual override active
            </span>
          )}
          <button
            type="button"
            className="text-xs link-brand px-2 py-1 rounded"
            onClick={() =>
              void onPatch({ manualRegularHours: null, manualOvertimeHours: null })
            }
          >
            Use clock totals
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-[var(--text)] mb-0.5">
          Additional rates (optional)
        </p>
        <p className="text-xs text-[var(--muted)] mb-2 leading-relaxed">
          Extra hours at different rates. Each row is <strong>rate × hours</strong>. Pick
          Regular or OT to add that amount to regular pay or OT pay (enter the OT $/hr
          you want — no extra multiplier).
        </p>
        <div className="space-y-2">
          {segments.map((seg, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-[var(--muted)] w-8">{i + 1}.</span>
              <label className="text-xs text-[var(--muted)] flex items-center gap-1">
                Applies to
                <select
                  value={seg.bucket}
                  className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs"
                  onChange={(e) => {
                    const bucket = e.target.value === "OVERTIME" ? "OVERTIME" : "REGULAR";
                    const next = [...segments];
                    next[i] = { ...next[i], bucket };
                    commitSegments(next);
                  }}
                >
                  <option value="REGULAR">Regular</option>
                  <option value="OVERTIME">OT</option>
                </select>
              </label>
              <label className="text-xs text-[var(--muted)] flex items-center gap-1">
                Rate $
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={seg.rate}
                  className="w-24 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm"
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    const next = [...segments];
                    next[i] = { ...next[i], rate: Number.isFinite(n) ? n : 0 };
                    commitSegments(next);
                  }}
                />
              </label>
              <label className="text-xs text-[var(--muted)] flex items-center gap-1">
                Hours
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={seg.hours}
                  className="w-24 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm"
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    const next = [...segments];
                    next[i] = { ...next[i], hours: Number.isFinite(n) ? n : 0 };
                    commitSegments(next);
                  }}
                />
              </label>
              <button
                type="button"
                className="p-1.5 rounded text-[var(--muted)] hover:text-red-500 hover:bg-red-500/10"
                aria-label="Remove row"
                onClick={() => {
                  commitSegments(segments.filter((_, j) => j !== i));
                }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent-deep)] dark:text-[var(--accent-light)] hover:underline"
            onClick={() => {
              commitSegments([
                ...segments,
                { rate: baseRate, hours: 0, bucket: "REGULAR" },
              ]);
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add rate / hours row
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PayrollRunPage() {
  const params = useParams();
  const runId = params.id as string;
  const [run, setRun] = useState<Run | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeeToAdd, setEmployeeToAdd] = useState("");

  const load = useCallback(async () => {
    if (!runId) return;
    const { data } = await api.get<Run>(`/api/payroll/${runId}`);
    setRun(data);
  }, [runId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!run?.company?.id || run.status !== "DRAFT") {
      setEmployees([]);
      setEmployeeToAdd("");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await api.get<EmployeeOption[]>(
          `/api/employees/company/${run.company.id}`
        );
        if (cancelled) return;
        const active = data.filter((e) => e.isActive);
        setEmployees(active);
      } catch {
        if (!cancelled) setEmployees([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [run?.company?.id, run?.status]);

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

  const patchLine = async (lineId: string, body: Record<string, unknown>) => {
    if (!runId || run?.status !== "DRAFT") return;
    await api.patch(`/api/payroll/${runId}/lines/${lineId}`, body);
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

  const addEmployeeToRun = async () => {
    if (!runId || !employeeToAdd || run?.status !== "DRAFT") return;
    setBusy(true);
    setMsg("");
    try {
      const { data } = await api.post<Run>(`/api/payroll/${runId}/lines`, {
        employeeId: employeeToAdd,
      });
      setRun(data);
      setEmployeeToAdd("");
      setMsg("Employee added to this payroll run.");
    } catch {
      setMsg("Could not add employee to this run.");
    } finally {
      setBusy(false);
    }
  };

  const removeEmployeeFromRun = async (lineId: string) => {
    if (!runId || run?.status !== "DRAFT") return;
    if (!confirm("Remove this employee from the payroll run?")) return;
    setBusy(true);
    setMsg("");
    try {
      await api.delete(`/api/payroll/${runId}/lines/${lineId}`);
      await load();
      setMsg("Employee removed from this payroll run.");
    } catch {
      setMsg("Could not remove employee from this run.");
    } finally {
      setBusy(false);
    }
  };

  if (!run) {
    return <div className="text-[var(--muted)]">Loading…</div>;
  }

  const draft = run.status === "DRAFT";
  const runEmployeeIds = new Set(run.lines.map((l) => l.employee.id));
  const addableEmployees = employees.filter((e) => !runEmployeeIds.has(e.id));

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
      {draft && (
        <div className="no-print mb-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-[var(--muted)]">Include employee in this run</span>
          <select
            value={employeeToAdd}
            onChange={(e) => setEmployeeToAdd(e.target.value)}
            className="min-w-[220px] rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          >
            <option value="">Select employee</option>
            {addableEmployees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.payType})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy || !employeeToAdd}
            onClick={() => void addEmployeeToRun()}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            Add employee
          </button>
        </div>
      )}

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
              <div className="flex items-center gap-3">
                {line.employee.payType === "HOURLY" && (
                  <div className="text-sm text-[var(--muted)]">
                    Rate ${line.hourlyRateSnapshot?.toFixed(2) ?? "—"}/hr · OT over{" "}
                    {line.overtimeThreshold}h @ {line.overtimeMultiplier}×
                  </div>
                )}
                {draft && (
                  <button
                    type="button"
                    onClick={() => void removeEmployeeFromRun(line.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-red-300 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                )}
              </div>
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
                {draft && (
                  <HourlyManualTools
                    line={line}
                    onPatch={(body) => void patchLine(line.id, body)}
                  />
                )}
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
