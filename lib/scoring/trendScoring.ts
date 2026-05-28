/**
 * Trend Scoring
 *
 * Computes a normalized 0-100 "Trend Score" from multiple data source signals.
 *
 * The Trend Score answers: **how strong is the popularity momentum of this
 * keyword right now, across all data sources?**
 *
 * It does NOT answer "should I buy stock?" — that's the job of `buyScoring.ts`,
 * which uses the trend score as one of several inputs.
 *
 * Methodology:
 *   1. Each source signal contributes a sub-score based on its current
 *      popularity (50%) and short-term growth (50%).
 *   2. Sub-scores are weighted per source (TikTok and Google are weighted
 *      higher than e.g. generic web mentions).
 *   3. A buzz multiplier amplifies signals when several sources spike together.
 *   4. Confidence is derived from signal coverage and consistency.
 *
 * All math is pure and deterministic — easy to unit test.
 */

import type {
  ConfidenceLevel,
  DataSource,
  SourceSignal,
  TimeSeries,
  TrendGrowth,
  TrendScores,
  TrendSourceBreakdown,
  MarginLevel,
  RiskLevel,
} from "@/types";

// ─── Weights ──────────────────────────────────────────────────────────────────

/**
 * Weight per source in the final trend score.
 * These are tunable based on which sources best predict pharmacy sell-through.
 * Initial values are based on the hypothesis that TikTok/Google drive
 * consumer pull while Amazon/Instagram corroborate.
 */
export const SOURCE_WEIGHTS: Record<DataSource, number> = {
  google_trends: 0.3,
  tiktok: 0.3,
  amazon: 0.15,
  instagram: 0.15,
  web: 0.05,
  perplexity: 0.05,
};

/**
 * Within a single source, how much weight to give to current popularity
 * vs growth momentum. 0.5/0.5 by default; can shift toward growth for
 * "emerging" detection.
 */
const POPULARITY_WEIGHT = 0.5;
const GROWTH_WEIGHT = 0.5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Map a growth percentage to a 0-100 score using a damped logarithmic curve.
 *
 * - 0% growth → 50 (neutral)
 * - +100% (×2) → ~75
 * - +500% (×6) → ~92
 * - -50% → ~33
 * - -90% → ~10
 *
 * We use log to avoid letting outlier growth (e.g. +5000%) dominate.
 */
export function growthToScore(growthPct: number): number {
  // Map to multiplier ratio (1.0 = no change)
  const ratio = 1 + growthPct / 100;
  if (ratio <= 0) return 0;
  // log2 gives -∞..+∞; we clamp at ±3 (×8 or ÷8) and rescale to 0-100
  const log = Math.log2(ratio);
  const clamped = Math.max(-3, Math.min(3, log));
  return clamp(50 + (clamped / 3) * 50);
}

/**
 * Per-source contribution: weighted popularity + growth.
 */
function scoreForSignal(signal: SourceSignal): number {
  const popularity = clamp(signal.score);
  const growth = growthToScore(signal.growth7d);
  return POPULARITY_WEIGHT * popularity + GROWTH_WEIGHT * growth;
}

// ─── Buzz multiplier ──────────────────────────────────────────────────────────

/**
 * When multiple sources spike simultaneously (>+50% in 7d), apply a small
 * multiplicative boost to reward coordinated buzz. Capped at +15%.
 */
function buzzMultiplier(signals: readonly SourceSignal[]): number {
  const spiking = signals.filter((s) => s.growth7d >= 50).length;
  const total = signals.length;
  if (total === 0) return 1;
  const ratio = spiking / total;
  return 1 + Math.min(0.15, ratio * 0.2);
}

// ─── Confidence ───────────────────────────────────────────────────────────────

/**
 * Confidence is high when:
 *   - many sources have signal (coverage)
 *   - sources agree directionally (consistency)
 *   - growth values are not extreme outliers
 */
