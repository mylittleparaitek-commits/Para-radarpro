"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendChartData } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type Range = "d7" | "d30" | "d90";

const RANGE_LABEL: Record<Range, string> = {
  d7: "7 jours",
  d30: "30 jours",
  d90: "90 jours",
};

export interface TrendChartProps {
  data: TrendChartData;
  className?: string;
}

export function TrendChart({ data, className }: TrendChartProps) {
  const [range, setRange] = useState<Range>("d30");

  const series = useMemo(() => {
    return [...data[range]].map((p) => ({ date: p.date, value: p.value }));
  }, [data, range]);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex justify-end gap-1">
        {(["d7", "d30", "d90"] as const).map((r) => (
          <Button
            key={r}
            size="sm"
            variant={range === r ? "default" : "outline"}
            onClick={() => setRange(r)}
          >
            {RANGE_LABEL[r]}
          </Button>
        ))}
      </div>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(d: string) => d.slice(5)}
              minTickGap={20}
            />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} width={30} />
            <Tooltip
              labelFormatter={(d: string) => d}
              formatter={(v: number) => [v.toFixed(1), "Score"]}
              contentStyle={{
                borderRadius: 6,
                fontSize: 12,
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
