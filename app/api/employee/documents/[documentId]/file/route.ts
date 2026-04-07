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
  const { searchParams } = new URL(request.url);
  const part = searchParams.get("part") ?? "original";

  const doc = await prisma.employeeDocument.findFirst({
    where: { id: documentId, employeeId: emp.id },
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
        "Cache-Control": "private, no-store",
      },
    });
  }

  if (part === "signature") {
    if (doc.status !== "SIGNED" || !doc.signatureImage) {
      return NextResponse.json({ message: "Not signed yet" }, { status: 404 });
    }
    const body = Buffer.from(doc.signatureImage);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `inline; filename="signature.png"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  return NextResponse.json({ message: "Invalid part" }, { status: 400 });
}
