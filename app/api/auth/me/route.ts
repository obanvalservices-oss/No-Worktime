import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId, jsonUnauthorized } from "@/lib/jwt-auth";

export async function GET(request: Request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return jsonUnauthorized();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) return jsonUnauthorized();
  return NextResponse.json(user);
}
