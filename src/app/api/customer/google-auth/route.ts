/**
 * POST /api/customer/google-auth
 *
 * Body: { idToken: string }
 *
 * Receives a Google ID token from the Desktop OAuth flow, verifies it
 * against Google's tokeninfo endpoint, then:
 *   - Login if google_id already bound
 *   - Auto-bind google_id to existing email-based customer
 *   - Create new tenant + customer otherwise
 *
 * Returns the same shape as /register so the Pro app can reuse the same
 * persistence logic. For new customers we also include `ownerApiKey`
 * (plaintext, returned ONCE).
 */
import { NextRequest, NextResponse } from "next/server";
import { loginOrRegisterGoogle, getCustomerPublic } from "@/lib/customers";
import { createApiKey } from "@/lib/auth";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { idToken } = body as { idToken?: string };

  if (!idToken || typeof idToken !== "string") {
    return NextResponse.json(
      { error: "missing idToken" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const result = await loginOrRegisterGoogle(idToken);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  // For new customers, issue the owner master key (same as /register flow).
  // Returning customer skips issuance — they should already have one.
  let ownerApiKey: string | null = null;
  if (result.isNewCustomer && result.customer.tenantId) {
    try {
      const issued = await createApiKey(
        result.customer.tenantId,
        "Owner Master Key",
        "enterprise",
        { rateLimitRpm: 120 }
      );
      ownerApiKey = issued.rawKey;
    } catch (err) {
      console.error("[google-auth] owner key issue failed:", err);
    }
  }

  const res = NextResponse.json(
    {
      message: result.isNewCustomer ? "Google 註冊成功" : "Google 登入成功",
      customer: getCustomerPublic(result.customer),
      ownerApiKey,
      isNewCustomer: result.isNewCustomer,
    },
    { headers: CORS_HEADERS }
  );

  res.cookies.set("nclaw_token", result.token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 24 * 60 * 60,
    path: "/",
    domain: ".nplusstar.ai",
  });

  return res;
}
