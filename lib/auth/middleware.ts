/**
 * Supabase session refresh helper, used by Next.js middleware on every
 * request. Without this, the session cookie would never be rotated and
 * users would silently get signed out after the access token expires.
 *
 * Adapted from the official Supabase + Next.js App Router template.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    // Don't crash the entire app if env is missing at build time on Vercel.
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // CRITICAL: do not run any code between createServerClient and getUser —
  // it would race against the refresh and break sign-in.
  await supabase.auth.getUser();

  return supabaseResponse;
}
