import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagementAccess } from "@/lib/auth/api-session";
import { canAccessCompany } from "@/lib/auth/company-access";

const patchSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const auth = await requireManagementAccess(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, role } = auth;
  const { companyId: id } = await params;

  const body = await request.json();
  const parsed = patchSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });
  }
  if (!(await canAccessCompany(userId, role, id))) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const c = await prisma.company.update({
    where: { id },
    data: {
      ...(parsed.data.name != null ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description?.trim() || null }
        : {}),
    },
  });
  return NextResponse.json(c);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const auth = await requireManagementAccess(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, role } = auth;
  const { companyId: id } = await params;

  if (!(await canAccessCompany(userId, role, id))) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  await prisma.company.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
