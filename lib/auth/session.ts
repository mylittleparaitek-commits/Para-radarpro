/**
 * Session helpers — wrap Supabase auth + profile fetch.
 *
 * `getCurrentUser` returns the authenticated user + their profile, or null
 * if anonymous. `requireUser` throws / redirects when no user is signed in.
 */

import "server-only";
import { redirect } from "next/navigation";
import { createClient as createServerSupabase } from "../supabase/server";
import { getProfileById } from "../supabase/repositories/profiles";
import type { ProfileRow } from "@/types/database";

export interface CurrentUser {
  id: string;
  email: string;
  profile: ProfileRow;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user || !user.email) return null;

  const profile = await getProfileById(supabase, user.id);
  if (!profile) {
    // Profile row should be created by the `handle_new_user()` trigger.
    // If it's missing, treat as anonymous rather than crashing.
    return null;
  }
  return { id: user.id, email: user.email, profile };
}

export async function requireUser(redirectTo = "/login"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(redirectTo);
  return user;
}

export async function requireAdmin(redirectTo = "/dashboard"): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.profile.role !== "admin") redirect(redirectTo);
  return user;
}
