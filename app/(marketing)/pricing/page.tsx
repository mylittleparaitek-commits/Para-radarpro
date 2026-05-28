import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLANS } from "@/lib/stripe/products";

export const metadata = {
  title: "Tarifs",
  description: "Tarifs ParaRadar Pro — Découverte, Pro, Business, Premium. Sans engagement.",
};

export default function PricingPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Choisissez votre plan</h1>
        <p className="mt-4 text-muted-foreground">
          Sans engagement, résiliation en un clic depuis votre espace.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Object.values(PLANS).map((plan) => (
          <Card
            key={plan.id}
            className={plan.highlight ? "relative border-primary shadow-lg" : "relative"}
          >
            {plan.highlight && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Le plus populaire
              </Badge>
            )}
            <CardContent className="flex h-full flex-col p-6">
              <h2 className="text-xl font-semibold">{plan.name}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{plan.priceMonthly} €</span>
                <span className="text-sm text-muted-foreground">HT / mois</span>
              </div>
              <ul className="mt-6 flex-1 space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {plan.id === "free" ? (
                <Button asChild className="mt-6 w-full" variant="outline">
                  <Link href="/register">Commencer gratuitement</Link>
                </Button>
              ) : (
                <form action="/api/stripe/checkout" method="post" className="mt-6">
                  <input type="hidden" name="plan" value={plan.id} />
                  <Button
                    type="submit"
                    className="w-full"
                    variant={plan.highlight ? "default" : "outline"}
                  >
                    Démarrer {plan.name}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mx-auto mt-16 max-w-3xl rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
        <p>
          <strong className="text-foreground">Besoin d'une offre sur mesure ?</strong> Pour les
          groupements, centrales d'achat ou grandes enseignes e-commerce, contactez-nous à{" "}
          <a
            href="mailto:contact@pararadar.pro"
            className="font-medium text-primary hover:underline"
          >
            contact@pararadar.pro
          </a>
          .
        </p>
      </div>
    </div>
  );
}
