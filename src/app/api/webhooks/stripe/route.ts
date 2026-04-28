import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature, addCredits, isSessionProcessed, markSessionProcessed } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const event = verifyWebhookSignature(body, sig, webhookSecret);
  if (!event) {
    console.error("Webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data as Record<string, unknown>;
    const obj = session.object as Record<string, unknown>;
    const sessionId = obj.id as string;

    if (await isSessionProcessed(sessionId)) {
      return NextResponse.json({ received: true, status: "already_processed" });
    }

    const metadata = obj.metadata as Record<string, string> | undefined;
    const tenantId = metadata?.tenantId;
    const creditAmount = parseInt(metadata?.creditAmount || "0", 10);
    const packageId = metadata?.packageId || "unknown";

    if (!tenantId || !creditAmount) {
      console.error("Missing metadata in checkout session:", sessionId);
      return NextResponse.json({ error: "Invalid session metadata" }, { status: 400 });
    }

    const newBalance = await addCredits(
      tenantId,
      creditAmount,
      `Purchased ${packageId}: +${creditAmount} credits`,
      sessionId
    );

    markSessionProcessed(sessionId);
    console.log(`Credits added: tenant=${tenantId}, credits=${creditAmount}, balance=${newBalance}`);
  }

  return NextResponse.json({ received: true });
}
