"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";
import type { UserRole } from "@/lib/auth/roles";
import api from "@/lib/api";

interface User {
  id: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<User | null>;
  login: (email: string, password: string) => Promise<User>;
  register: (
    email: string,
    password: string,
    role: "EMPLOYER" | "EMPLOYEE"
  ) => Promise<{ requiresVerification: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<User | null> => {
    try {
      const { data } = await api.get<User>("/api/auth/me");
      setUser(data);
      return data;
    } catch {
      if (typeof window !== "undefined") localStorage.removeItem("token");
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = async (email: string, password: string): Promise<User> => {
    try {
      const { data } = await api.post<{
        token: string;
        user: User;
      }>("/api/auth/login", {
        email,
        password,
      });
      if (data.token) localStorage.setItem("token", data.token);
      setUser(data.user);
      return data.user;
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const msg = (e.response?.data as { message?: string })?.message;
        throw new Error(msg || "Login failed");
      }
      throw new Error("Login failed");
    }
  };

  const register = async (
    email: string,
    password: string,
    role: "EMPLOYER" | "EMPLOYEE"
  ): Promise<{ requiresVerification: boolean; message?: string }> => {
    try {
      const { data } = await api.post<{
        requiresVerification?: boolean;
        message?: string;
      }>("/api/auth/register", {
        email,
        password,
        role,
      });
      return {
        requiresVerification: data.requiresVerification !== false,
        message: data.message,
      };
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const msg = (e.response?.data as { message?: string })?.message;
        throw new Error(msg || "Registration failed");
      }
      throw new Error("Registration failed");
    }
  };

  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      /* ignore */
    }
    localStorage.removeItem("token");
    setUser(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, loading, refresh, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
