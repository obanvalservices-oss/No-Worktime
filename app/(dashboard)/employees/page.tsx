"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { useCompany } from "@/context/CompanyContext";
import { Trash2 } from "lucide-react";

interface Department {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  payType: "HOURLY" | "SALARY";
  hourlyRate: number | null;
  weeklyBaseSalary: number | null;
  department: Department;
  user: { id: string; email: string } | null;
}

function EmployeeRow({
  emp,
  delay,
  onUnlinkOrLink,
  onRemove,
}: {
  emp: Employee;
  delay: number;
  onUnlinkOrLink: () => void;
  onRemove: () => void;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const link = async () => {
    if (!email.trim()) return;
    setBusy(true);
    try {
      await api.post(`/api/employees/${emp.id}/link-portal`, {
        email: email.trim(),
      });
      setEmail("");
      onUnlinkOrLink();
    } catch (e: unknown) {
      const msg =
        axios.isAxiosError(e) &&
        (e.response?.data as { message?: string })?.message
          ? (e.response?.data as { message?: string }).message
          : "Link failed";
      alert(msg);
    } finally {
      setBusy(false);
    }
  };

  const unlink = async () => {
    if (!confirm("Remove portal access for this employee?")) return;
    setBusy(true);
    try {
      await api.post(`/api/employees/${emp.id}/unlink-portal`);
      onUnlinkOrLink();
    } catch (e: unknown) {
      const msg =
        axios.isAxiosError(e) &&
        (e.response?.data as { message?: string })?.message
          ? (e.response?.data as { message?: string }).message
          : "Unlink failed";
      alert(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
    >
      <div className="min-w-0 flex-1">
        <div className="font-medium">{emp.name}</div>
        <div className="text-xs text-[var(--muted)]">
          {emp.department.name} · {emp.payType}
          {emp.payType === "HOURLY"
            ? ` · $${emp.hourlyRate}/hr`
            : ` · $${emp.weeklyBaseSalary}/wk`}
        </div>
        <div className="mt-2 text-xs space-y-1">
          {emp.user ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[var(--muted)]">Portal:</span>
              <span className="text-[var(--text)] break-all">{emp.user.email}</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => void unlink()}
                className="text-amber-700 dark:text-amber-300 hover:underline disabled:opacity-50"
              >
                Unlink
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-2">
              <span className="text-[var(--muted)] shrink-0">Portal link</span>
              <input
                type="email"
                placeholder="employee@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 min-w-[180px] rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-xs"
              />
              <button
                type="button"
                disabled={busy || !email.trim()}
                onClick={() => void link()}
                className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs font-medium hover:bg-[var(--accent-muted)]/30 disabled:opacity-50"
              >
                Link
              </button>
            </div>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-2 rounded-lg text-[var(--muted)] hover:bg-red-500/10 hover:text-red-500 self-start"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.li>
  );
}

export default function EmployeesPage() {
  const { company } = useCompany();
  const [depts, setDepts] = useState<Department[]>([]);
  const [rows, setRows] = useState<Employee[]>([]);
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [payType, setPayType] = useState<"HOURLY" | "SALARY">("HOURLY");
  const [hourlyRate, setHourlyRate] = useState("");
  const [weeklySalary, setWeeklySalary] = useState("");

  const loadDepts = async () => {
    if (!company) return;
    const { data } = await api.get<Department[]>(
      `/api/departments/company/${company.id}`
    );
    setDepts(data);
    if (data.length && !departmentId) setDepartmentId(data[0].id);
  };

  const loadEmployees = async () => {
    if (!company) return;
    const { data } = await api.get<Employee[]>(
      `/api/employees/company/${company.id}`
    );
    setRows(data);
  };

  useEffect(() => {
    void loadDepts();
  }, [company?.id]);

  useEffect(() => {
    void loadEmployees();
  }, [company?.id]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !name.trim() || !departmentId) return;
    const body: Record<string, unknown> = {
      departmentId,
      name: name.trim(),
      payType,
    };
    if (payType === "HOURLY") {
      body.hourlyRate = Number(hourlyRate);
    } else {
      body.weeklyBaseSalary = Number(weeklySalary);
    }
    await api.post(`/api/employees/company/${company.id}`, body);
    setName("");
    setHourlyRate("");
    setWeeklySalary("");
    await loadEmployees();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete employee?")) return;
    await api.delete(`/api/employees/${id}`);
    await loadEmployees();
  };

  if (!company) {
    return <p className="text-[var(--muted)]">Select or create a company.</p>;
  }

  if (depts.length === 0) {
    return (
      <p className="text-[var(--muted)]">
        Add at least one department before adding employees.
      </p>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Employees</h1>

      <form
        onSubmit={add}
        className="grid gap-3 sm:grid-cols-2 mb-8 rounded-xl border border-[var(--border)] p-4 bg-[var(--surface)]"
      >
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm sm:col-span-2"
        />
        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
        >
          {depts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={payType}
          onChange={(e) => setPayType(e.target.value as "HOURLY" | "SALARY")}
          className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
        >
          <option value="HOURLY">Hourly</option>
          <option value="SALARY">Salary (weekly)</option>
        </select>
        {payType === "HOURLY" ? (
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Hourly rate"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm sm:col-span-2"
          />
        ) : (
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Default weekly gross"
            value={weeklySalary}
            onChange={(e) => setWeeklySalary(e.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm sm:col-span-2"
          />
        )}
        <button
          type="submit"
          className="btn-brand px-4 py-2 text-sm font-medium sm:col-span-2"
        >
          Add employee
        </button>
      </form>

      <ul className="space-y-2">
        {rows.map((emp, i) => (
          <EmployeeRow
            key={emp.id}
            emp={emp}
            delay={i * 0.03}
            onUnlinkOrLink={() => void loadEmployees()}
            onRemove={() => remove(emp.id)}
          />
        ))}
      </ul>
    </div>
  );
}
