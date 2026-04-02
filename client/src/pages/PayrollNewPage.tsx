import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useCompany } from "../context/CompanyContext";

function daysInclusive(start: string, end: string): number {
  const a = new Date(`${start}T12:00:00Z`).getTime();
  const b = new Date(`${end}T12:00:00Z`).getTime();
  return Math.round((b - a) / 86400000) + 1;
}

export default function PayrollNewPage() {
  const { company } = useCompany();
  const nav = useNavigate();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");
  const [pending, setPending] = useState(false);

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
        { startDate: start, endDate: end, notes: notes.trim() || undefined }
      );
      nav(`/payroll/${data.id}`);
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
        Choose start and end dates for a 7-day work week.
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
          className="w-full rounded-lg bg-teal-600 text-white py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create & enter time"}
        </button>
      </form>
    </div>
  );
}
