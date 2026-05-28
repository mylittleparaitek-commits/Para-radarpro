import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

const PLAN_LABEL: Record<ProfileRow["subscription_plan"], string> = {
  free: "Découverte",
  pro: "Pro",
  business: "Business",
  premium: "Premium",
};

const PLAN_VARIANT: Record<ProfileRow["subscription_plan"], "secondary" | "success" | "default" | "warning"> = {
  free: "secondary",
  pro: "default",
  business: "success",
  premium: "warning",
};

export function TopNav({ profile }: { profile: ProfileRow }) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="text-sm text-muted-foreground">
        Bonjour {profile.full_name?.split(" ")[0] ?? profile.email.split("@")[0]} 👋
      </div>
      <div className="flex items-center gap-3">
        <Badge variant={PLAN_VARIANT[profile.subscription_plan]}>
          {PLAN_LABEL[profile.subscription_plan]}
        </Badge>
        {profile.subscription_plan === "free" && (
          <Button asChild size="sm" variant="outline">
            <Link href="/pricing">Passer Pro</Link>
          </Button>
        )}
        <form action={signOut}>
          <Button type="submit" size="sm" variant="ghost">
            Déconnexion
          </Button>
        </form>
      </div>
    </header>
  );
}
