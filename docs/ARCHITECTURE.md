# Architecture

## Layers

```
┌────────────────────────────────────────────────────────────┐
│  UI                — app/, components/                     │
│  ├── (marketing)   public landing, pricing, methodology    │
│  ├── (app)         protected dashboard, trends, newsletter │
│  └── (admin)       admin-only                              │
├────────────────────────────────────────────────────────────┤
│  API & Server Actions  — app/api/, "use server" functions  │
├────────────────────────────────────────────────────────────┤
│  Domain / Business     — lib/scoring/, lib/newsletter/     │
│  Pure functions: TrendSignals → Trend → Newsletter         │
├────────────────────────────────────────────────────────────┤
│  Data access           — lib/supabase/repositories/        │
│  Maps Row ↔ Domain types. No business logic here.          │
├────────────────────────────────────────────────────────────┤
│  Connectors            — lib/data-sources/                 │
│  SourceConnector interface + per-source implementations    │
├────────────────────────────────────────────────────────────┤
│  Infrastructure                                            │
│  ├── Supabase (Postgres + Auth + RLS)                      │
│  ├── Stripe (billing)                                      │
│  └── Optional: Perplexity (qualitative research)           │
└────────────────────────────────────────────────────────────┘
```

The arrows go down: the UI never touches Supabase directly, never imports Stripe, never reads from `data-sources/`. It calls a repository or a server action; the server action composes scoring + repository + connector.

## Folder map

```
app/
├── (marketing)/          public pages
├── (app)/                dashboard, trends, newsletter, settings (auth gated)
├── (admin)/              admin pages (role gated)
├── api/                  REST endpoints + Stripe webhook
├── auth/callback/        Supabase OAuth/magic-link return URL
├── layout.tsx            root layout (Inter font, metadata)
└── globals.css           Tailwind base + design tokens

components/
├── ui/                   button, card, badge, input (shadcn-style)
├── trends/               TrendCard, TrendChart, Badges, TrendFilters
├── newsletter/           NewsletterPreview
├── dashboard/            PlanGate
└── layout/               Sidebar, TopNav

lib/
├── scoring/              ★ Pure business logic — no I/O
│   ├── trendScoring.ts   Trend Score (popularity + growth + buzz)
│   ├── buyScoring.ts     Buy Score + Recommended Action
│   └── seasonalityDetection.ts
├── data-sources/         Connector interface + impls + aggregator
│   ├── sourceConnector.interface.ts    central abstraction
│   ├── {googleTrends, tiktok, amazon, instagram, perplexity}.ts  stubs
│   ├── mockData.ts       6+ realistic French parapharmacy trends
│   └── aggregator.ts     parallel fetch → scoring → Trend draft
├── newsletter/           pure templating, HTML + Markdown
├── ai/perplexity.ts      qualitative research client (never popularity)
├── supabase/             clients + admin + repositories + mappers
├── stripe/               client + plan catalog + checkout + portal + webhook
├── auth/                 session + plan-guard + middleware refresh
└── utils/                cn, format (fr-FR), text

db/
├── migrations/           0001_initial.sql + 0002_stripe_events.sql
└── policies/             rls.sql + triggers.sql

scripts/
├── seed.ts               populates mock trends
└── generate-weekly-newsletter.ts

docs/                     this folder
types/                    index.ts (domain) + database.ts (rows)
```

## Why these decisions

### Supabase over self-hosted Postgres + Drizzle

- Auth + DB + RLS in one piece; no auth runtime lock-in (the v1 Manus template was inseparable from auth).
- RLS lets us push plan-gating to the database level — defense in depth.
- Free tier is enough to ship; Postgres compatible with any migration target later.

### App Router + Server Components

- Server-side data fetching by default = no client-side waterfalls, smaller bundle.
- `"use server"` actions replace half the tRPC ceremony.
- Built-in route groups (`(marketing)`, `(app)`, `(admin)`) for clean layout separation.

### Mock mode as a first-class citizen

`DATA_SOURCE_MODE=mock` (default in `.env.example`) means the entire app is usable end-to-end without a single API key — critical for onboarding and CI.

### Strict TypeScript

`tsconfig.json` enables `noUncheckedIndexedAccess`, `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitOverride`. The `as any` count in v1 dropped from dozens to zero. Connectors throw `ConnectorError` with a typed `code` enum.

### Webhook idempotence

Stripe delivers at least once. The `stripe_events` table stores every processed event id. The handler inserts before processing; on duplicate-key it returns 200 without re-running side effects.

### Pure scoring layer

`lib/scoring/` has zero I/O dependencies — same input → same output. Unit-testable. Easy to validate changes against historical data.

## Trust boundaries

- **Browser → Server**: all route handlers + server actions validate inputs with Zod.
- **Server → Supabase (anon)**: RLS-enforced. Anonymous users see published trends only.
- **Server → Supabase (service role)**: only in `lib/supabase/admin.ts`, guarded by `import "server-only"`. Used by the webhook handler and seed script.
- **Server → Stripe**: signed webhook verification before any DB write.
- **Server → External APIs**: connectors throw typed `ConnectorError`s; the aggregator never crashes the pipeline when one source fails.
