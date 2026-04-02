import { Outlet, NavLink } from "react-router-dom";
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
import { useCompany } from "../context/CompanyContext";
import { useAuth } from "../context/AuthContext";
import { useEffect, useState } from "react";
import clsx from "clsx";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/departments", label: "Departments", icon: Building2 },
  { to: "/employees", label: "Employees", icon: Users },
  { to: "/payroll", label: "Payroll", icon: Wallet },
];

export default function Layout() {
  const { logout, user } = useAuth();
  const { companies, company, setCompanyId, loading } = useCompany();
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="no-print border-b md:border-b-0 md:border-r border-[var(--border)] md:w-56 shrink-0 p-4 flex flex-row md:flex-col gap-4 md:gap-6 bg-[var(--surface)]">
        <div className="font-semibold text-lg tracking-tight text-[var(--accent)]">
          Payroll
        </div>
        <nav className="flex md:flex-col gap-1 flex-1 md:flex-none overflow-x-auto">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                    : "text-[var(--muted)] hover:bg-black/5 dark:hover:bg-white/5"
                )
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
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
        <header className="no-print border-b border-[var(--border)] px-4 py-3 flex flex-wrap items-center gap-3 bg-[var(--surface)]">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <label className="text-xs text-[var(--muted)] shrink-0">Company</label>
            <select
              className="flex-1 max-w-xs rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
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
            onClick={() => logout()}
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
          <Outlet />
        </motion.main>
      </div>
    </div>
  );
}
