"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { axiosErrorMessage } from "@/lib/axiosErrorMessage";

interface UserListItem {
  id: string;
  email: string;
  role: "ADMIN" | "EMPLOYER" | "EMPLOYEE";
  emailVerified: boolean;
  createdAt: string;
  _count: { companyMemberships: number };
}

interface CompanyOption {
  id: string;
  name: string;
}

interface UserProfile {
  id: string;
  email: string;
  role: "ADMIN" | "EMPLOYER" | "EMPLOYEE";
  emailVerified: boolean;
  createdAt: string;
  companyMemberships: Array<{
    id: string;
    company: { id: string; name: string; description: string | null };
  }>;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyIdToAdd, setCompanyIdToAdd] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, companiesRes] = await Promise.all([
        api.get<UserListItem[]>("/api/admin/users"),
        api.get<CompanyOption[]>("/api/admin/companies"),
      ]);
      setUsers(usersRes.data);
      setCompanies(companiesRes.data);
      const fallbackId = selectedUserId || usersRes.data[0]?.id || "";
      setSelectedUserId(fallbackId);
    } catch (err) {
      setError(axiosErrorMessage(err, "Failed to load users."));
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async (userId: string) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    try {
      const { data } = await api.get<UserProfile>(`/api/admin/users/${userId}`);
      setProfile(data);
    } catch (err) {
      setError(axiosErrorMessage(err, "Failed to load user profile."));
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadProfile(selectedUserId);
  }, [selectedUserId]);

  const assignedCompanyIds = useMemo(
    () => new Set(profile?.companyMemberships.map((m) => m.company.id) ?? []),
    [profile]
  );
  const addableCompanies = useMemo(
    () => companies.filter((c) => !assignedCompanyIds.has(c.id)),
    [companies, assignedCompanyIds]
  );

  const assignCompany = async () => {
    if (!selectedUserId || !companyIdToAdd) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/api/admin/users/${selectedUserId}/memberships`, {
        companyId: companyIdToAdd,
      });
      setCompanyIdToAdd("");
      await loadProfile(selectedUserId);
      await load();
    } catch (err) {
      setError(axiosErrorMessage(err, "Failed to assign company access."));
    } finally {
      setSaving(false);
    }
  };

  const removeCompany = async (companyId: string) => {
    if (!selectedUserId) return;
    setSaving(true);
    setError(null);
    try {
      await api.delete(`/api/admin/users/${selectedUserId}/memberships`, {
        data: { companyId },
      });
      await loadProfile(selectedUserId);
      await load();
    } catch (err) {
      setError(axiosErrorMessage(err, "Failed to remove company access."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text)]">Admin User Management</h1>
        <p className="text-sm text-[var(--muted)] mt-2">
          View users, inspect profiles, and manage company access memberships.
        </p>
      </div>

      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      <div className="grid md:grid-cols-2 gap-5">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-4">
          <h2 className="font-medium text-[var(--text)] mb-3">All users</h2>
          {loading ? (
            <p className="text-sm text-[var(--muted)]">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No users found.</p>
          ) : (
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedUserId(u.id)}
                  className={`w-full text-left rounded-lg border px-3 py-2 ${
                    selectedUserId === u.id
                      ? "border-[var(--accent)] bg-[var(--accent-muted)]/40"
                      : "border-[var(--border)] hover:bg-[var(--accent-muted)]/20"
                  }`}
                >
                  <div className="text-sm font-medium text-[var(--text)]">{u.email}</div>
                  <div className="text-xs text-[var(--muted)] mt-1">
                    {u.role} • memberships: {u._count.companyMemberships}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-solid)] p-4">
          <h2 className="font-medium text-[var(--text)] mb-3">User profile</h2>
          {!profile ? (
            <p className="text-sm text-[var(--muted)]">Select a user.</p>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-[var(--text)]">
                <div className="font-medium">{profile.email}</div>
                <div className="text-xs text-[var(--muted)] mt-1">
                  {profile.role} • {profile.emailVerified ? "Email verified" : "Email unverified"}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-[var(--text)]">Assigned companies</h3>
                {profile.companyMemberships.length === 0 ? (
                  <p className="text-sm text-[var(--muted)]">No company memberships yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {profile.companyMemberships.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2"
                      >
                        <span className="text-sm text-[var(--text)]">{m.company.name}</span>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void removeCompany(m.company.id)}
                          className="text-xs rounded-md border border-red-300 text-red-700 px-2 py-1 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-950/30"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex gap-2">
                <select
                  value={companyIdToAdd}
                  onChange={(e) => setCompanyIdToAdd(e.target.value)}
                  className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                >
                  <option value="">Select company to assign</option>
                  {addableCompanies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={saving || !companyIdToAdd}
                  onClick={() => void assignCompany()}
                  className="btn-brand px-3 py-2 rounded-lg text-sm"
                >
                  Assign
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
