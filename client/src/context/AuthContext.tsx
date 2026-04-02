import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import axios from "axios";
import api from "../api/client";

interface User {
  id: string;
  email: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<boolean>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<boolean> => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return false;
    }
    try {
      const { data } = await api.get<User>("/api/auth/me");
      setUser(data);
      return true;
    } catch {
      localStorage.removeItem("token");
      setUser(null);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    try {
      const { data } = await api.post<{ token: string }>("/api/auth/login", {
        email,
        password,
      });
      localStorage.setItem("token", data.token);
      const ok = await refresh();
      if (!ok) throw new Error("Session could not be established");
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const msg = (e.response?.data as { message?: string })?.message;
        throw new Error(msg || "Login failed");
      }
      throw new Error("Login failed");
    }
  };

  const register = async (email: string, password: string) => {
    try {
      const { data } = await api.post<{ token: string }>("/api/auth/register", {
        email,
        password,
      });
      localStorage.setItem("token", data.token);
      const ok = await refresh();
      if (!ok) throw new Error("Session could not be established");
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const msg = (e.response?.data as { message?: string })?.message;
        throw new Error(msg || "Registration failed");
      }
      throw new Error("Registration failed");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, refresh, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
