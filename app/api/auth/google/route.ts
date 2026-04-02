import { NextResponse } from "next/server";
import { buildGoogleAuthUrl, isGoogleOAuthConfigured } from "@/lib/google-oauth";

export async function GET() {
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.json(
      { message: "Google sign-in is not configured on the server." },
      { status: 503 }
    );
  }
  return NextResponse.redirect(buildGoogleAuthUrl());
}
