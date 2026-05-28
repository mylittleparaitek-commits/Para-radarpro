/**
 * Supabase server client — for Server Components, Route Handlers, and
 * Server Actions.
 *
 * Uses Next.js `cookies()` to mirror the user's session cookie back and
 * forth. Anon key only — service role lives in `./admin.ts`.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set");
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — Next.js disallows mutation.
          // The middleware (see /middleware.ts) refreshes session cookies
          // on every request, so this is safe to swallow here.
        }
      },
    },
  });
}
