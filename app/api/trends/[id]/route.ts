/**
 * GET /api/trends/[id]
 *
 * Returns one trend with plan-gated detail.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canAccessFullTrendDetail, canAccessProductRecommendations } from "@/lib/auth/plan-guard";
import { createClient } from "@/lib/supabase/server";
import { getTrendById } from "@/lib/supabase/repositories/trends";
import { listForTrend } from "@/lib/supabase/repositories/products";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  const supabase = await createClient();
  const trend = await getTrendById(supabase, id);
  if (!trend) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const plan = user?.profile.subscription_plan ?? "free";

  // Strip plan-gated fields if the user can't access them.
  const stripped = { ...trend };
  if (!canAccessFullTrendDetail(plan)) {
    stripped.suggestedQuantities = { small: 0, medium: 0, large: 0 };
    stripped.content = {
      ...trend.content,
      seoKeywords: [],
      socialContentIdeas: [],
      counterQuestions: [],
    };
  }

  const recommendations = canAccessProductRecommendations(plan)
    ? await listForTrend(supabase, id)
    : [];

  return NextResponse.json({ trend: stripped, recommendations, plan });
}
