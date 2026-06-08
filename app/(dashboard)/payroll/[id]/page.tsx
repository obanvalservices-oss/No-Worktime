"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useCompany } from "@/context/CompanyContext";
import {
  decimalHoursToHHMM,
  normalizeClockString,
  sumDayHours,
  sumWeekHours,
} from "@/lib/time";
import {
  decimalPlacesFromInputString,
  formatDecimal,
  roundHalfUp,
} from "@/lib/decimalPrecision";
import {
  computeLineTotals,
  parseExtraRateSegments,
  type ExtraRateSegment,
} from "@/lib/payrollCalculator";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calculator,
  Lock,
  Pencil,
  Plus,
  Printer,
  Trash2,
} from "lucide-react";

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

type PendingDayPatch = {
  lineId: string;
  workDate: string;
  body: Partial<TimeEntry>;
};

type PendingLinePatch = {
  lineId: string;
  body: Record<string, unknown>;
};

function cloneRun(run: Run): Run {
  return structuredClone(run);
}

function applyDayPatch(
  run: Run,
  lineId: string,
  workDate: string,
  body: Partial<TimeEntry>
): Run {
  return {
    ...run,
    lines: run.lines.map((line) =>
      line.id !== lineId
        ? line
        : {
            ...line,
            timeEntries: line.timeEntries.map((te) =>
              te.workDate === workDate ? { ...te, ...body } : te
            ),
          }
    ),
  };
}

function applyLinePatch(
  run: Run,
  lineId: string,
  body: Record<string, unknown>
): Run {
  return {
    ...run,
    lines: run.lines.map((line) =>
      line.id === lineId ? ({ ...line, ...body } as Line) : line
    ),
  };
}

/** Recompute stored hour/pay totals on a line after manual override or segment edits. */
function recomputeHourlyLineTotals(run: Run, lineId: string): Run {
  const line = run.lines.find((l) => l.id === lineId);
  if (!line || line.employee.payType !== "HOURLY") return run;
  const totals = computeLineTotals("HOURLY", line.timeEntries, line);
  return applyLinePatch(run, lineId, totals);
}

function queueDayPatch(
  pending: PendingDayPatch[],
  lineId: string,
  workDate: string,
  body: Partial<TimeEntry>
): PendingDayPatch[] {
  const i = pending.findIndex(
    (p) => p.lineId === lineId && p.workDate === workDate
  );
  if (i >= 0) {
    const next = [...pending];
    next[i] = { lineId, workDate, body: { ...next[i].body, ...body } };
    return next;
  }
  return [...pending, { lineId, workDate, body }];
}

function queueLinePatch(
  pending: PendingLinePatch[],
  lineId: string,
  body: Record<string, unknown>
): PendingLinePatch[] {
  const i = pending.findIndex((p) => p.lineId === lineId);
  if (i >= 0) {
    const next = [...pending];
    next[i] = { lineId, body: { ...next[i].body, ...body } };
    return next;
  }
  return [...pending, { lineId, body }];
}

