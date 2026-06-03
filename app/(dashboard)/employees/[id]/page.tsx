"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import api from "@/lib/api";
import { axiosErrorMessage } from "@/lib/axiosErrorMessage";

interface Department {
  id: string;
  name: string;
}

interface EmployeeDetail {
  id: string;
  name: string;
  payType: "HOURLY" | "SALARY";
  hourlyRate: number | null;
  weeklyBaseSalary: number | null;
  overtimeThreshold: number;
  overtimeMultiplier: number;
  isActive: boolean;
  inactiveAt: string | null;
  department: Department;
  company: { id: string; name: string };
  user: { id: string; email: string } | null;
}

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;
  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [payType, setPayType] = useState<"HOURLY" | "SALARY">("HOURLY");
  const [hourlyRate, setHourlyRate] = useState("");
  const [weeklySalary, setWeeklySalary] = useState("");
  const [overtimeThreshold, setOvertimeThreshold] = useState("40");
  const [overtimeMultiplier, setOvertimeMultiplier] = useState("1.5");
  const [isActive, setIsActive] = useState(true);
  const [inactiveAt, setInactiveAt] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [portalEmail, setPortalEmail] = useState("");
  const [portalUser, setPortalUser] = useState<{ id: string; email: string } | null>(
    null
  );

  const applyEmployee = (data: EmployeeDetail) => {
    setName(data.name);
    setDepartmentId(data.department.id);
    setPayType(data.payType);
    setHourlyRate(data.hourlyRate != null ? String(data.hourlyRate) : "");
    setWeeklySalary(data.weeklyBaseSalary != null ? String(data.weeklyBaseSalary) : "");
    setOvertimeThreshold(String(data.overtimeThreshold));
    setOvertimeMultiplier(String(data.overtimeMultiplier));
    setIsActive(data.isActive);
    setInactiveAt(data.inactiveAt ?? new Date().toISOString().slice(0, 10));
    setPortalUser(data.user);
  };

  const reloadEmployee = async () => {
    const { data } = await api.get<EmployeeDetail>(`/api/employees/${employeeId}`);
    applyEmployee(data);
  };

  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get<EmployeeDetail>(`/api/employees/${employeeId}`);
        if (cancelled) return;
        applyEmployee(data);
        const companyId = data.company.id;
        const deptRes = await api.get<Department[]>(
          `/api/departments/company/${companyId}`
        );
        if (!cancelled) setDepts(deptRes.data);
      } catch (err) {
        if (!cancelled) {
          setError(axiosErrorMessage(err, "Could not load employee."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !departmentId) return;
    setSaving(true);
    setError(null);
    setMsg(null);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        departmentId,
        payType,
        isActive,
        inactiveAt: isActive ? null : inactiveAt,
        overtimeThreshold: Number(overtimeThreshold),
        overtimeMultiplier: Number(overtimeMultiplier),
      };
      if (payType === "HOURLY") {
        body.hourlyRate = Number(hourlyRate);
        body.weeklyBaseSalary = null;
      } else {
        body.weeklyBaseSalary = Number(weeklySalary);
        body.hourlyRate = null;
      }
      await api.patch(`/api/employees/${employeeId}`, body);
      setMsg("Profile saved.");
      router.refresh();
    } catch (err) {
      setError(axiosErrorMessage(err, "Could not save employee."));
    } finally {
      setSaving(false);
    }
  };

  const linkPortal = async () => {
    if (!portalEmail.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/api/employees/${employeeId}/link-portal`, {
        email: portalEmail.trim(),
      });
      setPortalEmail("");
      setMsg("Portal account linked.");
      await reloadEmployee();
    } catch (err) {
      setError(
        axios.isAxiosError(err)
          ? (err.response?.data as { message?: string })?.message || "Link failed"
          : "Link failed"
      );
    } finally {
      setSaving(false);
    }
  };

  const unlinkPortal = async () => {
    if (!confirm("Remove portal access for this employee?")) return;
    setSaving(true);
    try {
      await api.post(`/api/employees/${employeeId}/unlink-portal`);
      setMsg("Portal unlinked.");
      await reloadEmployee();
    } catch (err) {
      setError(axiosErrorMessage(err, "Could not unlink portal."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-[var(--muted)]">Loading…</p>;
  }

  if (error && !name) {
    return (
      <div className="max-w-xl space-y-4">
        <Link href="/employees" className="text-sm link-brand hover:underline">
          ← Employees
        </Link>
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <Link href="/employees" className="text-sm link-brand hover:underline">
          ← Employees
        </Link>
        <h1 className="text-2xl font-semibold mt-4 text-[var(--text)]">Edit employee</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Update roster details, department, and pay settings.
        </p>
      </div>

      <form
        onSubmit={save}
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4"
      >
        <label className="text-sm flex flex-col gap-1.5">
          <span className="text-[var(--muted)]">Name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
          />
        </label>

        <label className="text-sm flex flex-col gap-1.5">
          <span className="text-[var(--muted)]">Department</span>
          <select
            required
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
          >
            {depts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm flex flex-col gap-1.5">
          <span className="text-[var(--muted)]">Pay type</span>
          <select
            value={payType}
            onChange={(e) => setPayType(e.target.value as "HOURLY" | "SALARY")}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
          >
            <option value="HOURLY">Hourly</option>
            <option value="SALARY">Salary (weekly)</option>
          </select>
        </label>

        {payType === "HOURLY" ? (
          <>
            <label className="text-sm flex flex-col gap-1.5">
              <span className="text-[var(--muted)]">Hourly rate ($)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
              />
            </label>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="text-sm flex flex-col gap-1.5">
                <span className="text-[var(--muted)]">OT threshold (hours)</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={overtimeThreshold}
                  onChange={(e) => setOvertimeThreshold(e.target.value)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
                />
              </label>
              <label className="text-sm flex flex-col gap-1.5">
                <span className="text-[var(--muted)]">OT multiplier</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={overtimeMultiplier}
                  onChange={(e) => setOvertimeMultiplier(e.target.value)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
                />
              </label>
            </div>
          </>
        ) : (
          <label className="text-sm flex flex-col gap-1.5">
            <span className="text-[var(--muted)]">Weekly base salary ($)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={weeklySalary}
              onChange={(e) => setWeeklySalary(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
            />
          </label>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-[var(--border)]"
          />
          <span className="text-[var(--text)]">Active on payroll roster</span>
        </label>
        {!isActive ? (
          <label className="text-sm flex flex-col gap-1.5">
            <span className="text-[var(--muted)]">Inactive as of</span>
            <input
              type="date"
              required
              value={inactiveAt}
              onChange={(e) => setInactiveAt(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 max-w-xs"
            />
            <span className="text-xs text-[var(--muted)] leading-relaxed">
              Past payroll runs and reports before this date are unchanged. New payroll
              runs will not include this employee until reactivated.
            </span>
          </label>
        ) : null}

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        {msg ? <p className="text-sm text-brand-msg">{msg}</p> : null}

        <button
          type="submit"
          disabled={saving}
          className="btn-brand w-full sm:w-auto px-6 py-2.5 text-sm font-medium rounded-xl"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
        <h2 className="text-sm font-medium text-[var(--text)]">Employee portal</h2>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          Link an EMPLOYEE account so they can access documents and leave requests.
        </p>
        {portalUser ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-[var(--muted)]">Linked:</span>
            <span className="text-[var(--text)] break-all">{portalUser.email}</span>
            <button
              type="button"
              disabled={saving}
              onClick={() => void unlinkPortal()}
              className="text-amber-700 dark:text-amber-300 hover:underline disabled:opacity-50"
            >
              Unlink
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            <input
              type="email"
              placeholder="employee@email.com"
              value={portalEmail}
              onChange={(e) => setPortalEmail(e.target.value)}
              className="flex-1 min-w-[200px] rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={saving || !portalEmail.trim()}
              onClick={() => void linkPortal()}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[var(--accent-muted)]/30 disabled:opacity-50"
            >
              Link account
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
