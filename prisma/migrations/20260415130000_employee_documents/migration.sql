-- CreateEnum
CREATE TYPE "EmployeeDocumentStatus" AS ENUM ('PENDING_SIGNATURE', 'SIGNED');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "EmployeeDocument" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "originalData" BYTEA NOT NULL,
    "status" "EmployeeDocumentStatus" NOT NULL DEFAULT 'PENDING_SIGNATURE',
    "uploadedByUserId" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3),
    "signaturePayload" JSONB,
    "signatureImage" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployeeDocument_employeeId_idx" ON "EmployeeDocument"("employeeId");

CREATE INDEX "EmployeeDocument_companyId_idx" ON "EmployeeDocument"("companyId");

CREATE INDEX "EmployeeDocument_status_idx" ON "EmployeeDocument"("status");

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
