import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publicOriginFromRequest } from "@/lib/auth/requestOrigin";
import { sendVerificationEmail } from "@/lib/email/sendVerificationEmail";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["EMPLOYER", "EMPLOYEE"]),
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
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);

    const role = parsed.data.role as UserRole;

    await prisma.user.create({
      data: {
        email,
        password: hash,
        role,
        emailVerified: false,
        emailVerificationToken: token,
        emailVerificationExpires: expires,
      },
    });

    const base = publicOriginFromRequest(request);
    const verifyUrl = `${base}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

    try {
      await sendVerificationEmail(email, verifyUrl);
    } catch (e) {
      console.error("sendVerificationEmail", e);
      await prisma.user.deleteMany({ where: { email } });
      return NextResponse.json(
        { message: "Could not send confirmation email. Try again later." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        message: "Check your email to confirm your address before signing in.",
        requiresVerification: true,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("register error", e);
    return NextResponse.json({ message: "Registration failed" }, { status: 500 });
  }
}
