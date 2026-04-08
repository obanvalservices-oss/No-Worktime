import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagementAccess } from "@/lib/auth/api-session";
import { canAccessCompany } from "@/lib/auth/company-access";

const patchSchema = z.object({
  name: z.string().min(1),
  kind: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireManagementAccess(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, role } = auth;
  const { id } = await params;

  const dep = await prisma.department.findUnique({
    where: { id },
    include: { company: true },
  });
  if (!dep || !(await canAccessCompany(userId, role, dep.companyId))) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const body = await request.json();
  const parsed = patchSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });
  }
  const d = await prisma.department.update({
    where: { id },
    data: {
      ...(parsed.data.name != null ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.kind !== undefined
        ? { kind: parsed.data.kind?.trim() || null }
        : {}),
    },
  });
  return NextResponse.json(d);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireManagementAccess(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, role } = auth;
  const { id } = await params;

  const dep = await prisma.department.findUnique({
    where: { id },
    include: { company: true },
  });
  if (!dep || !(await canAccessCompany(userId, role, dep.companyId))) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  await prisma.department.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
