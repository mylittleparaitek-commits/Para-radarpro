/**
 * Newsletter — Markdown template.
 *
 * Used for archival, plain-text email, and as a feed for AI / email-service
 * smart rendering (Mailchimp, Brevo). All UI strings are in French.
 */

import type { RecommendedAction, Trend } from "@/types";

export interface NewsletterRenderContext {
  week: string;
  title: string;
  summary: string;
  top: readonly Trend[];
  buyNow: readonly Trend[];
  watchlist: readonly Trend[];
  avoidOrWait: readonly Trend[];
  contentIdeas: readonly string[];
  appUrl: string;
}

const ACTION_LABELS: Record<RecommendedAction, string> = {
  buy_now: "✅ Acheter maintenant",
  buy_carefully: "⚠️ Acheter prudemment",
  watch: "👀 Surveiller",
  do_not_buy: "🚫 Ne pas acheter",
  seo_only: "📝 SEO uniquement",
  highlight_stock: "📌 Mettre en avant le stock existant",
  regulatory_caution: "⚠️ Prudence réglementaire",
};

function actionLabel(action: RecommendedAction): string {
  return ACTION_LABELS[action];
}

function formatPercent(value: number): string {
  const rounded = Math.round(value);
  return rounded > 0 ? `+${rounded}%` : `${rounded}%`;
}

export function renderMarkdown(ctx: NewsletterRenderContext): string {
  const { week, title, summary, top, buyNow, watchlist, avoidOrWait, contentIdeas, appUrl } = ctx;

  const topSection = top
    .map(
      (t, i) => `### ${i + 1}. ${t.keyword}

- **Trend Score** : ${t.scores.trend}/100 | **Buy Score** : ${t.scores.buy}/100
- **Croissance 7 j** : ${formatPercent(t.growth.weekOverWeek)} | **30 j** : ${formatPercent(t.growth.monthOverMonth)}
- **Action recommandée** : ${actionLabel(t.recommendedAction)}
- **Confiance** : ${t.confidenceLevel} | **Risque** : ${t.riskLevel}

${t.content.executiveSummary}
`,
    )
    .join("\n");

  const buyNowSection =
    buyNow.length > 0
      ? buyNow
          .map(
            (t) =>
              `- **${t.keyword}** — Buy Score : ${t.scores.buy}/100 (${formatPercent(t.growth.weekOverWeek)} en 7 j)`,
          )
          .join("\n")
      : "_Aucune recommandation d'achat immédiat cette semaine._";

  const watchlistSection =
    watchlist.length > 0
      ? watchlist
          .map(
            (t) =>
              `- **${t.keyword}** — ${actionLabel(t.recommendedAction)} (${formatPercent(t.growth.weekOverWeek)} en 7 j)`,
          )
          .join("\n")
      : "_Pas de tendance à surveiller cette semaine._";

  const avoidSection =
    avoidOrWait.length > 0
      ? avoidOrWait
          .map(
            (t) =>
              `- **${t.keyword}** — ${
                t.content.regulatoryNotes ?? "Risque identifié, voir le détail dans l'app"
              }`,
          )
          .join("\n")
      : "_Aucune alerte réglementaire cette semaine._";

  const ideasSection =
    contentIdeas.length > 0
      ? contentIdeas.map((idea) => `- ${idea}`).join("\n")
      : "_Pas d'idée de contenu mise en avant cette semaine._";

  return `# 🔥 ${title}

> _${summary}_

---

## 🏆 Top ${top.length} Tendances de la semaine

${topSection}

---

## 🛒 À commander maintenant

${buyNowSection}

---

## 👀 À surveiller

${watchlistSection}

---

## ⚠️ Prudence / À éviter

${avoidSection}

---

## 💡 Idées de contenu (SEO & réseaux)

${ideasSection}

---

[👉 Voir l'analyse complète sur ParaRadar Pro](${appUrl}/dashboard)

_ParaRadar Pro — Intelligence des tendances parapharmacie — Semaine ${week}_
`;
}
