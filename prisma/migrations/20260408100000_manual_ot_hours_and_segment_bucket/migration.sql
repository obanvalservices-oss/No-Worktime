-- Replace manualTotalHours with explicit manualOvertimeHours

ALTER TABLE "PayrollLine" ADD COLUMN IF NOT EXISTS "manualOvertimeHours" DOUBLE PRECISION;

UPDATE "PayrollLine"
SET "manualOvertimeHours" = GREATEST(
  0::double precision,
  COALESCE("manualTotalHours", 0) - COALESCE("manualRegularHours", 0)
)
WHERE "manualTotalHours" IS NOT NULL
  AND "manualRegularHours" IS NOT NULL;

ALTER TABLE "PayrollLine" DROP COLUMN IF EXISTS "manualTotalHours";
