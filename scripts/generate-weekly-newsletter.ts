/**
 * Weekly newsletter generation script.
 *
 * Picks the top trends from this week's `trends` table, generates HTML +
 * Markdown via `generateNewsletter`, and persists a draft newsletter issue
 * for admin review before publishing.
 *
 * Usage:
 *   pnpm tsx scripts/generate-weekly-newsletter.ts
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { listTrends } from "@/lib/supabase/repositories/trends";
import { createNewsletter } from "@/lib/supabase/repositories/newsletters";
import { generateNewsletter } from "@/lib/newsletter/newsletterGenerator";
import { isoWeek } from "@/lib/utils/format";

async function main(): Promise<void> {
  const admin = createAdminClient();
  const week = isoWeek();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://pararadar.pro";

  // Take the top 15 trends by trend score, all published.
  const trends = await listTrends(admin, { status: "published", limit: 15 });
  if (trends.length === 0) {
    console.warn("No published trends — nothing to generate.");
    return;
  }

  const generated = generateNewsletter({ week, trends, appUrl });

  const issue = await createNewsletter(admin, {
    title: generated.title,
    week,
    summary: generated.summary,
    topTrendIds: generated.topTrendIds,
    buyNowIds: generated.buyNowIds,
    watchlistIds: generated.watchlistIds,
    avoidOrWaitIds: generated.avoidOrWaitIds,
    contentIdeas: generated.contentIdeas,
    generatedHtml: generated.html,
    generatedMarkdown: generated.markdown,
    status: "draft",
  });

  console.log(`✓ Newsletter draft created (id: ${issue.id}) for week ${week}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
