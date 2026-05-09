import { NextRequest, NextResponse } from "next/server";
import { registerCustomer, getCustomerPublic } from "@/lib/customers";
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
  const { email, password, companyName, contactName, phone } = body;

  if (!email || !password || !companyName || !contactName) {
    return NextResponse.json(
      { error: "請填寫所有必填欄位" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "密碼至少 6 碼" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const result = await registerCustomer({
    email,
    password,
    companyName,
    contactName,
    phone: phone || "",
  });

  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: 409, headers: CORS_HEADERS }
    );
  }

  // Issue initial "owner" api_key for this fresh tenant — returned ONCE.
  let ownerApiKey: string | null = null;
  try {
    const tenantId = result.customer.tenantId;
    if (tenantId) {
      const issued = await createApiKey(tenantId, "Owner Master Key", "enterprise", {
        rateLimitRpm: 120,
      });
      ownerApiKey = issued.rawKey;
    }
  } catch (err) {
    // Non-fatal: customer is registered; owner key can be created later via /keys
    console.error("[customer/register] owner key issue failed:", err);
  }

  const res = NextResponse.json(
    {
      message: "註冊成功",
      customer: getCustomerPublic(result.customer),
      ownerApiKey, // plaintext; user must save it now — never returned again
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
