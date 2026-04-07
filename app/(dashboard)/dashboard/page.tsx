"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useCompany } from "@/context/CompanyContext";
import api from "@/lib/api";
import { BRAND_TAGLINE } from "@/lib/brand";
import { axiosErrorMessage } from "@/lib/axiosErrorMessage";
import {
  ArrowRight,
  Building2,
  Calculator,
  ChevronRight,
  Clock,
  Layers,
  Plus,
  Users,
  Wallet,
} from "lucide-react";

const container = {
  show: { transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

interface PayrollRun {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  _count: { lines: number };
}

export default function DashboardPage() {
  const { company, refresh } = useCompany();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);

  useEffect(() => {
    if (!company?.id) {
      setRuns([]);
      return;
    }
    let cancelled = false;
    setRunsLoading(true);
    void (async () => {
      try {
        const { data } = await api.get<PayrollRun[]>(
          `/api/payroll/company/${company.id}`
        );
        if (!cancelled) setRuns(data);
      } finally {
        if (!cancelled) setRunsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [company?.id]);

  const createCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await api.post("/api/companies", { name: name.trim() });
      setName("");
      await refresh();
    } catch (err) {
      setCreateError(axiosErrorMessage(err, "Could not create company."));
    } finally {
      setCreating(false);
    }
  };

  const depts = company?._count?.departments ?? 0;
  const emps = company?._count?.employees ?? 0;
  const draftRuns = runs.filter((r) => r.status === "DRAFT").length;
  const recentRuns = [...runs]
    .sort((a, b) => b.endDate.localeCompare(a.endDate))
    .slice(0, 4);

  const quickActions = company
    ? [
        {
          href: "/departments",
          title: "Departments",
          desc: "Organize teams and cost centers",
          icon: Building2,
        },
        {
          href: "/employees",
          title: "Employees",
          desc: "Rates, pay type, and assignments",
          icon: Users,
        },
        {
          href: "/payroll/new",
          title: "New payroll run",
          desc: "Start a 7-day time entry period",
          icon: Plus,
          accent: true,
        },
        {
          href: "/payroll",
          title: "All payroll runs",
          desc: "Open drafts, reports, and history",
          icon: Wallet,
        },
      ]
    : [];

  return (
    <div className="max-w-6xl mx-auto space-y-8 md:space-y-10">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-6 md:px-8 md:py-8 shadow-sm"
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--accent-muted)] blur-3xl opacity-80"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[var(--accent-deep)] dark:text-[var(--accent-light)] mb-1">
              Overview
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--text)]">
              {company ? company.name : "Your workspace"}
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)] max-w-xl">
              {company
                ? BRAND_TAGLINE
                : "Create a company to manage departments, employees, and weekly payroll in one place."}
            </p>
          </div>
          {company && (
            <div className="flex flex-wrap gap-2 md:justify-end">
              <Link
                href="/payroll/new"
                className="inline-flex items-center gap-2 btn-brand px-4 py-2.5 text-sm font-medium rounded-xl shadow-sm"
              >
                <Calculator className="w-4 h-4" />
                Run payroll
              </Link>
              <Link
                href="/employees"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm font-medium text-[var(--text)] hover:bg-[var(--accent-muted)]/40 transition-colors"
              >
                <Users className="w-4 h-4 text-[var(--accent-deep)] dark:text-[var(--accent-light)]" />
                Add people
              </Link>
            </div>
          )}
        </div>
      </motion.header>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {company && (
          <>
            <motion.section variants={item} className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-sm font-semibold text-[var(--text)]">
                  At a glance
                </h2>
                {runsLoading && (
                  <span className="text-xs text-[var(--muted)]">Updating…</span>
                )}
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <StatCard
                  icon={Layers}
                  label="Departments"
                  value={depts}
                  href="/departments"
                />
                <StatCard
                  icon={Users}
                  label="Employees"
                  value={emps}
                  href="/employees"
                />
                <StatCard
                  icon={Wallet}
                  label="Payroll runs"
                  value={runs.length}
                  href="/payroll"
                />
                <StatCard
                  icon={Clock}
                  label="Drafts open"
                  value={draftRuns}
                  href="/payroll"
                  hint={draftRuns > 0 ? "Needs calculate / finalize" : undefined}
                />
              </div>
            </motion.section>

            <motion.section variants={item} className="space-y-4">
              <h2 className="text-sm font-semibold text-[var(--text)]">
                Quick actions
              </h2>
              <div className="grid sm:grid-cols-2 gap-3 md:gap-4">
                {quickActions.map((a) => (
                  <Link
                    key={a.href}
                    href={a.href}
                    className={`group relative flex gap-4 rounded-2xl border p-4 md:p-5 transition-all hover:shadow-md hover:border-[var(--accent)]/35 ${
                      a.accent
                        ? "border-[var(--accent)]/25 bg-[var(--accent-muted)]/50 dark:bg-[var(--accent-muted)]/30"
                        : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--bg-elevated)]"
                    }`}
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        a.accent
                          ? "bg-[var(--accent)] text-white"
                          : "bg-[var(--accent-muted)] text-[var(--accent-deep)] dark:text-[var(--accent-light)]"
                      }`}
                    >
                      <a.icon className="w-5 h-5" />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-[var(--text)]">
                          {a.title}
                        </h3>
                        <ChevronRight className="w-4 h-4 shrink-0 text-[var(--muted)] opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted)]">{a.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.section>

            <motion.section
              variants={item}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-5 border-b border-[var(--border)] bg-[var(--bg)]/50">
                <h2 className="text-sm font-semibold text-[var(--text)]">
                  Recent payroll
                </h2>
                <Link
                  href="/payroll"
                  className="text-xs font-medium link-brand inline-flex items-center gap-1"
                >
                  View all
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {recentRuns.length === 0 ? (
                <div className="px-4 py-10 md:px-5 text-center">
                  <p className="text-sm text-[var(--muted)] mb-4">
                    No payroll runs yet for this company.
                  </p>
                  <Link
                    href="/payroll/new"
                    className="inline-flex items-center gap-2 btn-brand px-4 py-2 text-sm font-medium rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                    Create first run
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {recentRuns.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/payroll/${r.id}`}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-5 hover:bg-[var(--accent-muted)]/25 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-sm text-[var(--text)]">
                            {r.startDate}{" "}
                            <span className="text-[var(--muted)] font-normal">
                              →
                            </span>{" "}
                            {r.endDate}
                          </div>
                          <div className="text-xs text-[var(--muted)] mt-0.5">
                            {r._count.lines} people on this run
                          </div>
                        </div>
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${
                            r.status === "DRAFT"
                              ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
                              : "bg-[var(--accent-muted)] text-[var(--accent-deep)] dark:text-[var(--accent-light)]"
                          }`}
                        >
                          {r.status === "DRAFT" ? "Draft" : "Finalized"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </motion.section>
          </>
        )}

        <motion.section
          variants={item}
          className={`rounded-2xl border border-[var(--border)] p-5 md:p-6 ${
            company ? "bg-[var(--surface)]" : "bg-[var(--surface)] shadow-sm"
          }`}
        >
          <h2 className="font-medium mb-1 flex items-center gap-2 text-[var(--text)]">
            <Plus className="w-4 h-4 text-[var(--accent-deep)] dark:text-[var(--accent-light)]" />
            {company ? "Add another company" : "Create your first company"}
          </h2>
          <p className="text-sm text-[var(--muted)] mb-4">
            {company
              ? "Switch between companies from the header anytime."
              : "You’ll unlock departments, employees, and payroll after this step."}
          </p>
          {createError ? (
            <p className="text-sm text-red-600 dark:text-red-400 mb-3" role="alert">
              {createError}
            </p>
          ) : null}
          <form onSubmit={createCompany} className="flex gap-2 flex-wrap">
            <input
              placeholder="Company name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 min-w-[200px] rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm"
            />
            <button
              type="submit"
              disabled={creating}
              className="btn-brand px-5 py-2.5 text-sm font-medium rounded-xl"
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </form>
        </motion.section>
      </motion.div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
  hint,
}: {
  icon: typeof Building2;
  label: string;
  value: number;
  href: string;
  hint?: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-5 hover:border-[var(--accent)]/30 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-[var(--accent-deep)] dark:text-[var(--accent-light)]">
          <Icon className="w-4 h-4" />
        </span>
        <ArrowRight className="w-4 h-4 text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
      <div className="text-2xl md:text-3xl font-semibold tabular-nums text-[var(--text)]">
        {value}
      </div>
      <div className="text-xs font-medium text-[var(--muted)] mt-1">{label}</div>
      {hint && (
        <div className="text-[11px] text-[var(--accent-deep)] dark:text-[var(--accent-light)] mt-2 leading-snug">
          {hint}
        </div>
      )}
    </Link>
  );
}
