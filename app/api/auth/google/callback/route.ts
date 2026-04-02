import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  exchangeGoogleCode,
  fetchGoogleProfile,
  isGoogleOAuthConfigured,
} from "@/lib/google-oauth";
import { signToken, AUTH_COOKIE } from "@/lib/jwt-auth";

function appOrigin(request: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (env) return env;
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "http";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

export async function GET(request: Request) {
  const base = appOrigin(request);
  const fail = (err: string) =>
    NextResponse.redirect(`${base}/login?error=${encodeURIComponent(err)}`);

  if (!isGoogleOAuthConfigured()) {
    return fail("google_unconfigured");
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) {
    return fail("google_failed");
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    const profile = await fetchGoogleProfile(tokens.access_token);
    const email = profile.email;

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { email, googleId: profile.id },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.id },
      });
    }

    const token = signToken(user.id);
    const res = NextResponse.redirect(`${base}/dashboard`);
    res.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });
    return res;
  } catch {
    return fail("google_failed");
  }
}
