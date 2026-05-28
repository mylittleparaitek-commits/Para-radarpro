-- Database triggers.
--
-- • handle_new_user: when a user signs up via Supabase Auth, automatically
--   create a matching `public.profiles` row.
-- • set_updated_at: refresh the `updated_at` timestamp on row update.

-- ─── handle_new_user ─────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── set_updated_at ─────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_trends_updated_at on public.trends;
create trigger set_trends_updated_at
  before update on public.trends
  for each row execute function public.set_updated_at();

drop trigger if exists set_newsletter_issues_updated_at on public.newsletter_issues;
create trigger set_newsletter_issues_updated_at
  before update on public.newsletter_issues
  for each row execute function public.set_updated_at();

-- ─── promote_to_admin (admin task, called via service role) ─────────────────

create or replace function public.promote_to_admin(target_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set role = 'admin' where email = target_email;
end;
$$;

-- Lock down: only the service role may call this.
revoke all on function public.promote_to_admin(text) from public;
revoke all on function public.promote_to_admin(text) from anon;
revoke all on function public.promote_to_admin(text) from authenticated;
