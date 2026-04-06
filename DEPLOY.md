# Deploying NO Worktime (Railway + Supabase)

Production domain: **https://no-worktime.nestorobando.com**

## 1. Supabase (PostgreSQL)

1. Create a project at [supabase.com](https://supabase.com).
2. **Settings → Database → Connection string → URI** (use the **direct** Postgres connection on port **5432**, not the transaction pooler, unless you configure `directUrl` in `prisma/schema.prisma`).
3. Append `?sslmode=require` if not already present.
4. Copy the URI into Railway as `DATABASE_URL`.

## 2. Railway

1. **New project → Deploy from GitHub** (this repo).
2. Add **variables** (see `.env.example`):
   - `DATABASE_URL`
   - `JWT_SECRET` (long random string)
   - `NEXT_PUBLIC_APP_URL` = `https://no-worktime.nestorobando.com`
   - `MASTER_USER_EMAIL` / `MASTER_USER_PASSWORD` (strong password in production)
   - `ALLOW_PUBLIC_REGISTER` = `false` unless you want open signup
   - Optional: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
3. **Build**: Nixpacks runs `npm run build` (`prisma generate` + `next build`).
4. **Start**: `railway.toml` runs `npx prisma migrate deploy && npm run start` so the Postgres schema is applied before the server listens.
5. **Custom domain**: Project → **Settings → Networking → Custom domain** → `no-worktime.nestorobando.com` and add the DNS records Railway shows (CNAME or A).

## 3. Google OAuth (optional)

In [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → OAuth 2.0 Client:

- **Authorized redirect URI**:  
  `https://no-worktime.nestorobando.com/api/auth/google/callback`
- Set `GOOGLE_CALLBACK_URL` to the same value in Railway.

## 4. Local development with Postgres

Use a local Postgres or a Supabase dev branch. Set `DATABASE_URL` in `.env`, then:

```bash
npx prisma migrate dev
npm run dev
```

SQLite is no longer used; the baseline migration is PostgreSQL-only.

## 5. Environment checklist

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Postgres (Supabase direct 5432 recommended) |
| `JWT_SECRET` | Yes | |
| `NEXT_PUBLIC_APP_URL` | Yes in prod | No trailing slash |
| `MASTER_USER_EMAIL` / `MASTER_USER_PASSWORD` | Recommended | Bootstrap admin |
| `GOOGLE_*` | Optional | Match redirect URI exactly |

Railway sets `PORT` and `NODE_ENV=production` automatically.
