/**
 * POST /api/stripe/checkout
 *
 * Body: form-encoded `plan=pro|business|premium`
 * Auth: requires a signed-in user.
 *
 * On success, 303-redirects to the Stripe Checkout URL.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { createCheckoutSession } from "@/lib/stripe/checkout";
import { SUBSCRIPTION_PLANS } from "@/types";

export const runtime = "nodejs";

const Body = z.object({
  plan: z.enum(SUBSCRIPTION_PLANS).refine((p) => p !== "free", {
    message: "Cannot checkout the free plan",
  }),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/pricing", req.url), 303);
  }

  let plan: string;
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const json = (await req.json()) as unknown;
    plan = (json as { plan?: string }).plan ?? "";
  } else {
    const form = await req.formData();
    plan = String(form.get("plan") ?? "");
  }

  const parsed = Body.safeParse({ plan });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const { checkoutUrl } = await createCheckoutSession({
    userId: user.id,
    userEmail: user.email,
    plan: parsed.data.plan,
    origin,
  });

  if (contentType.includes("application/json")) {
    return NextResponse.json({ checkoutUrl });
  }
  return NextResponse.redirect(checkoutUrl, 303);
}
