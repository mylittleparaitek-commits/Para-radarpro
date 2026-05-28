/**
 * Newsletter Generator
 *
 * Builds a weekly newsletter from a curated list of trends:
 *   - Title with the top 3 keywords
 *   - Executive summary
 *   - Top 5 trends section
 *   - "Buy now" section
 *   - "Watchlist" section
 *   - "Avoid / regulatory caution" section
 *   - Content ideas (SEO + social)
 *
 * Emits two formats:
 *   - **Markdown**: for archival, email-as-text, and feeding to AI email
 *     services like Mailchimp / Brevo for smart-rendering.
 *   - **HTML**: ready-to-send standalone email (inlined CSS, no external assets).
 *
 * Pure functions. No I/O. Templating is in `./templates/{html,markdown}.ts`.
 */

import type {
  NewsletterIssue,
  RecommendedAction,
  Trend,
} from "@/types";
import { renderHtml } from "./templates/html";
import { renderMarkdown } from "./templates/markdown";

// ─── Input / output ──────────────────────────────────────────────────────────

export interface GenerateNewsletterInput {
  week: string; // ISO week label, e.g. "2026-W22"
  trends: readonly Trend[];
  /** Override the title (otherwise auto-generated from top trends). */
  title?: string;
  /** Override the summary (otherwise auto-generated). */
  summary?: string;
  /** Brand / app URL used in CTAs. */
  appUrl?: string;
}

export interface GeneratedNewsletter {
  title: string;
  summary: string;
  /** Trend ids by category, for the database `*_ids` columns. */
  topTrendIds: readonly string[];
  buyNowIds: readonly string[];
  watchlistIds: readonly string[];
  avoidOrWaitIds: readonly string[];
  contentIdeas: readonly string[];
  markdown: string;
  html: string;
}

// ─── Categorization ──────────────────────────────────────────────────────────

const TOP_LIMIT = 5;
const BUY_LIMIT = 3;
const WATCH_LIMIT = 3;
const AVOID_LIMIT = 2;

function isAction(t: Trend, ...actions: RecommendedAction[]): boolean {
  return actions.includes(t.recommendedAction);
}

function categorize(trends: readonly Trend[]) {
  const sorted = [...trends].sort((a, b) => b.scores.trendScore - a.scores.trendScore);

  const top = sorted.slice(0, TOP_LIMIT);
  const buyNow = sorted
    .filter((t) => isAction(t, "buy_now"))
    .sort((a, b) => b.scores.buyScore - a.scores.buyScore)
    .slice(0, BUY_LIMIT);
  const watchlist = sorted
    .filter((t) => isAction(t, "watch", "buy_carefully", "highlight_stock"))
    .slice(0, WATCH_LIMIT);
  const avoidOrWait = sorted
    .filter((t) => isAction(t, "do_not_buy", "regulatory_caution"))
    .slice(0, AVOID_LIMIT);

  return { top, buyNow, watchlist, avoidOrWait };
}

// ─── Title / summary auto-generation ─────────────────────────────────────────

function autoTitle(top: readonly Trend[], week: string): string {
  if (top.length === 0) return `Tendances Parapharmacie — ${week}`;
  const keywords = top
    .slice(0, 3)
    .map((t) => t.keyword)
    .join(", ");
  return `🔥 Tendances Parapharma — ${week} | ${keywords} en forte hausse`;
}

function autoSummary(
  top: readonly Trend[],
  buyNow: readonly Trend[],
  avoidOrWait: readonly Trend[]
): string {
  if (top.length === 0) {
    return "Aucune tendance majeure cette semaine.";
  }
  const parts = [
    `${top.length} tendance${top.length > 1 ? "s" : ""} majeure${top.length > 1 ? "s" : ""} détectée${top.length > 1 ? "s" : ""} sur le radar parapharmacie.`,
  ];
  if (buyNow.length > 0) {
    parts.push(`${buyNow.length} recommandation${buyNow.length > 1 ? "s" : ""} d'achat immédiat.`);
  }
  if (avoidOrWait.length > 0) {
    parts.push(`${avoidOrWait.length} alerte${avoidOrWait.length > 1 ? "s" : ""} réglementaire${avoidOrWait.length > 1 ? "s" : ""}.`);
  }
  return parts.join(" ");
}

// ─── Content ideas extraction ────────────────────────────────────────────────

function extractContentIdeas(trends: readonly Trend[], max = 6): readonly string[] {
  const ideas: string[] = [];
  for (const t of trends) {
    const first = t.content.socialContentIdeas[0];
    if (first) ideas.push(first);
    if (ideas.length >= max) break;
  }
  return ideas;
}

// ─── Main entry ──────────────────────────────────────────────────────────────

/**
 * Generate a newsletter from a set of trends.
 *
 * The result is a `GeneratedNewsletter` with both markdown and HTML rendered;
 * the caller is responsible for persisting it via the newsletter repository.
 */
export function generateNewsletter(input: GenerateNewsletterInput): GeneratedNewsletter {
  const { week, trends, title: overrideTitle, summary: overrideSummary, appUrl } = input;

  const { top, buyNow, watchlist, avoidOrWait } = categorize(trends);

  const title = overrideTitle ?? autoTitle(top, week);
  const summary = overrideSummary ?? autoSummary(top, buyNow, avoidOrWait);
  const contentIdeas = extractContentIdeas(top);

  const renderContext = {
    week,
    title,
    summary,
    top,
    buyNow,
    watchlist,
    avoidOrWait,
    contentIdeas,
    appUrl: appUrl ?? "https://pararadar.pro",
  };

  const markdown = renderMarkdown(renderContext);
  const html = renderHtml(renderContext);

  return {
    title,
    summary,
    topTrendIds: top.map((t) => t.id),
    buyNowIds: buyNow.map((t) => t.id),
    watchlistIds: watchlist.map((t) => t.id),
    avoidOrWaitIds: avoidOrWait.map((t) => t.id),
    contentIdeas,
    markdown,
    html,
  };
}

/**
 * Build a partial NewsletterIssue (id-less) ready to insert into the DB.
 */
export function buildNewsletterIssueDraft(
  input: GenerateNewsletterInput
): Omit<NewsletterIssue, "id" | "createdAt" | "updatedAt"> {
  const g = generateNewsletter(input);
  return {
    title: g.title,
    week: input.week,
    summary: g.summary,
    topTrendIds: g.topTrendIds,
    watchlistIds: g.watchlistIds,
    buyNowIds: g.buyNowIds,
    avoidOrWaitIds: g.avoidOrWaitIds,
    contentIdeas: g.contentIdeas,
    generatedHtml: g.html,
    generatedMarkdown: g.markdown,
    status: "draft",
    publishedAt: null,
  };
}
