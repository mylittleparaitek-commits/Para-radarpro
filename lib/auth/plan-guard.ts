/**
 * Plan-based feature gating.
 *
 * Centralizes the rules that map a subscription plan to its capabilities.
 * UI components and API routes consume `PLAN_LIMITS` and the helpers below
 * to render lock states or 403 on protected resources.
 */

import type { PlanLimits, SubscriptionPlan } from "@/types";
import { PLAN_ORDER } from "../stripe/products";

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    maxTrends: 5,
    productRecommendations: false,
    fullTrendDetail: false,
    csvExport: false,
    apiAccess: false,
    historyDays: 7,
  },
  pro: {
    maxTrends: 20,
    productRecommendations: true,
    fullTrendDetail: true,
    csvExport: false,
    apiAccess: false,
    historyDays: 30,
  },
  business: {
    maxTrends: 50,
    productRecommendations: true,
    fullTrendDetail: true,
    csvExport: true,
    apiAccess: false,
    historyDays: 365,
  },
  premium: {
    maxTrends: 100,
    productRecommendations: true,
    fullTrendDetail: true,
    csvExport: true,
    apiAccess: true,
    historyDays: 3650,
  },
};

export function getPlanLimits(plan: SubscriptionPlan): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function planMeets(actual: SubscriptionPlan, required: SubscriptionPlan): boolean {
  return PLAN_ORDER[actual] >= PLAN_ORDER[required];
}

export function canAccessFullTrendDetail(plan: SubscriptionPlan): boolean {
  return PLAN_LIMITS[plan].fullTrendDetail;
}

export function canAccessProductRecommendations(plan: SubscriptionPlan): boolean {
  return PLAN_LIMITS[plan].productRecommendations;
}

export function canExportCsv(plan: SubscriptionPlan): boolean {
  return PLAN_LIMITS[plan].csvExport;
}

export function canUseApi(plan: SubscriptionPlan): boolean {
  return PLAN_LIMITS[plan].apiAccess;
}

export class PlanRequiredError extends Error {
  constructor(
    readonly required: SubscriptionPlan,
    readonly actual: SubscriptionPlan,
  ) {
    super(`This feature requires the "${required}" plan (current: "${actual}")`);
    this.name = "PlanRequiredError";
  }
}

/** Throws `PlanRequiredError` when the user's plan is too low. */
export function requirePlan(actual: SubscriptionPlan, required: SubscriptionPlan): void {
  if (!planMeets(actual, required)) {
    throw new PlanRequiredError(required, actual);
  }
}
