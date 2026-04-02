import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useAuth();

  useEffect(() => {
    const err = params.get("error");
    if (err) {
      navigate(`/login?error=${encodeURIComponent(err)}`, { replace: true });
      return;
    }
    const token = params.get("token");
    if (!token) {
      navigate("/login?error=missing_token", { replace: true });
      return;
    }
    (async () => {
      localStorage.setItem("token", token);
      const ok = await refresh();
      if (ok) {
        navigate("/dashboard", { replace: true });
      } else {
        localStorage.removeItem("token");
        navigate("/login?error=invalid_token", { replace: true });
      }
    })();
  }, [params, navigate, refresh]);

  return (
    <div className="min-h-screen flex items-center justify-center text-[var(--muted)]">
      Signing in…
    </div>
  );
}
