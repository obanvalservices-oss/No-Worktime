import type { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthenticatedUserId,
  jsonUnauthorized,
  jsonForbidden,
} from "@/lib/jwt-auth";
import type { UserRole } from "@/lib/auth/roles";
import { canManageCompany } from "@/lib/auth/roles";

export async function getApiUser(
  request: Request
): Promise<{ id: string; role: UserRole } | null> {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!user) return null;
  return { id: user.id, role: user.role as UserRole };
}

export async function requireManagementAccess(
  request: Request
): Promise<{ userId: string; role: UserRole } | NextResponse> {
  const u = await getApiUser(request);
  if (!u) return jsonUnauthorized();
  if (!canManageCompany(u.role)) return jsonForbidden();
  return { userId: u.id, role: u.role };
}

export async function requireRoles(
  request: Request,
  allowed: readonly UserRole[]
): Promise<{ userId: string; role: UserRole } | NextResponse> {
  const u = await getApiUser(request);
  if (!u) return jsonUnauthorized();
  if (!allowed.includes(u.role)) return jsonForbidden();
  return { userId: u.id, role: u.role };
}
