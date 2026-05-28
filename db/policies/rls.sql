-- Row Level Security policies for ParaRadar Pro.
--
-- Conceptual model:
--   • profiles: each user can only see/update their own row. Admins can do
--     everything (admin = role = 'admin' on their own profile row).
--   • trends: anyone (anon + authenticated) can read `status = 'published'`.
--     Admins can read everything and do CUD.
--   • product_recommendations: read requires the user's plan to be >= 'pro'.
--     Admins can do CUD.
--   • newsletter_issues: published rows are readable by anyone. Drafts only
--     by admins.
--   • stripe_events: NEVER exposed to anon/authenticated. Service role only.

-- ─── Enable RLS on every public table ────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.trends enable row level security;
alter table public.product_recommendations enable row level security;
alter table public.newsletter_issues enable row level security;
alter table public.stripe_events enable row level security;

-- ─── Helper: is_admin() ──────────────────────────────────────────────────────

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ─── Helper: current_plan() ──────────────────────────────────────────────────

create or replace function public.current_plan()
returns subscription_plan
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select subscription_plan from public.profiles where id = auth.uid()),
    'free'::subscription_plan
  );
$$;

-- ─── Helper: plan_meets(required) ────────────────────────────────────────────
-- Maps the enum to an ordinal and compares.

create or replace function public.plan_rank(p subscription_plan)
returns int
language sql
immutable
as $$
  select case p
    when 'free' then 0
    when 'pro' then 1
    when 'business' then 2
    when 'premium' then 3
  end;
$$;

-- ─── profiles policies ──────────────────────────────────────────────────────

drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- No insert/delete policy on profiles — those go through the
-- `handle_new_user` trigger (insert) and the service role (delete).

-- ─── trends policies ────────────────────────────────────────────────────────

drop policy if exists "trends_read_published" on public.trends;
create policy "trends_read_published"
  on public.trends for select
  using (status = 'published' or public.is_admin());

drop policy if exists "trends_admin_write" on public.trends;
create policy "trends_admin_write"
  on public.trends for all
  using (public.is_admin())
  with check (public.is_admin());

-- ─── product_recommendations policies ───────────────────────────────────────

drop policy if exists "products_read_pro_plus" on public.product_recommendations;
create policy "products_read_pro_plus"
  on public.product_recommendations for select
  using (
    public.is_admin()
    or public.plan_rank(public.current_plan()) >= public.plan_rank('pro')
  );

drop policy if exists "products_admin_write" on public.product_recommendations;
create policy "products_admin_write"
  on public.product_recommendations for all
  using (public.is_admin())
  with check (public.is_admin());

-- ─── newsletter_issues policies ─────────────────────────────────────────────

drop policy if exists "newsletters_read_published" on public.newsletter_issues;
create policy "newsletters_read_published"
  on public.newsletter_issues for select
  using (status = 'published' or public.is_admin());

drop policy if exists "newsletters_admin_write" on public.newsletter_issues;
create policy "newsletters_admin_write"
  on public.newsletter_issues for all
  using (public.is_admin())
  with check (public.is_admin());

-- ─── stripe_events: service role only (default deny) ────────────────────────

-- No policies = no access for anon/authenticated. The service role bypasses
-- RLS anyway, which is exactly what the webhook handler uses.
