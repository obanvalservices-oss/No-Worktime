/** Areas of the employee self-service portal (extend with workflows later). */
export const EMPLOYEE_PORTAL_MODULES = [
  "paystubs",
  "documents",
  "requests",
] as const;

export type EmployeePortalModule = (typeof EMPLOYEE_PORTAL_MODULES)[number];
