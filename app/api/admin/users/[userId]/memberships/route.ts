import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRoles } from "@/lib/auth/api-session";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  companyId: z.string().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireRoles(request, ["ADMIN"]);
  if (auth instanceof NextResponse) return auth;
  const { userId } = await params;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });
  }

  const [user, company] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
    prisma.company.findUnique({
      where: { id: parsed.data.companyId },
      select: { id: true },
    }),
  ]);
  if (!user || !company) {
    return NextResponse.json({ message: "User or company not found" }, { status: 404 });
  }

  await prisma.companyMembership.upsert({
    where: {
      userId_companyId: {
        userId,
        companyId: parsed.data.companyId,
      },
    },
    update: {},
    create: {
      userId,
      companyId: parsed.data.companyId,
    },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = await requireRoles(request, ["ADMIN"]);
  if (auth instanceof NextResponse) return auth;
  const { userId } = await params;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });
  }

  await prisma.companyMembership.deleteMany({
    where: { userId, companyId: parsed.data.companyId },
  });
  return new NextResponse(null, { status: 204 });
}
