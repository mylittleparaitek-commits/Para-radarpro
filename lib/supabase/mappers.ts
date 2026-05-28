/**
 * Mappers between the database row types (snake_case, flat) and the domain
 * types (camelCase, nested). All repository code goes through these
 * functions so the domain layer never sees raw rows.
 */

import type {
  ConfidenceLevel,
  MarginLevel,
  NewsletterIssue,
  ProductRecommendation,
  RecommendedAction,
  RiskLevel,
  TimeSeries,
  Trend,
  TrendStatus,
} from "@/types";
import type { NewsletterIssueRow, ProductRecommendationRow, TrendRow } from "@/types/database";

function nz<T>(v: T | null | undefined, fallback: T): T {
  return v == null ? fallback : v;
}

function asSeries(v: unknown): TimeSeries {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (p): p is { date: string; value: number } =>
      typeof p === "object" &&
      p !== null &&
      typeof (p as Record<string, unknown>).date === "string" &&
      typeof (p as Record<string, unknown>).value === "number",
  );
}

export function rowToTrend(r: TrendRow): Trend {
  return {
    id: r.id,
    keyword: r.keyword,
    normalizedKeyword: r.normalized_keyword,
    category: r.category,
    subcategory: r.subcategory,
    description: r.description,
    scores: {
      trendScore: r.trend_score,
      buyScore: r.buy_score,
      confidenceLevel: r.confidence_level,
      seasonalityScore: r.seasonality_score,
      noveltyScore: r.novelty_score,
      buzzScore: r.buzz_score,
      riskScore: r.risk_score,
      marginPotential: r.margin_potential,
      stockRisk: r.stock_risk,
      regulatoryRisk: r.regulatory_risk,
    },
    growth: {
      growth7d: r.growth_7d,
      growth30d: r.growth_30d,
      growth90d: r.growth_90d,
      yoyGrowth: r.yoy_growth,
    },
    sources: {
      google: r.source_google,
      tiktok: r.source_tiktok,
      amazon: r.source_amazon,
      instagram: r.source_instagram,
      web: r.source_web,
      dominant: r.dominant_source,
    },
    seasonality: {
      peakMonths: r.seasonality_months ?? [],
      label: r.seasonality_label,
    },
    recommendedAction: r.recommended_action,
    suggestedQuantities: {
      small: r.suggested_qty_small,
      medium: r.suggested_qty_medium,
      large: r.suggested_qty_large,
    },
    content: {
      seoKeywords: r.seo_keywords ?? [],
      socialContentIdeas: r.social_content_ideas ?? [],
      counterQuestions: r.counter_questions ?? [],
      evidenceLinks: r.evidence_links ?? [],
      executiveSummary: r.executive_summary,
      whyItRises: r.why_it_rises,
      regulatoryNotes: r.regulatory_notes,
    },
    charts: {
      d7: asSeries(r.chart_data_7d),
      d30: asSeries(r.chart_data_30d),
      d90: asSeries(r.chart_data_90d),
    },
    status: r.status,
    isValidated: r.is_validated,
    isFeatured: r.is_featured,
    detectedAt: r.detected_at,
    updatedAt: r.updated_at,
  };
}

export function trendToRow(t: Omit<Trend, "id">): Omit<TrendRow, "id" | "detected_at" | "updated_at"> {
  return {
    keyword: t.keyword,
    normalized_keyword: t.normalizedKeyword,
    category: t.category,
    subcategory: t.subcategory,
    description: t.description,
    trend_score: t.scores.trendScore,
    buy_score: t.scores.buyScore,
    confidence_level: t.scores.confidenceLevel as ConfidenceLevel,
    seasonality_score: t.scores.seasonalityScore,
    novelty_score: t.scores.noveltyScore,
    buzz_score: t.scores.buzzScore,
    risk_score: t.scores.riskScore,
    margin_potential: t.scores.marginPotential as MarginLevel,
    stock_risk: t.scores.stockRisk as RiskLevel,
    regulatory_risk: t.scores.regulatoryRisk as RiskLevel,
    growth_7d: t.growth.growth7d,
    growth_30d: t.growth.growth30d,
    growth_90d: t.growth.growth90d,
    yoy_growth: t.growth.yoyGrowth,
    source_google: t.sources.google,
    source_tiktok: t.sources.tiktok,
    source_amazon: t.sources.amazon,
    source_instagram: t.sources.instagram,
    source_web: t.sources.web,
    dominant_source: t.sources.dominant,
    seasonality_months: Array.from(t.seasonality.peakMonths),
    seasonality_label: t.seasonality.label,
    recommended_action: t.recommendedAction as RecommendedAction,
    suggested_qty_small: t.suggestedQuantities.small,
    suggested_qty_medium: t.suggestedQuantities.medium,
    suggested_qty_large: t.suggestedQuantities.large,
    seo_keywords: Array.from(t.content.seoKeywords),
    social_content_ideas: Array.from(t.content.socialContentIdeas),
    counter_questions: Array.from(t.content.counterQuestions),
    evidence_links: Array.from(t.content.evidenceLinks),
    executive_summary: t.content.executiveSummary,
    why_it_rises: t.content.whyItRises,
    regulatory_notes: t.content.regulatoryNotes,
    chart_data_7d: Array.from(t.charts.d7) as TrendRow["chart_data_7d"],
    chart_data_30d: Array.from(t.charts.d30) as TrendRow["chart_data_30d"],
    chart_data_90d: Array.from(t.charts.d90) as TrendRow["chart_data_90d"],
    status: t.status as TrendStatus,
    is_validated: t.isValidated,
    is_featured: t.isFeatured,
  };
}

export function rowToProductRecommendation(r: ProductRecommendationRow): ProductRecommendation {
  return {
    id: r.id,
    trendId: r.trend_id,
    productName: r.product_name,
    brand: r.brand,
    format: r.format,
    category: r.category,
    reason: r.reason,
    recommendedQty: r.recommended_qty,
    risk: r.risk,
    estimatedMarginLevel: r.estimated_margin_level,
    priority: r.priority,
    supplierNotes: r.supplier_notes,
    createdAt: r.created_at,
  };
}

export function rowToNewsletter(r: NewsletterIssueRow): NewsletterIssue {
  return {
    id: r.id,
    title: r.title,
    week: r.week,
    summary: r.summary,
    topTrendIds: r.top_trend_ids,
    watchlistIds: r.watchlist_ids,
    buyNowIds: r.buy_now_ids,
    avoidOrWaitIds: r.avoid_or_wait_ids,
    contentIdeas: r.content_ideas,
    generatedHtml: r.generated_html,
    generatedMarkdown: r.generated_markdown,
    status: r.status,
    publishedAt: r.published_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// Silence "unused" warnings when the helper is exported but not used here.
void nz;
