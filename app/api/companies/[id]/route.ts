import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId, jsonUnauthorized } from "@/lib/jwt-auth";

const patchSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return jsonUnauthorized();
  const { id } = await params;

  const body = await request.json();
  const parsed = patchSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });
  }
  const existing = await prisma.company.findFirst({
    where: { id, ownerId: userId },
  });
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const c = await prisma.company.update({
    where: { id },
    data: {
      ...(parsed.data.name != null ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description?.trim() || null }
        : {}),
    },
  });
  return NextResponse.json(c);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getAuthenticatedUserId(request);
  if (!userId) return jsonUnauthorized();
  const { id } = await params;

  const existing = await prisma.company.findFirst({
    where: { id, ownerId: userId },
  });
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  await prisma.company.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
