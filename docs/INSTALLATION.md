# Installation

Step-by-step setup. About 30 minutes if Supabase and Stripe are already in place.

## 1. Prerequisites

- Node.js ≥ 20.10
- pnpm 9 (`npm install -g pnpm`)
- A Supabase project (free tier is enough to start)
- A Stripe account (test mode is fine)

## 2. Install dependencies

```bash
pnpm install
```

## 3. Supabase setup

1. Create a project on [supabase.com](https://supabase.com/dashboard).
2. In **Project Settings → API**, copy the **URL**, the **anon key**, and the **service-role key** into `.env.local` (next step).
3. In **SQL Editor**, run the four files **in order**:
   - `db/migrations/0001_initial.sql` — tables + enums
   - `db/migrations/0002_stripe_events.sql` — webhook idempotence table
   - `db/policies/rls.sql` — Row Level Security
   - `db/policies/triggers.sql` — auto-create profile on signup
4. (Optional) In **Authentication → URL Configuration**, set the **Site URL** to `http://localhost:3000` for dev. Add `https://pararadar.pro` for prod.

## 4. Stripe setup

1. In the [Stripe Dashboard](https://dashboard.stripe.com/test/products), create three **products** with **recurring monthly EUR** prices:
   - **Pro** — 19 € / month
   - **Business** — 49 € / month
   - **Premium** — 99 € / month
2. Copy each Price ID (starts with `price_`) into `.env.local` (`STRIPE_PRICE_ID_PRO`, etc.).
3. Create a **webhook endpoint** (in dev, use the CLI — see below). In prod, point it at `https://your-domain.com/api/stripe/webhook` and subscribe to: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.created`, `invoice.payment_failed`.
4. Copy the webhook signing secret (`whsec_…`) into `.env.local` as `STRIPE_WEBHOOK_SECRET`.

## 5. Environment variables

```bash
cp .env.example .env.local
```

Fill in everything except `PERPLEXITY_API_KEY` (optional for the qualitative-research pipeline). Keep `DATA_SOURCE_MODE=mock` until you wire real connectors.

## 6. Seed mock data

```bash
pnpm db:seed
```

This populates the database with 6 ready-to-display French parapharmacy trends. You can re-run any time — it's idempotent (upsert on `normalized_keyword`).

## 7. Run

```bash
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000). Create an account at `/register` — your profile row will be auto-created by the `handle_new_user` trigger.

## 8. Promote your account to admin (optional)

In the Supabase SQL editor:

```sql
select public.promote_to_admin('you@example.com');
```

You'll then see the **Admin** sidebar entry on next reload.

## 9. Webhook testing

In a second terminal:

```bash
pnpm stripe:listen
```

This forwards Stripe events to your local `/api/stripe/webhook`. Try a checkout from `/pricing` — the webhook will update your `profiles.subscription_plan`.

## 10. Generate a weekly newsletter

```bash
pnpm tsx scripts/generate-weekly-newsletter.ts
```

Creates a draft issue from the top 15 published trends.

---

## Troubleshooting

- **"Profile not found" after signup** — the `handle_new_user` trigger from `db/policies/triggers.sql` is required. Re-run that file.
- **Stripe webhook fails with `signature` error** — `STRIPE_WEBHOOK_SECRET` must match the secret of the active webhook endpoint (different between CLI and dashboard).
- **`SUPABASE_SERVICE_ROLE_KEY` errors at build time on Vercel** — make sure the env var is set in the Vercel project settings, not just locally.
- **No trends visible in the dashboard** — run `pnpm db:seed`. Make sure the mock trends have `status = 'published'`.
