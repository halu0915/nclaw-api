import { NextRequest, NextResponse } from "next/server";
import { resolveCustomerOrKey } from "@/lib/customer-or-key-auth";
import { getKeysByTenant, createApiKey, type ApiKey } from "@/lib/auth";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * GET /api/customer/keys — list api keys for caller's tenant.
 * Auth: cookie OR api_key. Never returns key_hash or rawKey.
 */
export async function GET(req: NextRequest) {
  const auth = await resolveCustomerOrKey(req);
  if (!auth) {
    return NextResponse.json(
      { error: { message: "未登入", type: "unauthorized" } },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  try {
    const keys = await getKeysByTenant(auth.tenantId);
    return NextResponse.json({ keys }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("[customer/keys] GET error:", err);
    return NextResponse.json(
      { error: { message: "無法取得 API 金鑰列表", type: "internal_error" } },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

/**
 * POST /api/customer/keys — issue a new api_key.
 * Body: { name, departmentId?, plan?, rateLimitRpm?, allowedModels? }
 * Returns rawKey ONCE; never again.
 */
export async function POST(req: NextRequest) {
  const auth = await resolveCustomerOrKey(req);
  if (!auth) {
    return NextResponse.json(
      { error: { message: "未登入", type: "unauthorized" } },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  let body: {
    name?: string;
    allowedModels?: string[];
    rateLimitRpm?: number;
    departmentId?: string;
    plan?: ApiKey["plan"];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid JSON body", type: "bad_request" } },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
    return NextResponse.json(
      { error: { message: "name is required", type: "validation_error" } },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const ALLOWED_PLANS: ApiKey["plan"][] = ["free", "developer", "light", "standard", "pro", "enterprise"];
  const planFromBody = body.plan && ALLOWED_PLANS.includes(body.plan) ? body.plan : null;
  const plan = planFromBody ?? (auth.plan as ApiKey["plan"]);

  try {
    const result = await createApiKey(auth.tenantId, body.name.trim(), plan, {
      departmentId: body.departmentId,
      rateLimitRpm: body.rateLimitRpm,
      allowedModels: body.allowedModels,
    });
    return NextResponse.json(
      { apiKey: result.apiKey, rawKey: result.rawKey },
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("[customer/keys] POST error:", err);
    return NextResponse.json(
      { error: { message: "無法建立 API 金鑰", type: "internal_error" } },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
