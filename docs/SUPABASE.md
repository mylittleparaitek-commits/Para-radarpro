# Supabase

ParaRadar Pro v2 uses Supabase for:

- **Postgres** — single data layer (no Drizzle, no ORM)
- **Auth** — email/password + magic link, optionally OAuth providers
- **Row Level Security** — defense-in-depth for plan gating

## Project setup

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. In **Settings → API**, copy the three credentials into `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` ← **server-only, never expose to the browser**

## Running migrations

In the Supabase SQL editor, run **in order**:

1. `db/migrations/0001_initial.sql` — enum types + 4 tables (profiles, trends, product_recommendations, newsletter_issues) + indexes
2. `db/migrations/0002_stripe_events.sql` — webhook idempotence table
3. `db/policies/rls.sql` — RLS policies + helper functions (`is_admin`, `current_plan`, `plan_rank`)
4. `db/policies/triggers.sql` — `handle_new_user` + `set_updated_at` + `promote_to_admin`

All four are **idempotent** — safe to re-run.

## RLS model

| Table | Anon / Authenticated | Service role | Admin (role='admin') |
| --- | --- | --- | --- |
| `profiles` | own row only (read + update) | all | all |
| `trends` | `status='published'` (read only) | all | all (incl. CUD) |
| `product_recommendations` | read only if plan ≥ `pro` | all | all (incl. CUD) |
| `newsletter_issues` | `status='published'` (read only) | all | all (incl. CUD) |
| `stripe_events` | no access | all | no access |

The helper functions encapsulate the "is admin" / "current plan rank" predicates so the policies stay declarative.

## Auth flow

1. User signs up at `/register` with email + password.
2. Supabase fires `auth.users INSERT`.
3. The `handle_new_user` trigger creates a matching `public.profiles` row with `subscription_plan = 'free'`.
4. Supabase sends a confirmation email. User clicks → `/auth/callback?code=…` → `exchangeCodeForSession` → cookie set → redirect to `/dashboard`.
5. The `middleware.ts` file refreshes the session cookie on every request.

Server Components call `getCurrentUser()` (`lib/auth/session.ts`) which combines `supabase.auth.getUser()` with the profile row.

## Promoting yourself to admin

In the SQL editor:

```sql
select public.promote_to_admin('you@example.com');
```

The `promote_to_admin` function is `security definer` and **revoked from anon/authenticated** — only the service role (i.e. the SQL editor running as superuser) can call it.

## Type generation

Hand-written types live in `types/database.ts` as a fallback. To regenerate from your live schema:

```bash
pnpm dlx supabase gen types typescript --project-id <your-project-ref> --schema public > types/database.generated.ts
```

Then swap the import in `lib/supabase/{client,server,admin}.ts` to point at the generated file.

## Plan gating — defense in depth

Plan limits are enforced at **three** levels:

1. **UI** — `<PlanGate>` shows a paywall card.
2. **API / Server Actions** — `requirePlan()` throws `PlanRequiredError`.
3. **Database (RLS)** — the `products_read_pro_plus` policy uses `current_plan()` to block the SELECT entirely.

A bug at one level is caught by the next. The DB layer is the last line: even a misconfigured API route can't leak Pro-only data to a free user.

## Backup & recovery

- Supabase free tier: daily auto-backups, 7-day retention.
- Pro tier: PITR (point-in-time recovery), 7-day retention; daily backups 30-day retention.
- For local snapshots: `pg_dump --schema=public` against the Supabase connection string.

## Common gotchas

- **"Profile not found" after signup** — the `handle_new_user` trigger from `db/policies/triggers.sql` wasn't installed. Re-run the file.
- **RLS blocks reads even for the owner** — check that you're using `lib/supabase/server.ts` (with the session cookie) not `lib/supabase/admin.ts` (which bypasses RLS but doesn't know who you are).
- **`SUPABASE_SERVICE_ROLE_KEY` accidentally exposed** — that key bypasses RLS entirely. If it leaks, rotate it in **Project Settings → API → Reset service role key** immediately.
