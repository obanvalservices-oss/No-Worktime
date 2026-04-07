/** Public site origin for links in emails and OAuth (prefer NEXT_PUBLIC_APP_URL). */
export function publicOriginFromRequest(request: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (env) return env;
  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "http";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}
