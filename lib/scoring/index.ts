/**
 * Public API of the scoring module.
 *
 * Usage:
 *   import { computeTrendScores, computeBuyScore, deriveRecommendedAction,
 *            detectSeasonality } from "@/lib/scoring";
 */

export * from "./trendScoring";
export * from "./buyScoring";
export * from "./seasonalityDetection";
