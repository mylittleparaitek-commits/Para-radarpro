/**
 * Amazon connector.
 *
 * Uses the **Amazon Product Advertising API v5** (PA-API 5).
 *
 * Requirements:
 *   - Amazon Associates account (region-specific: amazon.fr for FR).
 *   - PA-API credentials: access key, secret key, partner tag (associate ID).
 *   - The account must have generated at least one qualified sale in the last
 *     30 days to keep the keys active. (Amazon enforces this.)
 *
 * What we use it for:
 *   - **SearchItems**: list products matching a keyword, with their
 *     SalesRank, BSR delta, customer review count, price band.
 *   - SalesRank movement is our proxy for popularity & growth.
 *
 * ⚠️  PA-API is rate-limited to a low TPS that scales with your sales.
 *     Implement caching aggressively (24h+ for SalesRank).
 *
 * ⚠️  Scraping Amazon search pages is against ToS and triggers IP bans.
 *     Do not implement that path.
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
  growth: true, // derived from SalesRank delta over time (requires our own history table)
  timeSeries: false, // PA-API doesn't expose historical BSR — need to record snapshots ourselves
  keywordLookup: true,
  yearOverYear: false,
};

interface AmazonConfig {
  accessKey: string;
  secretKey: string;
  partnerTag: string;
  marketplace: string;
  region: string;
}

function readConfig(): AmazonConfig | null {
  const accessKey = process.env.AMAZON_PA_API_ACCESS_KEY;
  const secretKey = process.env.AMAZON_PA_API_SECRET_KEY;
  const partnerTag = process.env.AMAZON_PA_API_PARTNER_TAG;
  if (!accessKey || !secretKey || !partnerTag) return null;
  return {
    accessKey,
    secretKey,
    partnerTag,
    marketplace: process.env.AMAZON_PA_API_MARKETPLACE ?? "www.amazon.fr",
    region: process.env.AMAZON_PA_API_REGION ?? "eu-west-1",
  };
}

export class AmazonConnector implements SourceConnector {
  readonly source = "amazon" as const;
  readonly label = "Amazon";
  readonly capabilities = CAPS;

  async health(): Promise<ConnectorHealth> {
    const cfg = readConfig();
    if (!cfg) {
      return {
        status: "unavailable",
        lastSuccessAt: null,
        lastError:
          "Missing AMAZON_PA_API_{ACCESS_KEY,SECRET_KEY,PARTNER_TAG}",
      };
    }
    return { status: "ready", lastSuccessAt: null, lastError: null };
  }

  async fetchSignal(_options: FetchSignalOptions): Promise<SourceSignal> {
    const cfg = readConfig();
    if (!cfg) throw new ConnectorError("Amazon not configured", this.source, "auth");

    throw new ConnectorError(
      "AmazonConnector.fetchSignal not yet implemented. " +
        "Use the paapi5-nodejs-sdk and call SearchItems with the keyword, " +
        "then aggregate SalesRank across the top 5 results.",
      this.source,
      "unsupported"
    );

    // Reference (paapi5-nodejs-sdk):
    //   const api = new ProductAdvertisingAPIv1.DefaultApi(...);
    //   const req = new ProductAdvertisingAPIv1.SearchItemsRequest();
    //   req.PartnerTag = cfg.partnerTag;
    //   req.PartnerType = "Associates";
    //   req.Marketplace = cfg.marketplace;
    //   req.Keywords = options.keyword;
    //   req.ItemCount = 10;
    //   req.Resources = ["BrowseNodeInfo.WebsiteSalesRank","ItemInfo.Title","Offers.Listings.Price"];
    //   const res = await api.searchItems(req);
    //   return mapPaApiResponseToSignal(options.keyword, res);
  }

  async fetchTopTrending(_options?: FetchTopOptions): Promise<readonly SourceSignal[]> {
    // PA-API has a "GetBrowseNodes" + "SearchItems(sortBy=ReleaseDate)" path
    // that approximates trending. Implement when needed.
    return [];
  }

  async fetchTimeSeries(_options: FetchSignalOptions): Promise<TimeSeries | null> {
    // We don't get history from Amazon — we'd have to recompose it from our own
    // snapshot table (see db/migrations for source_snapshots table when added).
    return null;
  }
}

export const amazonConnector = new AmazonConnector();
