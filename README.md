# ParaRadar Pro v2

**L'intelligence des tendances parapharmacie** — détectez les produits qui montent avant vos concurrents grâce à l'analyse multi-sources (Google Trends, TikTok, Amazon, Instagram).

## Stack

- **Next.js 15** (App Router, React 19, Server Components, Server Actions)
- **Supabase** (Postgres + Auth + RLS) as the only data layer
- **Stripe** for billing (Pro 19 €, Business 49 €, Premium 99 €)
- **Tailwind CSS** + minimal shadcn-style UI primitives
- **TypeScript strict** (no `any`, no implicit returns, indexed access checks)
- **Zod** for runtime validation at every trust boundary
- **Recharts** for the trend charts

## Quick start

```bash
pnpm install
cp .env.example .env.local        # then fill in Supabase + Stripe values
# In your Supabase SQL editor, run (in order):
#   db/migrations/0001_initial.sql
#   db/migrations/0002_stripe_events.sql
#   db/policies/rls.sql
#   db/policies/triggers.sql
pnpm db:seed                      # populates 6+ mock trends
pnpm dev                          # http://localhost:3000
```

In another terminal (for webhook testing):

```bash
pnpm stripe:listen
```

## Docs

| Doc | Purpose |
| --- | --- |
| [`docs/INSTALLATION.md`](./docs/INSTALLATION.md) | Step-by-step setup (Supabase + Stripe + env) |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Layer diagram, folder map, design decisions |
| [`docs/DATA_SOURCES.md`](./docs/DATA_SOURCES.md) | How to wire each connector. Eligibility notes. |
| [`docs/SCORING.md`](./docs/SCORING.md) | Trend / Buy score formulas. Action thresholds. |
| [`docs/STRIPE.md`](./docs/STRIPE.md) | Stripe setup, webhook, idempotence |
| [`docs/SUPABASE.md`](./docs/SUPABASE.md) | Supabase setup, RLS, admin promotion |

## What's different from v1

| | v1 (Manus template) | v2 (this) |
| --- | --- | --- |
| Framework | Vite + Express + tRPC + wouter | Next.js 15 App Router |
| DB | Drizzle / MySQL | Supabase / Postgres |
| Auth | Manus runtime (locked-in) | Supabase Auth (portable) |
| Scoring | hardcoded in seed | `lib/scoring/` (pure functions, unit-testable) |
| Connectors | mocked | `lib/data-sources/` (typed interface, mock + real stubs) |
| Webhook idempotence | none | `stripe_events` table |
| TS strictness | `as any` everywhere | `strict + noUncheckedIndexedAccess + noImplicitReturns` |
| Newsletter | inline in router | `lib/newsletter/` (pure, templated, HTML + Markdown) |

## License

Proprietary. © 2026 — All rights reserved.
