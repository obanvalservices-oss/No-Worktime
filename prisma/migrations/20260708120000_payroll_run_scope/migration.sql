-- AlterTable
ALTER TABLE "PayrollRun" ADD COLUMN "payTypeFilter" "PayType",
ADD COLUMN "departmentId" TEXT;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "PayrollRun_departmentId_idx" ON "PayrollRun"("departmentId");
