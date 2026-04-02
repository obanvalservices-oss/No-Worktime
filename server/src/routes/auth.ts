import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { getPassport, isGoogleOAuthConfigured } from "../config/passport.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, signToken, type AuthRequest } from "../middleware/auth.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

function clientBaseUrl(): string {
  const raw =
    process.env.CLIENT_URL ??
    process.env.CLIENT_ORIGIN ??
    "http://localhost:5173";
  return raw.replace(/\/$/, "");
}

async function isRegisterAllowed(): Promise<boolean> {
  if (process.env.ALLOW_PUBLIC_REGISTER === "true") return true;
  const n = await prisma.user.count();
  return n === 0;
}

/** Public: which auth options the UI may show */
router.get("/config", async (_req, res) => {
  const allowRegister = await isRegisterAllowed();
  res.json({
    googleEnabled: isGoogleOAuthConfigured,
    allowRegister,
  });
});

router.post("/register", async (req, res) => {
  try {
    const allowed = await isRegisterAllowed();
    if (!allowed) {
      res.status(403).json({
        message:
          "Registration is disabled. Set ALLOW_PUBLIC_REGISTER=true or use the first account only.",
      });
      return;
    }

    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Invalid body",
        issues: parsed.error.flatten(),
      });
      return;
    }

    const email = parsed.data.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ message: "Email already registered" });
      return;
    }

    const hash = await bcrypt.hash(parsed.data.password, 10);
    const user = await prisma.user.create({
      data: { email, password: hash },
    });

    res.status(201).json({
      token: signToken(user.id),
      user: { id: user.id, email: user.email },
    });
  } catch (e) {
    console.error("register error", e);
    res.status(500).json({ message: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid body", issues: parsed.error.flatten() });
      return;
    }
    const email = parsed.data.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.password) {
      res.status(401).json({
        message: user
          ? "This account uses Google sign-in."
          : "Invalid email or password",
      });
      return;
    }
    let ok = false;
    try {
      ok = await bcrypt.compare(parsed.data.password, user.password);
    } catch {
      ok = false;
    }
    if (!ok) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }
    res.json({ token: signToken(user.id), user: { id: user.id, email: user.email } });
  } catch (e) {
    console.error("login error", e);
    res.status(500).json({ message: "Login temporarily unavailable" });
  }
});

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { id: true, email: true },
  });
  if (!user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  res.json(user);
});

router.get("/google", (req, res, next) => {
  if (!isGoogleOAuthConfigured) {
    res.status(503).json({ message: "Google sign-in is not configured on the server." });
    return;
  }
  const passport = getPassport();
  if (!passport) {
    res.status(503).json({ message: "Google sign-in is unavailable. Install server dependencies (npm install)." });
    return;
  }
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })(req, res, next);
});

router.get(
  "/google/callback",
  (req, res, next) => {
    if (!isGoogleOAuthConfigured) {
      res.redirect(`${clientBaseUrl()}/login?error=google_unconfigured`);
      return;
    }
    const passport = getPassport();
    if (!passport) {
      res.redirect(`${clientBaseUrl()}/login?error=google_unconfigured`);
      return;
    }
    passport.authenticate("google", { session: false, failureRedirect: `${clientBaseUrl()}/login?error=google_failed` })(
      req,
      res,
      next
    );
  },
  (req, res) => {
    const u = req.user as { id: string } | undefined;
    if (!u?.id) {
      res.redirect(`${clientBaseUrl()}/login?error=google_failed`);
      return;
    }
    const token = signToken(u.id);
    res.redirect(`${clientBaseUrl()}/auth/callback?token=${encodeURIComponent(token)}`);
  }
);

export default router;
