import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth/api-session";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireRoles(request, ["ADMIN"]);
  if (auth instanceof NextResponse) return auth;

  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      ownerId: true,
    },
  });

  return NextResponse.json(companies);
}
