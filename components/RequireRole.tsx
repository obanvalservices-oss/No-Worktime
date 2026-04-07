"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/lib/auth/roles";
import { postLoginPath } from "@/lib/auth/post-login-path";
import ScreenLoading from "@/components/ScreenLoading";

export default function RequireRole({
  allow,
  children,
}: {
  /** Prefer exported constants from `@/lib/auth/roles` (stable references). */
  allow: readonly UserRole[];
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    if (!allow.includes(user.role)) {
      router.replace(postLoginPath(user.role));
    }
  }, [user, loading, router, allow]);

  if (loading) {
    return <ScreenLoading message="Loading…" subtle />;
  }

  if (!user) {
    return null;
  }

  if (!allow.includes(user.role)) {
    return <ScreenLoading message="Redirecting…" subtle />;
  }

  return <>{children}</>;
}
