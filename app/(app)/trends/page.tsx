import { requireUser } from "@/lib/auth/session";
import { getPlanLimits } from "@/lib/auth/plan-guard";
import { createClient } from "@/lib/supabase/server";
import { listTrends } from "@/lib/supabase/repositories/trends";
import { TrendCard } from "@/components/trends/TrendCard";
import { TrendFilters } from "@/components/trends/TrendFilters";
import {
  RECOMMENDED_ACTIONS,
  RISK_LEVELS,
  type RecommendedAction,
  type RiskLevel,
  type TrendFilters as TrendFiltersType,
} from "@/types";

export const metadata = { title: "Tendances" };

function parseAction(v: string | undefined): RecommendedAction | undefined {
  if (v && (RECOMMENDED_ACTIONS as readonly string[]).includes(v)) {
    return v as RecommendedAction;
  }
  return undefined;
}

function parseRisk(v: string | undefined): RiskLevel | undefined {
  if (v && (RISK_LEVELS as readonly string[]).includes(v)) {
    return v as RiskLevel;
  }
  return undefined;
}

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const limits = getPlanLimits(user.profile.subscription_plan);
  const supabase = await createClient();
  const params = await searchParams;

  const filters: TrendFiltersType = {
    status: "published",
    search: params.search,
    recommendedAction: parseAction(params.recommendedAction),
    regulatoryRisk: parseRisk(params.regulatoryRisk),
    minTrendScore: params.minTrendScore ? Number(params.minTrendScore) : undefined,
    limit: Math.min(limits.maxTrends, 60),
  };

  const trends = await listTrends(supabase, filters);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tendances</h1>
        <p className="text-sm text-muted-foreground">
          {trends.length} tendance{trends.length !== 1 ? "s" : ""} · limite plan&nbsp;:&nbsp;
          {limits.maxTrends}
        </p>
      </div>

      <TrendFilters />

      {trends.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center text-sm text-muted-foreground">
          Aucune tendance ne correspond à vos critères.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {trends.map((t) => (
            <TrendCard key={t.id} trend={t} />
          ))}
        </div>
      )}
    </div>
  );
}
