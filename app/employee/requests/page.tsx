"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { axiosErrorMessage } from "@/lib/axiosErrorMessage";
import ScreenLoading from "@/components/ScreenLoading";

type LeaveType = "VACATION" | "SICK";
type LeaveStatus = "PENDING" | "REJECTED" | "AWAITING_SIGNATURE" | "COMPLETED";

interface LeaveReq {
  id: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  notes: string | null;
  status: LeaveStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  documentId: string | null;
  createdAt: string;
  company: { id: string; name: string };
}

export default function EmployeeRequestsPage() {
  const [linked, setLinked] = useState<boolean | null>(null);
  const [requests, setRequests] = useState<LeaveReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [type, setType] = useState<LeaveType>("VACATION");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data } = await api.get<{ linked: boolean; requests: LeaveReq[] }>(
        "/api/employee/leave-requests"
      );
      setLinked(data.linked);
      setRequests(data.requests);
    } catch (e) {
      setLoadError(axiosErrorMessage(e, "Could not load requests."));
      setLinked(null);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || !startDate || !endDate) return;
    setSubmitting(true);
    try {
      await api.post("/api/employee/leave-requests", {
        type,
        startDate,
        endDate,
        reason: reason.trim(),
        notes: notes.trim() || null,
      });
      setReason("");
      setNotes("");
      await load();
    } catch (err: unknown) {
      alert(axiosErrorMessage(err, "Could not submit request."));
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel = (s: LeaveStatus) => {
    switch (s) {
      case "PENDING":
        return "Pending review";
      case "REJECTED":
        return "Rejected";
      case "AWAITING_SIGNATURE":
        return "Sign approval form";
      case "COMPLETED":
        return "Completed";
      default:
        return s;
    }
  };

  if (loading) {
    return <ScreenLoading message="Loading…" subtle />;
  }

  if (loadError) {
    return (
      <div className="max-w-xl space-y-3">
        <h1 className="text-2xl font-semibold text-[var(--text)] tracking-tight">Leave requests</h1>
        <p className="text-sm text-red-600 dark:text-red-400 leading-relaxed">{loadError}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="text-sm font-medium text-[var(--accent-deep)] dark:text-[var(--accent-light)] underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (linked === false) {
    return (
      <div className="max-w-xl space-y-3">
        <h1 className="text-2xl font-semibold text-[var(--text)] tracking-tight">Leave requests</h1>
        <p className="text-sm text-[var(--muted)] leading-relaxed">
          Your account must be linked to your employee profile before you can submit leave
          requests. Ask your employer to connect your portal email on the Employees page.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text)] tracking-tight">Leave requests</h1>
        <p className="text-sm text-[var(--muted)] mt-1 leading-relaxed">
          Request vacation or sick time. When approved, you&apos;ll receive an approval form
          to review and sign—same signing experience as other documents.
        </p>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={submit}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-5 space-y-4"
      >
        <h2 className="text-sm font-medium text-[var(--text)]">New request</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as LeaveType)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            >
              <option value="VACATION">Vacation</option>
              <option value="SICK">Sick</option>
            </select>
          </div>
          <div className="hidden sm:block" />
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">Start date</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">End date</label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Reason</label>
          <textarea
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Brief reason for your request"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Anything else your manager should know"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-[var(--accent-deep)] text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit request"}
        </button>
      </motion.form>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-[var(--text)]">Your requests</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No requests yet.</p>
        ) : (
          <ul className="space-y-3">
            {requests.map((r, i) => (
              <motion.li
                key={r.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-4 space-y-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-[var(--text)]">
                      {r.type === "VACATION" ? "Vacation" : "Sick"} · {r.startDate} →{" "}
                      {r.endDate}
                    </div>
                    <div className="text-xs text-[var(--muted)] mt-0.5">{r.company.name}</div>
                  </div>
                  <span
                    className={
                      r.status === "COMPLETED"
                        ? "text-xs text-emerald-600 dark:text-emerald-400"
                        : r.status === "REJECTED"
                          ? "text-xs text-red-600 dark:text-red-400"
                          : r.status === "AWAITING_SIGNATURE"
                            ? "text-xs text-amber-700 dark:text-amber-300"
                            : "text-xs text-[var(--muted)]"
                    }
                  >
                    {statusLabel(r.status)}
                  </span>
                </div>
                <p className="text-sm text-[var(--text)]">{r.reason}</p>
                {r.notes ? (
                  <p className="text-xs text-[var(--muted)]">Notes: {r.notes}</p>
                ) : null}
                {r.status === "REJECTED" && r.reviewNote ? (
                  <p className="text-xs text-[var(--muted)]">Employer: {r.reviewNote}</p>
                ) : null}
                {r.status === "AWAITING_SIGNATURE" && r.documentId ? (
                  <Link
                    href={`/employee/documents/${r.documentId}/sign`}
                    className="inline-flex rounded-lg bg-[var(--accent-deep)] text-white px-3 py-2 text-sm font-medium"
                  >
                    Review &amp; sign approval form
                  </Link>
                ) : null}
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
