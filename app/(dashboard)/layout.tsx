import AppShell from "@/components/AppShell";
import RequireAuth from "@/components/RequireAuth";
import RequireRole from "@/components/RequireRole";
import { ALLOW_MANAGEMENT } from "@/lib/auth/roles";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <RequireRole allow={ALLOW_MANAGEMENT}>
        <AppShell>{children}</AppShell>
      </RequireRole>
    </RequireAuth>
  );
}