export function computeConfidence(signals: readonly SourceSignal[]): ConfidenceLevel {
  const coverage = signals.length / 4; // 4+ sources = full coverage
  if (signals.length === 0) return "low";

  // Consistency: how many signals point in the same direction as the majority?
  const positives = signals.filter((s) => s.growth7d > 0).length;
  const negatives = signals.length - positives;
  const consistency = Math.max(positives, negatives) / signals.length;

  const score = 0.5 * Math.min(1, coverage) + 0.5 * consistency;

  if (score >= 0.85) return "very_high";
  if (score >= 0.65) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}

// ─── Novelty / Buzz / Risk sub-scores ────────────────────────────────────────

/**
 * Novelty: how recently did this keyword appear / spike?
 * Derived from the 90d series — flat then sudden rise = high novelty.
 */
export function computeNoveltyScore(series: TimeSeries | undefined): number {
  if (!series || series.length < 30) return 50;
  const first30 = series.slice(0, 30);
  const last30 = series.slice(-30);
  const avgFirst = avg(first30.map((p) => p.value));
  const avgLast = avg(last30.map((p) => p.value));
  if (avgFirst === 0) return 100;
  const ratio = avgLast / avgFirst;
  // Ratio 1 = no novelty (50), ratio 5+ = very novel (95+)
  return clamp(50 + Math.log2(ratio) * 18);
}

/**
 * Buzz: short-term excitement, weighted toward social sources.
 */
export function computeBuzzScore(signals: readonly SourceSignal[]): number {
  const socials = signals.filter((s) => s.source === "tiktok" || s.source === "instagram");
  if (socials.length === 0) {
    // Fallback to 7d growth on whatever signals exist
    return clamp(avg(signals.map((s) => growthToScore(s.growth7d))));
  }
  return clamp(avg(socials.map((s) => s.score * 0.5 + growthToScore(s.growth7d) * 0.5)));
}

/**
 * Risk: combination of regulatory concerns + stock volatility.
 * Lower is safer. Inputs are provided externally by the regulatory module
 * (not implemented here — see `lib/data-sources/regulatory.ts` placeholder).
 */
export function computeRiskScore(input: {
  regulatoryRisk: RiskLevel;
  stockRisk: RiskLevel;
  growthVolatility: number; // stddev of growth across sources
}): number {
  const regWeight: Record<RiskLevel, number> = { none: 0, low: 15, medium: 50, high: 90 };
  const stockWeight: Record<RiskLevel, number> = { none: 0, low: 10, medium: 35, high: 70 };
  const reg = regWeight[input.regulatoryRisk];
  const stock = stockWeight[input.stockRisk];
  const volat = clamp(input.growthVolatility, 0, 50);
  return clamp(reg * 0.5 + stock * 0.3 + volat * 0.2);
}

// ─── Aggregations ────────────────────────────────────────────────────────────

