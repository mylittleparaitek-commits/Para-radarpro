import { requireUser } from "@/lib/auth/session";
import { planMeets } from "@/lib/auth/plan-guard";
import { createClient } from "@/lib/supabase/server";
import {
  getLatestPublishedNewsletter,
  listNewsletters,
} from "@/lib/supabase/repositories/newsletters";
import { NewsletterPreview } from "@/components/newsletter/NewsletterPreview";
import { Card, CardContent } from "@/components/ui/card";
import { PlanGate } from "@/components/dashboard/PlanGate";
import { formatDate } from "@/lib/utils/format";

export const metadata = { title: "Newsletter" };

export default async function NewsletterPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const latest = await getLatestPublishedNewsletter(supabase);
  const issues = await listNewsletters(supabase, { limit: 12 });

  const isPro = planMeets(user.profile.subscription_plan, "pro");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Newsletter hebdomadaire</h1>
        <p className="text-sm text-muted-foreground">
          Chaque lundi, les tendances majeures à commander, surveiller ou éviter.
        </p>
      </div>

      {latest ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-semibold">{latest.title}</h2>
              <span className="text-xs text-muted-foreground">{latest.week}</span>
            </div>
            {latest.summary && (
              <p className="text-sm italic text-muted-foreground">{latest.summary}</p>
            )}
            {isPro ? (
              <NewsletterPreview html={latest.generatedHtml ?? ""} />
            ) : (
              <PlanGate
                current={user.profile.subscription_plan}
                required="pro"
                title="Newsletter complète réservée au plan Pro"
                description="Le plan Découverte donne accès à un résumé. Passez Pro pour la newsletter complète."
              >
                <NewsletterPreview html={latest.generatedHtml ?? ""} />
              </PlanGate>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Aucune newsletter publiée pour le moment.
          </CardContent>
        </Card>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Numéros précédents</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {issues
            .filter((i) => i.status === "published" && i.id !== latest?.id)
            .map((i) => (
              <Card key={i.id}>
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">
                    {i.publishedAt ? formatDate(i.publishedAt) : i.week}
                  </div>
                  <div className="mt-1 font-medium">{i.title}</div>
                  {i.summary && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {i.summary}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
        </div>
      </section>
    </div>
  );
}
