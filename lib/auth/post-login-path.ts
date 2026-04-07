import type { UserRole } from "@/lib/auth/roles";

/** Default route after sign-in for each role. */
export function postLoginPath(role: UserRole): string {
  return role === "EMPLOYEE" ? "/employee" : "/dashboard";
}
