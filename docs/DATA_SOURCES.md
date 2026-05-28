# Data Sources

How to wire each connector. All sources are **opt-in**: the app runs in mock mode by default.

## Legal & ethical constraints

ParaRadar Pro uses **only official APIs or licensed providers**. Direct scraping is explicitly out of scope:

- Faster legal action against scrapers (Meta v. Bright Data, LinkedIn v. hiQ).
- Brittle: a single class-name change breaks the pipeline.
- Violates ToS, which we cannot resell.

The `SourceConnector` interface in `lib/data-sources/sourceConnector.interface.ts` is the central abstraction. Every connector implements it and throws a `ConnectorError` with a typed `code` (`rate_limit`, `auth`, `not_found`, `network`, `parse`, `unsupported`, `unknown`) instead of leaking provider-specific errors.

## Switching from mock to live

In `.env.local`:

```bash
DATA_SOURCE_MODE=live
```

Each connector independently falls back to the mock if its env vars are missing, so you can roll out one source at a time.

## Connectors

### Google Trends

**Provider options** (set `GOOGLE_TRENDS_PROVIDER`):

- `serpapi` — [serpapi.com](https://serpapi.com/google-trends-api), pay per request, easy.
- `dataforseo` — [dataforseo.com](https://dataforseo.com/), volume pricing.
- `glimpse` — [meetglimpse.com](https://meetglimpse.com/), best signal but enterprise pricing.

```bash
GOOGLE_TRENDS_PROVIDER=serpapi
GOOGLE_TRENDS_API_KEY=...
```

Implementation lives in `lib/data-sources/googleTrends.ts`. The current file throws `ConnectorError("unsupported")` — fill in the `fetchSignal` method with your provider's HTTP call.

### TikTok

**The only legal path is the [TikTok Research API](https://developers.tiktok.com/products/research-api/)**, which requires:

- A verified TikTok developer account
- A research justification (academic, journalism, market intelligence)
- Approval — typically 2-6 weeks

For commercial trend intelligence specifically, the alternatives are:

- **TikTok Marketing API** (Ads platform) — for brand mention discovery.
- **Third-party providers**: Tribe, Brandwatch, Sprout Social, BuzzSumo — these have a TikTok license you can resell-but-only-from.

```bash
TIKTOK_RESEARCH_API_TOKEN=...
TIKTOK_API_BASE=https://open.tiktokapis.com/v2
```

### Amazon

**Amazon Product Advertising API v5 (PA-API 5)**. Requirements:

- An [Amazon Associates](https://affiliate-program.amazon.com/) account that has driven at least 3 sales in the last 180 days (otherwise PA-API access is revoked).
- AWS-style access key + secret + partner tag.

```bash
AMAZON_PA_API_ACCESS_KEY=...
AMAZON_PA_API_SECRET_KEY=...
AMAZON_PA_API_PARTNER_TAG=...
AMAZON_PA_API_HOST=webservices.amazon.fr
```

Throughput: 1 request/sec per ASIN per associate ID, throttled aggressively. The popularity signal is derived from sales rank — a low rank means high popularity.

### Instagram

**Instagram Graph API** (Meta for Business), requires:

- A Facebook Business account
- An Instagram **Business** or **Creator** account linked to it
- A long-lived user access token with `instagram_basic` + `pages_show_list` scopes

```bash
INSTAGRAM_GRAPH_API_TOKEN=...
INSTAGRAM_BUSINESS_ACCOUNT_ID=...
```

Limits: hashtag search returns top 50 + recent 50 media per hashtag. Aggregate post engagement is the popularity signal.

### Perplexity

Used **only for qualitative research** (executive summary, regulatory notes, evidence links) — never for popularity, growth, or any quantitative figure. The generative output can be wrong about numbers but is excellent for narrative + sources.

```bash
PERPLEXITY_API_KEY=...
PERPLEXITY_MODEL=sonar-pro
```

The client lives in `lib/ai/perplexity.ts`. It enforces a strict JSON output schema with citations and falls back gracefully on parse errors.

## Aggregator behavior

`lib/data-sources/aggregator.ts`:

1. Fans out to every available connector in parallel via `Promise.allSettled`.
2. Per-source failures do **not** block the pipeline — they're collected and surfaced as `errors[]` on the result.
3. The longest time series wins for seasonality detection.
4. The scoring engine takes over from there: pure functions, no I/O.
5. The output `Trend` is in `status: "draft"` — an admin validates before publishing.

This last point matters: **every trend goes through human validation** before being shown to paying users. The mock seed bypasses this for convenience (`is_validated: true`).
