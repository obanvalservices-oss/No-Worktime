-- Optional manual hour overrides and extra rate/hour segments (hourly lines)

ALTER TABLE "PayrollLine" ADD COLUMN IF NOT EXISTS "manualRegularHours" DOUBLE PRECISION;
ALTER TABLE "PayrollLine" ADD COLUMN IF NOT EXISTS "manualTotalHours" DOUBLE PRECISION;
ALTER TABLE "PayrollLine" ADD COLUMN IF NOT EXISTS "extraRateSegments" JSONB NOT NULL DEFAULT '[]'::jsonb;
