-- ParaRadar Pro — initial schema
-- Migration: 0001_initial.sql
--
-- Idempotent: safe to re-run. Creates enum types, tables, and indexes.
-- Run AFTER you've enabled the `pgcrypto` extension (used by gen_random_uuid).

create extension if not exists "pgcrypto";

-- ─── Enum types ──────────────────────────────────────────────────────────────

do $$ begin
  create type subscription_plan as enum ('free', 'pro', 'business', 'premium');
exception when duplicate_object then null; end $$;

do $$ begin
  create type pharmacy_size as enum ('small', 'medium', 'large');
exception when duplicate_object then null; end $$;

do $$ begin
  create type confidence_level as enum ('low', 'medium', 'high', 'very_high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type risk_level as enum ('none', 'low', 'medium', 'high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type margin_level as enum ('low', 'medium', 'high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type recommended_action as enum (
    'buy_now', 'buy_carefully', 'watch', 'do_not_buy',
    'seo_only', 'highlight_stock', 'regulatory_caution'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type trend_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type newsletter_status as enum ('draft', 'published');
exception when duplicate_object then null; end $$;

do $$ begin
  create type data_source as enum (
    'google_trends', 'tiktok', 'amazon', 'instagram', 'web', 'perplexity'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum (
    'active', 'trialing', 'past_due', 'canceled', 'incomplete', 'inactive'
  );
exception when duplicate_object then null; end $$;

-- ─── profiles ────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  company_name text,
  pharmacy_size pharmacy_size,
  ecommerce_volume text,
  role text not null default 'user' check (role in ('user', 'admin')),
  subscription_plan subscription_plan not null default 'free',
  stripe_customer_id text unique,
  stripe_subscription_id text,
  subscription_status subscription_status not null default 'inactive',
  subscription_ends_at timestamptz,
  preferences jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_signed_in_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_stripe_customer_idx on public.profiles (stripe_customer_id);

-- ─── trends ──────────────────────────────────────────────────────────────────

create table if not exists public.trends (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  normalized_keyword text not null unique,
  category text,
  subcategory text,
  description text,

  -- Scores (0-100)
  trend_score numeric(5,2) not null default 0,
  buy_score numeric(5,2) not null default 0,
  confidence_level confidence_level not null default 'medium',
  seasonality_score numeric(5,2) not null default 0,
  novelty_score numeric(5,2) not null default 0,
  buzz_score numeric(5,2) not null default 0,
  risk_score numeric(5,2) not null default 0,
  margin_potential margin_level not null default 'medium',
  stock_risk risk_level not null default 'low',
  regulatory_risk risk_level not null default 'low',

  -- Growth percentages
  growth_7d numeric(7,2) not null default 0,
  growth_30d numeric(7,2) not null default 0,
  growth_90d numeric(7,2) not null default 0,
  yoy_growth numeric(7,2) not null default 0,

  -- Source breakdown (each 0-100)
  source_google numeric(5,2) not null default 0,
  source_tiktok numeric(5,2) not null default 0,
  source_amazon numeric(5,2) not null default 0,
  source_instagram numeric(5,2) not null default 0,
  source_web numeric(5,2) not null default 0,
  dominant_source data_source,

  -- Seasonality
  seasonality_months int[],
  seasonality_label text,

  -- Recommendation
  recommended_action recommended_action not null default 'watch',
  suggested_qty_small int not null default 0,
  suggested_qty_medium int not null default 0,
  suggested_qty_large int not null default 0,

  -- Content
  seo_keywords text[],
  social_content_ideas text[],
  counter_questions text[],
  evidence_links text[],
  executive_summary text,
  why_it_rises text,
  regulatory_notes text,

  -- Charts (jsonb arrays of {date, value})
  chart_data_7d jsonb,
  chart_data_30d jsonb,
  chart_data_90d jsonb,

  -- Status
  status trend_status not null default 'draft',
  is_validated boolean not null default false,
  is_featured boolean not null default false,

  detected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trends_status_idx on public.trends (status);
create index if not exists trends_category_idx on public.trends (category);
create index if not exists trends_trend_score_idx on public.trends (trend_score desc);
create index if not exists trends_buy_score_idx on public.trends (buy_score desc);
create index if not exists trends_recommended_action_idx on public.trends (recommended_action);
create index if not exists trends_detected_at_idx on public.trends (detected_at desc);

-- ─── product_recommendations ────────────────────────────────────────────────

create table if not exists public.product_recommendations (
  id uuid primary key default gen_random_uuid(),
  trend_id uuid not null references public.trends(id) on delete cascade,
  product_name text not null,
  brand text,
  format text,
  category text,
  reason text,
  recommended_qty int not null default 0,
  risk margin_level not null default 'medium',
  estimated_margin_level margin_level not null default 'medium',
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  supplier_notes text,
  created_at timestamptz not null default now()
);

create index if not exists product_recommendations_trend_idx on public.product_recommendations (trend_id);

-- ─── newsletter_issues ──────────────────────────────────────────────────────

create table if not exists public.newsletter_issues (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  week text not null,
  summary text,
  top_trend_ids uuid[] not null default '{}',
  watchlist_ids uuid[] not null default '{}',
  buy_now_ids uuid[] not null default '{}',
  avoid_or_wait_ids uuid[] not null default '{}',
  content_ideas text[] not null default '{}',
  generated_html text,
  generated_markdown text,
  status newsletter_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists newsletter_issues_status_idx on public.newsletter_issues (status);
create index if not exists newsletter_issues_week_idx on public.newsletter_issues (week desc);
