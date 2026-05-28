/**
 * Perplexity connector.
 *
 * Perplexity is used differently from the other connectors: it's not a
 * popularity metric source, it's a **qualitative research assistant** that:
 *
 *   - finds and synthesizes evidence links for a trend
 *   - drafts the `executiveSummary` and `whyItRises` editorial fields
 *   - explains the regulatory landscape
 *
 * Its "signal" is therefore a heuristic confidence score derived from
 * citation density + recency of cited sources.
 *
 * Uses the official Perplexity API (https://docs.perplexity.ai/).
 * Models: `sonar`, `sonar-pro`, `sonar-reasoning`. We default to `sonar-pro`
 * for grounded answers with citations.
 *
 * The qualitative output (summary text + links) lives in `lib/ai/perplexity.ts`
 * rather than here; this file only exposes the SourceConnector facade so the
 * aggregator can include Perplexity as an "evidence" source.
 */

import type {
  ConnectorCapabilities,
  ConnectorHealth,
  FetchSignalOptions,
  SourceConnector,
} from "./sourceConnector.interface";
import { ConnectorError } from "./sourceConnector.interface";
import type { SourceSignal, TimeSeries } from "@/types";

const CAPS: ConnectorCapabilities = {
  popularity: false, // Perplexity doesn't measure popularity directly
  growth: false,
  timeSeries: false,
  keywordLookup: true,
  yearOverYear: false,
};

function hasKey(): boolean {
  return Boolean(process.env.PERPLEXITY_API_KEY);
}

export class PerplexityConnector implements SourceConnector {
  readonly source = "perplexity" as const;
  readonly label = "Perplexity";
  readonly capabilities = CAPS;

  async health(): Promise<ConnectorHealth> {
    if (!hasKey()) {
      return {
        status: "unavailable",
        lastSuccessAt: null,
        lastError: "Missing PERPLEXITY_API_KEY",
      };
    }
    return { status: "ready", lastSuccessAt: null, lastError: null };
  }

  async fetchSignal(_options: FetchSignalOptions): Promise<SourceSignal> {
    if (!hasKey()) throw new ConnectorError("Perplexity not configured", this.source, "auth");
    throw new ConnectorError(
      "PerplexityConnector.fetchSignal is not used for popularity metrics. " +
        "Use lib/ai/perplexity.ts for qualitative research instead.",
      this.source,
      "unsupported"
    );
  }

  async fetchTopTrending(): Promise<readonly SourceSignal[]> {
    return [];
  }

  async fetchTimeSeries(): Promise<TimeSeries | null> {
    return null;
  }
}

export const perplexityConnector = new PerplexityConnector();
