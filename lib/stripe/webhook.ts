/**
 * Stripe webhook handler.
 *
 * Idempotence: we record every processed event id in `public.stripe_events`
 * and skip re-processing. This protects against Stripe's at-least-once
 * delivery and our own retries.
 *
 * Events handled:
 *   - checkout.session.completed     → set plan / customer linkage
 *   - customer.subscription.updated  → keep plan + status in sync
 *   - customer.subscription.deleted  → downgrade to free
 *   - invoice.payment_failed         → flag past_due
 */

import "server-only";
import type Stripe from "stripe";
import { getStripe } from "./client";
import { planForStripePriceId } from "./products";
import { createAdminClient } from "../supabase/admin";
import {
  getProfileByStripeCustomerId,
  updateSubscription,
} from "../supabase/repositories/profiles";
import type { SubscriptionPlan } from "@/types";
import type { ProfileRow } from "@/types/database";

export interface WebhookHandleInput {
  /** Raw request body (Buffer or string) — required for signature verification. */
  rawBody: string | Buffer;
  signature: string;
}

export interface WebhookHandleResult {
  received: true;
  /** Whether the event was processed (false if duplicate). */
  processed: boolean;
  eventType: string;
}

export async function handleStripeWebhook(input: WebhookHandleInput): Promise<WebhookHandleResult> {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(input.rawBody, input.signature, webhookSecret);
  } catch (err) {
    throw new Error(`Stripe signature verification failed: ${(err as Error).message}`);
  }

  const admin = createAdminClient();

  // ─── Idempotence ─────────────────────────────────────────────────────────
  // Insert with `onConflict: do nothing` semantics. If the row already
  // exists (we processed this event before), skip silently.
  const { error: idemError } = await admin
    .from("stripe_events" as never)
    .insert({
      id: event.id,
      type: event.type,
      payload: event as unknown as Record<string, unknown>,
      processed_at: new Date().toISOString(),
    } as never)
    .select("id")
    .single();

  if (idemError) {
    // Duplicate primary key = already processed. Stripe will retry on
    // any non-2xx response, so we still return 200.
    if (idemError.code === "23505" || idemError.message.toLowerCase().includes("duplicate")) {
      return { received: true, processed: false, eventType: event.type };
    }
    throw new Error(`Failed to record event idempotence: ${idemError.message}`);
  }

  switch (event.type) {
    case "checkout.session.completed":
      await onCheckoutSessionCompleted(event.data.object);
      break;
    case "customer.subscription.updated":
    case "customer.subscription.created":
      await onSubscriptionChanged(event.data.object);
      break;
    case "customer.subscription.deleted":
      await onSubscriptionDeleted(event.data.object);
      break;
    case "invoice.payment_failed":
      await onPaymentFailed(event.data.object);
      break;
    default:
      // Acknowledge other events without acting on them.
      break;
  }

  return { received: true, processed: true, eventType: event.type };
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function onCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.client_reference_id ?? session.metadata?.["user_id"] ?? null;
  if (!userId) return;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;
  if (!subscriptionId) return;

  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const plan = planFromSubscription(sub);
  if (!plan) return;

  const admin = createAdminClient();
  await updateSubscription(admin, userId, {
    plan,
    status: mapStatus(sub.status),
    stripeSubscriptionId: sub.id,
    endsAt: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
  });
}

async function onSubscriptionChanged(sub: Stripe.Subscription): Promise<void> {
  const userId = await resolveUserIdFromCustomer(sub.customer);
  if (!userId) return;
  const plan = planFromSubscription(sub);
  if (!plan) return;
  const admin = createAdminClient();
  await updateSubscription(admin, userId, {
    plan,
    status: mapStatus(sub.status),
    stripeSubscriptionId: sub.id,
    endsAt: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
  });
}

async function onSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  const userId = await resolveUserIdFromCustomer(sub.customer);
  if (!userId) return;
  const admin = createAdminClient();
  await updateSubscription(admin, userId, {
    plan: "free",
    status: "canceled",
    stripeSubscriptionId: null,
    endsAt: null,
  });
}

async function onPaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const userId = await resolveUserIdFromCustomer(invoice.customer);
  if (!userId) return;
  const admin = createAdminClient();
  const current = await admin
    .from("profiles")
    .select("subscription_plan")
    .eq("id", userId)
    .maybeSingle();
  const plan = (current.data?.subscription_plan ?? "pro") as SubscriptionPlan;
  await updateSubscription(admin, userId, { plan, status: "past_due" });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function planFromSubscription(sub: Stripe.Subscription): SubscriptionPlan | null {
  const item = sub.items.data[0];
  if (!item) return null;
  const priceId = item.price.id;
  return planForStripePriceId(priceId);
}

function mapStatus(s: Stripe.Subscription.Status): ProfileRow["subscription_status"] {
  switch (s) {
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
    case "incomplete":
      return s;
    case "incomplete_expired":
    case "unpaid":
    case "paused":
      return "inactive";
    default:
      return "inactive";
  }
}

async function resolveUserIdFromCustomer(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): Promise<string | null> {
  if (!customer) return null;
  const customerId = typeof customer === "string" ? customer : customer.id;
  const admin = createAdminClient();
  const profile = await getProfileByStripeCustomerId(admin, customerId);
  return profile?.id ?? null;
}
