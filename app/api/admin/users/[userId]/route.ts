import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth/api-session";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireRoles(request, ["ADMIN"]);
  if (auth instanceof NextResponse) return auth;
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      companyMemberships: {
        orderBy: { company: { name: "asc" } },
        select: {
          id: true,
          createdAt: true,
          company: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      },
    },
  });
  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}
