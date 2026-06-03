"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "@/lib/api";
import { useCompany } from "@/context/CompanyContext";
import { axiosErrorMessage } from "@/lib/axiosErrorMessage";
import { Pencil, Trash2, X } from "lucide-react";

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
  const [editing, setEditing] = useState<Department | null>(null);
  const [editName, setEditName] = useState("");
  const [editKind, setEditKind] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const openEdit = (d: Department) => {
    setEditing(d);
    setEditName(d.name);
    setEditKind(d.kind ?? "");
    setError(null);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !editName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/api/departments/${editing.id}`, {
        name: editName.trim(),
        kind: editKind.trim() || null,
      });
      setEditing(null);
      await load();
    } catch (err) {
      setError(axiosErrorMessage(err, "Could not update department."));
    } finally {
      setSaving(false);
    }
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
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => openEdit(d)}
                className="p-2 rounded-lg text-[var(--muted)] hover:bg-[var(--accent-muted)]/40 hover:text-[var(--text)]"
                aria-label="Edit department"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => remove(d.id)}
                className="p-2 rounded-lg text-[var(--muted)] hover:bg-red-500/10 hover:text-red-500"
                aria-label="Delete department"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.li>
        ))}
      </ul>

      {editing ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-dept-title"
        >
          <form
            onSubmit={saveEdit}
            className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-5 shadow-xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 id="edit-dept-title" className="text-lg font-semibold text-[var(--text)]">
                Edit department
              </h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="p-1 rounded-lg text-[var(--muted)] hover:bg-black/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <label className="text-sm flex flex-col gap-1.5">
              <span className="text-[var(--muted)]">Name</span>
              <input
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
              />
            </label>
            <label className="text-sm flex flex-col gap-1.5">
              <span className="text-[var(--muted)]">Type (optional)</span>
              <input
                value={editKind}
                onChange={(e) => setEditKind(e.target.value)}
                placeholder="e.g. Farm"
                className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
              />
            </label>
            {error ? (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            ) : null}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-brand px-4 py-2 text-sm font-medium rounded-lg"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
