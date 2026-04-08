import type { Prisma } from "@prisma/client";
import type { UserRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";

export function companyAccessWhere(userId: string, role: UserRole): Prisma.CompanyWhereInput {
  if (role === "ADMIN") return {};
  return {
    OR: [{ ownerId: userId }, { memberships: { some: { userId } } }],
  };
}

export async function canAccessCompany(
  userId: string,
  role: UserRole,
  companyId: string
): Promise<boolean> {
  const row = await prisma.company.findFirst({
    where: {
      id: companyId,
      ...companyAccessWhere(userId, role),
    },
    select: { id: true },
  });
  return !!row;
}
