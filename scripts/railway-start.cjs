"use strict";

const { spawnSync } = require("child_process");

if (!process.env.DIRECT_URL && process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

function run(label, command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`[railway-start] ${label} failed with exit code ${result.status ?? 1}`);
    process.exit(result.status ?? 1);
  }
}

run("migrate", "npx", ["prisma", "migrate", "deploy"]);

const port = String(process.env.PORT || "3000");
console.log(`[railway-start] Starting Next.js on 0.0.0.0:${port}`);
run("next", "npx", ["next", "start", "-H", "0.0.0.0", "-p", port]);
