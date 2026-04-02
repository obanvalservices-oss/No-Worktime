import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId, jsonUnauthorized } from "@/lib/jwt-auth";

export async function GET(request: Request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return jsonUnauthorized();

  const list = await prisma.company.findMany({
    where: { ownerId: userId },
    orderBy: { name: "asc" },
    include: { _count: { select: { departments: true, employees: true } } },
  });
  return NextResponse.json(list);
}

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function POST(request: Request) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return jsonUnauthorized();

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });
  }
  const c = await prisma.company.create({
    data: {
      ownerId: userId,
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || null,
    },
  });
  return NextResponse.json(c, { status: 201 });
}
