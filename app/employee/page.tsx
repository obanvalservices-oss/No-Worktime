"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FileText, FolderOpen, Inbox } from "lucide-react";

const cards = [
  {
    href: "/employee/paystubs",
    title: "Paystubs",
    description: "View pay history when payroll is linked to your profile.",
    icon: FileText,
  },
  {
    href: "/employee/documents",
    title: "Documents",
    description: "Review and sign forms your employer assigns to you.",
    icon: FolderOpen,
  },
  {
    href: "/employee/requests",
    title: "Requests",
    description: "Submit vacation or sick-day leave and sign approved forms.",
    icon: Inbox,
  },
];

export default function EmployeePortalHomePage() {
  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text)] tracking-tight">
          Your portal
        </h1>
        <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed max-w-lg">
          Paystubs, assigned documents, and leave requests in one place—separate from employer
          tools.
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-1">
        {cards.map(({ href, title, description, icon: Icon }, i) => (
          <motion.li
            key={href}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Link
              href={href}
              className="block rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-5 hover:border-[var(--accent)]/40 hover:bg-[var(--accent-muted)]/20 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-[var(--accent-muted)]/40 p-3 text-[var(--accent-deep)] dark:text-[var(--accent-light)]">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-medium text-[var(--text)]">{title}</h2>
                  <p className="text-sm text-[var(--muted)] mt-1 leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            </Link>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
