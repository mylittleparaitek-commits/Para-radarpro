/**
 * Plan catalog and Stripe Price IDs.
 *
 * Prices are stored centrally so the marketing page, checkout API, and
 * portal share a single source of truth. Price IDs come from env so the
 * same code runs in test and live mode.
 */

import type { SubscriptionPlan } from "@/types";

export interface PlanInfo {
  id: SubscriptionPlan;
  /** Display name (FR). */
  name: string;
  /** Monthly price in euros. 0 for free. */
  priceMonthly: number;
  /** Short tagline (FR). */
  description: string;
  /** Feature bullets (FR). */
  features: readonly string[];
  /** Stripe Price ID. `null` for the free plan. */
  stripePriceId: string | null;
  /** Marketing-only highlight. */
  highlight?: boolean;
}

export const PLANS: Record<SubscriptionPlan, PlanInfo> = {
  free: {
    id: "free",
    name: "Découverte",
    priceMonthly: 0,
    description: "Accès limité au top 5 hebdo",
    features: [
      "5 tendances par semaine",
      "Newsletter hebdomadaire (résumé)",
      "Scores publics (sans détail)",
      "Historique 7 jours",
    ],
    stripePriceId: null,
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthly: 19,
    description: "Pour un pharmacien indépendant",
    features: [
      "20 tendances par semaine",
      "Détail complet (SEO, social, quantités)",
      "Recommandations produits",
      "Historique 30 jours",
      "Newsletter complète",
    ],
    stripePriceId: process.env.STRIPE_PRICE_ID_PRO ?? null,
    highlight: true,
  },
  business: {
    id: "business",
    name: "Business",
    priceMonthly: 49,
    description: "Pour un groupe ou une enseigne e-commerce",
    features: [
      "50 tendances par semaine",
      "Tout le détail Pro",
      "Export CSV / Excel",
      "Historique 1 an",
      "Comparaisons concurrentielles",
      "Support prioritaire",
    ],
    stripePriceId: process.env.STRIPE_PRICE_ID_BUSINESS ?? null,
  },
  premium: {
    id: "premium",
    name: "Premium",
    priceMonthly: 99,
    description: "Tout l'historique + accès API",
    features: [
      "100 tendances par semaine",
      "Tout le contenu Business",
      "Accès API REST",
      "Historique complet",
      "Webhooks personnalisés",
      "Account manager dédié",
    ],
    stripePriceId: process.env.STRIPE_PRICE_ID_PREMIUM ?? null,
  },
};

/** Ordered ranking for upgrade comparisons (free < pro < business < premium). */
export const PLAN_ORDER: Record<SubscriptionPlan, number> = {
  free: 0,
  pro: 1,
  business: 2,
  premium: 3,
};

/** Map a Stripe Price ID back to a plan. */
export function planForStripePriceId(stripePriceId: string): SubscriptionPlan | null {
  for (const plan of Object.values(PLANS)) {
    if (plan.stripePriceId === stripePriceId) return plan.id;
  }
  return null;
}

export function getPlan(id: SubscriptionPlan): PlanInfo {
  return PLANS[id];
}

export function isPaidPlan(id: SubscriptionPlan): boolean {
  return id !== "free";
}
