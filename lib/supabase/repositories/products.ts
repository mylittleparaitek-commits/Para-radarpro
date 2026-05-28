/**
 * Product recommendations repository.
 *
 * Visibility is plan-gated upstream: free users do not see recommendations.
 * RLS enforces the rule at the database level.
 */

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductRecommendation } from "@/types";
import type { Database, ProductRecommendationRow } from "@/types/database";
import { rowToProductRecommendation } from "../mappers";

type DB = SupabaseClient<any, any, any>;

export async function listForTrend(
  db: DB,
  trendId: string,
): Promise<ProductRecommendation[]> {
  const { data, error } = await db
    .from("product_recommendations")
    .select("*")
    .eq("trend_id", trendId)
    .order("priority", { ascending: false });
  if (error) throw new Error(`listForTrend failed: ${error.message}`);
  return (data ?? []).map(rowToProductRecommendation);
}

export interface CreateProductRecommendationInput {
  trendId: string;
  productName: string;
  brand?: string | null;
  format?: string | null;
  category?: string | null;
  reason?: string | null;
  recommendedQty: number;
  risk?: ProductRecommendation["risk"];
  estimatedMarginLevel?: ProductRecommendation["estimatedMarginLevel"];
  priority?: ProductRecommendation["priority"];
  supplierNotes?: string | null;
}

export async function createProductRecommendation(
  db: DB,
  input: CreateProductRecommendationInput,
): Promise<ProductRecommendation> {
  const insert: Database["public"]["Tables"]["product_recommendations"]["Insert"] = {
    trend_id: input.trendId,
    product_name: input.productName,
    brand: input.brand ?? null,
    format: input.format ?? null,
    category: input.category ?? null,
    reason: input.reason ?? null,
    recommended_qty: input.recommendedQty,
    risk: input.risk ?? "medium",
    estimated_margin_level: input.estimatedMarginLevel ?? "medium",
    priority: input.priority ?? "medium",
    supplier_notes: input.supplierNotes ?? null,
  };
  const { data, error } = await db
    .from("product_recommendations")
    .insert(insert)
    .select("*")
    .single();
  if (error) throw new Error(`createProductRecommendation failed: ${error.message}`);
  return rowToProductRecommendation(data as ProductRecommendationRow);
}

export async function deleteProductRecommendation(db: DB, id: string): Promise<void> {
  const { error } = await db.from("product_recommendations").delete().eq("id", id);
  if (error) throw new Error(`deleteProductRecommendation failed: ${error.message}`);
}
