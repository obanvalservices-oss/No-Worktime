import express from "express";
import cors from "cors";
import { passportInitialize } from "./config/passport.js";
import authRoutes from "./routes/auth.js";
import companiesRoutes from "./routes/companies.js";
import departmentsRoutes from "./routes/departments.js";
import employeesRoutes from "./routes/employees.js";
import payrollRoutes from "./routes/payroll.js";

export function createApp() {
  const app = express();
  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN?.split(",") ?? ["http://localhost:5173"],
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(passportInitialize());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRoutes);
  app.use("/api/companies", companiesRoutes);
  app.use("/api/departments", departmentsRoutes);
  app.use("/api/employees", employeesRoutes);
  app.use("/api/payroll", payrollRoutes);

  return app;
}
