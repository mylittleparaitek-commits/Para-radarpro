/**
 * GET /api/newsletter
 *
 * Returns the latest published newsletters.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listNewsletters } from "@/lib/supabase/repositories/newsletters";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const issues = await listNewsletters(supabase, { limit: 12 });
  return NextResponse.json({ issues });
}
