"use client";

import { Receipt } from "lucide-react";

export default function EmployeePaystubsPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text)] tracking-tight">Paystubs</h1>
        <p className="text-sm text-[var(--muted)] mt-1 leading-relaxed">
          When your employer connects payroll to your profile, finalized paystubs will list
          here.
        </p>
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-10 flex flex-col items-center justify-center gap-3 text-center">
        <Receipt className="w-10 h-10 text-[var(--muted)]" aria-hidden />
        <p className="text-sm text-[var(--muted)]">No paystubs yet</p>
      </div>
    </div>
  );
}
