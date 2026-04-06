# Payroll (fullstack)

Multi-company payroll with departments, hourly (7-day time entry) and salary employees, weekly periods, calculations, and printable reports.

## Stack

- **App**: Next.js 15 (App Router), React 19, Tailwind CSS 4, Framer Motion
- **API**: Next.js Route Handlers (`app/api/**`)
- **Data**: Prisma, PostgreSQL (e.g. Supabase) or SQLite for local experiments

## Quick start (Next.js)

```bash
cp .env.example .env
# Set DATABASE_URL, DIRECT_URL (Supabase pooler + direct), JWT_SECRET, etc.

npm install
npx prisma migrate deploy
npm run dev
```

App: `http://localhost:3000`

Default login (after migrate + first boot): values from `.env` → `MASTER_USER_EMAIL` / `MASTER_USER_PASSWORD`.

### Optional: legacy Express API (`server/`)

```bash
cd server
cp .env.example .env
npm install
npx prisma migrate deploy
npm run dev
```

API: `http://localhost:4000`

## Workflow

1. Create a **company** (dashboard).
2. Add **departments** (cost centers / farms / workplaces).
3. Add **employees** (hourly or salary).
4. **Payroll** → new run → pick **exactly 7 days** → enter **HH:mm** times for hourly staff → **Calculate** → **Finalize** → **Print report**.

## Production notes

- Set a strong `JWT_SECRET` and secure `MASTER_USER_PASSWORD` (or remove master bootstrap after creating users).
- Use PostgreSQL in production; with Supabase transaction pooler, set `DATABASE_URL` (port 6543, `pgbouncer=true`) and `DIRECT_URL` (direct `db.*.supabase.co:5432`) for Prisma migrations.
- Set `NEXT_PUBLIC_APP_URL` for correct OAuth redirects and metadata.
