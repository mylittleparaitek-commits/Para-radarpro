/**
 * Stripe Billing Portal — lets users self-manage their subscription
 * (upgrade, downgrade, cancel, update payment method).
 */

import "server-only";
import { getStripe } from "./client";
import { createAdminClient } from "../supabase/admin";
import { getProfileById } from "../supabase/repositories/profiles";

export interface CreatePortalSessionInput {
  userId: string;
  /** Where Stripe should redirect after the user closes the portal. */
  returnUrl: string;
}

export async function createPortalSession(input: CreatePortalSessionInput): Promise<{ portalUrl: string }> {
  const stripe = getStripe();
  const admin = createAdminClient();

  const profile = await getProfileById(admin, input.userId);
  if (!profile?.stripe_customer_id) {
    throw new Error("User has no Stripe customer — checkout first");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: input.returnUrl,
  });

  return { portalUrl: session.url };
}
