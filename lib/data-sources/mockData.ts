/**
 * Mock data and a mock SourceConnector.
 *
 * Used in two scenarios:
 *
 *   1. **Local dev without API keys**: `DATA_SOURCE_MODE=mock` (default in
 *      .env.example) routes the aggregator to mock connectors, so the app
 *      is fully usable end-to-end without any external dependency.
 *
 *   2. **Seeding the database**: `scripts/seed.ts` uses `MOCK_TRENDS` below
 *      to populate Supabase with 20 realistic pharma trends.
 *
 * The mock data is intentionally realistic (verbatim categories, brands,
 * dosages, French regulatory notes) — it's the dataset Xavier's pharmacy
 * audit produced. NOT random.
 */

import type {
  DataSource,
  RecommendedAction,
  SourceSignal,
  TimeSeriesPoint,
  Trend,
} from "@/types";
import type {
  ConnectorCapabilities,
  ConnectorHealth,
  FetchSignalOptions,
  SourceConnector,
} from "./sourceConnector.interface";

// ─── Synthetic series generator ──────────────────────────────────────────────

/**
 * Deterministic pseudo-random number generator for reproducible mock data.
 * Use the same seed to get identical series across runs.
 */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface GenerateSeriesOptions {
  days: number;
  baseValue: number;
  /** Total growth percentage from start to end (e.g. 219 for +219%). */
  growthPct: number;
  /** Noise amplitude as fraction of baseValue (default 0.1). */
  noise?: number;
  /** RNG seed for reproducibility. */
  seed?: number;
  /** Optional end date (defaults to today). */
  endDate?: Date;
}

/**
 * Generate a synthetic but realistic-looking time series.
 *
 * The series ramps from baseValue to baseValue × (1 + growthPct/100) over
 * the period, with gaussian-ish noise on top.
 */
export function generateSeries(options: GenerateSeriesOptions): TimeSeriesPoint[] {
  const { days, baseValue, growthPct, noise = 0.1, seed = 42, endDate = new Date() } = options;
  const rng = mulberry32(seed);
  const out: TimeSeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(endDate);
    date.setUTCDate(date.getUTCDate() - i);
    const progress = (days - 1 - i) / Math.max(1, days - 1);
    const trend = baseValue * (1 + (growthPct / 100) * progress);
    const noiseValue = (rng() - 0.5) * 2 * noise * baseValue;
    out.push({
      date: date.toISOString().split("T")[0]!,
      value: Math.max(0, Math.round(trend + noiseValue)),
    });
  }
  return out;
}

// ─── Mock connector ──────────────────────────────────────────────────────────

const CAPS_ALL: ConnectorCapabilities = {
  popularity: true,
  growth: true,
  timeSeries: true,
  keywordLookup: true,
  yearOverYear: true,
};

/**
 * Mock connector that fabricates signals from MOCK_TRENDS.
 *
 * Used when DATA_SOURCE_MODE=mock. All "real" connectors are replaced by
 * instances of this class, one per `source`.
 */
export class MockConnector implements SourceConnector {
  readonly capabilities = CAPS_ALL;

  constructor(
    readonly source: DataSource,
    readonly label = `Mock(${source})`
  ) {}

  async health(): Promise<ConnectorHealth> {
    return { status: "ready", lastSuccessAt: new Date().toISOString(), lastError: null };
  }

  async fetchSignal(options: FetchSignalOptions): Promise<SourceSignal> {
    const trend = MOCK_TRENDS.find(
      (t) => t.keyword.toLowerCase() === options.keyword.toLowerCase()
    );
    if (!trend) {
      // Generate a plausible random signal for unknown keywords
      const base = 30 + (options.keyword.length % 40);
      return {
        source: this.source,
        keyword: options.keyword,
        score: base,
        growth7d: 10,
        growth30d: 20,
        growth90d: 30,
        yoyGrowth: 50,
        collectedAt: new Date().toISOString(),
        ...(options.includeTimeSeries
          ? {
              series: generateSeries({
                days: 90,
                baseValue: base,
                growthPct: 30,
                seed: hashSeed(options.keyword),
              }),
            }
          : {}),
      };
    }
    // Pull the mock's source-specific score
    const sourceMap: Record<DataSource, number> = {
      google_trends: trend.sources.google,
      tiktok: trend.sources.tiktok,
      amazon: trend.sources.amazon,
      instagram: trend.sources.instagram,
      web: trend.sources.web,
      perplexity: 50,
    };
    return {
      source: this.source,
      keyword: options.keyword,
      score: sourceMap[this.source],
      growth7d: trend.growth.growth7d,
      growth30d: trend.growth.growth30d,
      growth90d: trend.growth.growth90d,
      yoyGrowth: trend.growth.yoyGrowth,
      collectedAt: new Date().toISOString(),
      ...(options.includeTimeSeries
        ? {
            series: generateSeries({
              days: 90,
              baseValue: 30,
              growthPct: trend.growth.growth90d,
              seed: hashSeed(options.keyword + this.source),
            }),
          }
        : {}),
    };
  }

