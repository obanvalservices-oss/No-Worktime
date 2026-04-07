"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import NotimeLoader from "@/components/NotimeLoader";
import BrandLogo from "@/components/BrandLogo";
import Wordmark from "@/components/Wordmark";
import { BRAND_TAGLINE } from "@/lib/brand";
import { postLoginPath } from "@/lib/auth/post-login-path";
import { Building2, User } from "lucide-react";
import clsx from "clsx";

interface AuthConfig {
  googleEnabled: boolean;
  allowRegister: boolean;
}

function CreateAccountForm() {
  const { user, loading, register } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const reduceMotion = useReducedMotion();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"EMPLOYER" | "EMPLOYEE">("EMPLOYER");
  const [err, setErr] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");
  const [cfg, setCfg] = useState<AuthConfig | null>(null);

  useEffect(() => {
    void fetch("/api/auth/config")
      .then((r) => r.json())
      .then((data: AuthConfig) => setCfg(data))
      .catch(() => setCfg({ googleEnabled: false, allowRegister: false }));
  }, []);

  useEffect(() => {
    const qErr = params.get("error");
    if (qErr) setErr(qErr);
  }, [params]);

  useEffect(() => {
    if (!loading && user) {
      router.replace(postLoginPath(user.role));
    }
  }, [user, loading, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setPending(true);
    try {
      const result = await register(email.trim(), password, role);
      if (result.requiresVerification) {
        setMsg(result.message ?? "Check your email.");
        setDone(true);
      }
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Failed");
    } finally {
      setPending(false);
    }
  };

  if (loading || !cfg) {
    return (
      <div className="login-page-root flex min-h-screen items-center justify-center">
        <div className="login-time-texture" aria-hidden />
        <NotimeLoader size={72} className="relative z-[2]" label="Loading" />
      </div>
    );
  }

  if (!cfg.allowRegister) {
    return (
      <div className="login-page-root relative flex min-h-screen flex-col items-center justify-center p-4">
        <div className="login-time-texture" aria-hidden />
        <div className="relative z-[2] max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center space-y-4">
          <p className="text-[var(--text)]">
            Registration is disabled. Contact an administrator or set{" "}
            <code className="text-xs bg-[var(--bg)] px-1 rounded">ALLOW_PUBLIC_REGISTER=true</code>{" "}
            when appropriate.
          </p>
          <Link href="/login" className="inline-block text-sm link-brand">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="login-page-root flex min-h-screen items-center justify-center">
        <NotimeLoader size={56} label="Redirecting" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="login-page-root relative flex min-h-screen flex-col items-center justify-center p-4">
        <div className="login-time-texture" aria-hidden />
        <motion.div
          className="relative z-[2] max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center space-y-4"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <h1 className="text-lg font-semibold text-[var(--text)]">Confirm your email</h1>
          <p className="text-sm text-[var(--muted)] leading-relaxed">{msg}</p>
          <Link href="/login" className="inline-flex btn-brand px-6 py-2.5 text-sm font-medium rounded-xl">
            Go to sign in
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="login-page-root relative flex min-h-screen flex-col">
      <div className="login-time-texture" aria-hidden />
      <div className="relative z-[3] flex flex-1 flex-col items-center justify-center p-4 sm:p-6 py-10">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.35 }}
        >
          <div className="text-center mb-6">
            <BrandLogo size={88} className="mx-auto mb-3 drop-shadow-lg" />
            <Wordmark size="md" className="mb-1" />
            <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">{BRAND_TAGLINE}</p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm space-y-5">
            <div>
              <h1 className="text-lg font-semibold text-[var(--text)]">Create account</h1>
              <p className="text-xs text-[var(--muted)] mt-1">
                This sets your account role for upcoming permissions. Only an admin can change it later.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("EMPLOYER")}
                className={clsx(
                  "flex flex-col items-center gap-2 rounded-xl border p-3 text-left transition-colors",
                  role === "EMPLOYER"
                    ? "border-[var(--accent)] bg-[var(--accent-muted)]/40"
                    : "border-[var(--border)] hover:bg-[var(--bg)]"
                )}
              >
                <Building2 className="w-6 h-6 text-[var(--accent-deep)]" />
                <span className="text-xs font-medium text-[var(--text)]">Employer</span>
                <span className="text-[10px] text-[var(--muted)] leading-tight text-center">
                  Manage companies & payroll
                </span>
              </button>
              <button
                type="button"
                onClick={() => setRole("EMPLOYEE")}
                className={clsx(
                  "flex flex-col items-center gap-2 rounded-xl border p-3 text-left transition-colors",
                  role === "EMPLOYEE"
                    ? "border-[var(--accent)] bg-[var(--accent-muted)]/40"
                    : "border-[var(--border)] hover:bg-[var(--bg)]"
                )}
              >
                <User className="w-6 h-6 text-[var(--accent-deep)]" />
                <span className="text-xs font-medium text-[var(--text)]">Employee</span>
                <span className="text-[10px] text-[var(--muted)] leading-tight text-center">
                  Worker access (permissions next)
                </span>
              </button>
            </div>

            <form onSubmit={submit} className="space-y-3">
              {err ? (
                <div
                  role="alert"
                  className="text-xs text-red-600 dark:text-red-300 bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20"
                >
                  {err}
                </div>
              ) : null}
              <div className="space-y-1">
                <label htmlFor="reg-email" className="text-xs text-[var(--muted)]">
                  Email
                </label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="reg-password" className="text-xs text-[var(--muted)]">
                  Password
                </label>
                <input
                  id="reg-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm"
                />
                <p className="text-[10px] text-[var(--muted)]">At least 6 characters</p>
              </div>
              <button
                type="submit"
                disabled={pending}
                className="w-full btn-brand py-2.5 text-sm font-semibold rounded-xl disabled:opacity-70"
              >
                {pending ? "Creating…" : "Create account"}
              </button>
            </form>

            <p className="text-center text-xs text-[var(--muted)]">
              Already have an account?{" "}
              <Link href="/login" className="link-brand font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function CreateAccountPage() {
  return (
    <Suspense
      fallback={
        <div className="login-page-root flex min-h-screen items-center justify-center">
          <NotimeLoader size={64} label="Loading" />
        </div>
      }
    >
      <CreateAccountForm />
    </Suspense>
  );
}
