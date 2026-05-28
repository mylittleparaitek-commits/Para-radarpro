/**
 * Newsletter — HTML template (inlined CSS, no external assets).
 *
 * Designed for email clients (Gmail, Outlook, Apple Mail). 600 px container.
 * Brand gradient header: green-blue. All UI strings in French.
 */

import type { RecommendedAction, Trend } from "@/types";
import type { NewsletterRenderContext } from "./markdown";

const ACTION_LABELS: Record<RecommendedAction, string> = {
  buy_now: "✅ Acheter maintenant",
  buy_carefully: "⚠️ Acheter prudemment",
  watch: "👀 Surveiller",
  do_not_buy: "🚫 Ne pas acheter",
  seo_only: "📝 SEO uniquement",
  highlight_stock: "📌 Mettre en avant le stock",
  regulatory_caution: "⚠️ Prudence réglementaire",
};

const ACTION_BADGE_CLASS: Record<RecommendedAction, string> = {
  buy_now: "badge-green",
  buy_carefully: "badge-amber",
  watch: "badge-blue",
  do_not_buy: "badge-red",
  seo_only: "badge-blue",
  highlight_stock: "badge-blue",
  regulatory_caution: "badge-red",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtPct(value: number): string {
  const r = Math.round(value);
  return r > 0 ? `+${r}%` : `${r}%`;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

function topCard(t: Trend): string {
  return `
    <div class="trend-card">
      <div class="trend-name">${escapeHtml(t.keyword)}</div>
      <div class="trend-meta">
        <span class="badge badge-blue">Score ${t.scores.trend}/100</span>
        <span class="badge badge-green">Achat ${t.scores.buy}/100</span>
        <span class="badge ${ACTION_BADGE_CLASS[t.recommendedAction]}">${ACTION_LABELS[t.recommendedAction]}</span>
        <span class="growth">${fmtPct(t.growth.weekOverWeek)} en 7 j</span>
      </div>
      <p class="trend-summary">${escapeHtml(truncate(t.content.executiveSummary, 180))}</p>
    </div>`;
}

export function renderHtml(ctx: NewsletterRenderContext): string {
  const { week, title, summary, top, buyNow, watchlist, avoidOrWait, contentIdeas, appUrl } = ctx;

  const topCards = top.map(topCard).join("");

  const buyNowList =
    buyNow.length > 0
      ? buyNow
          .map(
            (t) =>
              `<p class="list-row">✅ <strong>${escapeHtml(t.keyword)}</strong> — Buy Score ${t.scores.buy}/100 <span class="growth">(${fmtPct(t.growth.weekOverWeek)})</span></p>`,
          )
          .join("")
      : `<p class="muted">Aucune recommandation d'achat immédiat cette semaine.</p>`;

  const watchlistList =
    watchlist.length > 0
      ? watchlist
          .map(
            (t) =>
              `<p class="list-row">👀 <strong>${escapeHtml(t.keyword)}</strong> — ${ACTION_LABELS[t.recommendedAction]} <span class="growth">(${fmtPct(t.growth.weekOverWeek)})</span></p>`,
          )
          .join("")
      : `<p class="muted">Pas de tendance à surveiller cette semaine.</p>`;

  const avoidList =
    avoidOrWait.length > 0
      ? avoidOrWait
          .map(
            (t) =>
              `<p class="list-row">⚠️ <strong>${escapeHtml(t.keyword)}</strong> — ${escapeHtml(
                truncate(t.content.regulatoryNotes ?? "Risque identifié, voir le détail dans l'app.", 140),
              )}</p>`,
          )
          .join("")
      : `<p class="muted">Aucune alerte réglementaire cette semaine.</p>`;

  const ideasList =
    contentIdeas.length > 0
      ? `<ul class="ideas">${contentIdeas.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`
      : `<p class="muted">Pas d'idée de contenu mise en avant cette semaine.</p>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; background: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
  .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
  .header { background: linear-gradient(135deg, #1e3a5f, #0d7a5f); padding: 32px 40px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; line-height: 1.3; }
  .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 13px; }
  .content { padding: 32px 40px; }
  .lede { color: #475569; font-size: 14px; line-height: 1.55; margin: 0 0 16px; font-style: italic; }
  .section-title { font-size: 16px; font-weight: 700; color: #1e293b; margin: 28px 0 12px; border-left: 3px solid #0d7a5f; padding-left: 12px; }
  .trend-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; }
  .trend-name { font-size: 15px; font-weight: 600; color: #1e293b; }
  .trend-meta { display: block; margin-top: 8px; }
  .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; margin-right: 4px; margin-bottom: 4px; }
  .badge-green { background: #dcfce7; color: #166534; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-amber { background: #fef3c7; color: #92400e; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .growth { color: #16a34a; font-weight: 700; font-size: 12px; }
  .trend-summary { margin: 10px 0 0; font-size: 13px; color: #475569; line-height: 1.5; }
  .list-row { margin: 6px 0; font-size: 14px; color: #1e293b; line-height: 1.5; }
  .ideas { padding-left: 18px; margin: 8px 0 0; font-size: 13px; color: #475569; }
  .ideas li { margin: 4px 0; }
  .muted { color: #94a3b8; font-size: 13px; font-style: italic; }
  .cta { display: block; background: #0d7a5f; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; text-align: center; margin: 28px 0 8px; font-size: 14px; }
  .footer { background: #f8fafc; padding: 24px 40px; text-align: center; font-size: 12px; color: #64748b; }
  .footer a { color: #0d7a5f; text-decoration: none; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>🔥 ${escapeHtml(title)}</h1>
    <p>Semaine ${escapeHtml(week)}</p>
  </div>
  <div class="content">
    <p class="lede">${escapeHtml(summary)}</p>

    <div class="section-title">🏆 Top ${top.length} Tendances</div>
    ${topCards}

    <div class="section-title">🛒 À commander maintenant</div>
    ${buyNowList}

    <div class="section-title">👀 À surveiller</div>
    ${watchlistList}

    <div class="section-title">⚠️ Prudence / À éviter</div>
    ${avoidList}

    <div class="section-title">💡 Idées de contenu</div>
    ${ideasList}

    <a href="${escapeHtml(appUrl)}/dashboard" class="cta">Voir l'analyse complète →</a>
  </div>
  <div class="footer">
    <p>ParaRadar Pro — Intelligence des tendances parapharmacie</p>
    <p><a href="${escapeHtml(appUrl)}/settings">Gérer mes préférences</a> · <a href="${escapeHtml(appUrl)}/unsubscribe">Se désabonner</a></p>
  </div>
</div>
</body>
</html>`;
}
