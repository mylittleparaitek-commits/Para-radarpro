import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import {
  canAccessFullTrendDetail,
  canAccessProductRecommendations,
} from "@/lib/auth/plan-guard";
import { createClient } from "@/lib/supabase/server";
import { getTrendById } from "@/lib/supabase/repositories/trends";
import { listForTrend } from "@/lib/supabase/repositories/products";
import { TrendChart } from "@/components/trends/TrendChart";
import {
  ActionBadge,
  ConfidenceBadge,
  GrowthBadge,
  RiskBadge,
  ScoreBadge,
} from "@/components/trends/Badges";
import { PlanGate } from "@/components/dashboard/PlanGate";
import { Card, CardContent } from "@/components/ui/card";

export default async function TrendDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const supabase = await createClient();
  const trend = await getTrendById(supabase, id);
  if (!trend) notFound();

  const fullAccess = canAccessFullTrendDetail(user.profile.subscription_plan);
  const productAccess = canAccessProductRecommendations(user.profile.subscription_plan);
  const recommendations = productAccess ? await listForTrend(supabase, trend.id) : [];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {trend.category && (
            <span className="text-xs text-muted-foreground">{trend.category}</span>
          )}
          <ActionBadge action={trend.recommendedAction} />
          <ConfidenceBadge level={trend.scores.confidenceLevel} />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{trend.keyword}</h1>
        {trend.description && (
          <p className="text-base text-muted-foreground">{trend.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <ScoreBadge value={trend.scores.trendScore} label="Trend" />
          <ScoreBadge value={trend.scores.buyScore} label="Buy" />
          <GrowthBadge value={trend.growth.growth7d} period="7j" />
          <GrowthBadge value={trend.growth.growth30d} period="30j" />
          <GrowthBadge value={trend.growth.growth90d} period="90j" />
        </div>
      </div>

      {/* Executive summary */}
      {trend.content.executiveSummary && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-semibold">Résumé</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {trend.content.executiveSummary}
            </p>
            {trend.content.whyItRises && (
              <>
                <h3 className="mt-4 text-sm font-semibold">Pourquoi ça monte</h3>
                <p className="mt-1 text-sm text-muted-foreground">{trend.content.whyItRises}</p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-base font-semibold">Évolution</h2>
          <div className="mt-4">
            <TrendChart data={trend.charts} />
          </div>
        </CardContent>
      </Card>

      {/* Source breakdown + risks */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-semibold">Sources</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Google Trends</dt>
                <dd className="font-medium">{trend.sources.google.toFixed(0)}/100</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">TikTok</dt>
                <dd className="font-medium">{trend.sources.tiktok.toFixed(0)}/100</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Amazon</dt>
                <dd className="font-medium">{trend.sources.amazon.toFixed(0)}/100</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Instagram</dt>
                <dd className="font-medium">{trend.sources.instagram.toFixed(0)}/100</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Web</dt>
                <dd className="font-medium">{trend.sources.web.toFixed(0)}/100</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-6">
            <h2 className="text-base font-semibold">Risques</h2>
            <div className="flex flex-wrap gap-2">
              <RiskBadge level={trend.scores.stockRisk} label={`Stock : ${trend.scores.stockRisk}`} />
              <RiskBadge
                level={trend.scores.regulatoryRisk}
                label={`Réglementaire : ${trend.scores.regulatoryRisk}`}
              />
            </div>
            {trend.content.regulatoryNotes && (
              <p className="mt-2 text-sm text-amber-900">
                <strong>Note réglementaire&nbsp;:</strong> {trend.content.regulatoryNotes}
              </p>
            )}
            {trend.seasonality.label && (
              <p className="text-sm text-muted-foreground">
                <strong>Saisonnalité&nbsp;:</strong> {trend.seasonality.label}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Plan-gated detail */}
      <PlanGate
        current={user.profile.subscription_plan}
        required="pro"
        title="Détail complet réservé au plan Pro"
        description="Quantités conseillées, recommandations produits, idées SEO et contenus social."
      >
        {fullAccess && (
          <>
            <Card>
              <CardContent className="space-y-3 p-6">
                <h2 className="text-base font-semibold">Quantités conseillées</h2>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Petite pharmacie</div>
                    <div className="text-2xl font-bold">{trend.suggestedQuantities.small}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Moyenne pharmacie</div>
                    <div className="text-2xl font-bold">{trend.suggestedQuantities.medium}</div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Grande pharmacie</div>
                    <div className="text-2xl font-bold">{trend.suggestedQuantities.large}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {recommendations.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-base font-semibold">Produits recommandés</h2>
                  <ul className="mt-3 space-y-3 text-sm">
                    {recommendations.map((r) => (
                      <li key={r.id} className="rounded-md border p-3">
                        <div className="font-medium">
                          {r.productName} {r.brand && <span className="text-muted-foreground">— {r.brand}</span>}
                        </div>
                        {r.reason && (
                          <p className="mt-1 text-muted-foreground">{r.reason}</p>
                        )}
                        <div className="mt-2 text-xs text-muted-foreground">
                          Quantité conseillée : <strong>{r.recommendedQty}</strong> · Marge : {r.estimatedMarginLevel} · Priorité : {r.priority}
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {trend.content.seoKeywords.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-base font-semibold">Mots-clés SEO</h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {trend.content.seoKeywords.map((k) => (
                        <span key={k} className="rounded-md bg-muted px-2 py-1 text-xs">
                          {k}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {trend.content.socialContentIdeas.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-base font-semibold">Idées contenu social</h2>
                    <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {trend.content.socialContentIdeas.map((i) => (
                        <li key={i}>• {i}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {trend.content.counterQuestions.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-base font-semibold">Questions des clients au comptoir</h2>
                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {trend.content.counterQuestions.map((q) => (
                      <li key={q}>• {q}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {trend.content.evidenceLinks.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-base font-semibold">Sources</h2>
                  <ul className="mt-3 space-y-1 text-sm">
                    {trend.content.evidenceLinks.map((u) => (
                      <li key={u}>
                        <a
                          href={u}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {u}
                        </a>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </PlanGate>
    </div>
  );
}
