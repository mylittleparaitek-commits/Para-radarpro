"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RECOMMENDED_ACTIONS, RISK_LEVELS } from "@/types";

const ACTION_LABELS: Record<string, string> = {
  buy_now: "Acheter maintenant",
  buy_carefully: "Acheter prudemment",
  watch: "Surveiller",
  do_not_buy: "Ne pas acheter",
  seo_only: "SEO uniquement",
  highlight_stock: "Mettre en avant",
  regulatory_caution: "Prudence réglementaire",
};

export function TrendFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (!value) next.delete(key);
    else next.set(key, value);
    startTransition(() => {
      router.push(`/trends?${next.toString()}`);
    });
  }

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const search = String(fd.get("search") ?? "");
        setParam("search", search || null);
      }}
    >
      <div className="flex-1 min-w-[200px]">
        <label className="text-xs font-medium text-muted-foreground">Recherche</label>
        <Input
          name="search"
          defaultValue={params.get("search") ?? ""}
          placeholder="ex. zinc, magnésium, mélatonine…"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Action</label>
        <select
          className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={params.get("recommendedAction") ?? ""}
          onChange={(e) => setParam("recommendedAction", e.target.value || null)}
        >
          <option value="">Toutes</option>
          {RECOMMENDED_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {ACTION_LABELS[a]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Risque réglementaire</label>
        <select
          className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={params.get("regulatoryRisk") ?? ""}
          onChange={(e) => setParam("regulatoryRisk", e.target.value || null)}
        >
          <option value="">Tous</option>
          {RISK_LEVELS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Trend score min</label>
        <Input
          name="minTrendScore"
          type="number"
          min={0}
          max={100}
          className="w-24"
          defaultValue={params.get("minTrendScore") ?? ""}
          onChange={(e) => setParam("minTrendScore", e.target.value || null)}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "…" : "Filtrer"}
      </Button>
    </form>
  );
}
