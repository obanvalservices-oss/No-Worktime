"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import NotimeLoader from "@/components/NotimeLoader";
import BrandLogo from "@/components/BrandLogo";
import Wordmark from "@/components/Wordmark";
import { BRAND_TAGLINE } from "@/lib/brand";

interface AuthConfig {
  googleEnabled: boolean;
  allowRegister: boolean;
}

/** Concentric time rings — each rotates independently */
function LoginTimeRings({ reduceMotion }: { reduceMotion: boolean }) {
  const rings: { size: string; duration: number; ccw: boolean }[] = [
    { size: "min(96vmin, 580px)", duration: 142, ccw: false },
    { size: "min(80vmin, 480px)", duration: 108, ccw: true },
    { size: "min(64vmin, 390px)", duration: 168, ccw: false },
    { size: "min(50vmin, 300px)", duration: 88, ccw: true },
    { size: "min(38vmin, 228px)", duration: 124, ccw: false },
    { size: "148px", duration: 76, ccw: true },
  ];

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center"
      aria-hidden
    >
      {rings.map((ring, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-[var(--accent)]/[0.11] dark:border-[var(--accent)]/[0.16]"
          style={{
            width: ring.size,
            height: ring.size,
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            margin: "auto",
          }}
          initial={false}
          animate={reduceMotion ? {} : { rotate: ring.ccw ? -360 : 360 }}
          transition={{
            duration: ring.duration,
            repeat: reduceMotion ? 0 : Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

function LoginBackdrop({
  children,
  reduceMotion,
}: {
  children: React.ReactNode;
  reduceMotion: boolean;
}) {
  return (
    <div className="login-page-root relative flex min-h-screen flex-col">
      <div className="login-time-texture" aria-hidden />
      <LoginTimeRings reduceMotion={reduceMotion} />
      <div className="relative z-[3] flex min-h-screen flex-1 flex-col items-center justify-center p-4 sm:p-6">
        {children}
      </div>
    </div>
  );
}

type FormInnerProps = {
  mode: "login" | "register";
  setMode: (m: "login" | "register") => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  err: string;
  cfg: AuthConfig | null;
  onSubmit: (e: React.FormEvent) => void;
  pending: boolean;
  emailId: string;
  passwordId: string;
};

function LoginFormCard(props: FormInnerProps) {
  const {
    mode,
    setMode,
    email,
    setEmail,
    password,
    setPassword,
    err,
    cfg,
    onSubmit,
    pending,
    emailId,
    passwordId,
  } = props;

  const cardBg = "bg-[#363a40]";

  return (
    <div
      className="login-disc-frame overflow-hidden rounded-full shadow-xl shadow-black/30 backdrop-blur-xl
        w-[min(92vw,calc(92dvh-32px),480px)] h-[min(92vw,calc(92dvh-32px),480px)] max-w-[480px] max-h-[480px]"
    >
      <div className="login-disc-shine" aria-hidden />
      <div
        className={`absolute inset-[3px] sm:inset-[3.5px] z-[2] flex min-h-0 flex-col overflow-hidden rounded-full ${cardBg}`}
      >
        <div
          className="login-disc-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-[clamp(1.65rem,11vw,2.75rem)] pt-4 sm:pt-5 pb-8 sm:pb-10 text-zinc-100"
        >
        <div className="flex flex-col items-center text-center mb-4">
          <BrandLogo size={120} className="mb-2 drop-shadow-lg" />
          <Wordmark
            size="md"
            className="mb-1 [&>span:first-child]:text-[#8fd9c8] [&>span:last-child]:text-zinc-100"
          />
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.18em] text-zinc-400 font-medium leading-tight px-1">
            {BRAND_TAGLINE}
          </p>
        </div>
        <p className="text-xs text-zinc-400 mb-4 text-center leading-snug">
          {mode === "login" ? "Sign in to continue" : "Create your account"}
        </p>

        {cfg?.googleEnabled && (
          <>
            <a
              href="/api/auth/google"
              className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-full border border-white/10 bg-zinc-800/90 py-2 px-3 text-xs sm:text-sm font-medium text-zinc-100 hover:bg-zinc-700/90 transition-colors"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
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
              <span className="truncate">Google</span>
            </a>
            <div className="relative mb-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase text-zinc-500">
                <span className={`${cardBg} px-2`}>or</span>
              </div>
            </div>
          </>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          {err ? (
            <div
              role="alert"
              className="text-xs text-red-300 bg-red-500/15 rounded-full px-3 py-2 text-center leading-snug border border-red-500/20"
            >
              {err}
            </div>
          ) : null}
          <div className="space-y-0.5">
            <label htmlFor={emailId} className="block text-[10px] sm:text-xs text-zinc-400 pl-1">
              Email
            </label>
            <input
              id={emailId}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-full border border-white/10 bg-zinc-900/70 px-4 py-2.5 text-xs sm:text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-[var(--accent)]/40"
            />
          </div>
          <div className="space-y-0.5">
            <label htmlFor={passwordId} className="block text-[10px] sm:text-xs text-zinc-400 pl-1">
              Password
            </label>
            <input
              id={passwordId}
              type="password"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              required
              minLength={mode === "register" ? 6 : 1}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-full border border-white/10 bg-zinc-900/70 px-4 py-2.5 text-xs sm:text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-[var(--accent)]/40"
            />
            {mode === "register" ? (
              <p className="text-[10px] text-zinc-500 pl-1">Min. 6 characters</p>
            ) : null}
          </div>
          <div className="flex justify-center pt-1">
            <button
              type="submit"
              disabled={pending}
              aria-busy={pending}
              className="!rounded-full px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-white btn-brand inline-flex items-center justify-center gap-2 min-w-[7.5rem] max-w-[62%] disabled:opacity-70"
            >
              {pending ? <NotimeLoader size={20} decorative /> : null}
              {mode === "login" ? "Sign in" : "Create account"}
            </button>
          </div>
        </form>

        {cfg?.allowRegister ? (
          <div className="mt-4 text-center">
            <button
              type="button"
              className="text-[#8fd9c8] hover:text-[#a8e8d4] hover:underline text-xs leading-tight px-1"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
              }}
            >
              {mode === "login" ? "Need an account? Register" : "Have an account? Sign in"}
            </button>
          </div>
        ) : null}
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const { user, loading, login, register } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const reduceMotion = useReducedMotion();
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

  useEffect(() => {
    void router.prefetch("/dashboard");
  }, [router]);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

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
      router.replace("/dashboard");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Failed");
    } finally {
      setPending(false);
    }
  };

  const emailId = `auth-email-${mode}`;
  const passwordId = `auth-password-${mode}`;

  if (loading) {
    return (
      <div className="login-page-root flex min-h-screen items-center justify-center">
        <div className="login-time-texture" aria-hidden />
        <NotimeLoader size={72} className="relative z-[2]" label="Loading" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="login-page-root flex min-h-screen items-center justify-center">
        <div className="login-time-texture" aria-hidden />
        <NotimeLoader size={56} className="relative z-[2]" label="Redirecting" />
      </div>
    );
  }

  return (
    <LoginBackdrop reduceMotion={Boolean(reduceMotion)}>
      <motion.div
        className="relative z-[4] flex w-full justify-center"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <LoginFormCard
          mode={mode}
          setMode={(m) => {
            setMode(m);
            setErr("");
          }}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          err={err}
          cfg={cfg}
          onSubmit={submit}
          pending={pending}
          emailId={emailId}
          passwordId={passwordId}
        />
      </motion.div>
    </LoginBackdrop>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="login-page-root flex min-h-screen items-center justify-center">
          <NotimeLoader size={64} label="Loading" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
