/**
 * Source Connector Interface
 *
 * The single contract that ALL external data source adapters must implement.
 *
 * The point of this abstraction is to keep the rest of the codebase
 * (scoring engine, ingestion jobs, dashboard) completely independent from
 * which API is used to fetch a signal. Adding a new source (e.g. Pinterest,
 * Reddit, Google Search Console) means implementing this interface once;
 * the rest of the pipeline picks it up automatically.
 *
 * ⚠️  Legal & ethical constraint
 *     Implementations MUST only use official APIs (Google Trends API,
 *     TikTok Research API, Amazon PA-API, etc.) or licensed datasets.
 *     Do NOT implement scrapers that bypass robots.txt, ToS, or rate limits.
 *     Connectors that would require illegal scraping are intentionally
 *     left as `unsupported` placeholders.
 */

import type { DataSource, SourceSignal, TimeSeries } from "@/types";

// ─── Connector capabilities ──────────────────────────────────────────────────

/**
 * Declares what a connector can / cannot do, so the aggregator can call it
 * intelligently and fall back when needed.
 */
export interface ConnectorCapabilities {
  /** Can fetch the current popularity score? */
  popularity: boolean;
  /** Can fetch growth metrics (7/30/90d)? */
  growth: boolean;
  /** Can return a historical time series? */
  timeSeries: boolean;
  /** Can search by keyword (vs only top-trending feed)? */
  keywordLookup: boolean;
  /** Can return YoY (year-over-year) comparison? */
  yearOverYear: boolean;
}

// ─── Health & metadata ───────────────────────────────────────────────────────

export type ConnectorStatus = "ready" | "degraded" | "unavailable" | "unsupported";

export interface ConnectorHealth {
  status: ConnectorStatus;
  /** Last successful fetch timestamp, ISO. */
  lastSuccessAt: string | null;
  /** Last error message, if any. */
  lastError: string | null;
  /** Free-form notes (e.g. quota state). */
  notes?: string;
}

// ─── Query options ───────────────────────────────────────────────────────────

export interface FetchSignalOptions {
  /** Keyword to look up. Connector should normalize as needed. */
  keyword: string;
  /** Optional locale (e.g. "fr-FR"). */
  locale?: string;
  /** Whether to include the long (90d/365d) time series. Costlier. */
  includeTimeSeries?: boolean;
  /** Abort signal for cancellation. */
  signal?: AbortSignal;
}

export interface FetchTopOptions {
  /** Category to scope to (connector may ignore if not supported). */
  category?: string;
  /** Max results. */
  limit?: number;
  locale?: string;
  signal?: AbortSignal;
}

// ─── Errors ──────────────────────────────────────────────────────────────────

export class ConnectorError extends Error {
  constructor(
    message: string,
    public readonly source: DataSource,
    public readonly code:
      | "rate_limit"
      | "auth"
      | "not_found"
      | "network"
      | "parse"
      | "unsupported"
      | "unknown",
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "ConnectorError";
  }
}

// ─── The interface ───────────────────────────────────────────────────────────

/**
 * Contract every data source connector must implement.
 *
 * Implementations are stateless from the caller's POV — internal caching
 * and rate limiting are allowed but must not change the return contract.
 */
export interface SourceConnector {
  /** Stable identifier matching the DataSource enum. */
  readonly source: DataSource;

  /** Human-friendly label, used in UI. */
  readonly label: string;

  /** Static declaration of what this connector supports. */
  readonly capabilities: ConnectorCapabilities;

  /** Self-check — does the connector have its credentials and is the API reachable? */
  health(): Promise<ConnectorHealth>;

  /**
   * Fetch a single signal for one keyword.
   * Throws ConnectorError on failure; never returns a partial signal.
   */
  fetchSignal(options: FetchSignalOptions): Promise<SourceSignal>;

  /**
   * Optionally fetch the top trending keywords from this source.
   * Useful for discovery (finding tomorrow's trends, not just scoring existing ones).
   *
   * Implementations that don't support this should return an empty array
   * (not throw), so the discovery pipeline degrades gracefully.
   */
  fetchTopTrending(options?: FetchTopOptions): Promise<readonly SourceSignal[]>;

  /**
   * Fetch only the time series for a keyword, separately from the rest.
   * Useful when seeding chart data on demand without re-running full signal.
   *
   * Implementations without time-series support return null.
   */
  fetchTimeSeries(options: FetchSignalOptions): Promise<TimeSeries | null>;
}

// ─── Helper: minimal base class ──────────────────────────────────────────────

/**
 * Optional convenience base class that throws "unsupported" for any method
 * the connector hasn't overridden. Implementations can extend this and just
 * override what they support.
 */
export abstract class BaseSourceConnector implements SourceConnector {
  abstract readonly source: DataSource;
  abstract readonly label: string;
  abstract readonly capabilities: ConnectorCapabilities;

  async health(): Promise<ConnectorHealth> {
    return { status: "unsupported", lastSuccessAt: null, lastError: null };
  }

  async fetchSignal(_options: FetchSignalOptions): Promise<SourceSignal> {
    throw new ConnectorError(
      `${this.label}: fetchSignal not implemented`,
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

// ─── Connector registry ──────────────────────────────────────────────────────

export type ConnectorRegistry = ReadonlyMap<DataSource, SourceConnector>;

/**
 * Build a registry from a list of connectors. Useful for DI in the aggregator
 * so tests can swap real connectors for mocks.
 */
export function createConnectorRegistry(
  connectors: readonly SourceConnector[]
): ConnectorRegistry {
  const map = new Map<DataSource, SourceConnector>();
  for (const c of connectors) {
    if (map.has(c.source)) {
      throw new Error(`Duplicate connector for source: ${c.source}`);
    }
    map.set(c.source, c);
  }
  return map;
}
