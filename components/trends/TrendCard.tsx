import Link from "next/link";
import type { Trend } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionBadge, GrowthBadge, ScoreBadge } from "./Badges";

export interface TrendCardProps {
  trend: Trend;
  /** When true, render a compact version (dashboard rows). */
  compact?: boolean;
}

export function TrendCard({ trend, compact }: TrendCardProps) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className={compact ? "p-4 pb-2" : undefined}>
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/trends/${trend.id}`}
            className="flex-1 text-base font-semibold leading-tight hover:underline"
          >
            {trend.keyword}
          </Link>
          <ActionBadge action={trend.recommendedAction} />
        </div>
        {!compact && trend.content.executiveSummary && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {trend.content.executiveSummary}
          </p>
        )}
      </CardHeader>
      <CardContent className={compact ? "p-4 pt-0" : "pt-0"}>
        <div className="flex flex-wrap items-center gap-2">
          <ScoreBadge value={trend.scores.trendScore} label="Tendance" />
          <ScoreBadge value={trend.scores.buyScore} label="Achat" />
          <GrowthBadge value={trend.growth.growth7d} period="7j" />
          {!compact && <GrowthBadge value={trend.growth.growth30d} period="30j" />}
        </div>
      </CardContent>
    </Card>
  );
}
