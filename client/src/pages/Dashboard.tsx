import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useCompany } from "../context/CompanyContext";
import api from "../api/client";
import { ArrowRight, Plus } from "lucide-react";

const container = {
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const { company, refresh } = useCompany();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const createCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await api.post("/api/companies", { name: name.trim() });
      setName("");
      await refresh();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Dashboard</h1>
      <p className="text-[var(--muted)] text-sm mb-8">
        Select a company, set up departments and employees, then run a weekly
        payroll.
      </p>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        <motion.section
          variants={item}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <h2 className="font-medium mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4" /> New company
          </h2>
          <form onSubmit={createCompany} className="flex gap-2 flex-wrap">
            <input
              placeholder="Company name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 min-w-[200px] rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              Create
            </button>
          </form>
        </motion.section>

        {company && (
          <>
            <motion.section
              variants={item}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <h2 className="font-medium mb-2">Current: {company.name}</h2>
              <p className="text-sm text-[var(--muted)] mb-4">
                {company._count?.departments ?? 0} departments ·{" "}
                {company._count?.employees ?? 0} employees
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  to="/departments"
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3 text-sm hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
                >
                  1. Departments
                  <ArrowRight className="w-4 h-4 text-[var(--muted)]" />
                </Link>
                <Link
                  to="/employees"
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3 text-sm hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
                >
                  2. Employees
                  <ArrowRight className="w-4 h-4 text-[var(--muted)]" />
                </Link>
                <Link
                  to="/payroll/new"
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3 text-sm hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
                >
                  3. Run payroll (7-day period)
                  <ArrowRight className="w-4 h-4 text-[var(--muted)]" />
                </Link>
                <Link
                  to="/payroll"
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3 text-sm hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
                >
                  All payroll runs
                  <ArrowRight className="w-4 h-4 text-[var(--muted)]" />
                </Link>
              </div>
            </motion.section>
          </>
        )}

        {!company && (
          <motion.p variants={item} className="text-sm text-[var(--muted)]">
            Create a company above to unlock the workflow.
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
