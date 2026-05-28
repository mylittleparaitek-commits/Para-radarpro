/**
 * Seasonality Detection
 *
 * Detects whether a trend has a seasonal pattern, and which months are its
 * historical peaks.
 *
 * Two strategies are supported:
 *
 *   1. **Time-series based** (preferred): given a multi-year series (or a
 *      sufficiently long 365d+ window), use month-of-year aggregation +
 *      coefficient of variation to detect seasonality strength.
 *
 *   2. **Category-based fallback**: for new trends without history, infer
 *      peak months from the product category (immunity → autumn/winter,
 *      solar protection → summer, etc.).
 *
 * Output is a `TrendSeasonality` object + a 0-100 score that fits into the
 * `TrendScores` bundle.
 */

import type { TimeSeries, TrendSeasonality } from "@/types";

// ─── Category → peak months fallback table ───────────────────────────────────

const CATEGORY_PEAK_MONTHS: Record<string, { months: number[]; label: string }> = {
  // Immunité — pic automne/hiver
  immunite: { months: [9, 10, 11, 12, 1, 2], label: "Automne-Hiver (immunité)" },
  immunity: { months: [9, 10, 11, 12, 1, 2], label: "Automne-Hiver (immunité)" },

  // Solaire / protection — été
  solaire: { months: [5, 6, 7, 8], label: "Printemps-Été (solaire)" },
  solar: { months: [5, 6, 7, 8], label: "Printemps-Été (solaire)" },
  sunscreen: { months: [5, 6, 7, 8], label: "Printemps-Été (solaire)" },

  // Minceur — janvier (résolutions) + printemps (été qui arrive)
  minceur: { months: [1, 2, 3, 4, 5], label: "Janvier–Mai (minceur post-fêtes)" },
  slimming: { months: [1, 2, 3, 4, 5], label: "Janvier–Mai (minceur post-fêtes)" },

  // Allergie — printemps
  allergie: { months: [3, 4, 5, 6], label: "Printemps (allergies)" },
  allergy: { months: [3, 4, 5, 6], label: "Printemps (allergies)" },

  // Stress / sommeil — fin d'année + rentrée
  stress: { months: [9, 10, 11, 12], label: "Rentrée + fin d'année (stress)" },
  sommeil: { months: [1, 2, 9, 10, 11], label: "Hiver (sommeil)" },
  sleep: { months: [1, 2, 9, 10, 11], label: "Hiver (sommeil)" },

  // Hydratation/peau sèche — hiver
  hydratation: { months: [10, 11, 12, 1, 2, 3], label: "Hiver (hydratation)" },

  // Détox — janvier et septembre
  detox: { months: [1, 9], label: "Janvier & septembre (détox)" },

  // Cheveux/ongles — printemps (chute saisonnière auto/printemps)
  cheveux: { months: [3, 4, 9, 10], label: "Printemps & automne (cheveux)" },
  hair: { months: [3, 4, 9, 10], label: "Printemps & automne (cheveux)" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function avg(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stddev(xs: readonly number[]): number {
  if (xs.length < 2) return 0;
  const m = avg(xs);
  return Math.sqrt(avg(xs.map((x) => (x - m) ** 2)));
}

/** Coefficient of variation: stddev / mean. Higher = more seasonal. */
function coefficientOfVariation(xs: readonly number[]): number {
  const m = avg(xs);
  if (m === 0) return 0;
  return stddev(xs) / m;
}

// ─── Category-based fallback ─────────────────────────────────────────────────

/**
 * Look up peak months from a category string. Returns null if no match.
 * Normalizes the input (lowercased, accent-stripped) to be tolerant.
 */
export function seasonalityFromCategory(
  category: string | null | undefined
): TrendSeasonality | null {
  if (!category) return null;
  const normalized = category
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  for (const [key, value] of Object.entries(CATEGORY_PEAK_MONTHS)) {
    if (normalized.includes(key)) {
      return { peakMonths: value.months, label: value.label };
    }
  }
  return null;
}

// ─── Time-series based detection ─────────────────────────────────────────────

interface MonthAggregate {
  month: number; // 1-12
  mean: number;
  count: number;
}

/**
 * Aggregate a daily series by month-of-year, returning mean value per month.
 * Months with no data get a count of 0 and mean of 0.
 */
function aggregateByMonth(series: TimeSeries): MonthAggregate[] {
  const buckets: Record<number, { sum: number; count: number }> = {};
  for (let m = 1; m <= 12; m++) buckets[m] = { sum: 0, count: 0 };
  for (const point of series) {
    const date = new Date(point.date);
    if (Number.isNaN(date.getTime())) continue;
    const month = date.getUTCMonth() + 1;
    buckets[month]!.sum += point.value;
    buckets[month]!.count += 1;
  }
  return Object.entries(buckets).map(([m, b]) => ({
    month: Number(m),
    mean: b.count > 0 ? b.sum / b.count : 0,
    count: b.count,
  }));
}

/**
 * Detect seasonality from a long time series.
 *
 * The peak set is defined as months with mean ≥ overall mean × `peakThreshold`.
 * The score reflects how much each month's mean varies (CV), capped at 100.
 *
 * @param series  Daily time series. Should span 12+ months for reliable detection.
 * @param peakThreshold  Multiplier for what counts as "above average" (default 1.15).
 * @returns Detected seasonality + 0-100 confidence-weighted score.
 *          Returns null if the series is too short.
 */
export function detectSeasonalityFromSeries(
  series: TimeSeries,
  peakThreshold = 1.15
): { seasonality: TrendSeasonality; score: number } | null {
  if (series.length < 60) return null; // too short — no opinion

  const monthly = aggregateByMonth(series);
  const monthsWithData = monthly.filter((m) => m.count > 0);
  if (monthsWithData.length < 4) return null; // need at least 4 months represented

  const overallMean = avg(monthsWithData.map((m) => m.mean));
  if (overallMean === 0) return null;

  const peakMonths = monthsWithData
    .filter((m) => m.mean >= overallMean * peakThreshold)
    .map((m) => m.month)
    .sort((a, b) => a - b);

  // Score = clamped CV × 100. CV of ~0.3+ for pharma trends typically indicates
  // real seasonality.
  const cv = coefficientOfVariation(monthsWithData.map((m) => m.mean));
  const score = clamp(cv * 200); // 0.5 CV → 100

  return {
    seasonality: {
      peakMonths,
      label: peakMonths.length > 0 ? labelFromMonths(peakMonths) : null,
    },
    score: Math.round(score),
  };
}

// ─── Label generation from month set ─────────────────────────────────────────

const MONTH_NAMES_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/**
 * Build a human-readable French seasonality label from a set of peak months.
 * Detects classic season runs (e.g. months 6,7,8 → "Été").
 */
export function labelFromMonths(months: readonly number[]): string {
  if (months.length === 0) return "Aucune saisonnalité";
  const set = new Set(months);
  const has = (...xs: number[]) => xs.every((x) => set.has(x));

  if (has(6, 7, 8) && months.length <= 4) return "Été";
  if (has(12, 1, 2) && months.length <= 4) return "Hiver";
  if (has(3, 4, 5) && months.length <= 4) return "Printemps";
  if (has(9, 10, 11) && months.length <= 4) return "Automne";
  if (has(9, 10, 11, 12, 1, 2)) return "Automne-Hiver";
  if (has(3, 4, 5, 6, 7, 8)) return "Printemps-Été";

  // Default: comma-separated short month names
  return months.map((m) => MONTH_NAMES_FR[m - 1]).join(", ");
}

// ─── Main entry ──────────────────────────────────────────────────────────────

export interface DetectSeasonalityInput {
  category?: string | null;
  longSeries?: TimeSeries;
}

export interface SeasonalityResult {
  seasonality: TrendSeasonality;
  score: number;
  /** Did we use the series or the category fallback? */
  source: "series" | "category" | "none";
}

/**
 * Top-level seasonality detection. Tries the time series first, falls back
 * to category mapping, and finally returns a "no seasonality" result.
 */
export function detectSeasonality(input: DetectSeasonalityInput): SeasonalityResult {
  if (input.longSeries && input.longSeries.length >= 60) {
    const result = detectSeasonalityFromSeries(input.longSeries);
    if (result && result.seasonality.peakMonths.length > 0) {
      return { ...result, source: "series" };
    }
  }
  const fallback = seasonalityFromCategory(input.category);
  if (fallback) {
    return { seasonality: fallback, score: 50, source: "category" };
  }
  return {
    seasonality: { peakMonths: [], label: null },
    score: 0,
    source: "none",
  };
}

/**
 * Is the current month a peak month for this trend?
 * Useful for boosting buyScore right before / during the season.
 */
export function isInSeason(
  seasonality: TrendSeasonality,
  now: Date = new Date()
): boolean {
  if (seasonality.peakMonths.length === 0) return false;
  const month = now.getUTCMonth() + 1;
  return seasonality.peakMonths.includes(month);
}
