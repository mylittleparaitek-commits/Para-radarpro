import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Méthodologie",
  description: "Comment ParaRadar Pro calcule ses scores et détecte les tendances parapharmacie.",
};

export default function MethodologyPage() {
  return (
    <article className="container mx-auto max-w-3xl px-4 py-16 prose prose-slate">
      <h1 className="text-4xl font-bold tracking-tight">Méthodologie</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Comment ParaRadar Pro détecte, score et qualifie les tendances parapharmacie.
      </p>

      <Card className="my-8">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold">Sources de données</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            ParaRadar Pro n'utilise que des sources officielles ou des prestataires agréés. Aucun
            scraping non autorisé. Toutes les sources respectent les conditions d'usage de leur
            plateforme.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm">
            <li>
              <strong>Google Trends</strong> — via des prestataires agréés (SerpAPI, DataForSEO).
              Mesure la demande explicite (recherches).
            </li>
            <li>
              <strong>TikTok</strong> — API TikTok Research (accès académique / commercial). Mesure
              le buzz UGC.
            </li>
            <li>
              <strong>Amazon</strong> — Product Advertising API v5. Mesure la demande
              transactionnelle.
            </li>
            <li>
              <strong>Instagram</strong> — Graph API (compte business) sur hashtags pertinents.
            </li>
            <li>
              <strong>Perplexity / web</strong> — Recherche qualitative uniquement (résumé, sources,
              veille réglementaire). Jamais utilisé pour quantifier la popularité.
            </li>
          </ul>
        </CardContent>
      </Card>

      <h2 className="mt-12 text-2xl font-semibold">Le Trend Score (0-100)</h2>
      <p className="mt-2">
        Combine la <strong>popularité actuelle</strong> et la <strong>croissance</strong> sur
        plusieurs périodes :
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        <li>Popularité agrégée pondérée par source (Google 30%, TikTok 30%, Amazon 15%, Instagram 15%, web 5%, Perplexity 5%)</li>
        <li>Croissance pondérée : 7j (50%), 30j (30%), 90j (20%)</li>
        <li>Multiplicateur de "buzz" si plusieurs sources convergent</li>
      </ul>

      <h2 className="mt-12 text-2xl font-semibold">Le Buy Score (0-100)</h2>
      <p className="mt-2">
        Va plus loin que la simple tendance : il intègre les facteurs qui décident d'un achat
        pharmacie.
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        <li>Trend Score (35%)</li>
        <li>Croissance court terme (20%)</li>
        <li>Marge potentielle (15%)</li>
        <li>Saisonnalité (10%)</li>
        <li>Confiance (10%)</li>
        <li>Pénalité de risque (10%)</li>
      </ul>

      <h2 className="mt-12 text-2xl font-semibold">L'action recommandée</h2>
      <p className="mt-2">
        Sept actions possibles, dérivées du Buy Score + signaux qualitatifs :
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        <li><strong>✅ Acheter maintenant</strong> — Buy Score ≥ 75, pas de risque réglementaire</li>
        <li><strong>⚠️ Acheter prudemment</strong> — Buy Score 60-75</li>
        <li><strong>👀 Surveiller</strong> — tendance émergente, données insuffisantes</li>
        <li><strong>🚫 Ne pas acheter</strong> — tendance en déclin ou stock dormant probable</li>
        <li><strong>📝 SEO uniquement</strong> — buzz court terme, intérêt SEO mais pas d'achat</li>
        <li><strong>📌 Mettre en avant le stock</strong> — produit déjà en stock à remonter en vente</li>
        <li><strong>⚠️ Prudence réglementaire</strong> — alerte ANSM / EFSA en cours</li>
      </ul>

      <h2 className="mt-12 text-2xl font-semibold">Saisonnalité</h2>
      <p className="mt-2">
        Détection par deux stratégies complémentaires : (1) analyse statistique de la série
        temporelle (agrégation par mois sur 12 à 24 mois, calcul du coefficient de variation),
        (2) repli sur table de catégorie (immunité → automne-hiver, solaire → été, allergie →
        printemps, etc.).
      </p>

      <h2 className="mt-12 text-2xl font-semibold">Confiance</h2>
      <p className="mt-2">
        Quatre niveaux (faible, moyenne, élevée, très élevée). Déterminée par la cohérence entre
        sources, la profondeur historique disponible et la stabilité du signal.
      </p>

      <h2 className="mt-12 text-2xl font-semibold">Validation humaine</h2>
      <p className="mt-2">
        Chaque tendance détectée passe d'abord en statut <code>draft</code>. Un pharmacien
        responsable la valide et la publie après vérification du contexte réglementaire. Cela
        évite les faux positifs (effet de buzz sans demande réelle) et garantit la qualité du
        contenu éditorial.
      </p>
    </article>
  );
}
