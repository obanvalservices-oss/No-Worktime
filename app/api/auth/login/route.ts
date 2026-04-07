import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken, jsonWithAuthCookie } from "@/lib/jwt-auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const email = parsed.data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user?.password) {
      return NextResponse.json(
        {
          message: user
            ? "This account uses Google sign-in."
            : "Invalid email or password",
        },
        { status: 401 }
      );
    }
    let ok = false;
    try {
      ok = await bcrypt.compare(parsed.data.password, user.password);
    } catch {
      ok = false;
    }
    if (!ok) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    }
    if (!user.emailVerified) {
      return NextResponse.json(
        {
          message:
            "Confirm your email before signing in. Check your inbox or request a new link from support.",
        },
        { status: 403 }
      );
    }
    const token = signToken(user.id);
    return jsonWithAuthCookie(
      {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
        },
      },
      token
    );
  } catch (e) {
    console.error("login error", e);
    return NextResponse.json({ message: "Login temporarily unavailable" }, { status: 500 });
  }
}
