import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/auth/api-session";
import { getEmployeeForUser } from "@/lib/employee-record";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const auth = await requireRoles(request, ["EMPLOYEE"]);
  if (auth instanceof NextResponse) return auth;

  const emp = await getEmployeeForUser(auth.userId);
  if (!emp) {
    return NextResponse.json({ message: "No linked employee profile" }, { status: 403 });
  }

  const { documentId } = await params;

  const doc = await prisma.employeeDocument.findFirst({
    where: { id: documentId, employeeId: emp.id },
    select: {
      id: true,
      title: true,
      fileName: true,
      mimeType: true,
      status: true,
      signedAt: true,
      createdAt: true,
      company: { select: { id: true, name: true } },
    },
  });
  if (!doc) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return NextResponse.json(doc);
}
