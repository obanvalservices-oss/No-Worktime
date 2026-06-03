import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRoles } from "@/lib/auth/api-session";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  canEditFinalizedPayroll: z.boolean(),
});

export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ userId: string; membershipId: string }> }
) {
  const auth = await requireRoles(request, ["ADMIN"]);
  if (auth instanceof NextResponse) return auth;
  const { userId, membershipId } = await params;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });
  }

  const membership = await prisma.companyMembership.findFirst({
    where: { id: membershipId, userId },
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json({ message: "Membership not found" }, { status: 404 });
  }

  const updated = await prisma.companyMembership.update({
    where: { id: membershipId },
    data: { canEditFinalizedPayroll: parsed.data.canEditFinalizedPayroll },
    select: {
      id: true,
      canEditFinalizedPayroll: true,
      company: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}
