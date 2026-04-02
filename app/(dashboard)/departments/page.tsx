"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { useCompany } from "@/context/CompanyContext";
import { Trash2 } from "lucide-react";

interface Department {
  id: string;
  name: string;
  kind: string | null;
  _count?: { employees: number };
}

export default function DepartmentsPage() {
  const { company } = useCompany();
  const [rows, setRows] = useState<Department[]>([]);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("");

  const load = async () => {
    if (!company) return;
    const { data } = await api.get<Department[]>(
      `/api/departments/company/${company.id}`
    );
    setRows(data);
  };

  useEffect(() => {
    void load();
  }, [company?.id]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !name.trim()) return;
    await api.post(`/api/departments/company/${company.id}`, {
      name: name.trim(),
      kind: kind.trim() || undefined,
    });
    setName("");
    setKind("");
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete department? Employees must be reassigned first.")) return;
    await api.delete(`/api/departments/${id}`);
    await load();
  };

  if (!company) {
    return <p className="text-[var(--muted)]">Select or create a company.</p>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Departments</h1>
      <p className="text-sm text-[var(--muted)] mb-4">
        Use departments for cost centers, farms, or workplaces.
      </p>

      <form
        onSubmit={add}
        className="flex flex-wrap gap-2 mb-8 rounded-xl border border-[var(--border)] p-4 bg-[var(--surface)]"
      >
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 min-w-[140px] rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
        />
        <input
          placeholder="Type (optional, e.g. Farm)"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="flex-1 min-w-[160px] rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="btn-brand px-4 py-2 text-sm font-medium"
        >
          Add
        </button>
      </form>

      <ul className="space-y-2">
        {rows.map((d, i) => (
          <motion.li
            key={d.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
          >
            <div>
              <div className="font-medium">{d.name}</div>
              <div className="text-xs text-[var(--muted)]">
                {d.kind || "Department"} · {d._count?.employees ?? 0} employees
              </div>
            </div>
            <button
              type="button"
              onClick={() => remove(d.id)}
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
