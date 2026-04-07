import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagementAccess } from "@/lib/auth/api-session";

async function assertCompany(userId: string, companyId: string) {
  return prisma.company.findFirst({
    where: { id: companyId, ownerId: userId },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const auth = await requireManagementAccess(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const { companyId } = await params;

  if (!(await assertCompany(userId, companyId))) {
    return NextResponse.json({ message: "Company not found" }, { status: 404 });
  }
  const rows = await prisma.department.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    include: { _count: { select: { employees: true } } },
  });
  return NextResponse.json(rows);
}

const createSchema = z.object({
  name: z.string().min(1),
  kind: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const auth = await requireManagementAccess(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const { companyId } = await params;

  if (!(await assertCompany(userId, companyId))) {
    return NextResponse.json({ message: "Company not found" }, { status: 404 });
  }
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });
  }
  const d = await prisma.department.create({
    data: {
      companyId,
      name: parsed.data.name.trim(),
      kind: parsed.data.kind?.trim() || null,
    },
  });
  return NextResponse.json(d, { status: 201 });
}
