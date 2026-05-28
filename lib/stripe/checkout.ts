/**
 * Stripe Checkout — creates a hosted checkout session for a given plan.
 *
 * Idempotency: we pass `client_reference_id = userId` so we can correlate
 * the webhook back to our user even if the user signs out mid-flow.
 */

import "server-only";
import type { SubscriptionPlan } from "@/types";
import { getStripe } from "./client";
import { PLANS, isPaidPlan } from "./products";
import { getProfileById, setStripeCustomerId } from "../supabase/repositories/profiles";
import { createAdminClient } from "../supabase/admin";

export interface CreateCheckoutSessionInput {
  userId: string;
  userEmail: string;
  plan: SubscriptionPlan;
  /** Base URL of the app (e.g. https://pararadar.pro). */
  origin: string;
}

export interface CreateCheckoutSessionResult {
  checkoutUrl: string;
}

export async function createCheckoutSession(
  input: CreateCheckoutSessionInput,
): Promise<CreateCheckoutSessionResult> {
  if (!isPaidPlan(input.plan)) {
    throw new Error("Cannot checkout for free plan");
  }
  const planInfo = PLANS[input.plan];
  if (!planInfo.stripePriceId) {
    throw new Error(`Stripe Price ID for plan "${input.plan}" is not configured`);
  }

  const stripe = getStripe();
  const admin = createAdminClient();

  // Reuse the existing Stripe customer if we already created one for this user.
  const profile = await getProfileById(admin, input.userId);
  let customerId = profile?.stripe_customer_id ?? null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: input.userEmail,
      metadata: { user_id: input.userId },
    });
    customerId = customer.id;
    await setStripeCustomerId(admin, input.userId, customerId);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: input.userId,
    line_items: [{ price: planInfo.stripePriceId, quantity: 1 }],
    success_url: `${input.origin}/settings?payment=success`,
    cancel_url: `${input.origin}/pricing?payment=cancelled`,
    metadata: {
      user_id: input.userId,
      plan: input.plan,
    },
    subscription_data: {
      metadata: {
        user_id: input.userId,
        plan: input.plan,
      },
    },
    allow_promotion_codes: true,
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }
  return { checkoutUrl: session.url };
}