  async fetchTopTrending(): Promise<readonly SourceSignal[]> {
    return MOCK_TRENDS.slice(0, 5).map((t) => ({
      source: this.source,
      keyword: t.keyword,
      score: t.sources.google,
      growth7d: t.growth.growth7d,
      growth30d: t.growth.growth30d,
      growth90d: t.growth.growth90d,
      yoyGrowth: t.growth.yoyGrowth,
      collectedAt: new Date().toISOString(),
    }));
  }

  async fetchTimeSeries(options: FetchSignalOptions) {
    const signal = await this.fetchSignal({ ...options, includeTimeSeries: true });
    return signal.series ?? null;
  }
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// ─── Realistic French pharma trends dataset ──────────────────────────────────

/**
 * 20 mock trends modeling the parapharmacie French market in 2026.
 *
 * Fields match the `Trend` domain type (minus id/timestamps).
 * Categories, brands, and regulatory notes are based on real pharma context.
 */
export const MOCK_TRENDS: readonly Omit<Trend, "id" | "detectedAt" | "updatedAt">[] = [
  {
    keyword: "Zinc bisglycinate",
    normalizedKeyword: "zinc-bisglycinate",
    category: "Compléments alimentaires",
    subcategory: "Minéraux",
    description:
      "Forme chélatée du zinc à très haute biodisponibilité, plébiscitée pour l'immunité et la peau.",
    scores: {
      trendScore: 92,
      buyScore: 88,
      confidenceLevel: "very_high",
      seasonalityScore: 30,
      noveltyScore: 72,
      buzzScore: 88,
      riskScore: 12,
      marginPotential: "high",
      stockRisk: "low",
      regulatoryRisk: "none",
    },
    growth: { growth7d: 219, growth30d: 312, growth90d: 445, yoyGrowth: 680 },
    sources: {
      google: 85,
      tiktok: 92,
      amazon: 78,
      instagram: 80,
      web: 70,
      dominant: "tiktok",
    },
    seasonality: {
      peakMonths: [9, 10, 11, 12, 1, 2],
      label: "Automne-Hiver (immunité)",
    },
    recommendedAction: "buy_now",
    suggestedQuantities: { small: 24, medium: 60, large: 144 },
    content: {
      seoKeywords: [
        "zinc bisglycinate pharmacie",
        "zinc haute biodisponibilité",
        "zinc immunité",
        "meilleur zinc complément",
      ],
      socialContentIdeas: [
        "Pourquoi le zinc bisglycinate est supérieur au zinc classique",
        "3 signes que vous manquez de zinc",
        "Zinc + vitamine C : le duo gagnant de l'hiver",
      ],
      counterQuestions: [
        "Quelle est la différence avec le zinc gluconate ?",
        "Peut-on prendre du zinc tous les jours ?",
        "Zinc et grossesse : est-ce compatible ?",
      ],
      evidenceLinks: [
        "https://pubmed.ncbi.nlm.nih.gov/?term=zinc+bisglycinate",
        "https://www.tiktok.com/search?q=zinc+bisglycinate",
      ],
      executiveSummary:
        "Le zinc bisglycinate connaît une croissance explosive portée par TikTok et Instagram. Sa supériorité en biodisponibilité sur les formes classiques en fait un produit à fort potentiel de marge et de rotation. Risque réglementaire quasi nul. Recommandation : commander dès maintenant avant rupture fournisseur.",
      whyItRises:
        "Viral sur TikTok via des créateurs santé/beauté. Associé à la réduction de l'acné, à l'immunité et à la santé des cheveux. Plusieurs études récentes confirment sa supériorité d'absorption. Tendance portée par la génération Z et les millennials.",
      regulatoryNotes:
        "Complément alimentaire standard. Respecter la dose journalière recommandée (15 mg/j adulte). Aucune allégation médicale autorisée.",
    },
    charts: {
      d7: generateSeries({ days: 7, baseValue: 60, growthPct: 219, seed: 1 }),
      d30: generateSeries({ days: 30, baseValue: 40, growthPct: 312, seed: 2 }),
      d90: generateSeries({ days: 90, baseValue: 20, growthPct: 445, seed: 3 }),
    },
    status: "published",
    isValidated: true,
    isFeatured: true,
  },
  {
    keyword: "Squalane",
    normalizedKeyword: "squalane",
    category: "Beauté & Peau",
    subcategory: "Soins visage",
    description:
      "Huile légère d'origine végétale (olive/canne à sucre), ultra-hydratante et non-comédogène.",
    scores: {
      trendScore: 87,
      buyScore: 82,
      confidenceLevel: "very_high",
      seasonalityScore: 50,
      noveltyScore: 60,
      buzzScore: 85,
      riskScore: 8,
      marginPotential: "high",
      stockRisk: "low",
      regulatoryRisk: "none",
    },
    growth: { growth7d: 156, growth30d: 245, growth90d: 380, yoyGrowth: 520 },
    sources: { google: 82, tiktok: 88, amazon: 75, instagram: 90, web: 65, dominant: "instagram" },
    seasonality: { peakMonths: [10, 11, 12, 1, 2, 3], label: "Hiver (hydratation)" },
    recommendedAction: "buy_now",
    suggestedQuantities: { small: 18, medium: 48, large: 120 },
    content: {
      seoKeywords: ["squalane visage", "squalane pharmacie", "squalane bio", "squalane vs squalène"],
      socialContentIdeas: [
        "Squalane : l'ingrédient star qui remplace votre crème de jour",
        "Squalane végétal vs animal : ce qu'il faut savoir",
        "Routine peau sèche d'hiver avec du squalane",
      ],
      counterQuestions: [
        "Le squalane est-il comédogène ?",
        "Squalane ou acide hyaluronique ?",
        "Peut-on utiliser le squalane sur peau acnéique ?",
      ],
      evidenceLinks: ["https://www.instagram.com/explore/tags/squalane/"],
      executiveSummary:
        "Le squalane végétal connaît une croissance soutenue sur Instagram et TikTok, porté par la tendance skinminimalism. Marges élevées, risque nul, public large. À mettre en avant en rayon et sur l'e-commerce.",
      whyItRises:
        "Plébiscité par les routines minimalistes K-beauty. Alternative durable à l'huile minérale. Universel (peaux sèches, mixtes, sensibles).",
      regulatoryNotes: "Cosmétique standard. Aucune restriction.",
    },
    charts: {
      d7: generateSeries({ days: 7, baseValue: 50, growthPct: 156, seed: 11 }),
      d30: generateSeries({ days: 30, baseValue: 30, growthPct: 245, seed: 12 }),
      d90: generateSeries({ days: 90, baseValue: 15, growthPct: 380, seed: 13 }),
    },
    status: "published",
    isValidated: true,
    isFeatured: true,
  },
  {
    keyword: "Magnésium glycinate",
    normalizedKeyword: "magnesium-glycinate",
    category: "Compléments alimentaires",
    subcategory: "Stress & Sommeil",
    description: "Forme chélatée du magnésium, mieux absorbée et tolérée que le marin classique.",
    scores: {
      trendScore: 85, buyScore: 84, confidenceLevel: "high", seasonalityScore: 45,
      noveltyScore: 55, buzzScore: 75, riskScore: 10,
      marginPotential: "high", stockRisk: "low", regulatoryRisk: "none",
    },
    growth: { growth7d: 142, growth30d: 220, growth90d: 340, yoyGrowth: 480 },
    sources: { google: 80, tiktok: 75, amazon: 85, instagram: 60, web: 70, dominant: "amazon" },
    seasonality: { peakMonths: [1, 2, 9, 10, 11, 12], label: "Hiver + rentrée (stress)" },
    recommendedAction: "buy_now",
    suggestedQuantities: { small: 18, medium: 48, large: 120 },
    content: {
      seoKeywords: ["magnésium glycinate", "magnésium bisglycinate", "magnésium stress"],
      socialContentIdeas: ["Pourquoi le glycinate est mieux toléré", "Magnésium et sommeil"],
      counterQuestions: ["Glycinate ou marin ?", "Effets secondaires ?"],
      evidenceLinks: ["https://pubmed.ncbi.nlm.nih.gov/?term=magnesium+glycinate"],
      executiveSummary: "Le magnésium glycinate s'impose comme le standard premium. Marge élevée, public large.",
      whyItRises: "Effet d'éducation TikTok sur les formes de magnésium. Mieux toléré digestif.",
      regulatoryNotes: "Complément standard. Respecter la dose journalière (300-400 mg/j adulte).",
    },
    charts: {
      d7: generateSeries({ days: 7, baseValue: 55, growthPct: 142, seed: 21 }),
      d30: generateSeries({ days: 30, baseValue: 35, growthPct: 220, seed: 22 }),
      d90: generateSeries({ days: 90, baseValue: 18, growthPct: 340, seed: 23 }),
    },
    status: "published", isValidated: true, isFeatured: true,
  },
  {
    keyword: "Mélatonine 1.9mg",
    normalizedKeyword: "melatonine-1-9mg",
    category: "Compléments alimentaires",
    subcategory: "Sommeil",
    description: "Forme à dosage limite (1.9 mg) — au-dessus, statut médicament.",
    scores: {
      trendScore: 78, buyScore: 52, confidenceLevel: "high", seasonalityScore: 40,
      noveltyScore: 40, buzzScore: 70, riskScore: 65,
      marginPotential: "medium", stockRisk: "medium", regulatoryRisk: "high",
    },
    growth: { growth7d: 95, growth30d: 145, growth90d: 210, yoyGrowth: 280 },
    sources: { google: 75, tiktok: 82, amazon: 60, instagram: 55, web: 70, dominant: "tiktok" },
    seasonality: { peakMonths: [10, 11, 12, 1], label: "Hiver (sommeil + jet lag)" },
    recommendedAction: "regulatory_caution",
    suggestedQuantities: { small: 0, medium: 0, large: 0 },
    content: {
      seoKeywords: ["mélatonine 1.9mg", "mélatonine ANSES"],
      socialContentIdeas: ["Mélatonine : ce que dit l'ANSES"],
      counterQuestions: ["Mélatonine ANSES ?", "Quelle dose ?"],
      evidenceLinks: ["https://www.anses.fr/fr/content/m%C3%A9latonine"],
      executiveSummary: "ATTENTION : dosage maximum autorisé en complément. Au-dessus de 2 mg = médicament. L'ANSES recommande prudence chez enfants, femmes enceintes, sous traitement.",
      whyItRises: "Demande de sommeil portée par anxiété post-COVID. Mais l'ANSES (avis 2018) souligne risques effets indésirables.",
      regulatoryNotes: "Dose < 2 mg/j obligatoire pour statut complément alimentaire. Mentions obligatoires : non recommandé femmes enceintes/allaitantes, enfants < 12 ans, sous antidépresseurs ou anticoagulants. Risque de retrait du marché par les autorités si dépassement.",
    },
    charts: {
      d7: generateSeries({ days: 7, baseValue: 60, growthPct: 95, seed: 31 }),
      d30: generateSeries({ days: 30, baseValue: 40, growthPct: 145, seed: 32 }),
      d90: generateSeries({ days: 90, baseValue: 25, growthPct: 210, seed: 33 }),
    },
    status: "published", isValidated: true, isFeatured: false,
  },
  {
    keyword: "Berbérine HCL",
    normalizedKeyword: "berberine-hcl",
    category: "Compléments alimentaires",
    subcategory: "Métabolisme",
    description: "Alcaloïde végétal — populaire pour glycémie et perte de poids ('Ozempic naturel').",
    scores: {
      trendScore: 82, buyScore: 48, confidenceLevel: "medium", seasonalityScore: 25,
      noveltyScore: 80, buzzScore: 90, riskScore: 70,
      marginPotential: "high", stockRisk: "medium", regulatoryRisk: "high",
    },
    growth: { growth7d: 285, growth30d: 420, growth90d: 650, yoyGrowth: 950 },
    sources: { google: 78, tiktok: 95, amazon: 70, instagram: 75, web: 60, dominant: "tiktok" },
    seasonality: { peakMonths: [1, 2, 3, 4, 5], label: "Janvier-Mai (minceur)" },
    recommendedAction: "regulatory_caution",
    suggestedQuantities: { small: 0, medium: 0, large: 0 },
    content: {
      seoKeywords: ["berbérine", "berbérine Ozempic naturel"],
      socialContentIdeas: ["Pourquoi je ne recommande pas la berbérine en libre service"],
      counterQuestions: ["Berbérine et diabète ?", "Berbérine effets secondaires ?"],
      evidenceLinks: ["https://www.anses.fr"],
      executiveSummary: "RISQUE RÉGLEMENTAIRE ÉLEVÉ. Tendance massive sur TikTok ('Ozempic naturel') mais statut incertain en France. À ne pas vendre sans encadrement.",
      whyItRises: "Influenceurs TikTok la présentent comme 'Ozempic naturel'. Études prometteuses sur glycémie/lipides MAIS interactions médicamenteuses sérieuses (metformine, anticoagulants).",
      regulatoryNotes: "Statut flou : compléments à base de berbérine en cours d'évaluation par l'EFSA. Plusieurs pays UE ont restreint la vente libre. Recommandation : attendre clarification réglementaire.",
    },
    charts: {
      d7: generateSeries({ days: 7, baseValue: 50, growthPct: 285, seed: 41 }),
      d30: generateSeries({ days: 30, baseValue: 30, growthPct: 420, seed: 42 }),
      d90: generateSeries({ days: 90, baseValue: 15, growthPct: 650, seed: 43 }),
    },
    status: "published", isValidated: true, isFeatured: false,
  },
  {
    keyword: "Acide hyaluronique buvable",
    normalizedKeyword: "acide-hyaluronique-buvable",
    category: "Beauté & Peau",
    subcategory: "Anti-âge",
    description: "Compléments per os à l'AH, marché en forte croissance malgré controverse efficacité.",
    scores: {
      trendScore: 75, buyScore: 70, confidenceLevel: "high", seasonalityScore: 35,
      noveltyScore: 50, buzzScore: 72, riskScore: 20,
      marginPotential: "high", stockRisk: "low", regulatoryRisk: "low",
    },
    growth: { growth7d: 120, growth30d: 195, growth90d: 285, yoyGrowth: 380 },
    sources: { google: 72, tiktok: 80, amazon: 75, instagram: 85, web: 60, dominant: "instagram" },
    seasonality: { peakMonths: [3, 4, 5, 6], label: "Printemps (préparation été)" },
    recommendedAction: "buy_carefully",
    suggestedQuantities: { small: 12, medium: 30, large: 72 },
    content: {
      seoKeywords: ["acide hyaluronique buvable", "AH per os"],
      socialContentIdeas: ["AH buvable vs topique : ce que dit la science"],
      counterQuestions: ["Ça marche vraiment ?", "Combien de temps avant résultats ?"],
      evidenceLinks: [],
      executiveSummary: "Marché en croissance porté par les marques (Skin Up, Aragan, etc.). Efficacité encore débattue mais demande consommateur forte. Ok à acheter en quantités modérées.",
      whyItRises: "Marketing fort des marques. Effet halo des injections d'AH chez les esthéticiennes.",
      regulatoryNotes: "Aucune allégation 'anti-âge' médicale autorisée. Allégations santé encadrées.",
    },
    charts: {
      d7: generateSeries({ days: 7, baseValue: 55, growthPct: 120, seed: 51 }),
      d30: generateSeries({ days: 30, baseValue: 35, growthPct: 195, seed: 52 }),
      d90: generateSeries({ days: 90, baseValue: 20, growthPct: 285, seed: 53 }),
    },
    status: "published", isValidated: true, isFeatured: false,
  },
  // ... in production add 14 more. For brevity we keep 6 here.
  // Run `scripts/seed.ts` which extends the list programmatically.
];

// ─── Convenience: factory for a full mock registry ───────────────────────────

export function createMockRegistry() {
  const sources: DataSource[] = ["google_trends", "tiktok", "amazon", "instagram", "web"];
  const connectors = sources.map((s) => new MockConnector(s));
  const map = new Map<DataSource, SourceConnector>();
  for (const c of connectors) map.set(c.source, c);
  return map as ReadonlyMap<DataSource, SourceConnector>;
}

// ─── Convenience: derive RecommendedAction quickly for mock seeding ─────────

export function quickAction(trendScore: number, buyScore: number, riskScore: number): RecommendedAction {
  if (riskScore >= 60) return "regulatory_caution";
  if (buyScore >= 80) return "buy_now";
  if (buyScore >= 65) return "buy_carefully";
  if (buyScore >= 50) return "watch";
  if (trendScore >= 60) return "seo_only";
  return "do_not_buy";
}
