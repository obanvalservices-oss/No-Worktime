"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useCompany } from "@/context/CompanyContext";

function daysInclusive(start: string, end: string): number {
  const a = new Date(`${start}T12:00:00Z`).getTime();
  const b = new Date(`${end}T12:00:00Z`).getTime();
  return Math.round((b - a) / 86400000) + 1;
}

interface DepartmentOption {
  id: string;
  name: string;
}

export default function PayrollNewPage() {
  const { company } = useCompany();
  const router = useRouter();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [payTypeFilter, setPayTypeFilter] = useState<"" | "HOURLY" | "SALARY">("");
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [err, setErr] = useState("");
  const [pending, setPending] = useState(false);

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!company) return;
    if (daysInclusive(start, end) !== 7) {
      setErr("Period must be exactly 7 consecutive days.");
      return;
    }
    setPending(true);
    try {
      const { data } = await api.post<{ id: string }>(
        `/api/payroll/company/${company.id}`,
        {
          startDate: start,
          endDate: end,
          notes: notes.trim() || undefined,
          departmentId: departmentId || null,
          payTypeFilter: payTypeFilter || null,
        }
      );
      router.push(`/payroll/${data.id}`);
    } catch (ex: unknown) {
      const msg =
        (ex as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not create payroll";
      setErr(msg);
    } finally {
      setPending(false);
    }
  };

  if (!company) {
    return <p className="text-[var(--muted)]">Select a company.</p>;
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-2">New payroll</h1>
      <p className="text-sm text-[var(--muted)] mb-6">
        Choose dates and who to include (department and pay type).
      </p>
      <form
        onSubmit={submit}
        className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6"
      >
        {err && (
          <div className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">
            {err}
          </div>
        )}
        <div>
          <label className="text-xs text-[var(--muted)]">Start date</label>
          <input
            type="date"
            required
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-[var(--muted)]">End date</label>
          <input
            type="date"
            required
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-[var(--muted)]">Department</label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          >
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--muted)]">Include</label>
          <select
            value={payTypeFilter}
            onChange={(e) =>
              setPayTypeFilter(e.target.value as "" | "HOURLY" | "SALARY")
            }
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          >
            <option value="">All employees (hourly + salary)</option>
            <option value="HOURLY">Hourly only</option>
            <option value="SALARY">Salary only</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--muted)]">Notes (optional)</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-full btn-brand py-2.5 text-sm font-medium cursor-pointer disabled:cursor-not-allowed"
        >
          {pending ? "Creating…" : "Create & enter time"}
        </button>
      </form>
    </div>
  );
}
