/**
 * Source aggregator.
 *
 * Calls all registered connectors in parallel for a given keyword, collects
 * the SourceSignals, hands them to the scoring engine, and produces a
 * complete Trend object ready to upsert into the database.
 *
 * Failure model:
 *   - One connector failing must NOT block the others. The aggregator
 *     collects errors, lowers the confidence level accordingly, and still
 *     produces a partial trend if at least one signal succeeded.
 *   - If ALL connectors fail, the aggregator returns null and the ingestion
 *     job decides whether to retry or fall back to mock data.
 */

import {
  computeTrendScores,
  computeBuyScore,
  scoreBuyAndAction,
  detectSeasonality,
  buildSourceBreakdown,
  aggregateGrowth,
} from "@/lib/scoring";
import type {
  DataSource,
  MarginLevel,
  RiskLevel,
  SourceSignal,
  Trend,
} from "@/types";
import { normalizeKeyword } from "@/lib/utils/text";
import {
  type ConnectorRegistry,
  ConnectorError,
} from "./sourceConnector.interface";

export interface AggregateInput {
  keyword: string;
  category: string | null;
  subcategory?: string | null;
  description?: string | null;
  /** Margin potential, usually derived from category. */
  marginPotential: MarginLevel;
  /** Initial regulatory risk assessment; may be refined by Perplexity. */
  regulatoryRisk: RiskLevel;
  /** Initial stock risk; may be refined by sell-through data. */
  stockRisk: RiskLevel;
  /** Optional locale; defaults to fr-FR. */
  locale?: string;
}

export interface AggregateResult {
  trend: Omit<Trend, "id" | "detectedAt" | "updatedAt">;
  signals: readonly SourceSignal[];
  errors: readonly { source: DataSource; message: string }[];
}

/**
 * Run all connectors in parallel for one keyword and return a Trend draft.
 *
 * @param registry  The connector registry (DI for tests).
 * @param input     The keyword + context.
 */
export async function aggregateKeyword(
  registry: ConnectorRegistry,
  input: AggregateInput
): Promise<AggregateResult | null> {
  const errors: { source: DataSource; message: string }[] = [];
  const signals: SourceSignal[] = [];

  // Parallel fetch with per-connector error capture
  const results = await Promise.allSettled(
    Array.from(registry.values()).map(async (connector) => {
      try {
        const signal = await connector.fetchSignal({
          keyword: input.keyword,
          locale: input.locale ?? "fr-FR",
          includeTimeSeries: true,
        });
        return { ok: true as const, signal };
      } catch (err) {
        const code =
          err instanceof ConnectorError ? err.code : "unknown";
        return {
          ok: false as const,
          source: connector.source,
          message: err instanceof Error ? err.message : "Unknown error",
          code,
        };
      }
    })
  );

  for (const r of results) {
    if (r.status === "rejected") continue; // shouldn't happen — we catch inside
    if (r.value.ok) signals.push(r.value.signal);
    else errors.push({ source: r.value.source, message: r.value.message });
  }

  if (signals.length === 0) return null;

  // Seasonality first (it feeds trend score)
  const longestSeries = signals
    .map((s) => s.series)
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .sort((a, b) => b.length - a.length)[0];
  const seasonality = detectSeasonality({
    category: input.category,
    ...(longestSeries ? { longSeries: longestSeries } : {}),
  });

  // Trend scores
  const scores = computeTrendScores({
    signals,
    regulatoryRisk: input.regulatoryRisk,
    stockRisk: input.stockRisk,
    seasonalityScore: seasonality.score,
    marginPotential: input.marginPotential,
    ...(longestSeries ? { longSeries: longestSeries } : {}),
  });

  // Growth aggregation
  const growth = aggregateGrowth(signals);

  // Buy score + action
  const buyScore = computeBuyScore({ scores, growth });
  const { recommendedAction, suggestedQuantities } = scoreBuyAndAction({
    buyScore,
    trendScore: scores.trendScore,
    scores,
    growth,
  });

  // Source breakdown
  const sources = buildSourceBreakdown(signals);

  // Build the Trend draft (no id, no timestamps — caller persists)
  const trend: Omit<Trend, "id" | "detectedAt" | "updatedAt"> = {
    keyword: input.keyword,
    normalizedKeyword: normalizeKeyword(input.keyword),
    category: input.category,
    subcategory: input.subcategory ?? null,
    description: input.description ?? null,
    scores: { ...scores, buyScore },
    growth,
    sources,
    seasonality: seasonality.seasonality,
    recommendedAction,
    suggestedQuantities,
    content: {
      // Editorial content comes from lib/ai/perplexity.ts in a separate step.
      seoKeywords: [],
      socialContentIdeas: [],
      counterQuestions: [],
      evidenceLinks: [],
      executiveSummary: null,
      whyItRises: null,
      regulatoryNotes: null,
    },
    charts: {
      d7: pickSeries(signals, 7),
      d30: pickSeries(signals, 30),
      d90: pickSeries(signals, 90),
    },
    status: "draft", // never auto-publish — let admin validate
    isValidated: false,
    isFeatured: false,
  };

  return { trend, signals, errors };
}

/**
 * Pick the best available series of length ≥ n days.
 * Prefers the highest-weighted source (Google → TikTok → others).
 */
function pickSeries(signals: readonly SourceSignal[], minLength: number) {
  const priority: DataSource[] = [
    "google_trends",
    "tiktok",
    "amazon",
    "instagram",
    "web",
    "perplexity",
  ];
  for (const src of priority) {
    const signal = signals.find((s) => s.source === src && s.series && s.series.length >= minLength);
    if (signal?.series) return signal.series.slice(-minLength);
  }
  return [];
}
