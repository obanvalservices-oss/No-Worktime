import { NextResponse } from "next/server";

const MAX_SIG_BYTES = 600 * 1024;

/** Parse data URL or raw base64 PNG/JPEG from client canvas. */
export function parseSignatureImageBase64(input: string): { buffer: Buffer; mime: string } | null {
  const s = input.trim();
  const dataUrl = /^data:([^;]+);base64,(.+)$/s.exec(s);
  if (dataUrl) {
    const mime = dataUrl[1];
    if (!mime.startsWith("image/")) return null;
    const buffer = Buffer.from(dataUrl[2], "base64");
    if (buffer.length > MAX_SIG_BYTES) return null;
    return { buffer, mime };
  }
  try {
    const buffer = Buffer.from(s, "base64");
    if (buffer.length > MAX_SIG_BYTES || buffer.length < 32) return null;
    return { buffer, mime: "image/png" };
  } catch {
    return null;
  }
}

export function jsonInvalidSignature(): NextResponse {
  return NextResponse.json(
    { message: "Invalid or oversized signature image" },
    { status: 400 }
  );
}
