import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManagementAccess } from "@/lib/auth/api-session";
import { canAccessCompany } from "@/lib/auth/company-access";
import {
  ALLOWED_DOCUMENT_MIMES,
  MAX_DOCUMENT_UPLOAD_BYTES,
} from "@/lib/documents/constants";

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
  const employeeId = searchParams.get("employeeId");

  const rows = await prisma.employeeDocument.findMany({
    where: {
      companyId,
      ...(employeeId ? { employeeId } : {}),
    },
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
      employee: { select: { id: true, name: true } },
      uploadedBy: { select: { id: true, email: true } },
    },
  });

  return NextResponse.json(rows);
}

export async function POST(
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

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ message: "Expected multipart form data" }, { status: 400 });
  }

  const title = String(form.get("title") ?? "").trim();
  const employeeId = String(form.get("employeeId") ?? "").trim();
  const file = form.get("file");

  if (!title || !employeeId) {
    return NextResponse.json(
      { message: "title and employeeId are required" },
      { status: 400 }
    );
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ message: "file is required" }, { status: 400 });
  }

  if (file.size > MAX_DOCUMENT_UPLOAD_BYTES) {
    return NextResponse.json(
      { message: `File too large (max ${MAX_DOCUMENT_UPLOAD_BYTES / (1024 * 1024)} MB)` },
      { status: 400 }
    );
  }

  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_DOCUMENT_MIMES.has(mimeType)) {
    return NextResponse.json(
      { message: "Allowed types: PDF, JPEG, PNG, WebP" },
      { status: 400 }
    );
  }

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, companyId },
  });
  if (!employee) {
    return NextResponse.json({ message: "Employee not found in this company" }, { status: 404 });
  }

  const buf = Buffer.from(await file.arrayBuffer());

  const doc = await prisma.employeeDocument.create({
    data: {
      companyId,
      employeeId,
      title,
      fileName: file.name || "document",
      mimeType,
      originalData: buf,
      uploadedByUserId: userId,
    },
    select: {
      id: true,
      title: true,
      fileName: true,
      mimeType: true,
      status: true,
      createdAt: true,
      employee: { select: { id: true, name: true } },
      uploadedBy: { select: { id: true, email: true } },
    },
  });

  return NextResponse.json(doc, { status: 201 });
}
