import Link from "next/link";
import {
  BarChart3,
  Bell,
  CheckCircle2,
  Globe,
  Shield,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PLANS } from "@/lib/stripe/products";

const BENEFITS = [
  {
    icon: TrendingUp,
    title: "Détection précoce",
    description:
      "Identifiez les produits qui montent 4 à 8 semaines avant la concurrence grâce à l'analyse multi-sources.",
  },
  {
    icon: BarChart3,
    title: "Scores objectifs",
    description:
      "Trend Score et Buy Score calculés sur 8 critères : croissance, saisonnalité, marge, risque.",
  },
  {
    icon: Shield,
    title: "Veille réglementaire",
    description:
      "Alertes automatiques sur les ingrédients sensibles (mélatonine, berbérine, etc.) avant un retrait ANSM.",
  },
  {
    icon: Globe,
    title: "Sources multiples",
    description:
      "Google Trends, TikTok, Amazon, Instagram, sites spécialisés. Une vue à 360° de la demande réelle.",
  },
  {
    icon: Bell,
    title: "Newsletter hebdo",
    description:
      "Recevez chaque lundi les 5 tendances majeures à commander, surveiller ou éviter.",
  },
  {
    icon: Sparkles,
    title: "Quantités conseillées",
    description:
      "Recommandations adaptées à votre taille (petite/moyenne/grande pharmacie) pour limiter le sur-stock.",
  },
];

const FAQS = [
  {
    q: "Comment ParaRadar Pro détecte-t-il les tendances ?",
    a: "Notre moteur agrège des données de plusieurs sources officielles (Google Trends, API TikTok Research, Amazon PA-API, Instagram Graph API). Chaque tendance reçoit un Trend Score et un Buy Score calculés sur 8 critères pondérés : popularité, croissance 7/30/90 jours, saisonnalité, marge potentielle, risque réglementaire et risque de stock.",
  },
  {
    q: "Les recommandations d'achat sont-elles adaptées à ma taille de pharmacie ?",
    a: "Oui. Chaque fiche tendance propose des quantités recommandées pour trois profils : petite pharmacie (< 1 M€ CA), pharmacie moyenne (1-3 M€) et grande pharmacie (> 3 M€). Ces estimations tiennent compte de la rotation probable et du risque de stock dormant.",
  },
  {
    q: "Êtes-vous conforme aux conditions d'usage des sources de données ?",
    a: "Oui. ParaRadar Pro n'utilise que des sources officielles : API Google Trends via prestataires agréés, API TikTok Research, Amazon Product Advertising API, Instagram Graph API. Aucun scraping non autorisé. Voir la page Méthodologie pour le détail.",
  },
  {
    q: "Puis-je essayer gratuitement ?",
    a: "Oui. Le plan Découverte vous donne accès au top 5 hebdomadaire et à la newsletter résumée. Vous pouvez passer au plan Pro à tout moment depuis votre tableau de bord.",
  },
  {
    q: "Comment résilier mon abonnement ?",
    a: "Depuis votre espace Paramètres, accédez au portail de facturation Stripe : vous pouvez annuler en un clic, sans pénalité, avec effet à la fin de la période en cours.",
  },
  {
    q: "Proposez-vous une intégration avec mon logiciel pharmacie ?",
    a: "L'accès API REST est inclus dans le plan Premium et permet d'intégrer les tendances dans votre LGO, Google Sheets, n8n ou tout autre outil compatible HTTP.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-50 via-white to-blue-50" />
        <div className="container mx-auto px-4 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="success" className="mb-4">
              🚀 Nouveau · Détection précoce IA
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              L'intelligence des tendances{" "}
              <span className="bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                parapharmacie
              </span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground md:text-xl">
              Détectez les produits qui montent avant vos concurrents. Achetez juste, évitez les
              stocks dormants, anticipez les alertes réglementaires.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/register">Commencer gratuitement →</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/methodology">Voir la méthodologie</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Sans carte bancaire · Annulation en un clic
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Pourquoi ParaRadar Pro ?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Un outil pensé pour les pharmaciens, les responsables achats et les e-commerçants
            spécialisés.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <Card key={b.title} className="border-l-4 border-l-primary/70">
              <CardContent className="p-6">
                <b.icon className="h-6 w-6 text-primary" aria-hidden />
                <h3 className="mt-3 text-lg font-semibold">{b.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{b.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Tarifs simples et transparents
            </h2>
            <p className="mt-4 text-muted-foreground">
              Tous les plans sont sans engagement, résiliables en un clic.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Object.values(PLANS).map((plan) => (
              <Card
                key={plan.id}
                className={
                  plan.highlight
                    ? "relative border-primary shadow-lg"
                    : "relative"
                }
              >
                {plan.highlight && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Le plus populaire
                  </Badge>
                )}
                <CardContent className="flex h-full flex-col p-6">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{plan.description}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{plan.priceMonthly} €</span>
                    <span className="text-sm text-muted-foreground">/ mois</span>
                  </div>
                  <ul className="mt-6 flex-1 space-y-2 text-sm">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    variant={plan.highlight ? "default" : "outline"}
                    className="mt-6 w-full"
                  >
                    <Link href={plan.id === "free" ? "/register" : `/pricing?plan=${plan.id}`}>
                      {plan.id === "free" ? "Commencer" : `Démarrer ${plan.name}`}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
            Questions fréquentes
          </h2>
          <div className="mt-12 space-y-4">
            {FAQS.map((f) => (
              <details key={f.q} className="group rounded-lg border bg-card p-5">
                <summary className="cursor-pointer list-none text-base font-semibold">
                  {f.q}
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t bg-gradient-to-br from-emerald-600 to-blue-600 text-white">
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            Prêt à détecter les tendances avant les autres ?
          </h2>
          <p className="mt-3 text-white/85">
            Essayez gratuitement, sans carte bancaire.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-6">
            <Link href="/register">Créer mon compte →</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
