import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth/api-session";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireRoles(request, ["ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      _count: { select: { companyMemberships: true } },
    },
  });

  return NextResponse.json(users);
}
