"use client";

import { useAuth } from "@/context/AuthContext";
import { isAdmin } from "@/lib/auth/roles";
import { Shield, User } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();
  const admin = user && isAdmin(user.role);

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text)] tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
          {admin
            ? "Full workspace and system options."
            : "Account and workspace preferences. Sensitive system controls are limited to administrators."}
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-6 space-y-4">
        <div className="flex items-center gap-2 text-[var(--text)] font-medium">
          <User className="w-4 h-4 text-[var(--accent-deep)] dark:text-[var(--accent-light)]" />
          Account
        </div>
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-[var(--muted)]">Email</dt>
            <dd className="text-[var(--text)]">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Role</dt>
            <dd className="text-[var(--text)] capitalize">
              {user?.role?.toLowerCase()}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Email verified</dt>
            <dd className="text-[var(--text)]">
              {user?.emailVerified ? "Yes" : "No"}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-[var(--muted)] leading-relaxed pt-2 border-t border-[var(--border)]">
          Password changes and SSO can plug into this section without new routes.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-6 space-y-3">
        <h2 className="text-sm font-medium text-[var(--text)]">Workspace</h2>
        <p className="text-sm text-[var(--muted)] leading-relaxed">
          Companies, departments, employees, and payroll runs are managed from the main
          navigation. Notification defaults will live here in a later iteration.
        </p>
      </section>

      {admin ? (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-6 space-y-3">
          <div className="flex items-center gap-2 text-[var(--text)] font-medium">
            <Shield className="w-4 h-4 text-[var(--accent-deep)] dark:text-[var(--accent-light)]" />
            System administration
          </div>
          <p className="text-sm text-[var(--muted)] leading-relaxed">
            Reserved for environment-backed controls, audit logs, feature flags, and
            cross-company administration. Only admins see this block.
          </p>
        </section>
      ) : null}
    </div>
  );
}
