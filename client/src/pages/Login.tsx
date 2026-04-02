import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

interface AuthConfig {
  googleEnabled: boolean;
  allowRegister: boolean;
}

export default function Login() {
  const { user, loading, login, register } = useAuth();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [pending, setPending] = useState(false);
  const [cfg, setCfg] = useState<AuthConfig | null>(null);

  useEffect(() => {
    const qErr = params.get("error");
    if (qErr) {
      const labels: Record<string, string> = {
        google_failed: "Google sign-in was cancelled or failed.",
        google_unconfigured: "Google sign-in is not configured.",
        missing_token: "Missing token after sign-in.",
        invalid_token: "Could not validate session.",
      };
      setErr(labels[qErr] ?? qErr);
    }
  }, [params]);

  useEffect(() => {
    void fetch("/api/auth/config")
      .then((r) => r.json())
      .then((data: AuthConfig) => setCfg(data))
      .catch(() => setCfg({ googleEnabled: false, allowRegister: false }));
  }, []);

  useEffect(() => {
    if (cfg && !cfg.allowRegister && mode === "register") {
      setMode("login");
    }
  }, [cfg, mode]);

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setPending(true);
    try {
      if (mode === "register") {
        await register(email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Failed");
    } finally {
      setPending(false);
    }
  };

  const googleUrl = "/api/auth/google";

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg)]">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-lg"
      >
        <h1 className="text-2xl font-semibold mb-1">Payroll</h1>
        <p className="text-sm text-[var(--muted)] mb-6">
          {mode === "login" ? "Sign in to continue" : "Create your account"}
        </p>

        {cfg?.googleEnabled && (
          <>
            <a
              href={googleUrl}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] py-2.5 text-sm font-medium hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </a>
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--border)]" />
              </div>
              <div className="relative flex justify-center text-xs uppercase text-[var(--muted)]">
                <span className="bg-[var(--surface)] px-2">or</span>
              </div>
            </div>
          </>
        )}

        <form onSubmit={submit} className="space-y-4">
          {err && (
            <div className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">
              {err}
            </div>
          )}
          <div>
            <label className="text-xs text-[var(--muted)]">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--muted)]">Password</label>
            <input
              type="password"
              required
              minLength={mode === "register" ? 6 : 1}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            />
            {mode === "register" && (
              <p className="mt-1 text-xs text-[var(--muted)]">
                At least 6 characters
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {pending && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-2 text-center text-sm">
          {cfg?.allowRegister && (
            <button
              type="button"
              className="text-teal-600 hover:underline"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setErr("");
              }}
            >
              {mode === "login"
                ? "Need an account? Register"
                : "Already have an account? Sign in"}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
