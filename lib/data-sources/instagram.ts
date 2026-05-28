/**
 * Instagram connector.
 *
 * Uses the **Instagram Graph API** (Meta for Developers).
 *
 * Limitations relevant to ParaRadar:
 *   - There is **no public hashtag search endpoint** that returns volume metrics
 *     without a connected business account that owns the hashtag (limited
 *     hashtag insights endpoint).
 *   - The **Hashtag Search** endpoint returns top + recent media for a tag,
 *     scoped to your authenticated business account. It does NOT give you
 *     total post counts (Meta deprecated that).
 *
 * Practical strategies:
 *   1. **Authenticated business account**: connect a ParaRadar IG business
 *      account, then use `/ig_hashtag_search` + `/recent_media` to count
 *      mentions per keyword over a rolling window. Approximate but allowed.
 *   2. **Third-party listening providers** (Talkwalker, Brandwatch,
 *      Meltwater): licensed feeds, more reliable. Recommended for production.
 *
 * This connector is wired for path 1 by default.
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
  popularity: true, // approximated from hashtag media count over rolling 7d
  growth: true,
  timeSeries: false, // would require our own snapshot table
  keywordLookup: true,
  yearOverYear: false,
};

interface InstagramConfig {
  accessToken: string;
  igUserId: string;
  endpoint: string;
}

function readConfig(): InstagramConfig | null {
  const accessToken = process.env.INSTAGRAM_GRAPH_API_TOKEN;
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (!accessToken || !igUserId) return null;
  return {
    accessToken,
    igUserId,
    endpoint: process.env.INSTAGRAM_GRAPH_API_ENDPOINT ?? "https://graph.facebook.com/v18.0",
  };
}

export class InstagramConnector implements SourceConnector {
  readonly source = "instagram" as const;
  readonly label = "Instagram";
  readonly capabilities = CAPS;

  async health(): Promise<ConnectorHealth> {
    const cfg = readConfig();
    if (!cfg) {
      return {
        status: "unavailable",
        lastSuccessAt: null,
        lastError: "Missing INSTAGRAM_GRAPH_API_TOKEN or INSTAGRAM_BUSINESS_ACCOUNT_ID",
      };
    }
    return { status: "ready", lastSuccessAt: null, lastError: null };
  }

  async fetchSignal(_options: FetchSignalOptions): Promise<SourceSignal> {
    const cfg = readConfig();
    if (!cfg) {
      throw new ConnectorError("Instagram not configured", this.source, "auth");
    }
    throw new ConnectorError(
      "InstagramConnector.fetchSignal not yet implemented. " +
        "Plan: 1) GET /ig_hashtag_search?user_id={ig_user_id}&q={keyword} → hashtag_id " +
        "2) GET /{hashtag_id}/recent_media?fields=id,timestamp&limit=50 " +
        "3) count posts per day for last 7/30/90d, normalize.",
      this.source,
      "unsupported"
    );
  }

  async fetchTopTrending(_options?: FetchTopOptions): Promise<readonly SourceSignal[]> {
    return [];
  }

  async fetchTimeSeries(_options: FetchSignalOptions): Promise<TimeSeries | null> {
    return null;
  }
}

export const instagramConnector = new InstagramConnector();
