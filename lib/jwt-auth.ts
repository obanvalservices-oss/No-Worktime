import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export const AUTH_COOKIE = "payroll_token";

const WEEK_SEC = 60 * 60 * 24 * 7;

/** HttpOnly auth cookie options — Secure in production (HTTPS). */
export function authCookieOptions(maxAgeSeconds: number) {
  const secure =
    process.env.NODE_ENV === "production" ||
    process.env.COOKIE_SECURE === "true";
  return {
    httpOnly: true as const,
    path: "/" as const,
    maxAge: maxAgeSeconds,
    sameSite: "lax" as const,
    secure,
  };
}

function secret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return s;
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, secret(), { expiresIn: "7d" });
}

export function verifyUserId(token: string): string | null {
  try {
    const p = jwt.verify(token, secret()) as { sub: string };
    return p.sub;
  } catch {
    return null;
  }
}

export function getBearerToken(request: Request): string | null {
  const h = request.headers.get("authorization");
  if (h?.startsWith("Bearer ")) return h.slice(7);
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  const parts = cookie.split(";").map((c) => c.trim());
  for (const p of parts) {
    if (p.startsWith(`${AUTH_COOKIE}=`)) {
      return decodeURIComponent(p.slice(AUTH_COOKIE.length + 1));
    }
  }
  return null;
}

export function getAuthenticatedUserId(request: Request): string | null {
  const t = getBearerToken(request);
  if (!t) return null;
  return verifyUserId(t);
}

export function jsonUnauthorized(): NextResponse {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

export function jsonWithAuthCookie(
  data: unknown,
  token: string,
  status = 200
): NextResponse {
  const res = NextResponse.json(data, { status });
  res.cookies.set(AUTH_COOKIE, token, authCookieOptions(WEEK_SEC));
  return res;
}

export function clearAuthCookieResponse(): NextResponse {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, "", { ...authCookieOptions(0), maxAge: 0 });
  return res;
}
