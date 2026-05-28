/**
 * Stripe client (server-only).
 *
 * The Stripe Node SDK keeps its own keep-alive HTTP agent — we memoize the
 * client across hot-reloads in dev and across warm invocations in prod.
 */

import "server-only";
import Stripe from "stripe";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  cached = new Stripe(key, {
    // Pin the API version explicitly so accidental SDK upgrades don't
    // break the webhook payload contract.
    apiVersion: "2024-11-20.acacia",
    typescript: true,
    appInfo: {
      name: "ParaRadar Pro",
      version: "2.0.0",
    },
  });
  return cached;
}
