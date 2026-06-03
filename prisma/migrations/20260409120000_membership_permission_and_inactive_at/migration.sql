-- AlterTable
ALTER TABLE "CompanyMembership" ADD COLUMN "canEditFinalizedPayroll" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "inactiveAt" TEXT;
