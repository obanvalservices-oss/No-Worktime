"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import api from "@/lib/api";
import { canManageCompany } from "@/lib/auth/roles";
import { useAuth } from "./AuthContext";

export interface Company {
  id: string;
  name: string;
  description: string | null;
  _count?: { departments: number; employees: number };
}

interface CompanyContextValue {
  companies: Company[];
  company: Company | null;
  setCompanyId: (id: string | null) => void;
  refresh: () => Promise<void>;
  loading: boolean;
}

const CompanyContext = createContext<CompanyContextValue | null>(null);

const KEY = "payroll_company_id";

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyIdState] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem(KEY) : null
  );
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || !canManageCompany(user.role)) {
      setCompanies([]);
      setCompanyIdState(null);
      localStorage.removeItem(KEY);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get<Company[]>("/api/companies");
      setCompanies(data);
      const saved = localStorage.getItem(KEY);
      const next = data.find((c) => c.id === saved)?.id ?? data[0]?.id ?? null;
      setCompanyIdState(next);
      if (next) localStorage.setItem(KEY, next);
      else localStorage.removeItem(KEY);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setCompanyId = (id: string | null) => {
    setCompanyIdState(id);
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  };

  const company = companies.find((c) => c.id === companyId) ?? null;

  return (
    <CompanyContext.Provider
      value={{ companies, company, setCompanyId, refresh, loading }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany outside provider");
  return ctx;
}