function parseDecimalInput(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  const places = decimalPlacesFromInputString(t);
  return roundHalfUp(n, places);
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

  const [regInput, setRegInput] = useState(() =>
    line.manualRegularHours != null ? String(line.manualRegularHours) : ""
  );
  const [otInput, setOtInput] = useState(() =>
    line.manualOvertimeHours != null ? String(line.manualOvertimeHours) : ""
  );

  const [segments, setSegments] = useState<ExtraRateSegment[]>(() =>
    parseExtraRateSegments(line.extraRateSegments)
  );

  const segmentsKey = JSON.stringify(line.extraRateSegments ?? null);
  useEffect(() => {
    setSegments(parseExtraRateSegments(line.extraRateSegments));
  }, [line.id, segmentsKey]);

  useEffect(() => {
    setRegInput(
      line.manualRegularHours != null ? String(line.manualRegularHours) : ""
    );
    setOtInput(
      line.manualOvertimeHours != null ? String(line.manualOvertimeHours) : ""
    );
  }, [line.id, line.manualRegularHours, line.manualOvertimeHours]);

  const commitManual = (regRaw: string, otRaw: string) => {
    const rs = regRaw.trim();
    const os = otRaw.trim();
    if (rs === "" && os === "") {
      onPatch({ manualRegularHours: null, manualOvertimeHours: null });
      return;
    }
    const r = parseDecimalInput(rs);
    const o = parseDecimalInput(os);
    if (r == null || o == null) return;
    onPatch({ manualRegularHours: r, manualOvertimeHours: o });
  };

  const commitSegments = (next: ExtraRateSegment[]) => {
    setSegments(next);
    onPatch({ extraRateSegments: next });
  };

  const baseRate = line.hourlyRateSnapshot ?? 0;

  return (
    <div className="border-t border-[var(--border)] bg-[var(--bg)]/80 px-4 py-3 space-y-4">
      <div>
        <p className="text-xs font-medium text-[var(--text)] mb-0.5">
          Manual hour override (optional)
        </p>
        <p className="text-xs text-[var(--muted)] mb-2 leading-relaxed">
          Clock week total: {decimalHoursToHHMM(weekClock)} ({formatDecimal(weekClock, 2)} h).
          Leave both fields empty to use clocks for the reg/OT split. To override, enter{" "}
          <strong>regular</strong> and <strong>OT</strong> hours (both required together).
        </p>
        <div className="flex flex-wrap items-end gap-3" data-manual-wrap>
          <label className="text-xs text-[var(--muted)] flex flex-col gap-1">
            Regular h
            <input
              type="number"
              step="any"
              min="0"
              value={regInput}
              className="w-28 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm font-mono"
              onChange={(e) => {
                const next = e.target.value;
                setRegInput(next);
                commitManual(next, otInput);
              }}
            />
          </label>
          <label className="text-xs text-[var(--muted)] flex flex-col gap-1">
            OT h
            <input
              type="number"
              step="any"
              min="0"
              value={otInput}
              className="w-28 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm font-mono"
              onChange={(e) => {
                const next = e.target.value;
                setOtInput(next);
                commitManual(regInput, next);
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
            onClick={() => {
              setRegInput("");
              setOtInput("");
              onPatch({ manualRegularHours: null, manualOvertimeHours: null });
            }}
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
                  step="any"
                  min="0"
                  value={seg.rate}
                  className="w-24 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm"
                  onChange={(e) => {
                    const parsed = parseDecimalInput(e.target.value);
                    const next = [...segments];
                    next[i] = { ...next[i], rate: parsed ?? 0 };
                    commitSegments(next);
                  }}
                />
              </label>
              <label className="text-xs text-[var(--muted)] flex items-center gap-1">
                Hours
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={seg.hours}
                  className="w-24 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm"
                  onChange={(e) => {
                    const parsed = parseDecimalInput(e.target.value);
                    const next = [...segments];
                    next[i] = { ...next[i], hours: parsed ?? 0 };
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
  const router = useRouter();
  const runId = params.id as string;
  const { company } = useCompany();
  const [run, setRun] = useState<Run | null>(null);
  const [editRun, setEditRun] = useState<Run | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pendingDays, setPendingDays] = useState<PendingDayPatch[]>([]);
  const [pendingLines, setPendingLines] = useState<PendingLinePatch[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeeToAdd, setEmployeeToAdd] = useState("");
  const [canEditFinalized, setCanEditFinalized] = useState(false);

  const load = useCallback(async () => {
    if (!runId) return;
    const { data } = await api.get<Run>(`/api/payroll/${runId}`);
    setRun(data);
    if (isEditing) {
      setEditRun(cloneRun(data));
    }
  }, [runId, isEditing]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const companyId = run?.company?.id ?? company?.id;
    if (!companyId) {
      setCanEditFinalized(false);
      return;
    }
    void api
      .get<{ canEditFinalizedPayroll: boolean }>(
        `/api/auth/permissions?companyId=${companyId}`
      )
      .then((r) => setCanEditFinalized(r.data.canEditFinalizedPayroll))
      .catch(() => setCanEditFinalized(false));
  }, [run?.company?.id, company?.id]);

  const canEdit =
    run?.status === "DRAFT" ||
    (run?.status === "FINALIZED" && canEditFinalized);

  const formEnabled = canEdit && isEditing;

  useEffect(() => {
    if (!formEnabled) {
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
  }, [run?.company?.id, run?.status, canEditFinalized, formEnabled]);

  const startEditing = () => {
    if (!run || !canEdit) return;
    setEditRun(cloneRun(run));
    setPendingDays([]);
    setPendingLines([]);
    setDirty(false);
    setMsg("");
    setIsEditing(true);
  };

  const goBackToList = () => {
    if (dirty) {
      if (!confirm("You have unsaved changes. Leave without saving?")) return;
    }
    router.push("/payroll");
  };

  const queueDayChange = (
    lineId: string,
    workDate: string,
    body: Partial<TimeEntry>
  ) => {
    if (!editRun) return;
    setEditRun((prev) =>
      prev ? applyDayPatch(prev, lineId, workDate, body) : prev
    );
    setPendingDays((p) => queueDayPatch(p, lineId, workDate, body));
    setDirty(true);
    setMsg("");
  };

  const queueLineChange = (lineId: string, body: Record<string, unknown>) => {
    if (!editRun) return;
    setEditRun((prev) => {
      if (!prev) return prev;
      const patched = applyLinePatch(prev, lineId, body);
      return recomputeHourlyLineTotals(patched, lineId);
    });
    setPendingLines((p) => queueLinePatch(p, lineId, body));
    setDirty(true);
    setMsg("");
  };

  const saveChanges = async () => {
    if (!runId || !editRun) return;
    setBusy(true);
    setMsg("");
    try {
      for (const p of pendingDays) {
        await api.patch(
          `/api/payroll/${runId}/lines/${p.lineId}/day/${p.workDate}`,
          p.body
        );
      }
      for (const p of pendingLines) {
        await api.patch(`/api/payroll/${runId}/lines/${p.lineId}`, p.body);
      }
      const { data } = await api.post<Run>(`/api/payroll/${runId}/calculate`);
      setRun(data);
      setEditRun(cloneRun(data));
      setPendingDays([]);
      setPendingLines([]);
      setDirty(false);
      setMsg("Payroll updated.");
    } catch {
      setMsg("Could not save changes. Check time format (HH:mm) and try again.");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const calculate = async () => {
    if (!runId) return;
    if (dirty) {
      await saveChanges();
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const { data } = await api.post<Run>(`/api/payroll/${runId}/calculate`);
      setRun(data);
      if (isEditing) setEditRun(cloneRun(data));
      setMsg("Totals updated.");
    } catch {
      setMsg("Calculate failed.");
    } finally {
      setBusy(false);
    }
  };

  const finalize = async () => {
    if (
      !runId ||
      !confirm(
        "Finalize this payroll? Users without special permission will not be able to edit it afterward."
      )
    )
      return;
    if (dirty) {
      setMsg("Save changes before finalizing.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post<Run>(`/api/payroll/${runId}/finalize`);
      setRun(data);
      setEditRun(cloneRun(data));
      setIsEditing(false);
      setDirty(false);
      setMsg("Payroll finalized.");
    } finally {
      setBusy(false);
    }
  };

  const addEmployeeToRun = async () => {
    if (!runId || !employeeToAdd || !formEnabled) return;
    setBusy(true);
    setMsg("");
    try {
      const { data } = await api.post<Run>(`/api/payroll/${runId}/lines`, {
        employeeId: employeeToAdd,
      });
      setRun(data);
      setEditRun(cloneRun(data));
      setEmployeeToAdd("");
      setMsg("Employee added. Save changes or continue editing.");
      setDirty(true);
    } catch {
      setMsg("Could not add employee to this run.");
    } finally {
      setBusy(false);
    }
  };

  const removeEmployeeFromRun = async (lineId: string) => {
    if (!runId || !formEnabled) return;
    if (!confirm("Remove this employee from the payroll run?")) return;
    setBusy(true);
    setMsg("");
    try {
      await api.delete(`/api/payroll/${runId}/lines/${lineId}`);
      await load();
      if (editRun) {
        setEditRun((prev) =>
          prev
            ? { ...prev, lines: prev.lines.filter((l) => l.id !== lineId) }
            : prev
        );
      }
      setMsg("Employee removed.");
      setDirty(false);
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
  const displayRun = isEditing && editRun ? editRun : run;
  const runEmployeeIds = new Set(displayRun.lines.map((l) => l.employee.id));
  const addableEmployees = employees.filter((e) => !runEmployeeIds.has(e.id));
  const msgIsSuccess = msg === "Payroll updated.";

  return (
    <div className="max-w-6xl mx-auto">
      <button
        type="button"
        onClick={goBackToList}
        className="no-print inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--text)] cursor-pointer mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to payroll runs
      </button>

      <div className="no-print flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Payroll</h1>
          <p className="text-sm text-[var(--muted)]">
            {run.startDate} → {run.endDate} · {run.status}
            {isEditing ? " · Editing" : " · Viewing"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/payroll/${run.id}/report`}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print report
          </Link>
          {canEdit && !isEditing && (
            <button
              type="button"
              onClick={startEditing}
              className="inline-flex items-center gap-2 btn-brand px-4 py-2 text-sm font-medium cursor-pointer disabled:cursor-not-allowed"
            >
              <Pencil className="w-4 h-4" />
              Edit payroll
            </button>
          )}
          {formEnabled && dirty && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveChanges()}
              className="inline-flex items-center gap-2 btn-brand px-4 py-2 text-sm font-medium cursor-pointer disabled:cursor-not-allowed"
            >
              Save changes
            </button>
          )}
          {formEnabled && (
            <button
              type="button"
              disabled={busy}
              onClick={() => calculate()}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm cursor-pointer disabled:cursor-not-allowed"
            >
              <Calculator className="w-4 h-4" />
              Calculate
            </button>
          )}
          {formEnabled && draft && (
            <button
              type="button"
              disabled={busy}
              onClick={() => finalize()}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm cursor-pointer disabled:cursor-not-allowed"
            >
              <Lock className="w-4 h-4" />
              Finalize
            </button>
          )}
        </div>
      </div>
      {msg && (
        <p
          className={`no-print text-sm mb-4 rounded-lg px-3 py-2 ${
            msgIsSuccess
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
              : "text-brand-msg"
          }`}
        >
          {msg}
        </p>
      )}
      {formEnabled && (
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
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2 text-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            Add employee
          </button>
        </div>
      )}

      <div className="space-y-10">
        {displayRun.lines.map((line, idx) => (
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
                    Rate ${formatDecimal(line.hourlyRateSnapshot, 2)}/hr · OT over{" "}
                    {line.overtimeThreshold}h @ {line.overtimeMultiplier}×
                  </div>
                )}
                {formEnabled && (
                  <button
                    type="button"
                    onClick={() => void removeEmployeeFromRun(line.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-red-300 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-950/30 cursor-pointer"
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
                                disabled={!formEnabled}
                                defaultValue={te[k] ?? ""}
                                placeholder="HH:mm"
                                className="w-[72px] rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs font-mono disabled:opacity-60"
                                onBlur={(e) => {
                                  if (!formEnabled) return;
                                  const raw = e.target.value.trim();
                                  const cur = te[k];
                                  const normalized =
                                    raw === "" ? null : normalizeClockString(raw);
                                  if (raw !== "" && normalized === null) {
                                    e.target.value = cur ?? "";
                                    setMsg(
                                      "Invalid time. Use HH:mm, 0905, or 930 for 9:30."
                                    );
                                    return;
                                  }
                                  if (normalized != null) {
                                    e.target.value = normalized;
                                  }
                                  const next = normalized;
                                  if ((next ?? "") === (cur ?? "")) return;
                                  queueDayChange(line.id, te.workDate, { [k]: next });
                                }}
                              />
                            </td>
                          )
                        )}
                        <td className="px-3 py-2 text-right font-mono text-xs">
                          {decimalHoursToHHMM(sumDayHours(te))} (
                          {formatDecimal(sumDayHours(te), 2)}h)
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
                        {formatDecimal(sumWeekHours(line.timeEntries), 2)}h)
                      </td>
                    </tr>
                  </tfoot>
                </table>
                {formEnabled && (
                  <HourlyManualTools
                    line={line}
                    onPatch={(body) => queueLineChange(line.id, body)}
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
                  step="any"
                  min="0"
                  disabled={!formEnabled}
                  defaultValue={line.weeklySalaryAmount ?? ""}
                  className="w-36 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm disabled:opacity-60"
                  onBlur={(e) => {
                    if (!formEnabled) return;
                    const n = parseDecimalInput(e.target.value);
                    if (n != null) {
                      queueLineChange(line.id, { weeklySalaryAmount: n });
                    }
                  }}
                />
              </div>
            )}

            <div className="px-4 py-3 bg-[var(--bg)] text-sm grid sm:grid-cols-2 md:grid-cols-4 gap-2 border-t border-[var(--border)]">
              <div>
                <span className="text-[var(--muted)]">Regular h</span>{" "}
                {formatDecimal(line.regularHours, 2)}
              </div>
              <div>
                <span className="text-[var(--muted)]">OT h</span>{" "}
                {formatDecimal(line.overtimeHours, 2)}
              </div>
              <div>
                <span className="text-[var(--muted)]">Regular pay</span>{" "}
                {line.regularPay != null ? `$${formatDecimal(line.regularPay, 2)}` : "—"}
              </div>
              <div>
                <span className="text-[var(--muted)]">OT pay</span>{" "}
                {line.overtimePay != null ? `$${formatDecimal(line.overtimePay, 2)}` : "—"}
              </div>
              <div className="sm:col-span-2 md:col-span-4 font-semibold">
                Gross pay:{" "}
                {line.grossPay != null ? `$${formatDecimal(line.grossPay, 2)}` : "—"}
              </div>
            </div>
          </motion.section>
        ))}
      </div>
    </div>
  );
}
