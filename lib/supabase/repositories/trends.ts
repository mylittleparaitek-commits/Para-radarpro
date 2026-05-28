/**
 * Trends repository.
 *
 * All trend reads/writes go through here. RLS protects the underlying table:
 * anonymous/authenticated users see only `status = 'published'` rows,
 * service-role (admin) sees everything.
 */

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Trend, TrendFilters } from "@/types";
import type { Database, TrendRow } from "@/types/database";
import { rowToTrend, trendToRow } from "../mappers";

type DB = SupabaseClient<any, any, any>;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function listTrends(db: DB, filters: TrendFilters = {}): Promise<Trend[]> {
  let q = db.from("trends").select("*").order("trend_score", { ascending: false });

  if (filters.category) q = q.eq("category", filters.category);
  if (filters.minTrendScore !== undefined) q = q.gte("trend_score", filters.minTrendScore);
  if (filters.minBuyScore !== undefined) q = q.gte("buy_score", filters.minBuyScore);
  if (filters.recommendedAction) q = q.eq("recommended_action", filters.recommendedAction);
  if (filters.stockRisk) q = q.eq("stock_risk", filters.stockRisk);
  if (filters.regulatoryRisk) q = q.eq("regulatory_risk", filters.regulatoryRisk);
  if (filters.status) q = q.eq("status", filters.status);
  if (filters.search) {
    // ilike on keyword. For multi-column search use Postgres FTS in a later iteration.
    q = q.ilike("keyword", `%${filters.search}%`);
  }
  if (filters.source) {
    // Dominant source filter; granular per-source filtering would require
    // separate columns / numeric thresholds, not modeled here.
    q = q.eq("dominant_source", filters.source);
  }

  const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const offset = Math.max(filters.offset ?? 0, 0);
  q = q.range(offset, offset + limit - 1);

  const { data, error } = await q;
  if (error) throw new Error(`listTrends failed: ${error.message}`);
  return (data ?? []).map(rowToTrend);
}

export async function getTrendById(db: DB, id: string): Promise<Trend | null> {
  const { data, error } = await db.from("trends").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`getTrendById failed: ${error.message}`);
  return data ? rowToTrend(data) : null;
}

export async function getTrendByNormalizedKeyword(
  db: DB,
  normalizedKeyword: string,
): Promise<Trend | null> {
  const { data, error } = await db
    .from("trends")
    .select("*")
    .eq("normalized_keyword", normalizedKeyword)
    .maybeSingle();
  if (error) throw new Error(`getTrendByNormalizedKeyword failed: ${error.message}`);
  return data ? rowToTrend(data) : null;
}

/**
 * Insert or update a trend by `normalized_keyword`.
 * Caller is expected to use a service-role client.
 */
export async function upsertTrend(db: DB, trend: Omit<Trend, "id">): Promise<Trend> {
  const row = trendToRow(trend);
  const { data, error } = await db
    .from("trends")
    .upsert(row as Database["public"]["Tables"]["trends"]["Insert"], {
      onConflict: "normalized_keyword",
    })
    .select("*")
    .single();
  if (error) throw new Error(`upsertTrend failed: ${error.message}`);
  return rowToTrend(data as TrendRow);
}

export async function deleteTrend(db: DB, id: string): Promise<void> {
  const { error } = await db.from("trends").delete().eq("id", id);
  if (error) throw new Error(`deleteTrend failed: ${error.message}`);
}

export async function setTrendStatus(
  db: DB,
  id: string,
  status: Trend["status"],
  isValidated?: boolean,
): Promise<void> {
  const patch: Database["public"]["Tables"]["trends"]["Update"] = { status };
  if (isValidated !== undefined) patch.is_validated = isValidated;
  const { error } = await db.from("trends").update(patch).eq("id", id);
  if (error) throw new Error(`setTrendStatus failed: ${error.message}`);
}
