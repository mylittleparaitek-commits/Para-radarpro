import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SubscriptionPlan } from "@/types";
import { planMeets } from "@/lib/auth/plan-guard";

export interface PlanGateProps {
  current: SubscriptionPlan;
  required: SubscriptionPlan;
  children: React.ReactNode;
  /** Title shown when locked. */
  title?: string;
  /** Description shown when locked. */
  description?: string;
}

const PLAN_LABEL: Record<SubscriptionPlan, string> = {
  free: "Découverte",
  pro: "Pro",
  business: "Business",
  premium: "Premium",
};

/**
 * Render `children` if the user's plan meets the required tier, otherwise
 * render a paywall card with an upgrade CTA.
 */
export function PlanGate({
  current,
  required,
  children,
  title,
  description,
}: PlanGateProps) {
  if (planMeets(current, required)) return <>{children}</>;
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="text-base font-semibold">
          {title ?? `Réservé au plan ${PLAN_LABEL[required]}`}
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          {description ??
            `Cette section est disponible à partir du plan ${PLAN_LABEL[required]}.`}
        </p>
        <Button asChild size="sm">
          <Link href={`/pricing?plan=${required}`}>Passer au plan {PLAN_LABEL[required]}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
