"use strict";

const { spawnSync } = require("child_process");

const MIGRATE_TIMEOUT_MS = 90_000;

function isPoolerUrl(url) {
  if (!url) return false;
  return (
    /:6543\b/.test(url) ||
    /pgbouncer=true/i.test(url) ||
    /pooler\.supabase\.com/i.test(url)
  );
}

/** URL suitable for prisma migrate deploy (direct Postgres, not pooler). */
function resolveMigrateDirectUrl() {
  const direct = process.env.DIRECT_URL?.trim();
  if (direct && !isPoolerUrl(direct)) return direct;

  const db = process.env.DATABASE_URL?.trim();
  if (db && !isPoolerUrl(db)) return db;

  return null;
}

function run(label, command, args, timeoutMs) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
    timeout: timeoutMs,
  });
  if (result.error?.code === "ETIMEDOUT") {
    console.error(
      `[railway-start] ${label} timed out after ${timeoutMs}ms — use DIRECT_URL (Supabase :5432 direct), not the pooler.`
    );
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`[railway-start] ${label} failed with exit code ${result.status ?? 1}`);
    process.exit(result.status ?? 1);
  }
}

// Prisma schema requires DIRECT_URL at runtime; pooler DATABASE_URL is fine for queries.
if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

const migrateUrl = resolveMigrateDirectUrl();
if (migrateUrl) {
  process.env.DIRECT_URL = migrateUrl;
  console.log("[railway-start] Running prisma migrate deploy (direct connection)…");
  run("migrate", "npx", ["prisma", "migrate", "deploy"], MIGRATE_TIMEOUT_MS);
} else {
  console.warn(
    "[railway-start] SKIP prisma migrate deploy: DATABASE_URL is the Supabase pooler (:6543). " +
      "Set DIRECT_URL to db.<project>.supabase.co:5432 in Railway, or run: railway run npx prisma migrate deploy"
  );
}

const port = String(process.env.PORT || "3000");
console.log(`[railway-start] Starting Next.js on 0.0.0.0:${port}`);
run("next", "npx", ["next", "start", "-H", "0.0.0.0", "-p", port]);
