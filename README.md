# Payroll (fullstack)

Multi-company payroll with departments, hourly (7-day time entry) and salary employees, weekly periods, calculations, and printable reports.

## Stack

- **Server**: Node.js, Express, TypeScript, Prisma, SQLite (swap `DATABASE_URL` for PostgreSQL in production)
- **Client**: React 19, Vite 6, Tailwind CSS 4, Framer Motion

## Quick start

### 1. Server

```bash
cd server
cp .env.example .env
npm install
npx prisma migrate deploy
npm run dev
```

API: `http://localhost:4000`  
Default login (after migrate + first boot): values from `.env` → `MASTER_USER_EMAIL` / `MASTER_USER_PASSWORD`.

### 2. Client

```bash
cd client
npm install
npm run dev
```

App: `http://localhost:5173` (proxies `/api` to port 4000).

## Workflow

1. Create a **company** (dashboard).
2. Add **departments** (cost centers / farms / workplaces).
3. Add **employees** (hourly or salary).
4. **Payroll** → new run → pick **exactly 7 days** → enter **HH:mm** times for hourly staff → **Calculate** → **Finalize** → **Print report**.

## Production notes

- Set a strong `JWT_SECRET` and secure `MASTER_USER_PASSWORD` (or remove master bootstrap after creating users).
- Use PostgreSQL: change `provider` and `url` in `server/prisma/schema.prisma` and run migrations.
- Serve the Vite build behind your reverse proxy and point `VITE_API_URL` (or same-origin `/api`) to the API.
