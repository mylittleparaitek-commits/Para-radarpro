/**
 * POST /api/stripe/webhook
 *
 * Stripe signed webhook. Bypasses any application middleware (raw body
 * needed for signature verification).
 */

import { NextResponse, type NextRequest } from "next/server";
import { handleStripeWebhook } from "@/lib/stripe/webhook";

// Required: Stripe needs the raw body to verify the signature.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  try {
    const result = await handleStripeWebhook({ rawBody, signature });
    return NextResponse.json(result);
  } catch (err) {
    const message = (err as Error).message;
    // Bad signature is a 400; anything else is logged and returned as 500
    // so Stripe retries.
    if (message.includes("signature")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("[stripe-webhook] error", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
