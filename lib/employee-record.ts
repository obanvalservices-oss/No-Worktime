import { prisma } from "@/lib/prisma";

export async function getEmployeeForUser(userId: string) {
  return prisma.employee.findFirst({
    where: { userId },
    include: { company: { select: { id: true, name: true } } },
  });
}
