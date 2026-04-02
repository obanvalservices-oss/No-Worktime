import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "../api/client";
import { useCompany } from "../context/CompanyContext";
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
          onChange={(e) =>
            setPayType(e.target.value as "HOURLY" | "SALARY")
          }
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
          className="rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-medium sm:col-span-2"
        >
          Add employee
        </button>
      </form>

      <ul className="space-y-2">
        {rows.map((emp, i) => (
          <motion.li
            key={emp.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
          >
            <div>
              <div className="font-medium">{emp.name}</div>
              <div className="text-xs text-[var(--muted)]">
                {emp.department.name} · {emp.payType}
                {emp.payType === "HOURLY"
                  ? ` · $${emp.hourlyRate}/hr`
                  : ` · $${emp.weeklyBaseSalary}/wk`}
              </div>
            </div>
            <button
              type="button"
              onClick={() => remove(emp.id)}
              className="p-2 rounded-lg text-[var(--muted)] hover:bg-red-500/10 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
