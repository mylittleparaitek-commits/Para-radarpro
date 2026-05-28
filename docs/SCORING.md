# Scoring

Everything is in `lib/scoring/`. Pure functions: same input → same output. No I/O, no side effects.

## Trend Score

```
trendScore = clip(0, 100)(
    popularity_weighted   * 0.5
  + growthScore           * 0.4
  + noveltyScore          * 0.1
) × buzzMultiplier
```

### Popularity (weighted by source)

```
popularity_weighted =
    google     × 0.30
  + tiktok     × 0.30
  + amazon     × 0.15
  + instagram  × 0.15
  + web        × 0.05
  + perplexity × 0.05
```

The weights reflect signal quality vs noise: Google and TikTok dominate because they're the strongest leading indicators of consumer demand. Web + Perplexity are tie-breakers.

### Growth score

```
growthScore = damped_log(
    growth7d  × 0.5
  + growth30d × 0.3
  + growth90d × 0.2
)
```

A damped log curve maps unbounded growth percentages to a 0-100 bounded score. A new product going from 10 to 100 (+900 %) doesn't dwarf an established one going +30 %.

### Buzz multiplier

If three or more sources independently rise, the multiplier is `1.15`. Two sources: `1.05`. One: `1.0`. This is a "convergent signals" bonus — when Google + TikTok + Amazon all light up, that's harder to fake than a single TikTok hashtag spike.

## Buy Score

```
buyScore = clip(0, 100)(
    trendScore                   × 0.35
  + growth7d_normalized          × 0.20
  + margin_potential_score       × 0.15
  + seasonalityScore             × 0.10
  + confidence_score             × 0.10
  - risk_penalty                 × 0.10
)
```

The Buy Score answers "should I commit shelf space to this **today**?" — a higher-stakes question than "is this trending?".

The risk penalty is the max of stock risk and regulatory risk, scaled. A product with high regulatory risk (e.g. mélatonine 1.9 mg without a leaflet update) gets a Buy Score floor of 30, even if popularity is sky-high.

## Recommended action (decision tree)

```
1. If regulatory_risk = high      → regulatory_caution     (veto)
2. If growth7d < -10 AND trendScore < 30 → do_not_buy      (declining)
3. If buzz_only AND no buyer signal (no Amazon rise)
                                  → seo_only
4. If already stocked AND trendScore > 70
                                  → highlight_stock
5. If buyScore ≥ 75               → buy_now
6. If buyScore 60-74              → buy_carefully
7. Else                           → watch
```

Implemented in `lib/scoring/buyScoring.ts::deriveRecommendedAction()`.

## Confidence

Four levels (`low` < `medium` < `high` < `very_high`) determined by:

- **Source agreement** — how many sources show a consistent direction
- **Historical depth** — how many days of data we have
- **Signal stability** — coefficient of variation on the 30-day series

A trend with 3+ converging sources, 60+ days of data, and CV < 0.3 is `very_high`. A single-source signal with 7 days of data is `low`.

## Seasonality

Two strategies, in order:

1. **Statistical** (if ≥ 12 months of data): aggregate the series by month-of-year, compute the coefficient of variation. If > 0.4, the trend has a seasonal pattern; the peak months are those with values > 1.15 × mean.

2. **Category fallback** (`CATEGORY_PEAK_MONTHS` table):
   - Immunité → 9-12 + 1-2
   - Solaire → 5-8
   - Minceur → 1-5
   - Allergie → 3-6
   - Stress / sommeil → 9-12
   - …

The label is generated from the months: `[9, 10, 11, 12, 1, 2]` → `"Automne-Hiver"`.

## Suggested quantities (per pharmacy size)

Anchored on the Buy Score with a size multiplier, rounded to a packaging multiple (6 or 12 depending on category).

| Pharmacy size | Multiplier |
| --- | --- |
| small (< 1 M€ CA) | 0.25 |
| medium (1-3 M€) | 0.55 |
| large (> 3 M€) | 1.00 |

So a Buy Score of 85 gives a base quantity of ~25 units, rounded up: small 6, medium 12-18, large 24-30.

## Why no machine learning (yet)

Two reasons:

1. **Interpretability**. A pharmacist needs to know **why** a trend got an action label — "the algorithm said so" doesn't sell. The pure weighted formula above is auditable: change a weight and re-score, see what moves.
2. **Sample size**. ML on 12-24 months of pharmacy-specific demand data is not enough to beat a well-tuned weighted average. Once we have 3+ years of validated outcomes (did Buy Now actually sell?), an ML re-weighting becomes worthwhile.

## Future work

- Unit tests for the recommended-action decision tree (`scripts/test-scoring.ts`).
- Backtest harness: replay historical signals through current weights, compare to validated outcomes.
- Per-category weight overrides (TikTok matters more for cosmétique-tendance than for compléments-fond).
