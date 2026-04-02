import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken, jsonWithAuthCookie } from "@/lib/jwt-auth";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

async function isRegisterAllowed(): Promise<boolean> {
  if (process.env.ALLOW_PUBLIC_REGISTER === "true") return true;
  const n = await prisma.user.count();
  return n === 0;
}

export async function POST(request: Request) {
  try {
    const allowed = await isRegisterAllowed();
    if (!allowed) {
      return NextResponse.json(
        {
          message:
            "Registration is disabled. Set ALLOW_PUBLIC_REGISTER=true or use the first account only.",
        },
        { status: 403 }
      );
    }
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid body", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const email = parsed.data.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ message: "Email already registered" }, { status: 409 });
    }
    const hash = await bcrypt.hash(parsed.data.password, 10);
    const user = await prisma.user.create({
      data: { email, password: hash },
    });
    const token = signToken(user.id);
    return jsonWithAuthCookie(
      { token, user: { id: user.id, email: user.email } },
      token,
      201
    );
  } catch (e) {
    console.error("register error", e);
    return NextResponse.json({ message: "Registration failed" }, { status: 500 });
  }
}
