"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  FileText,
  FolderOpen,
  Inbox,
  LayoutGrid,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import clsx from "clsx";
import BrandLogo from "./BrandLogo";
import Wordmark from "./Wordmark";

const nav = [
  { href: "/employee", label: "Home", icon: LayoutGrid, end: true },
  { href: "/employee/paystubs", label: "Paystubs", icon: FileText },
  { href: "/employee/documents", label: "Documents", icon: FolderOpen },
  { href: "/employee/requests", label: "Requests", icon: Inbox },
];

export default function EmployeeShell({ children }: { children: React.ReactNode }) {
  const { logout, user } = useAuth();
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
          href="/employee"
          className="flex items-center gap-2.5 min-w-0 rounded-xl p-1 -m-1 hover:bg-[var(--accent-muted)]/50 transition-colors"
        >
          <BrandLogo size={42} />
          <Wordmark size="sm" className="leading-tight min-w-0 max-[380px]:hidden" />
        </Link>
        <p className="hidden md:block text-[10px] uppercase tracking-wider text-[var(--muted)] px-1">
          Employee portal
        </p>
        <nav className="flex md:flex-col gap-1 flex-1 md:flex-none overflow-x-auto">
          {nav.map(({ href, label, icon: Icon, end }) => {
            const isActive = end
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
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
          <div className="flex-1 min-w-[120px]" aria-hidden />
          <span className="text-sm text-[var(--muted)] truncate max-w-[min(100%,280px)] flex flex-col items-end gap-0.5 text-right">
            <span className="truncate">{user?.email}</span>
            <span className="text-[10px] uppercase tracking-wide text-[var(--accent-deep)] dark:text-[var(--accent-light)]">
              Employee
            </span>
          </span>
          <button
            type="button"
            onClick={() => void logout()}
            className="flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--text)] px-2 py-1.5 rounded-lg"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign out
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
