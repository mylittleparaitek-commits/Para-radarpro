/**
 * Database row types — direct mirror of the Postgres schema in `db/migrations/`.
 *
 * These are the types you get when reading from Supabase. They are NOT
 * the domain types — see `types/index.ts` for the application domain model.
 * The data access layer in `lib/supabase/*` is responsible for mapping
 * `*Row` types ↔ domain types.
 *
 * In production, regenerate this file from your Supabase project with:
 *   pnpm db:generate-types
 *
 * This file is hand-written as a fallback / source of truth for the migrations.
 */

import type {
  ConfidenceLevel,
  DataSource,
  MarginLevel,
  NewsletterStatus,
  PharmacySize,
  RecommendedAction,
  RiskLevel,
  SubscriptionPlan,
  TrendStatus,
  TimeSeriesPoint,
} from "./index";

export interface ProfileRow {
  id: string; // UUID — matches auth.users.id
  email: string;
  full_name: string | null;
  company_name: string | null;
  pharmacy_size: PharmacySize | null;
  ecommerce_volume: string | null;
  role: "user" | "admin";
  subscription_plan: SubscriptionPlan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: "active" | "trialing" | "past_due" | "canceled" | "incomplete" | "inactive";
  subscription_ends_at: string | null;
  preferences: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  last_signed_in_at: string;
}

export interface TrendRow {
  id: string;
  keyword: string;
  normalized_keyword: string;
  category: string | null;
  subcategory: string | null;
  description: string | null;

  // Scores
  trend_score: number;
  buy_score: number;
  confidence_level: ConfidenceLevel;
  seasonality_score: number;
  novelty_score: number;
  buzz_score: number;
  risk_score: number;
  margin_potential: MarginLevel;
  stock_risk: RiskLevel;
  regulatory_risk: RiskLevel;

  // Growth
  growth_7d: number;
  growth_30d: number;
  growth_90d: number;
  yoy_growth: number;

  // Source breakdown
  source_google: number;
  source_tiktok: number;
  source_amazon: number;
  source_instagram: number;
  source_web: number;
  dominant_source: DataSource | null;

  // Seasonality
  seasonality_months: number[] | null;
  seasonality_label: string | null;

  // Recommendation
  recommended_action: RecommendedAction;
  suggested_qty_small: number;
  suggested_qty_medium: number;
  suggested_qty_large: number;

  // Content (json arrays / text)
  seo_keywords: string[] | null;
  social_content_ideas: string[] | null;
  counter_questions: string[] | null;
  evidence_links: string[] | null;
  executive_summary: string | null;
  why_it_rises: string | null;
  regulatory_notes: string | null;

  // Charts
  chart_data_7d: TimeSeriesPoint[] | null;
  chart_data_30d: TimeSeriesPoint[] | null;
  chart_data_90d: TimeSeriesPoint[] | null;

  // Status
  status: TrendStatus;
  is_validated: boolean;
  is_featured: boolean;

  detected_at: string;
  updated_at: string;
}

export interface ProductRecommendationRow {
  id: string;
  trend_id: string;
  product_name: string;
  brand: string | null;
  format: string | null;
  category: string | null;
  reason: string | null;
  recommended_qty: number;
  risk: MarginLevel;
  estimated_margin_level: MarginLevel;
  priority: "low" | "medium" | "high" | "urgent";
  supplier_notes: string | null;
  created_at: string;
}

export interface NewsletterIssueRow {
  id: string;
  title: string;
  week: string;
  summary: string | null;
  top_trend_ids: string[];
  watchlist_ids: string[];
  buy_now_ids: string[];
  avoid_or_wait_ids: string[];
  content_ideas: string[];
  generated_html: string | null;
  generated_markdown: string | null;
  status: NewsletterStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Top-level Database type compatible with @supabase/supabase-js generic.
 * In production, prefer the auto-generated `database.generated.ts`.
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & Pick<ProfileRow, "id" | "email">;
        Update: Partial<ProfileRow>;
      };
      trends: {
        Row: TrendRow;
        Insert: Partial<TrendRow> & Pick<TrendRow, "keyword" | "normalized_keyword">;
        Update: Partial<TrendRow>;
      };
      product_recommendations: {
        Row: ProductRecommendationRow;
        Insert: Omit<ProductRecommendationRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<ProductRecommendationRow>;
      };
      newsletter_issues: {
        Row: NewsletterIssueRow;
        Insert: Omit<NewsletterIssueRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
        };
        Update: Partial<NewsletterIssueRow>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      subscription_plan: SubscriptionPlan;
      confidence_level: ConfidenceLevel;
      risk_level: RiskLevel;
      margin_level: MarginLevel;
      recommended_action: RecommendedAction;
      trend_status: TrendStatus;
      newsletter_status: NewsletterStatus;
      data_source: DataSource;
      pharmacy_size: PharmacySize;
    };
  };
}
