/**
 * Newsletters repository.
 */

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NewsletterIssue } from "@/types";
import type { Database, NewsletterIssueRow } from "@/types/database";
import { rowToNewsletter } from "../mappers";

type DB = SupabaseClient<any, any, any>;

export async function listNewsletters(
  db: DB,
  { limit = 12 }: { limit?: number } = {},
): Promise<NewsletterIssue[]> {
  const { data, error } = await db
    .from("newsletter_issues")
    .select("*")
    .order("week", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listNewsletters failed: ${error.message}`);
  return (data ?? []).map(rowToNewsletter);
}

export async function getNewsletterById(db: DB, id: string): Promise<NewsletterIssue | null> {
  const { data, error } = await db
    .from("newsletter_issues")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getNewsletterById failed: ${error.message}`);
  return data ? rowToNewsletter(data) : null;
}

export async function getLatestPublishedNewsletter(db: DB): Promise<NewsletterIssue | null> {
  const { data, error } = await db
    .from("newsletter_issues")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getLatestPublishedNewsletter failed: ${error.message}`);
  return data ? rowToNewsletter(data) : null;
}

export interface CreateNewsletterInput {
  title: string;
  week: string;
  summary: string | null;
  topTrendIds: readonly string[];
  watchlistIds: readonly string[];
  buyNowIds: readonly string[];
  avoidOrWaitIds: readonly string[];
  contentIdeas: readonly string[];
  generatedHtml: string;
  generatedMarkdown: string;
  status?: NewsletterIssue["status"];
}

export async function createNewsletter(
  db: DB,
  input: CreateNewsletterInput,
): Promise<NewsletterIssue> {
  const insert: Database["public"]["Tables"]["newsletter_issues"]["Insert"] = {
    title: input.title,
    week: input.week,
    summary: input.summary,
    top_trend_ids: Array.from(input.topTrendIds),
    watchlist_ids: Array.from(input.watchlistIds),
    buy_now_ids: Array.from(input.buyNowIds),
    avoid_or_wait_ids: Array.from(input.avoidOrWaitIds),
    content_ideas: Array.from(input.contentIdeas),
    generated_html: input.generatedHtml,
    generated_markdown: input.generatedMarkdown,
    status: input.status ?? "draft",
    published_at: null,
  };
  const { data, error } = await db
    .from("newsletter_issues")
    .insert(insert)
    .select("*")
    .single();
  if (error) throw new Error(`createNewsletter failed: ${error.message}`);
  return rowToNewsletter(data as NewsletterIssueRow);
}

export async function publishNewsletter(db: DB, id: string): Promise<void> {
  const { error } = await db
    .from("newsletter_issues")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`publishNewsletter failed: ${error.message}`);
}
