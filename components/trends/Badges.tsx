import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type {
  ConfidenceLevel,
  RecommendedAction,
  RiskLevel,
} from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

// ─── ScoreBadge ──────────────────────────────────────────────────────────────

export interface ScoreBadgeProps {
  /** Score 0-100 */
  value: number;
  /** Optional label shown before the value */
  label?: string;
  className?: string;
}

export function ScoreBadge({ value, label, className }: ScoreBadgeProps) {
  const v = Math.round(value);
  const color =
    v >= 75
      ? "bg-emerald-100 text-emerald-800"
      : v >= 50
        ? "bg-blue-100 text-blue-800"
        : v >= 25
          ? "bg-amber-100 text-amber-800"
          : "bg-red-100 text-red-800";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
        color,
        className,
      )}
    >
      {label && <span className="mr-1 opacity-75">{label}</span>}
      {v}/100
    </span>
  );
}

// ─── GrowthBadge ─────────────────────────────────────────────────────────────

export interface GrowthBadgeProps {
  /** Growth percentage (e.g. 42 → +42%) */
  value: number;
  /** Period label, e.g. "7j" */
  period?: string;
  className?: string;
}

export function GrowthBadge({ value, period, className }: GrowthBadgeProps) {
  const rounded = Math.round(value);
  const Icon = rounded > 5 ? TrendingUp : rounded < -5 ? TrendingDown : Minus;
  const color =
    rounded > 5
      ? "text-emerald-600"
      : rounded < -5
        ? "text-red-600"
        : "text-muted-foreground";
  const sign = rounded > 0 ? "+" : "";
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", color, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {sign}
      {rounded}%{period && <span className="text-[10px] opacity-70">/{period}</span>}
    </span>
  );
}

// ─── ActionBadge ─────────────────────────────────────────────────────────────

const ACTION_META: Record<
  RecommendedAction,
  { label: string; variant: "default" | "success" | "warning" | "danger" | "secondary" }
> = {
  buy_now: { label: "✅ Acheter maintenant", variant: "success" },
  buy_carefully: { label: "⚠️ Acheter prudemment", variant: "warning" },
  watch: { label: "👀 Surveiller", variant: "secondary" },
  do_not_buy: { label: "🚫 Ne pas acheter", variant: "danger" },
  seo_only: { label: "📝 SEO uniquement", variant: "secondary" },
  highlight_stock: { label: "📌 Mettre en avant le stock", variant: "default" },
  regulatory_caution: { label: "⚠️ Prudence réglementaire", variant: "danger" },
};

export function ActionBadge({ action }: { action: RecommendedAction }) {
  const meta = ACTION_META[action];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

// ─── ConfidenceBadge ─────────────────────────────────────────────────────────

const CONFIDENCE_META: Record<
  ConfidenceLevel,
  { label: string; variant: "default" | "success" | "warning" | "secondary" }
> = {
  low: { label: "Confiance faible", variant: "warning" },
  medium: { label: "Confiance moyenne", variant: "secondary" },
  high: { label: "Confiance élevée", variant: "default" },
  very_high: { label: "Confiance très élevée", variant: "success" },
};

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const meta = CONFIDENCE_META[level];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

// ─── RiskBadge ───────────────────────────────────────────────────────────────

const RISK_META: Record<
  RiskLevel,
  { label: string; variant: "secondary" | "warning" | "danger" }
> = {
  none: { label: "Aucun risque", variant: "secondary" },
  low: { label: "Risque faible", variant: "secondary" },
  medium: { label: "Risque moyen", variant: "warning" },
  high: { label: "Risque élevé", variant: "danger" },
};

export function RiskBadge({ level, label }: { level: RiskLevel; label?: string }) {
  const meta = RISK_META[level];
  return <Badge variant={meta.variant}>{label ?? meta.label}</Badge>;
}
