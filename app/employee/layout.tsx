import EmployeeShell from "@/components/EmployeeShell";
import RequireAuth from "@/components/RequireAuth";
import RequireRole from "@/components/RequireRole";
import { ALLOW_EMPLOYEE_PORTAL } from "@/lib/auth/roles";

export default function EmployeePortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <RequireRole allow={ALLOW_EMPLOYEE_PORTAL}>
        <EmployeeShell>{children}</EmployeeShell>
      </RequireRole>
    </RequireAuth>
  );
}
