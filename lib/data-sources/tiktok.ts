/**
 * TikTok connector.
 *
 * Uses the **official TikTok Research API** (https://developers.tiktok.com/products/research-api).
 *
 * Eligibility: only academic researchers and certain commercial partners
 * can access the Research API. For commercial / non-academic use, the
 * legitimate alternatives are:
 *
 *   - **TikTok Marketing API** (Creative Center insights — paid, requires
 *     business verification).
 *   - **Third-party intelligence providers** (Tribe Dynamics, Sprout Social,
 *     Brandwatch, etc.) that have a licensed data feed.
 *
 * ⚠️  This connector does NOT implement scraping of the tiktok.com web app.
 *     Scraping is against TikTok's ToS and is rate-limited aggressively.
 *
 * The shape below is built for the Research API; swap the URL / auth
 * handling for the Marketing API if that's the path you have access to.
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
  yearOverYear: false, // Research API only goes back ~2 years; YoY is unreliable
};

interface TikTokConfig {
  apiKey: string;
  endpoint: string;
}

function readConfig(): TikTokConfig | null {
  const apiKey = process.env.TIKTOK_RESEARCH_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    endpoint:
      process.env.TIKTOK_RESEARCH_API_ENDPOINT ??
      "https://open.tiktokapis.com/v2/research/video/query/",
  };
}

export class TikTokConnector implements SourceConnector {
  readonly source = "tiktok" as const;
  readonly label = "TikTok";
  readonly capabilities = CAPS;

  async health(): Promise<ConnectorHealth> {
    const cfg = readConfig();
    if (!cfg) {
      return {
        status: "unavailable",
        lastSuccessAt: null,
        lastError: "Missing TIKTOK_RESEARCH_API_KEY",
      };
    }
    return { status: "ready", lastSuccessAt: null, lastError: null };
  }

  async fetchSignal(_options: FetchSignalOptions): Promise<SourceSignal> {
    const cfg = readConfig();
    if (!cfg) {
      throw new ConnectorError("TikTok not configured", this.source, "auth");
    }
    throw new ConnectorError(
      "TikTokConnector.fetchSignal not yet implemented. " +
        "See docs/DATA_SOURCES.md for the Research API request shape.",
      this.source,
      "unsupported"
    );

    // Reference: POST {endpoint} with body
    //   { query: { and: [{ operation: "IN", field_name: "keyword", field_values: [keyword] }] },
    //     start_date: "...", end_date: "...", max_count: 100 }
    // Then aggregate views/likes per day → normalize to 0-100, compute growth.
  }

  async fetchTopTrending(_options?: FetchTopOptions): Promise<readonly SourceSignal[]> {
    // TikTok Creative Center has a "Trending Hashtags" + "Trending Songs" endpoint
    // exposed via the Marketing API. For Research API users, this is not available.
    return [];
  }

  async fetchTimeSeries(_options: FetchSignalOptions): Promise<TimeSeries | null> {
    return null;
  }
}

export const tiktokConnector = new TikTokConnector();