function avg(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stddev(xs: readonly number[]): number {
  if (xs.length < 2) return 0;
  const m = avg(xs);
  const variance = avg(xs.map((x) => (x - m) ** 2));
  return Math.sqrt(variance);
}

// ─── Source breakdown ────────────────────────────────────────────────────────

export function buildSourceBreakdown(
  signals: readonly SourceSignal[]
): TrendSourceBreakdown {
  const bySource: Record<DataSource, number> = {
    google_trends: 0,
    tiktok: 0,
    amazon: 0,
    instagram: 0,
    web: 0,
    perplexity: 0,
  };
  for (const s of signals) bySource[s.source] = s.score;
  let dominant: DataSource | null = null;
  let maxScore = -1;
  for (const [src, score] of Object.entries(bySource) as [DataSource, number][]) {
    if (score > maxScore) {
      maxScore = score;
      dominant = src;
    }
  }
  return {
    google: bySource.google_trends,
    tiktok: bySource.tiktok,
    amazon: bySource.amazon,
    instagram: bySource.instagram,
    web: bySource.web,
    dominant: maxScore > 0 ? dominant : null,
  };
}

// ─── Growth aggregation ──────────────────────────────────────────────────────

export function aggregateGrowth(signals: readonly SourceSignal[]): TrendGrowth {
  // Weighted average by source weight to avoid letting weak sources skew growth.
  const totalWeight = signals.reduce(
    (sum, s) => sum + (SOURCE_WEIGHTS[s.source] ?? 0),
    0
  );
  if (totalWeight === 0) {
    return { growth7d: 0, growth30d: 0, growth90d: 0, yoyGrowth: 0 };
  }
  const weighted = (pick: (s: SourceSignal) => number) =>
    signals.reduce((acc, s) => acc + pick(s) * (SOURCE_WEIGHTS[s.source] ?? 0), 0) /
    totalWeight;
  return {
    growth7d: round(weighted((s) => s.growth7d)),
    growth30d: round(weighted((s) => s.growth30d)),
    growth90d: round(weighted((s) => s.growth90d)),
    yoyGrowth: round(weighted((s) => s.yoyGrowth)),
  };
}

function round(n: number, digits = 1): number {
  const m = 10 ** digits;
  return Math.round(n * m) / m;
}

// ─── Main entry ──────────────────────────────────────────────────────────────

export interface ComputeTrendScoreInput {
  signals: readonly SourceSignal[];
  regulatoryRisk: RiskLevel;
  stockRisk: RiskLevel;
  /** Pre-computed seasonality score (0-100) from `seasonalityDetection.ts`. */
  seasonalityScore: number;
  /** Margin potential, usually set by category mapping or manual override. */
  marginPotential: MarginLevel;
  /** Optional long series (90d) for novelty detection. */
  longSeries?: TimeSeries;
}

/**
 * Compute the full TrendScores bundle for a single keyword.
 *
 * Returns deterministic, audit-able scores. The function never reads from
 * the database, network, or environment — all inputs are explicit.
 */
export function computeTrendScores(input: ComputeTrendScoreInput): TrendScores {
  const { signals, regulatoryRisk, stockRisk, seasonalityScore, marginPotential, longSeries } =
    input;

  if (signals.length === 0) {
    return {
      trendScore: 0,
      buyScore: 0,
      confidenceLevel: "low",
      seasonalityScore: clamp(seasonalityScore),
      noveltyScore: 50,
      buzzScore: 0,
      riskScore: 0,
      marginPotential,
      stockRisk,
      regulatoryRisk,
    };
  }

  // Weighted average of per-source scores
  const sumWeights = signals.reduce((s, sig) => s + (SOURCE_WEIGHTS[sig.source] ?? 0), 0);
  const rawTrendScore =
    signals.reduce(
      (acc, sig) => acc + scoreForSignal(sig) * (SOURCE_WEIGHTS[sig.source] ?? 0),
      0
    ) / Math.max(0.0001, sumWeights);

  const trendScore = round(clamp(rawTrendScore * buzzMultiplier(signals)));

  const buzzScore = round(computeBuzzScore(signals));
  const noveltyScore = round(computeNoveltyScore(longSeries));

  const growthsValues = signals.map((s) => s.growth7d);
  const riskScore = round(
    computeRiskScore({
      regulatoryRisk,
      stockRisk,
      growthVolatility: stddev(growthsValues),
    })
  );

  const confidenceLevel = computeConfidence(signals);

  return {
    trendScore,
    // buyScore is computed by buyScoring.ts; trendScores callers should call
    // computeBuyScore separately. We expose 0 here to make it explicit.
    buyScore: 0,
    confidenceLevel,
    seasonalityScore: round(clamp(seasonalityScore)),
    noveltyScore,
    buzzScore,
    riskScore,
    marginPotential,
    stockRisk,
    regulatoryRisk,
  };
}

// ─── Testing exports ─────────────────────────────────────────────────────────
// Exposed for unit tests, not part of the public API.
export const __internals = { avg, stddev, scoreForSignal, buzzMultiplier, round };
