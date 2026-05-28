/**
 * Buy Scoring
 *
 * Answers: **should the pharmacist actually order stock of this product?**
 *
 * This is distinct from trendScore — a viral trend can be a bad buy if:
 *   - the regulatory risk is high (e.g. melatonin dosage rules)
 *   - the trend already peaked (high novelty but low remaining momentum)
 *   - the seasonality is wrong (peak passed for the year)
 *   - the margin is too low to justify carrying inventory
 *
 * The Buy Score also drives the `RecommendedAction` enum, which is the
 * human-facing CTA on each trend card.
 */

import type {
  ConfidenceLevel,
  MarginLevel,
  RecommendedAction,
  RiskLevel,
  SuggestedQuantities,
  TrendScores,
  TrendGrowth,
} from "@/types";

// ─── Weights ──────────────────────────────────────────────────────────────────

const WEIGHTS = {
  trend: 0.35,
  growth: 0.2,
  margin: 0.15,
  seasonality: 0.1,
  confidence: 0.1,
  riskPenalty: 0.1, // applied as negative contribution
} as const;

const MARGIN_VALUES: Record<MarginLevel, number> = { low: 30, medium: 60, high: 90 };
const RISK_VALUES: Record<RiskLevel, number> = { none: 0, low: 15, medium: 50, high: 90 };
const CONFIDENCE_VALUES: Record<ConfidenceLevel, number> = {
  low: 25,
  medium: 50,
  high: 80,
  very_high: 100,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Growth momentum signal for buy decision:
 * - Strong positive growth (especially 7d > 30d > 90d acceleration) = strong buy
 * - Decelerating growth (90d high, 7d low) = late to the trend, lower score
 */
function momentumScore(growth: TrendGrowth): number {
  const { growth7d, growth30d } = growth;
  // Base from short-term growth
  let score = 50 + Math.min(40, growth7d * 0.15);
  // Acceleration bonus: 7d growth outpacing 30d growth means trend is accelerating
  const acceleration = growth7d - growth30d;
  score += Math.max(-15, Math.min(15, acceleration * 0.1));
  return clamp(score);
}

// ─── Main scoring ────────────────────────────────────────────────────────────

export interface ComputeBuyScoreInput {
  scores: TrendScores;
  growth: TrendGrowth;
}

/**
 * Compute the 0-100 Buy Score.
 *
 * The score is a linear combination of trend strength, growth momentum,
 * margin potential, seasonality match, and confidence — minus a risk penalty.
 *
 * Pure function. No I/O.
 */
export function computeBuyScore(input: ComputeBuyScoreInput): number {
  const { scores, growth } = input;

  const trend = clamp(scores.trendScore);
  const growthScore = momentumScore(growth);
  const margin = MARGIN_VALUES[scores.marginPotential];
  const seasonality = clamp(scores.seasonalityScore);
  const confidence = CONFIDENCE_VALUES[scores.confidenceLevel];
  const riskPenalty = scores.riskScore; // already 0-100

  const raw =
    WEIGHTS.trend * trend +
    WEIGHTS.growth * growthScore +
    WEIGHTS.margin * margin +
    WEIGHTS.seasonality * seasonality +
    WEIGHTS.confidence * confidence -
    WEIGHTS.riskPenalty * riskPenalty;

  return Math.round(clamp(raw));
}

// ─── Recommended action derivation ───────────────────────────────────────────

export interface DeriveActionInput {
  buyScore: number;
  trendScore: number;
  scores: TrendScores;
  growth: TrendGrowth;
  /** Optional category that may need regulatory caution flag (e.g. melatonin). */
  regulatoryFlag?: boolean;
}

/**
 * Map a Buy Score (and context) to a recommended action enum.
 *
 * The thresholds are intentionally tunable and live in one place to make
 * editorial calibration easy.
 */
export function deriveRecommendedAction(input: DeriveActionInput): RecommendedAction {
  const { buyScore, scores, growth, regulatoryFlag } = input;

  // Hard regulatory veto first
  if (scores.regulatoryRisk === "high" || regulatoryFlag) {
    return "regulatory_caution";
  }

  // Strongly declining = avoid
  if (growth.growth30d < -25 && growth.growth7d < 0) {
    return "do_not_buy";
  }

  // High trend but low confidence = SEO-only (capture search demand without stock risk)
  if (scores.trendScore >= 75 && scores.confidenceLevel === "low") {
    return "seo_only";
  }

  if (buyScore >= 80) return "buy_now";
  if (buyScore >= 65) return "buy_carefully";
  if (buyScore >= 50) return "watch";
  if (buyScore >= 35) return "highlight_stock"; // existing stock → mettre en avant
  return "do_not_buy";
}

// ─── Suggested quantities ────────────────────────────────────────────────────

/**
 * Suggested order quantities per pharmacy size.
 *
 * Rough heuristic: small pharmacies see ~30% of large pharmacy volume,
 * medium ~60%. Quantities scale with buy score and are rounded to
 * supplier-friendly multiples (6, 12, 24, ...) where possible.
 */
export function suggestQuantities(buyScore: number): SuggestedQuantities {
  if (buyScore < 50) return { small: 0, medium: 0, large: 0 };

  // Base quantity at score 50 = 12 units for large
  // Linear up to score 100 = 144 units for large
  const largeBase = Math.round(12 + ((buyScore - 50) / 50) * 132);

  return {
    small: roundToMultiple(Math.round(largeBase * 0.25), 6),
    medium: roundToMultiple(Math.round(largeBase * 0.55), 6),
    large: roundToMultiple(largeBase, 12),
  };
}

function roundToMultiple(n: number, multiple: number): number {
  if (n <= 0) return 0;
  return Math.max(multiple, Math.round(n / multiple) * multiple);
}

// ─── Combined orchestration helper ───────────────────────────────────────────

export interface ScoreAndActionResult {
  buyScore: number;
  recommendedAction: RecommendedAction;
  suggestedQuantities: SuggestedQuantities;
}

/**
 * One-shot helper: compute buy score, derive action, and produce quantities.
 * This is what the ingestion pipeline calls per keyword.
 */
export function scoreBuyAndAction(input: DeriveActionInput): ScoreAndActionResult {
  const buyScore = input.buyScore;
  const action = deriveRecommendedAction(input);
  const quantities =
    action === "buy_now" || action === "buy_carefully" || action === "highlight_stock"
      ? suggestQuantities(buyScore)
      : { small: 0, medium: 0, large: 0 };
  return { buyScore, recommendedAction: action, suggestedQuantities: quantities };
}
