import { requireUser } from "@/lib/auth/session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLANS } from "@/lib/stripe/products";

export const metadata = { title: "Paramètres" };

const PLAN_LABEL: Record<string, string> = {
  free: "Découverte",
  pro: "Pro",
  business: "Business",
  premium: "Premium",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const plan = PLANS[user.profile.subscription_plan];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-sm text-muted-foreground">
          Gérez votre profil et votre abonnement.
        </p>
      </div>

      {params.payment === "success" && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✅ Paiement validé. Votre nouveau plan est actif.
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">Profil</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Nom</dt>
              <dd>{user.profile.full_name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Société</dt>
              <dd>{user.profile.company_name ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Taille pharmacie</dt>
              <dd>{user.profile.pharmacy_size ?? "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Abonnement</h2>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            </div>
            <Badge>{PLAN_LABEL[plan.id]}</Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            Statut : <strong className="text-foreground">{user.profile.subscription_status}</strong>
            {user.profile.subscription_ends_at && (
              <>
                {" "}· Prochaine échéance :{" "}
                <strong className="text-foreground">
                  {new Date(user.profile.subscription_ends_at).toLocaleDateString("fr-FR")}
                </strong>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {user.profile.stripe_customer_id ? (
              <form action="/api/stripe/portal" method="post">
                <Button type="submit">Gérer mon abonnement</Button>
              </form>
            ) : (
              <Button asChild>
                <a href="/pricing">Choisir un plan</a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
