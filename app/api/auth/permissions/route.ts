import { NextResponse } from "next/server";
import { requireManagementAccess } from "@/lib/auth/api-session";
import { canAccessCompany } from "@/lib/auth/company-access";
import { canEditFinalizedPayroll } from "@/lib/auth/payroll-permissions";
import { isAdmin } from "@/lib/auth/roles";

export async function GET(request: Request) {
  const auth = await requireManagementAccess(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, role } = auth;

  const companyId = new URL(request.url).searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ message: "companyId required" }, { status: 400 });
  }

  if (!(await canAccessCompany(userId, role, companyId))) {
    return NextResponse.json({ message: "Company not found" }, { status: 404 });
  }

  const canEdit = await canEditFinalizedPayroll(userId, role, companyId);
  return NextResponse.json({
    canEditFinalizedPayroll: canEdit,
    isSuperAdmin: isAdmin(role),
  });
}
