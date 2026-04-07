import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/auth/api-session";
import { getEmployeeForUser } from "@/lib/employee-record";

export async function GET(request: Request) {
  const auth = await requireRoles(request, ["EMPLOYEE"]);
  if (auth instanceof NextResponse) return auth;

  const emp = await getEmployeeForUser(auth.userId);
  if (!emp) {
    return NextResponse.json(
      {
        linked: false,
        documents: [],
        message: "No employee profile linked to this account yet.",
      },
      { status: 200 }
    );
  }

  const documents = await prisma.employeeDocument.findMany({
    where: { employeeId: emp.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      fileName: true,
      mimeType: true,
      status: true,
      signedAt: true,
      createdAt: true,
      updatedAt: true,
      company: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ linked: true, employeeId: emp.id, documents });
}
