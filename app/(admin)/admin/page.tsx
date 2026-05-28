import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Admin" };

type PlanRow = {
  subscription_plan: string | null;
};

type DraftTrend = {
  id: string;
  keyword: string;
  trend_score: number | null;
  buy_score: number | null;
  recommended_action: string | null;
  status: string | null;
  is_validated: boolean | null;
};

export default async function AdminPage() {
  const admin = createAdminClient();

  const [{ count: totalUsers }, { count: totalTrends }, { count: totalNewsletters }] =
    await Promise.all([
      admin.from("profiles").select("*", { count: "exact", head: true }),
      admin.from("trends").select("*", { count: "exact", head: true }),
      admin.from("newsletter_issues").select("*", { count: "exact", head: true }),
    ]);

  const { data: byPlan } = await admin
    .from("profiles")
    .select("subscription_plan");

  const planCounts = ((byPlan ?? []) as PlanRow[]).reduce<Record<string, number>>(
    (acc, row) => {
      const p = row.subscription_plan ?? "free";
      acc[p] = (acc[p] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const { data: draftTrends } = await admin
    .from("trends")
    .select("id, keyword, trend_score, buy_score, recommended_action, status, is_validated")
    .eq("status", "draft")
    .order("trend_score", { ascending: false })
    .limit(20);

  const typedDraftTrends = (draftTrends ?? []) as DraftTrend[];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Admin</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="text-xs uppercase text-muted-foreground">Utilisateurs</div>
            <div className="mt-1 text-3xl font-bold">{totalUsers ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-xs uppercase text-muted-foreground">Tendances</div>
            <div className="mt-1 text-3xl font-bold">{totalTrends ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-xs uppercase text-muted-foreground">Newsletters</div>
            <div className="mt-1 text-3xl font-bold">{totalNewsletters ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-base font-semibold">Répartition des plans</h2>

          <div className="mt-3 grid grid-cols-4 gap-3 text-center">
            {["free", "pro", "business", "premium"].map((p) => (
              <div key={p} className="rounded-md border p-3">
                <div className="text-xs uppercase text-muted-foreground">{p}</div>
                <div className="text-xl font-bold">{planCounts[p] ?? 0}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="text-base font-semibold">Tendances en attente de validation</h2>

          {typedDraftTrends.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Aucun brouillon.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Mot-clé</th>
                  <th className="py-2">Trend</th>
                  <th className="py-2">Buy</th>
                  <th className="py-2">Action</th>
                  <th className="py-2"></th>
                </tr>
              </thead>

              <tbody>
                {typedDraftTrends.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="py-2 font-medium">{t.keyword}</td>
                    <td>{t.trend_score ?? "-"}</td>
                    <td>{t.buy_score ?? "-"}</td>
                    <td>{t.recommended_action ?? "-"}</td>
                    <td className="text-right">
                      <a
                        href={`/trends/${t.id}`}
                        className="text-primary hover:underline"
                      >
                        Voir →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <p className="mt-3 text-xs text-muted-foreground">
            La validation et la publication des tendances se font via les scripts d&apos;ingestion
            ou via l&apos;éditeur à venir.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
