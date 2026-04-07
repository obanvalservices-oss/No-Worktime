"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { postLoginPath } from "@/lib/auth/post-login-path";

function CallbackInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { refresh } = useAuth();

  useEffect(() => {
    const err = params.get("error");
    if (err) {
      router.replace(`/login?error=${encodeURIComponent(err)}`);
      return;
    }
    const token = params.get("token");
    if (!token) {
      router.replace("/login?error=missing_token");
      return;
    }
    (async () => {
      localStorage.setItem("token", token);
      const signedIn = await refresh();
      if (signedIn) {
        router.replace(postLoginPath(signedIn.role));
      } else {
        localStorage.removeItem("token");
        router.replace("/login?error=invalid_token");
      }
    })();
  }, [params, router, refresh]);

  return (
    <div className="min-h-screen flex items-center justify-center text-[var(--muted)]">
      Signing in…
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-[var(--muted)]">
          Loading…
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
