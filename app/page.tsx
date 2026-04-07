"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import BrandLogo from "@/components/BrandLogo";
import Wordmark from "@/components/Wordmark";
import { BRAND_TAGLINE } from "@/lib/brand";
import ScreenLoading from "@/components/ScreenLoading";
import { postLoginPath } from "@/lib/auth/post-login-path";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace(postLoginPath(user.role));
    }
  }, [user, loading, router]);

  if (loading) {
    return <ScreenLoading message="Loading…" subtle />;
  }

  if (user) {
    return <ScreenLoading message="Redirecting…" subtle />;
  }

  return (
    <div className="login-page-root relative min-h-screen flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
      <div className="login-time-texture pointer-events-none absolute inset-0 opacity-90" aria-hidden />
      <motion.div
        className="relative z-[2] max-w-lg w-full text-center space-y-8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div className="flex flex-col items-center gap-3">
          <BrandLogo size={100} className="drop-shadow-lg" />
          <Wordmark
            size="lg"
            className="[&>span:first-child]:text-[var(--accent)] [&>span:last-child]:text-[var(--text)]"
          />
          <p className="text-sm text-[var(--muted)] max-w-md leading-relaxed">{BRAND_TAGLINE}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
          <Link
            href="/login"
            className="inline-flex justify-center items-center btn-brand px-8 py-3 text-sm font-semibold rounded-xl shadow-md"
          >
            Sign in
          </Link>
          <Link
            href="/create-account"
            className="inline-flex justify-center items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-8 py-3 text-sm font-semibold text-[var(--text)] hover:bg-[var(--accent-muted)]/30 transition-colors"
          >
            Create account
          </Link>
        </div>
        <p className="text-xs text-[var(--muted)] max-w-md mx-auto leading-relaxed">
          Employers run payroll and operations; employees use a separate portal for documents, leave requests, and
          paystubs. Choose your role when you register.
        </p>
      </motion.div>
    </div>
  );
}
