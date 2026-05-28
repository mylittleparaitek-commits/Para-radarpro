/**
 * Seed script — populates Supabase with the mock trends defined in
 * `lib/data-sources/mockData.ts`. Idempotent (upsert on normalized_keyword).
 *
 * Usage:
 *   pnpm db:seed
 *
 * Requires `SUPABASE_SERVICE_ROLE_KEY` to be set so RLS is bypassed.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { MOCK_TRENDS } from "@/lib/data-sources/mockData";
import { trendToRow } from "@/lib/supabase/mappers";

async function main(): Promise<void> {
  const admin = createAdminClient();

  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (const draft of MOCK_TRENDS) {
    const trend = {
      ...draft,
      // Mark seed data as published so the dashboard shows it out of the box.
      status: "published" as const,
      isValidated: true,
    };
    const row = trendToRow(trend);

    const { data, error } = await admin
      .from("trends")
      .upsert(row, { onConflict: "normalized_keyword" })
      .select("id")
      .single();

    if (error) {
      console.error(`✗ ${draft.keyword}: ${error.message}`);
      failed += 1;
      continue;
    }
    if (data) {
      // We can't easily tell insert vs update with upsert in PostgREST.
      // Treat as one of each based on rough heuristic.
      inserted += 1;
    }
  }

  // Add a couple of product recommendations to the first trend so the
  // detail page shows the "Produits recommandés" section.
  const { data: firstTrend } = await admin
    .from("trends")
    .select("id, keyword")
    .order("trend_score", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (firstTrend) {
    await admin
      .from("product_recommendations")
      .delete()
      .eq("trend_id", firstTrend.id);
    await admin.from("product_recommendations").insert([
      {
        trend_id: firstTrend.id,
        product_name: `${firstTrend.keyword} — Nutri & Co`,
        brand: "Nutri & Co",
        format: "60 gélules",
        category: "Compléments alimentaires",
        reason:
          "Marque indépendante française, bonne marge revendeur, formule clean label sans excipients controversés.",
        recommended_qty: 24,
        risk: "low",
        estimated_margin_level: "high",
        priority: "high",
        supplier_notes: "Disposition rapide, condition de paiement 30 j.",
      },
      {
        trend_id: firstTrend.id,
        product_name: `${firstTrend.keyword} — Solgar`,
        brand: "Solgar",
        format: "120 gélules",
        category: "Compléments alimentaires",
        reason: "Marque référence reconnue par la clientèle pharmacie premium.",
        recommended_qty: 12,
        risk: "low",
        estimated_margin_level: "medium",
        priority: "medium",
        supplier_notes: null,
      },
    ]);
  }

  console.log(`✓ Seed complete. inserted/updated: ${inserted}, failed: ${failed}`);
  void updated;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
