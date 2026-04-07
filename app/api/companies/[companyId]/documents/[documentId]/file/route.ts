import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagementAccess } from "@/lib/auth/api-session";

async function assertCompany(userId: string, companyId: string) {
  return prisma.company.findFirst({
    where: { id: companyId, ownerId: userId },
  });
}

export async function GET(
  request: Request,
  {
    params,
  }: { params: Promise<{ companyId: string; documentId: string }> }
) {
  const auth = await requireManagementAccess(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const { companyId, documentId } = await params;

  if (!(await assertCompany(userId, companyId))) {
    return NextResponse.json({ message: "Company not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const part = searchParams.get("part") ?? "original";

  const doc = await prisma.employeeDocument.findFirst({
    where: { id: documentId, companyId },
  });
  if (!doc) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (part === "original") {
    const body = Buffer.from(doc.originalData);
    return new NextResponse(body, {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.fileName)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  if (part === "signature") {
    if (doc.status !== "SIGNED" || !doc.signatureImage) {
      return NextResponse.json({ message: "No signature on file" }, { status: 404 });
    }
    const body = Buffer.from(doc.signatureImage);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="signature-${encodeURIComponent(doc.title)}.png"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  return NextResponse.json({ message: "Invalid part" }, { status: 400 });
}
