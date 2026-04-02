import "dotenv/config";
import { createApp } from "./app.js";
import { loadPassport } from "./config/passport.js";
import { ensureMasterUser } from "./bootstrap/ensureMasterUser.js";

const PORT = Number(process.env.PORT) || 4000;

async function main() {
  if (!process.env.JWT_SECRET) {
    console.error("Set JWT_SECRET in .env");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("Set DATABASE_URL in .env");
    process.exit(1);
  }

  await ensureMasterUser();
  await loadPassport();

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Payroll API http://localhost:${PORT}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
