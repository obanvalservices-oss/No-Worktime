import type { PayrollStatus } from "@prisma/client";
import type { UserRole } from "@/lib/auth/roles";
import { isAdmin } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export async function canEditFinalizedPayroll(
  userId: string,
  role: UserRole,
  companyId: string
): Promise<boolean> {
  if (isAdmin(role)) return true;
  const membership = await prisma.companyMembership.findUnique({
    where: { userId_companyId: { userId, companyId } },
    select: { canEditFinalizedPayroll: true },
  });
  return membership?.canEditFinalizedPayroll ?? false;
}

/** Returns false when a finalized run cannot be mutated by this user. */
export async function assertPayrollRunEditable(
  userId: string,
  role: UserRole,
  run: { status: PayrollStatus; companyId: string }
): Promise<boolean> {
  if (run.status !== "FINALIZED") return true;
  return canEditFinalizedPayroll(userId, role, run.companyId);
}
