import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma.js";

/** Ensures MASTER_USER_EMAIL exists with MASTER_USER_PASSWORD (upsert). Omit env vars to skip. */
export async function ensureMasterUser(): Promise<void> {
  const email = process.env.MASTER_USER_EMAIL?.trim().toLowerCase();
  const password = process.env.MASTER_USER_PASSWORD;

  if (!email || !password) return;

  const hash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    create: { email, password: hash },
    update: { password: hash },
  });
  console.log(`[bootstrap] Master user ensured: ${email}`);
}
