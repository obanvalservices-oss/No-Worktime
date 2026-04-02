import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  userId?: string;
}

const secret = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return s;
};

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  try {
    const token = h.slice(7);
    const p = jwt.verify(token, secret()) as { sub: string };
    req.userId = p.sub;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, secret(), { expiresIn: "7d" });
}
