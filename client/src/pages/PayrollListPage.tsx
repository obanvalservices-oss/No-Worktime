import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/client";
import { useCompany } from "../context/CompanyContext";
import { Plus, Trash2 } from "lucide-react";

interface Run {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  _count: { lines: number };
}

export default function PayrollListPage() {
  const { company } = useCompany();
  const [runs, setRuns] = useState<Run[]>([]);

  const load = async () => {
    if (!company) return;
    const { data } = await api.get<Run[]>(
      `/api/payroll/company/${company.id}`
    );
    setRuns(data);
  };

  useEffect(() => {
    void load();
  }, [company?.id]);

  const remove = async (id: string) => {
    if (!confirm("Delete this draft payroll?")) return;
    await api.delete(`/api/payroll/${id}`);
    await load();
  };

  if (!company) {
    return <p className="text-[var(--muted)]">Select a company.</p>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Payroll runs</h1>
        <Link
          to="/payroll/new"
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New run
        </Link>
      </div>

      <ul className="space-y-2">
        {runs.map((r, i) => (
          <motion.li
            key={r.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
          >
            <Link to={`/payroll/${r.id}`} className="flex-1 min-w-0">
              <div className="font-medium">
                {r.startDate} → {r.endDate}
              </div>
              <div className="text-xs text-[var(--muted)]">
                {r.status} · {r._count.lines} employees
              </div>
            </Link>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to={`/payroll/${r.id}/report`}
                className="text-sm text-teal-600 hover:underline"
              >
                Report
              </Link>
              {r.status === "DRAFT" && (
                <button
                  type="button"
                  onClick={() => remove(r.id)}
                  className="p-2 rounded-lg text-[var(--muted)] hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.li>
        ))}
      </ul>
      {runs.length === 0 && (
        <p className="text-sm text-[var(--muted)] mt-6">No payroll runs yet.</p>
      )}
    </div>
  );
}
