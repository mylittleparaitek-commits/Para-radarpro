/**
 * GET /api/trends
 *
 * List trends with filters. Plan-gated row count.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getPlanLimits } from "@/lib/auth/plan-guard";
import { createClient } from "@/lib/supabase/server";
import { listTrends } from "@/lib/supabase/repositories/trends";
import {
  DATA_SOURCES,
  RECOMMENDED_ACTIONS,
  RISK_LEVELS,
  TREND_STATUSES,
} from "@/types";

export const runtime = "nodejs";

const QuerySchema = z.object({
  category: z.string().optional(),
  minTrendScore: z.coerce.number().optional(),
  minBuyScore: z.coerce.number().optional(),
  recommendedAction: z.enum(RECOMMENDED_ACTIONS).optional(),
  source: z.enum(DATA_SOURCES).optional(),
  stockRisk: z.enum(RISK_LEVELS).optional(),
  regulatoryRisk: z.enum(RISK_LEVELS).optional(),
  search: z.string().optional(),
  status: z.enum(TREND_STATUSES).optional(),
  limit: z.coerce.number().optional(),
  offset: z.coerce.number().optional(),
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  // Allow anonymous reads (they'll be RLS-gated to published-only).
  const supabase = await createClient();
  const params = Object.fromEntries(new URL(req.url).searchParams.entries());
  const parsed = QuerySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const plan = user?.profile.subscription_plan ?? "free";
  const planLimit = getPlanLimits(plan).maxTrends;
  const limit = Math.min(parsed.data.limit ?? planLimit, planLimit);

  const trends = await listTrends(supabase, {
    ...parsed.data,
    // Force published-only for non-admin callers.
    status: user?.profile.role === "admin" ? parsed.data.status : "published",
    limit,
  });

  return NextResponse.json({ trends, plan, limit });
}
