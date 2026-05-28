/**
 * Google Trends connector.
 *
 * ⚠️  Google does NOT publish an official Trends REST API.
 *
 * Three legitimate paths to use Google data:
 *
 *   1. **SerpApi / DataForSEO / Glimpse**: third-party paid providers that
 *      wrap Trends behind a stable contract. Recommended for production.
 *      → set GOOGLE_TRENDS_API_KEY and GOOGLE_TRENDS_PROVIDER=serpapi.
 *
 *   2. **Google Search Console API**: official API, but limited to *your*
 *      site impressions/CTR — not public trend data. Useful as a secondary
 *      signal for sites that already own SEO traffic.
 *
 *   3. **Self-hosted pytrends + queue**: technically possible but unstable
 *      and against Google ToS at scale. Not implemented here.
 *
 * This file implements path 1 with a provider-agnostic adapter shape. The
 * concrete provider is selected via env var so you can swap without code change.
 */

import type {
  ConnectorCapabilities,
  ConnectorHealth,
  FetchSignalOptions,
  FetchTopOptions,
  SourceConnector,
} from "./sourceConnector.interface";
import { ConnectorError } from "./sourceConnector.interface";
import type { SourceSignal, TimeSeries } from "@/types";

const CAPS: ConnectorCapabilities = {
  popularity: true,
  growth: true,
  timeSeries: true,
  keywordLookup: true,
  yearOverYear: true,
};

interface ProviderConfig {
  apiKey: string;
  provider: "serpapi" | "dataforseo" | "glimpse";
  endpoint: string;
}

function readConfig(): ProviderConfig | null {
  const apiKey = process.env.GOOGLE_TRENDS_API_KEY;
  if (!apiKey) return null;
  const provider = (process.env.GOOGLE_TRENDS_PROVIDER ?? "serpapi") as ProviderConfig["provider"];
  const endpoint =
    process.env.GOOGLE_TRENDS_ENDPOINT ??
    (provider === "serpapi"
      ? "https://serpapi.com/search.json"
      : provider === "dataforseo"
      ? "https://api.dataforseo.com/v3/keywords_data/google_trends/explore/live"
      : "https://api.glimpse.io/v1/trends");
  return { apiKey, provider, endpoint };
}

export class GoogleTrendsConnector implements SourceConnector {
  readonly source = "google_trends" as const;
  readonly label = "Google Trends";
  readonly capabilities = CAPS;

  async health(): Promise<ConnectorHealth> {
    const cfg = readConfig();
    if (!cfg) {
      return {
        status: "unavailable",
        lastSuccessAt: null,
        lastError: "Missing GOOGLE_TRENDS_API_KEY",
      };
    }
    return { status: "ready", lastSuccessAt: null, lastError: null };
  }

  async fetchSignal(options: FetchSignalOptions): Promise<SourceSignal> {
    const cfg = readConfig();
    if (!cfg) {
      throw new ConnectorError("Google Trends not configured", this.source, "auth");
    }
    // TODO(impl): replace with real provider-specific HTTP call.
    // The shape below documents the expected mapping. We throw to make it
    // obvious if someone forgets to flip DATA_SOURCE_MODE=live without
    // implementing the connector.
    throw new ConnectorError(
      `GoogleTrendsConnector.fetchSignal not yet implemented for provider ${cfg.provider}. ` +
        `Use DATA_SOURCE_MODE=mock or implement the provider call.`,
      this.source,
      "unsupported"
    );

    // Reference implementation skeleton:
    // const url = new URL(cfg.endpoint);
    // url.searchParams.set("api_key", cfg.apiKey);
    // url.searchParams.set("engine", "google_trends");
    // url.searchParams.set("q", options.keyword);
    // url.searchParams.set("geo", options.locale?.split("-")[1] ?? "FR");
    // const res = await fetch(url, { signal: options.signal });
    // if (!res.ok) throw new ConnectorError(`HTTP ${res.status}`, this.source, "network");
    // const json = await res.json();
    // return mapSerpApiResponseToSignal(options.keyword, json);
  }

  async fetchTopTrending(_options?: FetchTopOptions): Promise<readonly SourceSignal[]> {
    // Google Trends does expose a "Daily Trending Searches" endpoint via SerpApi,
    // but the results are very broad (not pharma-specific). Recommend filtering
    // in the aggregator. For now, return empty so discovery doesn't depend on it.
    return [];
  }

  async fetchTimeSeries(_options: FetchSignalOptions): Promise<TimeSeries | null> {
    // Same as fetchSignal: would call the provider's interest_over_time endpoint.
    return null;
  }
}

export const googleTrendsConnector = new GoogleTrendsConnector();
