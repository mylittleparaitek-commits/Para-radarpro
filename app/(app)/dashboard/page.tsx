import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getPlanLimits } from "@/lib/auth/plan-guard";
import { createClient } from "@/lib/supabase/server";
import { listTrends } from "@/lib/supabase/repositories/trends";
import { TrendCard } from "@/components/trends/TrendCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Trend } from "@/types";

export const metadata = { title: "Dashboard" };

function section(label: string, trends: Trend[], emptyMsg: string, max: number) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{label}</h2>
      {trends.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">{emptyMsg}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {trends.slice(0, max).map((t) => (
            <TrendCard key={t.id} trend={t} compact />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const limits = getPlanLimits(user.profile.subscription_plan);
  const supabase = await createClient();

  const all = await listTrends(supabase, {
    status: "published",
    limit: Math.min(limits.maxTrends, 60),
  });

  const top = all.slice(0, Math.min(limits.maxTrends, 6));
  const buyNow = all.filter((t) => t.recommendedAction === "buy_now").slice(0, 6);
  const emerging = [...all].sort((a, b) => b.scores.noveltyScore - a.scores.noveltyScore).slice(0, 6);
  const seasonal = [...all]
    .sort((a, b) => b.scores.seasonalityScore - a.scores.seasonalityScore)
    .slice(0, 6);
  const avoid = all.filter((t) =>
    ["do_not_buy", "regulatory_caution"].includes(t.recommendedAction),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {all.length} tendances publiées · plan {user.profile.subscription_plan}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/trends">
            Voir toutes les tendances <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {section("🏆 Top de la semaine", top, "Aucune tendance publiée pour le moment.", 6)}
      {section("🛒 À commander maintenant", buyNow, "Aucune recommandation d'achat immédiat.", 6)}
      {section("🚀 Émergentes", emerging, "Pas de tendance émergente cette semaine.", 6)}
      {section("📅 Saisonnières", seasonal, "Pas de tendance saisonnière forte.", 6)}
      {section("⚠️ À éviter / prudence", avoid, "Aucune alerte cette semaine.", 4)}
    </div>
  );
}
