"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import axios from "axios";
import { useCompany } from "@/context/CompanyContext";
import { openAuthBlobUrl } from "@/lib/openAuthBlob";
import { axiosErrorMessage } from "@/lib/axiosErrorMessage";

type LeaveType = "VACATION" | "SICK";
type LeaveStatus = "PENDING" | "REJECTED" | "AWAITING_SIGNATURE" | "COMPLETED";

interface LeaveRow {
  id: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  notes: string | null;
  status: LeaveStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  employee: { id: string; name: string };
  reviewedBy: { id: string; email: string } | null;
  document: {
    id: string;
    title: string;
    status: "PENDING_SIGNATURE" | "SIGNED";
    signedAt: string | null;
  } | null;
}

interface EmpOpt {
  id: string;
  name: string;
}

export default function EmployerLeaveRequestsPage() {
  const { company } = useCompany();
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [employees, setEmployees] = useState<EmpOpt[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [employeesError, setEmployeesError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [filterType, setFilterType] = useState<"" | LeaveType>("");
  const [filterStatus, setFilterStatus] = useState<"" | LeaveStatus>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (filterEmployeeId) p.set("employeeId", filterEmployeeId);
    if (filterType) p.set("type", filterType);
    if (filterStatus) p.set("status", filterStatus);
    if (dateFrom) p.set("dateFrom", dateFrom);
    if (dateTo) p.set("dateTo", dateTo);
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [filterEmployeeId, filterType, filterStatus, dateFrom, dateTo]);

  const loadEmployees = async () => {
    if (!company) return;
    setEmployeesError(null);
    try {
      const { data } = await api.get<EmpOpt[]>(`/api/employees/company/${company.id}`);
      setEmployees(data.map((e) => ({ id: e.id, name: e.name })));
    } catch (e) {
      setEmployeesError(axiosErrorMessage(e, "Could not load employees."));
      setEmployees([]);
    }
  };

  const loadRows = async () => {
    if (!company) return;
    setLoading(true);
    setFetchError(null);
    try {
      const { data } = await api.get<LeaveRow[]>(
        `/api/companies/${company.id}/leave-requests${query}`
      );
      setRows(data);
    } catch (e) {
      setFetchError(axiosErrorMessage(e, "Could not load leave requests."));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEmployees();
  }, [company?.id]);

  useEffect(() => {
    void loadRows();
  }, [company?.id, query]);

  const approve = async (id: string) => {
    if (!company) return;
    if (!confirm("Approve this request and generate the signing form for the employee?")) return;
    setBusyId(id);
    try {
      await api.patch(`/api/companies/${company.id}/leave-requests/${id}`, {
        action: "approve",
      });
      await loadRows();
    } catch (e: unknown) {
      const msg =
        axios.isAxiosError(e) &&
        (e.response?.data as { message?: string })?.message
          ? String((e.response?.data as { message?: string }).message)
          : "Could not approve";
      alert(msg);
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    if (!company) return;
    const note = window.prompt("Optional message to the employee (leave empty for none)") ?? "";
    setBusyId(id);
    try {
      await api.patch(`/api/companies/${company.id}/leave-requests/${id}`, {
        action: "reject",
        reviewNote: note.trim() || undefined,
      });
      await loadRows();
    } catch (e: unknown) {
      const msg =
        axios.isAxiosError(e) &&
        (e.response?.data as { message?: string })?.message
          ? String((e.response?.data as { message?: string }).message)
          : "Could not reject";
      alert(msg);
    } finally {
      setBusyId(null);
    }
  };

  const statusLabel = (s: LeaveStatus) => {
    switch (s) {
      case "PENDING":
        return "Pending";
      case "REJECTED":
        return "Rejected";
      case "AWAITING_SIGNATURE":
        return "Awaiting signature";
      case "COMPLETED":
        return "Completed";
      default:
        return s;
    }
  };

  if (!company) {
    return (
      <p className="text-sm text-[var(--muted)] leading-relaxed max-w-lg">
        Select a company in the header, or create one from the dashboard, to review leave requests.
      </p>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text)] tracking-tight">Leave requests</h1>
        <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
          Review vacation and sick-day requests. Approving generates a PDF for the employee
          to sign in their portal (same flow as other documents). Completed requests are
          stored with the signed form under Documents.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
      >
        <div>
          <label className="block text-[10px] uppercase text-[var(--muted)] mb-1">
            Employee
          </label>
          <select
            value={filterEmployeeId}
            onChange={(e) => setFilterEmployeeId(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm min-w-[140px]"
          >
            <option value="">All</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase text-[var(--muted)] mb-1">Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as "" | LeaveType)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="VACATION">Vacation</option>
            <option value="SICK">Sick</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase text-[var(--muted)] mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as "" | LeaveStatus)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="AWAITING_SIGNATURE">Awaiting signature</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] uppercase text-[var(--muted)] mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase text-[var(--muted)] mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm"
          />
        </div>
      </motion.div>

      {employeesError ? (
        <p className="text-sm text-amber-700 dark:text-amber-300" role="status">
          {employeesError}
        </p>
      ) : null}
      {fetchError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {fetchError}
        </p>
      ) : null}

      <div className="rounded-xl border border-[var(--border)] overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-[var(--surface)] text-left text-[var(--muted)]">
            <tr>
              <th className="p-3 font-medium">Employee</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Dates</th>
              <th className="p-3 font-medium">Reason</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-[var(--muted)]">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-[var(--muted)]">
                  No requests match these filters.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-[var(--border)] align-top">
                  <td className="p-3 font-medium text-[var(--text)]">{r.employee.name}</td>
                  <td className="p-3">
                    {r.type === "VACATION" ? "Vacation" : "Sick"}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {r.startDate} → {r.endDate}
                  </td>
                  <td className="p-3 max-w-[220px]">
                    <span className="line-clamp-3" title={r.reason}>
                      {r.reason}
                    </span>
                    {r.notes ? (
                      <div className="text-[10px] text-[var(--muted)] mt-1 line-clamp-2" title={r.notes ?? ""}>
                        Notes: {r.notes}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-3">
                    <div>{statusLabel(r.status)}</div>
                    {r.status === "REJECTED" && r.reviewNote ? (
                      <div className="text-[10px] text-[var(--muted)] mt-1">{r.reviewNote}</div>
                    ) : null}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col gap-2 items-start">
                      {r.status === "PENDING" ? (
                        <>
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => void approve(r.id)}
                            className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => void reject(r.id)}
                            className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                      {r.document && r.status !== "PENDING" && r.status !== "REJECTED" ? (
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              void openAuthBlobUrl(
                                `/api/companies/${company.id}/documents/${r.document!.id}/file?part=original`
                              )
                            }
                            className="text-xs text-[var(--accent-deep)] dark:text-[var(--accent-light)] hover:underline"
                          >
                            Form (PDF)
                          </button>
                          {r.document.status === "SIGNED" ? (
                            <button
                              type="button"
                              onClick={() =>
                                void openAuthBlobUrl(
                                  `/api/companies/${company.id}/documents/${r.document!.id}/file?part=signature`
                                )
                              }
                              className="text-xs text-[var(--accent-deep)] dark:text-[var(--accent-light)] hover:underline"
                            >
                              Signature
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
