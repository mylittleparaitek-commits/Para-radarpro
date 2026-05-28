/**
 * Core domain types for ParaRadar Pro.
 *
 * These types model the business domain (trends, products, scoring) and are
 * intentionally decoupled from any persistence layer. Database row types live
 * in `types/database.ts` and are mapped to these via the data access layer.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export const SUBSCRIPTION_PLANS = ["free", "pro", "business", "premium"] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

export const PHARMACY_SIZES = ["small", "medium", "large"] as const;
export type PharmacySize = (typeof PHARMACY_SIZES)[number];

export const CONFIDENCE_LEVELS = ["low", "medium", "high", "very_high"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

export const RISK_LEVELS = ["none", "low", "medium", "high"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const MARGIN_LEVELS = ["low", "medium", "high"] as const;
export type MarginLevel = (typeof MARGIN_LEVELS)[number];

export const RECOMMENDED_ACTIONS = [
  "buy_now",
  "buy_carefully",
  "watch",
  "do_not_buy",
  "seo_only",
  "highlight_stock",
  "regulatory_caution",
] as const;
export type RecommendedAction = (typeof RECOMMENDED_ACTIONS)[number];

export const DATA_SOURCES = [
  "google_trends",
  "tiktok",
  "amazon",
  "instagram",
  "web",
  "perplexity",
] as const;
export type DataSource = (typeof DATA_SOURCES)[number];

export const TREND_STATUSES = ["draft", "published", "archived"] as const;
export type TrendStatus = (typeof TREND_STATUSES)[number];

export const NEWSLETTER_STATUSES = ["draft", "published"] as const;
export type NewsletterStatus = (typeof NEWSLETTER_STATUSES)[number];

// ─── Chart data ───────────────────────────────────────────────────────────────

export interface TimeSeriesPoint {
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** Score value 0-100 or arbitrary unit, normalized within a series. */
  value: number;
}

export type TimeSeries = readonly TimeSeriesPoint[];

// ─── Source signals (input to the scoring engine) ─────────────────────────────

/**
 * Normalized signal coming from one data source for one keyword.
 * All signal scores are normalized to 0-100 so they can be combined.
 */
export interface SourceSignal {
  source: DataSource;
  keyword: string;
  /** Current popularity score 0-100, normalized within the source. */
  score: number;
  /** Growth percentage over the last 7 days (e.g. 219 for +219%). */
  growth7d: number;
  growth30d: number;
  growth90d: number;
  /** Year-over-year growth percentage (current vs same period last year). */
  yoyGrowth: number;
  /** Optional time series used for chart rendering and trend detection. */
  series?: TimeSeries;
  /** ISO timestamp when this signal was collected. */
  collectedAt: string;
  /** Source-specific metadata (URL, engagement, etc.). */
  meta?: Record<string, unknown>;
}

// ─── Trend (domain entity) ────────────────────────────────────────────────────

export interface TrendScores {
  trendScore: number;
  buyScore: number;
  confidenceLevel: ConfidenceLevel;
  seasonalityScore: number;
  noveltyScore: number;
  buzzScore: number;
  riskScore: number;
  marginPotential: MarginLevel;
  stockRisk: RiskLevel;
  regulatoryRisk: RiskLevel;
}

export interface TrendGrowth {
  growth7d: number;
  growth30d: number;
  growth90d: number;
  yoyGrowth: number;
}

export interface TrendSourceBreakdown {
  google: number;
  tiktok: number;
  amazon: number;
  instagram: number;
  web: number;
  dominant: DataSource | null;
}

export interface TrendSeasonality {
  /** Month numbers 1-12 when this trend peaks. */
  peakMonths: readonly number[];
  /** Human-readable label, e.g. "Automne-Hiver (immunité)". */
  label: string | null;
}

export interface SuggestedQuantities {
  small: number;
  medium: number;
  large: number;
}

export interface TrendContent {
  seoKeywords: readonly string[];
  socialContentIdeas: readonly string[];
  counterQuestions: readonly string[];
  evidenceLinks: readonly string[];
  executiveSummary: string | null;
  whyItRises: string | null;
  regulatoryNotes: string | null;
}

export interface TrendChartData {
  d7: TimeSeries;
  d30: TimeSeries;
  d90: TimeSeries;
}

export interface Trend {
  id: string;
  keyword: string;
  normalizedKeyword: string;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  scores: TrendScores;
  growth: TrendGrowth;
  sources: TrendSourceBreakdown;
  seasonality: TrendSeasonality;
  recommendedAction: RecommendedAction;
  suggestedQuantities: SuggestedQuantities;
  content: TrendContent;
  charts: TrendChartData;
  status: TrendStatus;
  isValidated: boolean;
  isFeatured: boolean;
  detectedAt: string;
  updatedAt: string;
}

// ─── Product recommendation ───────────────────────────────────────────────────

export interface ProductRecommendation {
  id: string;
  trendId: string;
  productName: string;
  brand: string | null;
  format: string | null;
  category: string | null;
  reason: string | null;
  recommendedQty: number;
  risk: MarginLevel;
  estimatedMarginLevel: MarginLevel;
  priority: "low" | "medium" | "high" | "urgent";
  supplierNotes: string | null;
  createdAt: string;
}

// ─── Newsletter ───────────────────────────────────────────────────────────────

export interface NewsletterIssue {
  id: string;
  title: string;
  week: string;
  summary: string | null;
  topTrendIds: readonly string[];
  watchlistIds: readonly string[];
  buyNowIds: readonly string[];
  avoidOrWaitIds: readonly string[];
  contentIdeas: readonly string[];
  generatedHtml: string | null;
  generatedMarkdown: string | null;
  status: NewsletterStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Filters (API query layer) ────────────────────────────────────────────────

export interface TrendFilters {
  category?: string;
  minTrendScore?: number;
  minBuyScore?: number;
  recommendedAction?: RecommendedAction;
  source?: DataSource;
  stockRisk?: RiskLevel;
  regulatoryRisk?: RiskLevel;
  search?: string;
  status?: TrendStatus;
  limit?: number;
  offset?: number;
}

// ─── Plan access ──────────────────────────────────────────────────────────────

export interface PlanLimits {
  /** Max number of trends visible in dashboard / list. */
  maxTrends: number;
  /** Whether product recommendations are accessible. */
  productRecommendations: boolean;
  /** Whether full trend detail (SEO, social ideas, quantities) is accessible. */
  fullTrendDetail: boolean;
  /** Whether CSV export is allowed. */
  csvExport: boolean;
  /** Whether the REST API is exposed (Premium only). */
  apiAccess: boolean;
  /** History depth in days. */
  historyDays: number;
}
