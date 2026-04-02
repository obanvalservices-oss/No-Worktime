import { clearAuthCookieResponse } from "@/lib/jwt-auth";

export async function POST() {
  return clearAuthCookieResponse();
}
