import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: AuthRequest, res) => {
  const list = await prisma.company.findMany({
    where: { ownerId: req.userId! },
    orderBy: { name: "asc" },
    include: { _count: { select: { departments: true, employees: true } } },
  });
  res.json(list);
});

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

router.post("/", async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }
  const c = await prisma.company.create({
    data: {
      ownerId: req.userId!,
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || null,
    },
  });
  res.status(201).json(c);
});

router.patch("/:id", async (req: AuthRequest, res) => {
  const id = req.params.id;
  const parsed = createSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }
  const existing = await prisma.company.findFirst({
    where: { id, ownerId: req.userId! },
  });
  if (!existing) {
    res.status(404).json({ message: "Not found" });
    return;
  }
  const c = await prisma.company.update({
    where: { id },
    data: {
      ...(parsed.data.name != null ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description?.trim() || null }
        : {}),
    },
  });
  res.json(c);
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const id = req.params.id;
  const existing = await prisma.company.findFirst({
    where: { id, ownerId: req.userId! },
  });
  if (!existing) {
    res.status(404).json({ message: "Not found" });
    return;
  }
  await prisma.company.delete({ where: { id } });
  res.status(204).send();
});

export default router;
