import { NextRequest, NextResponse } from "next/server";
import { authenticateCustomer } from "@/lib/customer-auth";
import { getKeysByTenant, createApiKey } from "@/lib/auth";

/**
 * GET /api/customer/keys
 * Returns all API keys for the authenticated customer's tenant.
 * The raw key is never returned — only the prefix is visible.
 */
export async function GET() {
  const customerAuth = await authenticateCustomer();
  if (!customerAuth) {
    return NextResponse.json(
      { error: { message: "未登入", type: "unauthorized" } },
      { status: 401 }
    );
  }

  try {
    const keys = await getKeysByTenant(customerAuth.tenantId);
    return NextResponse.json({ keys });
  } catch (err) {
    console.error("[customer/keys] GET error:", err);
    return NextResponse.json(
      { error: { message: "無法取得 API 金鑰列表", type: "internal_error" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customer/keys
 * Creates a new API key for the customer's tenant.
 * Body: { name, allowedModels?, rateLimitRpm?, departmentId? }
 * Returns the raw key ONLY on creation (one-time display).
 */
export async function POST(req: NextRequest) {
  const customerAuth = await authenticateCustomer();
  if (!customerAuth) {
    return NextResponse.json(
      { error: { message: "未登入", type: "unauthorized" } },
      { status: 401 }
    );
  }

  let body: {
    name?: string;
    allowedModels?: string[];
    rateLimitRpm?: number;
    departmentId?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid JSON body", type: "bad_request" } },
      { status: 400 }
    );
  }

  if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
    return NextResponse.json(
      { error: { message: "name is required", type: "validation_error" } },
      { status: 400 }
    );
  }

  try {
    const plan = customerAuth.customer.plan as
      | "free"
      | "developer"
      | "light"
      | "standard"
      | "pro"
      | "enterprise";

    const result = await createApiKey(customerAuth.tenantId, body.name.trim(), plan, {
      departmentId: body.departmentId,
      rateLimitRpm: body.rateLimitRpm,
      allowedModels: body.allowedModels,
    });

    return NextResponse.json(
      {
        apiKey: result.apiKey,
        rawKey: result.rawKey, // one-time display
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[customer/keys] POST error:", err);
    return NextResponse.json(
      { error: { message: "無法建立 API 金鑰", type: "internal_error" } },
      { status: 500 }
    );
  }
}
