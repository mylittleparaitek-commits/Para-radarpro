/**
 * Profiles repository — user metadata and subscription state.
 */

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ProfileRow } from "@/types/database";
import type { SubscriptionPlan } from "@/types";

type DB = SupabaseClient<Database>;

export async function getProfileById(db: DB, id: string): Promise<ProfileRow | null> {
  const { data, error } = await db.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`getProfileById failed: ${error.message}`);
  return data;
}

export async function getProfileByStripeCustomerId(
  db: DB,
  stripeCustomerId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await db
    .from("profiles")
    .select("*")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();
  if (error) throw new Error(`getProfileByStripeCustomerId failed: ${error.message}`);
  return data;
}

export async function setStripeCustomerId(
  db: DB,
  userId: string,
  stripeCustomerId: string,
): Promise<void> {
  const { error } = await db
    .from("profiles")
    .update({ stripe_customer_id: stripeCustomerId })
    .eq("id", userId);
  if (error) throw new Error(`setStripeCustomerId failed: ${error.message}`);
}

export interface SubscriptionUpdate {
  plan: SubscriptionPlan;
  status: ProfileRow["subscription_status"];
  stripeSubscriptionId?: string | null;
  endsAt?: string | null;
}

export async function updateSubscription(
  db: DB,
  userId: string,
  update: SubscriptionUpdate,
): Promise<void> {
  const patch: Database["public"]["Tables"]["profiles"]["Update"] = {
    subscription_plan: update.plan,
    subscription_status: update.status,
  };
  if (update.stripeSubscriptionId !== undefined) {
    patch.stripe_subscription_id = update.stripeSubscriptionId;
  }
  if (update.endsAt !== undefined) {
    patch.subscription_ends_at = update.endsAt;
  }
  const { error } = await db.from("profiles").update(patch).eq("id", userId);
  if (error) throw new Error(`updateSubscription failed: ${error.message}`);
}

export async function setRole(
  db: DB,
  userId: string,
  role: ProfileRow["role"],
): Promise<void> {
  const { error } = await db.from("profiles").update({ role }).eq("id", userId);
  if (error) throw new Error(`setRole failed: ${error.message}`);
}
