import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/auth/api-session";
import { getEmployeeForUser } from "@/lib/employee-record";
import {
  parseSignatureImageBase64,
  jsonInvalidSignature,
} from "@/lib/documents/signature";

const signSchema = z.object({
  acknowledged: z.literal(true),
  typedName: z.string().min(1).max(200).trim(),
  signatureImageBase64: z.string().min(20),
});

export async function POST(
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
  });
  if (!doc) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  if (doc.status !== "PENDING_SIGNATURE") {
    return NextResponse.json({ message: "Already signed or invalid state" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = signSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });
  }

  const img = parseSignatureImageBase64(parsed.data.signatureImageBase64);
  if (!img) {
    return jsonInvalidSignature();
  }

  const signedAt = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.employeeDocument.update({
      where: { id: doc.id },
      data: {
        status: "SIGNED",
        signedAt,
        signatureImage: Uint8Array.from(img.buffer),
        signaturePayload: {
          method: "draw",
          typedName: parsed.data.typedName,
          clientSignedAt: signedAt.toISOString(),
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
        signedAt: true,
        updatedAt: true,
      },
    });

    await tx.leaveRequest.updateMany({
      where: {
        documentId: doc.id,
        status: "AWAITING_SIGNATURE",
      },
      data: { status: "COMPLETED" },
    });

    return u;
  });

  return NextResponse.json(updated);
}
