import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/auth/api-session";
import { EMPLOYEE_PORTAL_MODULES } from "@/lib/employee-portal/modules";

/** Employee-only: portal metadata and profile stub (link User ↔ Employee record later). */
export async function GET(request: Request) {
  const auth = await requireRoles(request, ["EMPLOYEE"]);
  if (auth instanceof NextResponse) return auth;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, email: true, role: true, emailVerified: true },
  });
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    modules: [...EMPLOYEE_PORTAL_MODULES],
    user: {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
    },
    employeeRecord: null as null,
  });
}
