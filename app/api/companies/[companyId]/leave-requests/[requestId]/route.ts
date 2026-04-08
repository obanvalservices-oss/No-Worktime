import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManagementAccess } from "@/lib/auth/api-session";
import { buildLeaveApprovalPdf } from "@/lib/leave-requests/buildApprovalPdf";
import { leaveTypeLabel } from "@/lib/leave-requests/labels";
import { canAccessCompany } from "@/lib/auth/company-access";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({
    action: z.literal("reject"),
    reviewNote: z.string().max(500).optional(),
  }),
]);

export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ companyId: string; requestId: string }> }
) {
  const auth = await requireManagementAccess(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, role } = auth;
  const { companyId, requestId } = await params;

  if (!(await canAccessCompany(userId, role, companyId))) {
    return NextResponse.json({ message: "Company not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });
  }

  const req = await prisma.leaveRequest.findFirst({
    where: { id: requestId, companyId },
    include: {
      employee: true,
      company: true,
    },
  });
  if (!req) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  if (req.status !== "PENDING") {
    return NextResponse.json(
      { message: "Only pending requests can be approved or rejected" },
      { status: 400 }
    );
  }

  const reviewer = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  const approvedByEmail = reviewer?.email ?? "Employer";

  if (parsed.data.action === "reject") {
    const updated = await prisma.leaveRequest.update({
      where: { id: req.id },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewedByUserId: userId,
        reviewNote: parsed.data.reviewNote?.trim() || null,
      },
      include: {
        employee: { select: { id: true, name: true } },
        reviewedBy: { select: { email: true } },
      },
    });
    return NextResponse.json(updated);
  }

  const now = new Date().toISOString();
  const pdfBytes = await buildLeaveApprovalPdf({
    companyName: req.company.name,
    employeeName: req.employee.name,
    typeLabel: leaveTypeLabel(req.type),
    startDate: req.startDate,
    endDate: req.endDate,
    reason: req.reason,
    notes: req.notes,
    approvedByEmail,
    approvedAtIso: now,
  });

  const title = `Approved leave — ${leaveTypeLabel(req.type)} (${req.startDate}–${req.endDate})`;

  const result = await prisma.$transaction(async (tx) => {
    const doc = await tx.employeeDocument.create({
      data: {
        employeeId: req.employeeId,
        companyId: req.companyId,
        title,
        fileName: `leave-approval-${req.id}.pdf`,
        mimeType: "application/pdf",
        originalData: Uint8Array.from(pdfBytes),
        uploadedByUserId: userId,
        status: "PENDING_SIGNATURE",
      },
      select: {
        id: true,
        title: true,
        mimeType: true,
        status: true,
      },
    });

    const lr = await tx.leaveRequest.update({
      where: { id: req.id },
      data: {
        status: "AWAITING_SIGNATURE",
        documentId: doc.id,
        reviewedAt: new Date(),
        reviewedByUserId: userId,
        reviewNote: null,
      },
      include: {
        employee: { select: { id: true, name: true } },
        document: { select: { id: true, title: true, status: true } },
        reviewedBy: { select: { email: true } },
      },
    });

    return lr;
  });

  return NextResponse.json(result);
}
