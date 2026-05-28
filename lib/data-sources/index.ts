/**
 * Public API of the data-sources module.
 *
 * Exposes a single `getRegistry()` function that returns the connector
 * registry appropriate to the current runtime mode:
 *
 *   - DATA_SOURCE_MODE=mock → mock connectors only
 *   - DATA_SOURCE_MODE=live → real connectors (with mock fallback for sources
 *                              that have no API key configured)
 *
 * Consumers (aggregator, ingestion job, /api routes) should ONLY import
 * from this index — never reach into individual connector files. That way
 * we can swap implementations without touching callers.
 */

export * from "./sourceConnector.interface";
export type { AggregateInput, AggregateResult } from "./aggregator";
export { aggregateKeyword } from "./aggregator";

import type { ConnectorRegistry, SourceConnector } from "./sourceConnector.interface";
import type { DataSource } from "@/types";
import { createMockRegistry, MockConnector } from "./mockData";
import { googleTrendsConnector } from "./googleTrends";
import { tiktokConnector } from "./tiktok";
import { amazonConnector } from "./amazon";
import { instagramConnector } from "./instagram";
import { perplexityConnector } from "./perplexity";

let _registry: ConnectorRegistry | null = null;

/**
 * Get the connector registry for the current process.
 *
 * Memoized — only built once per process. Pass `force=true` to rebuild
 * (useful in tests).
 */
export function getRegistry(force = false): ConnectorRegistry {
  if (_registry && !force) return _registry;

  const mode = process.env.DATA_SOURCE_MODE ?? "mock";

  if (mode === "mock") {
    _registry = createMockRegistry();
    return _registry;
  }

  // Live mode: use real connectors when their env keys are set; mock otherwise.
  const map = new Map<DataSource, SourceConnector>();
  const real: SourceConnector[] = [
    googleTrendsConnector,
    tiktokConnector,
    amazonConnector,
    instagramConnector,
    perplexityConnector,
  ];
  for (const c of real) {
    map.set(c.source, c);
  }
  // Add a mock "web" connector so the aggregator always has at least one
  // signal source even in pure live mode without "web" implementation.
  if (!map.has("web")) {
    map.set("web", new MockConnector("web", "Web (fallback mock)"));
  }
  _registry = map;
  return _registry;
}
