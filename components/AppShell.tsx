"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Building2,
  Users,
  Wallet,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { useCompany } from "@/context/CompanyContext";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import clsx from "clsx";
import RequireAuth from "./RequireAuth";
import BrandLogo from "./BrandLogo";
import Wordmark from "./Wordmark";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/departments", label: "Departments", icon: Building2 },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/payroll", label: "Payroll", icon: Wallet },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <AppShellInner>{children}</AppShellInner>
    </RequireAuth>
  );
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const { logout, user } = useAuth();
  const { companies, company, setCompanyId, loading } = useCompany();
  const pathname = usePathname();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="no-print border-b md:border-b-0 md:border-r border-[var(--border)] md:w-56 shrink-0 p-4 flex flex-row md:flex-col gap-4 md:gap-6 bg-[var(--surface)] backdrop-blur-md">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 min-w-0 rounded-xl p-1 -m-1 hover:bg-[var(--accent-muted)]/50 transition-colors"
        >
          <BrandLogo size={42} />
          <Wordmark size="sm" className="leading-tight min-w-0 max-[380px]:hidden" />
        </Link>
        <nav className="flex md:flex-col gap-1 flex-1 md:flex-none overflow-x-auto">
          {nav.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-[var(--accent-muted)] text-[var(--accent-deep)] dark:text-[var(--accent-light)]"
                    : "text-[var(--muted)] hover:bg-black/5 dark:hover:bg-white/5"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => setDark((d) => !d)}
          className="hidden md:flex items-center gap-2 px-3 py-2 text-sm text-[var(--muted)] rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          Theme
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="no-print border-b border-[var(--border)] px-4 py-3 flex flex-wrap items-center gap-3 bg-[var(--surface)] backdrop-blur-md">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <label className="text-xs text-[var(--muted)] shrink-0">Company</label>
            <select
              className="flex-1 max-w-xs rounded-lg border border-[var(--border)] bg-[var(--surface-solid)] px-3 py-2 text-sm"
              value={company?.id ?? ""}
              disabled={loading || companies.length === 0}
              onChange={(e) => setCompanyId(e.target.value || null)}
            >
              {companies.length === 0 ? (
                <option value="">Create a company first</option>
              ) : (
                companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <span className="text-sm text-[var(--muted)] truncate max-w-[200px]">
            {user?.email}
          </span>
          <button
            type="button"
            onClick={() => void logout()}
            className="flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--text)] px-2 py-1 rounded-lg"
          >
            <LogOut className="w-4 h-4" />
            Out
          </button>
        </header>

        <motion.main
          className="flex-1 p-4 md:p-8 overflow-auto"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
}
