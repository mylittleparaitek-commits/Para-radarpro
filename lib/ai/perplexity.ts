/**
 * Perplexity API client.
 *
 * Used for **qualitative research** during trend ingestion — not popularity
 * scoring. Returns an executive summary, the "why it rises" narrative,
 * regulatory notes, and a list of evidence URLs.
 *
 * The popularity / growth scoring layer must NEVER rely on Perplexity:
 * - It is generative and can hallucinate quantitative figures.
 * - It is not a structured popularity source like Google Trends.
 *
 * Model: `sonar-pro` (or whatever env var overrides it).
 * Docs: https://docs.perplexity.ai
 */

import { ConnectorError } from "@/lib/data-sources/sourceConnector.interface";

const DEFAULT_MODEL = "sonar-pro";
const API_URL = "https://api.perplexity.ai/chat/completions";

export interface TrendResearch {
  executiveSummary: string;
  whyItRises: string;
  regulatoryNotes: string | null;
  evidenceLinks: readonly string[];
}

interface PerplexityChoice {
  message: { role: string; content: string };
}

interface PerplexityResponse {
  choices: PerplexityChoice[];
  citations?: string[];
}

/**
 * Research a trend qualitatively.
 *
 * @throws ConnectorError if Perplexity is misconfigured or the response is
 *   malformed. Callers should fall back to a sensible default content block
 *   in production rather than crashing the ingestion pipeline.
 */
export async function researchTrend(keyword: string): Promise<TrendResearch> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new ConnectorError(
      "unsupported",
      "perplexity",
      "PERPLEXITY_API_KEY is not configured.",
    );
  }

  const model = process.env.PERPLEXITY_MODEL ?? DEFAULT_MODEL;

  const systemPrompt = [
    "Tu es un analyste en intelligence économique spécialisé en parapharmacie française.",
    "Réponds STRICTEMENT en JSON valide (sans markdown, sans backticks) avec les clés suivantes :",
    `{
      "executiveSummary": "résumé en 2-3 phrases en français, ton factuel",
      "whyItRises": "explication de la montée en tendance, 2-4 phrases, en français",
      "regulatoryNotes": "notes réglementaires françaises/européennes pertinentes ou null",
      "evidenceLinks": ["url1", "url2", ...]
    }`,
    "Si la tendance ne présente aucun enjeu réglementaire, mets `regulatoryNotes` à null.",
    "Privilégie des sources officielles : ANSM, EFSA, sites institutionnels, publications scientifiques.",
  ].join(" ");

  const userPrompt = `Recherche la tendance parapharmacie suivante en France : "${keyword}". Pourquoi monte-t-elle, quels sont les risques réglementaires, quelles sources factuelles l'attestent ?`;

  let resp: Response;
  try {
    resp = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
        return_citations: true,
      }),
    });
  } catch (err) {
    throw new ConnectorError(
      "network",
      "perplexity",
      `Network error calling Perplexity: ${(err as Error).message}`,
      { cause: err },
    );
  }

  if (!resp.ok) {
    if (resp.status === 401 || resp.status === 403) {
      throw new ConnectorError("auth", "perplexity", `Perplexity auth failed: ${resp.status}`);
    }
    if (resp.status === 429) {
      throw new ConnectorError("rate_limit", "perplexity", "Perplexity rate limit hit");
    }
    throw new ConnectorError(
      "network",
      "perplexity",
      `Perplexity HTTP ${resp.status}: ${await resp.text().catch(() => "")}`,
    );
  }

  let json: PerplexityResponse;
  try {
    json = (await resp.json()) as PerplexityResponse;
  } catch (err) {
    throw new ConnectorError("parse", "perplexity", "Invalid JSON from Perplexity", { cause: err });
  }

  const raw = json.choices[0]?.message.content;
  if (!raw) {
    throw new ConnectorError("parse", "perplexity", "Perplexity response missing content");
  }

  // The model sometimes wraps JSON in fences — strip them defensively.
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: Partial<TrendResearch>;
  try {
    parsed = JSON.parse(cleaned) as Partial<TrendResearch>;
  } catch (err) {
    throw new ConnectorError("parse", "perplexity", `Perplexity returned non-JSON content: ${cleaned.slice(0, 200)}`, { cause: err });
  }

  return {
    executiveSummary: typeof parsed.executiveSummary === "string" ? parsed.executiveSummary : "",
    whyItRises: typeof parsed.whyItRises === "string" ? parsed.whyItRises : "",
    regulatoryNotes:
      typeof parsed.regulatoryNotes === "string" && parsed.regulatoryNotes.length > 0
        ? parsed.regulatoryNotes
        : null,
    evidenceLinks: Array.isArray(parsed.evidenceLinks)
      ? parsed.evidenceLinks.filter((u): u is string => typeof u === "string")
      : json.citations ?? [],
  };
}
