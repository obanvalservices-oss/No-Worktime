import RequireRole from "@/components/RequireRole";
import { ALLOW_ADMIN } from "@/lib/auth/roles";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RequireRole allow={ALLOW_ADMIN}>{children}</RequireRole>;
}
