-- Stripe events — used for webhook idempotence.
-- Migration: 0002_stripe_events.sql
--
-- Every Stripe event id is inserted before processing. If the insert
-- conflicts (duplicate id), the webhook handler treats the delivery as
-- already-processed and returns 200 without re-running side effects.

create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

create index if not exists stripe_events_type_idx on public.stripe_events (type);
create index if not exists stripe_events_processed_at_idx on public.stripe_events (processed_at desc);
