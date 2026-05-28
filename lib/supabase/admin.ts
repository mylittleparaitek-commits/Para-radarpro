/**
 * Supabase admin client — service-role key.
 *
 * ⚠️ NEVER import this from client code or expose its results to the
 * browser. The service role bypasses RLS entirely. Use only in:
 *   - Stripe webhook handlers (updating subscription_plan after payment)
 *   - Seed / migration scripts
 *   - Server-side admin actions (e.g. promoting a user to admin)
 *
 * For everything user-facing, use `./server.ts` or `./client.ts`, which
 * are RLS-protected.
 */

import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

let cached: ReturnType<typeof createSupabaseClient<Database>> | null = null;

export function createAdminClient() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }

  cached = createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
