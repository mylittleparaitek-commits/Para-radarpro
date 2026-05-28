/**
 * POST /api/stripe/portal
 *
 * Auth required. Returns or 303-redirects to a Stripe billing portal URL
 * so users can self-manage their subscription.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createPortalSession } from "@/lib/stripe/portal";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }
  const origin = new URL(req.url).origin;
  const { portalUrl } = await createPortalSession({
    userId: user.id,
    returnUrl: `${origin}/settings`,
  });

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return NextResponse.json({ portalUrl });
  }
  return NextResponse.redirect(portalUrl, 303);
}
