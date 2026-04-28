import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth";
import { createCheckoutSession, CREDIT_PACKAGES } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.valid) {
    return NextResponse.json(
      { error: { message: auth.error, type: "authentication_error" } },
      { status: 401 }
    );
  }

  const { apiKey } = auth;

  try {
    const body = await req.json();
    const packageId = body.package_id as string;
    const customAmount = body.custom_amount as number | undefined;

    let ntdAmount: number;
    let creditAmount: number;
    let label: string;

    if (packageId) {
      const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
      if (!pkg) {
        return NextResponse.json(
          { error: { message: `Invalid package: ${packageId}. Available: ${CREDIT_PACKAGES.map((p) => p.id).join(", ")}`, type: "invalid_request" } },
          { status: 400 }
        );
      }
      ntdAmount = pkg.ntd;
      creditAmount = pkg.amount;
      label = pkg.label;
    } else if (customAmount && customAmount >= 100) {
      ntdAmount = customAmount;
      creditAmount = customAmount;
      label = `NT$${customAmount} 自訂點數`;
    } else {
      return NextResponse.json(
        { error: { message: "package_id or custom_amount (min 100) is required", type: "invalid_request" } },
        { status: 400 }
      );
    }

    const result = await createCheckoutSession({
      currency: "twd",
      productName: `N+Star API Credits — ${label}`,
      description: `${creditAmount} credits for N+Star AI API Gateway`,
      unitAmount: ntdAmount * 100,
      metadata: {
        tenantId: apiKey.tenantId,
        apiKeyId: apiKey.id,
        creditAmount: String(creditAmount),
        packageId: packageId || "custom",
      },
      successUrl: `${req.headers.get("origin") || "https://api.nplusstar.ai"}/credits/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${req.headers.get("origin") || "https://api.nplusstar.ai"}/credits/cancel`,
    });

    if ("error" in result) {
      return NextResponse.json(
        { error: { message: result.error, type: "stripe_error" } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      checkout_url: result.url,
      session_id: result.id,
      credits: creditAmount,
      amount_ntd: ntdAmount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : "Failed to create checkout session", type: "stripe_error" } },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    packages: CREDIT_PACKAGES.map((p) => ({
      id: p.id,
      credits: p.amount,
      price_ntd: p.ntd,
      label: p.label,
      discount: p.amount > p.ntd ? `${Math.round((1 - p.ntd / p.amount) * 100)}% off` : null,
    })),
    custom: {
      min_amount: 100,
      currency: "TWD",
    },
  });
}
