/** Mirrors Prisma `UserRole` — kept as a string union so client bundles stay light. */
export type UserRole = "ADMIN" | "EMPLOYER" | "EMPLOYEE";

export const ROLES = {
  ADMIN: "ADMIN",
  EMPLOYER: "EMPLOYER",
  EMPLOYEE: "EMPLOYEE",
} as const satisfies { readonly [K in UserRole]: UserRole };

export function isAdmin(role: UserRole): boolean {
  return role === "ADMIN";
}

export function isEmployer(role: UserRole): boolean {
  return role === "EMPLOYER";
}

export function isEmployee(role: UserRole): boolean {
  return role === "EMPLOYEE";
}

/** Employers and admins can manage company data; extend for fine-grained checks later. */
export function canManageCompany(role: UserRole): boolean {
  return role === "ADMIN" || role === "EMPLOYER";
}

/** Stable arrays for `RequireRole` (avoid new array literals each render). */
export const ALLOW_MANAGEMENT: readonly UserRole[] = ["ADMIN", "EMPLOYER"];
export const ALLOW_EMPLOYEE_PORTAL: readonly UserRole[] = ["EMPLOYEE"];
export const ALLOW_ADMIN: readonly UserRole[] = ["ADMIN"];
