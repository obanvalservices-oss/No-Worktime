import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

async function assertCompany(userId: string, companyId: string) {
  return prisma.company.findFirst({
    where: { id: companyId, ownerId: userId },
  });
}

router.get("/company/:companyId", async (req: AuthRequest, res) => {
  const companyId = req.params.companyId;
  if (!(await assertCompany(req.userId!, companyId))) {
    res.status(404).json({ message: "Company not found" });
    return;
  }
  const rows = await prisma.department.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    include: { _count: { select: { employees: true } } },
  });
  res.json(rows);
});

const createSchema = z.object({
  name: z.string().min(1),
  kind: z.string().optional(),
});

router.post("/company/:companyId", async (req: AuthRequest, res) => {
  const companyId = req.params.companyId;
  if (!(await assertCompany(req.userId!, companyId))) {
    res.status(404).json({ message: "Company not found" });
    return;
  }
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }
  const d = await prisma.department.create({
    data: {
      companyId,
      name: parsed.data.name.trim(),
      kind: parsed.data.kind?.trim() || null,
    },
  });
  res.status(201).json(d);
});

router.patch("/:id", async (req: AuthRequest, res) => {
  const id = req.params.id;
  const dep = await prisma.department.findUnique({
    where: { id },
    include: { company: true },
  });
  if (!dep || dep.company.ownerId !== req.userId) {
    res.status(404).json({ message: "Not found" });
    return;
  }
  const parsed = createSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }
  const d = await prisma.department.update({
    where: { id },
    data: {
      ...(parsed.data.name != null ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.kind !== undefined
        ? { kind: parsed.data.kind?.trim() || null }
        : {}),
    },
  });
  res.json(d);
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const id = req.params.id;
  const dep = await prisma.department.findUnique({
    where: { id },
    include: { company: true },
  });
  if (!dep || dep.company.ownerId !== req.userId) {
    res.status(404).json({ message: "Not found" });
    return;
  }
  await prisma.department.delete({ where: { id } });
  res.status(204).send();
});

export default router;
