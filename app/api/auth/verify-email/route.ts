import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publicOriginFromRequest } from "@/lib/auth/requestOrigin";

export async function GET(request: Request) {
  const base = publicOriginFromRequest(request);
  const fail = (err: string) =>
    NextResponse.redirect(`${base}/login?error=${encodeURIComponent(err)}`);

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token?.trim()) {
    return fail("missing_verification_token");
  }

  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: token,
      emailVerificationExpires: { gt: new Date() },
    },
  });

  if (!user) {
    return fail("invalid_or_expired_verification");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    },
  });

  return NextResponse.redirect(`${base}/login?verified=1`);
}
