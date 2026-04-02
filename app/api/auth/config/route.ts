import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGoogleOAuthConfigured } from "@/lib/google-oauth";

async function isRegisterAllowed(): Promise<boolean> {
  if (process.env.ALLOW_PUBLIC_REGISTER === "true") return true;
  const n = await prisma.user.count();
  return n === 0;
}

export async function GET() {
  const allowRegister = await isRegisterAllowed();
  return NextResponse.json({
    googleEnabled: isGoogleOAuthConfigured(),
    allowRegister,
  });
}
