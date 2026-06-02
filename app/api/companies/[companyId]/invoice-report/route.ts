import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagementAccess } from "@/lib/auth/api-session";
import { canAccessCompany } from "@/lib/auth/company-access";
import { compareIsoDates } from "@/lib/leave-requests/dates";
import { buildInvoiceReport } from "@/lib/invoice-report/buildInvoiceReport";

const querySchema = z.object({
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  departmentId: z.string().min(1).optional(),
  commissionPercent: z.coerce.number().min(0).max(100).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const auth = await requireManagementAccess(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, role } = auth;
  const { companyId } = await params;

  if (!(await canAccessCompany(userId, role, companyId))) {
    return NextResponse.json({ message: "Company not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    dateFrom: searchParams.get("dateFrom"),
    dateTo: searchParams.get("dateTo"),
    departmentId: searchParams.get("departmentId") || undefined,
    commissionPercent: searchParams.get("commissionPercent") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid query parameters" }, { status: 400 });
  }

  const { dateFrom, dateTo, departmentId } = parsed.data;
  if (compareIsoDates(dateFrom, dateTo) > 0) {
    return NextResponse.json({ message: "dateFrom must be <= dateTo" }, { status: 400 });
  }

  const commissionPercent = parsed.data.commissionPercent ?? 0;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true },
  });
  if (!company) {
    return NextResponse.json({ message: "Company not found" }, { status: 404 });
  }

  let departmentFilter: { id: string; name: string } | null = null;
  if (departmentId) {
    const dep = await prisma.department.findFirst({
      where: { id: departmentId, companyId },
      select: { id: true, name: true },
    });
    if (!dep) {
      return NextResponse.json({ message: "Department not found" }, { status: 404 });
    }
    departmentFilter = dep;
  }

  const dateOverlap = {
    AND: [{ startDate: { lte: dateTo } }, { endDate: { gte: dateFrom } }],
  };

  const [finalizedRuns, draftRunsExcluded] = await Promise.all([
    prisma.payrollRun.findMany({
      where: {
        companyId,
        status: "FINALIZED",
        ...dateOverlap,
      },
      orderBy: { startDate: "asc" },
      include: {
        lines: {
          include: {
            employee: {
              include: { department: { select: { id: true, name: true } } },
            },
          },
        },
      },
    }),
    prisma.payrollRun.count({
      where: {
        companyId,
        status: "DRAFT",
        ...dateOverlap,
      },
    }),
  ]);

  const report = buildInvoiceReport({
    company,
    dateFrom,
    dateTo,
    departmentFilter,
    commissionPercent,
    draftRunsExcluded,
    runs: finalizedRuns,
  });

  return NextResponse.json(report);
}
