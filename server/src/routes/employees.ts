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
  const rows = await prisma.employee.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    include: { department: { select: { id: true, name: true, kind: true } } },
  });
  res.json(rows);
});

const employeeSchema = z.object({
  departmentId: z.string().min(1),
  name: z.string().min(1),
  payType: z.enum(["HOURLY", "SALARY"]),
  hourlyRate: z.number().nonnegative().optional().nullable(),
  weeklyBaseSalary: z.number().nonnegative().optional().nullable(),
  overtimeThreshold: z.number().positive().optional(),
  overtimeMultiplier: z.number().positive().optional(),
  isActive: z.boolean().optional(),
});

router.post("/company/:companyId", async (req: AuthRequest, res) => {
  const companyId = req.params.companyId;
  if (!(await assertCompany(req.userId!, companyId))) {
    res.status(404).json({ message: "Company not found" });
    return;
  }
  const parsed = employeeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body", issues: parsed.error.flatten() });
    return;
  }
  const dep = await prisma.department.findFirst({
    where: { id: parsed.data.departmentId, companyId },
  });
  if (!dep) {
    res.status(400).json({ message: "Invalid department" });
    return;
  }
  if (parsed.data.payType === "HOURLY" && (parsed.data.hourlyRate == null || parsed.data.hourlyRate <= 0)) {
    res.status(400).json({ message: "Hourly employees need hourlyRate > 0" });
    return;
  }
  if (parsed.data.payType === "SALARY" && (parsed.data.weeklyBaseSalary == null || parsed.data.weeklyBaseSalary < 0)) {
    res.status(400).json({ message: "Salary employees need weeklyBaseSalary" });
    return;
  }
  const e = await prisma.employee.create({
    data: {
      companyId,
      departmentId: parsed.data.departmentId,
      name: parsed.data.name.trim(),
      payType: parsed.data.payType,
      hourlyRate: parsed.data.payType === "HOURLY" ? parsed.data.hourlyRate : null,
      weeklyBaseSalary: parsed.data.payType === "SALARY" ? parsed.data.weeklyBaseSalary : null,
      overtimeThreshold: parsed.data.overtimeThreshold ?? 40,
      overtimeMultiplier: parsed.data.overtimeMultiplier ?? 1.5,
      isActive: parsed.data.isActive ?? true,
    },
    include: { department: true },
  });
  res.status(201).json(e);
});

router.patch("/:id", async (req: AuthRequest, res) => {
  const id = req.params.id;
  const existing = await prisma.employee.findUnique({
    where: { id },
    include: { company: true },
  });
  if (!existing || existing.company.ownerId !== req.userId) {
    res.status(404).json({ message: "Not found" });
    return;
  }
  const parsed = employeeSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body" });
    return;
  }
  if (parsed.data.departmentId) {
    const dep = await prisma.department.findFirst({
      where: { id: parsed.data.departmentId, companyId: existing.companyId },
    });
    if (!dep) {
      res.status(400).json({ message: "Invalid department" });
      return;
    }
  }
  const payType = parsed.data.payType ?? existing.payType;
  const e = await prisma.employee.update({
    where: { id },
    data: {
      ...(parsed.data.departmentId ? { departmentId: parsed.data.departmentId } : {}),
      ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.payType ? { payType: parsed.data.payType } : {}),
      ...(parsed.data.hourlyRate !== undefined
        ? { hourlyRate: payType === "HOURLY" ? parsed.data.hourlyRate : null }
        : {}),
      ...(parsed.data.weeklyBaseSalary !== undefined
        ? {
            weeklyBaseSalary:
              payType === "SALARY" ? parsed.data.weeklyBaseSalary : null,
          }
        : {}),
      ...(parsed.data.overtimeThreshold != null
        ? { overtimeThreshold: parsed.data.overtimeThreshold }
        : {}),
      ...(parsed.data.overtimeMultiplier != null
        ? { overtimeMultiplier: parsed.data.overtimeMultiplier }
        : {}),
      ...(parsed.data.isActive != null ? { isActive: parsed.data.isActive } : {}),
    },
    include: { department: true },
  });
  res.json(e);
});

router.delete("/:id", async (req: AuthRequest, res) => {
  const id = req.params.id;
  const existing = await prisma.employee.findUnique({
    where: { id },
    include: { company: true },
  });
  if (!existing || existing.company.ownerId !== req.userId) {
    res.status(404).json({ message: "Not found" });
    return;
  }
  await prisma.employee.delete({ where: { id } });
  res.status(204).send();
});

export default router;
