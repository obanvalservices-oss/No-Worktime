"use client";

import Link from "next/link";
import { FileBarChart, ChevronRight } from "lucide-react";

const reports = [
  {
    href: "/reports/invoice",
    title: "Invoicing Report",
    description:
      "Date range report by department: employees by week (reg/OT hours and pay), optional commission.",
  },
];

export default function ReportsPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text)] tracking-tight">Reports</h1>
        <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
          Generate printable reports from finalized payroll data.
        </p>
      </div>

      <ul className="space-y-3">
        {reports.map((r) => (
          <li key={r.href}>
            <Link
              href={r.href}
              className="group flex gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 hover:border-[var(--accent)]/35 hover:shadow-sm transition-all"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent-deep)] dark:text-[var(--accent-light)]">
                <FileBarChart className="w-5 h-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-medium text-[var(--text)]">{r.title}</h2>
                  <ChevronRight className="w-4 h-4 shrink-0 text-[var(--muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="mt-1 text-sm text-[var(--muted)] leading-relaxed">{r.description}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
