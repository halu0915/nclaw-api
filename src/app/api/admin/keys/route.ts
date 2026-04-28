import { NextRequest, NextResponse } from "next/server";
import { getKeysByTenant, createApiKey } from "@/lib/auth";
import { query } from "@/lib/db";
import { ensureDemoTenant, DEMO_TENANT_ID } from "@/lib/tenant";

function checkAdmin(req: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    console.error("[admin] ADMIN_SECRET env not set — admin endpoint disabled");
    return false;
  }
  const auth = req.headers.get("x-admin-secret");
  return auth === adminSecret;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = req.nextUrl.searchParams.get("tenantId");

  if (tenantId) {
    const keys = await getKeysByTenant(tenantId);
    return NextResponse.json({ keys });
  }

  const result = await query(
    `SELECT id, tenant_id, key_prefix, name, plan, rate_limit_rpm, allowed_models, enabled, created_at
     FROM api_keys ORDER BY created_at DESC`
  );

  return NextResponse.json({
    keys: result.rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      keyPrefix: r.key_prefix,
      name: r.name,
      plan: r.plan,
      rateLimitRpm: Number(r.rate_limit_rpm),
      allowedModels: r.allowed_models,
      enabled: r.enabled,
      createdAt: r.created_at,
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const name = body.name || "Unnamed Key";
  const plan = body.plan || "enterprise";
  const rpm = body.rateLimitRpm || 500;
  const tenantId = body.tenantId || DEMO_TENANT_ID;

  await ensureDemoTenant();

  const result = await createApiKey(tenantId, name, plan, {
    rateLimitRpm: rpm,
    allowedModels: body.allowedModels || null,
  });

  return NextResponse.json({
    rawKey: result.rawKey,
    keyPrefix: result.rawKey.slice(0, 12),
    plan,
    rateLimitRpm: rpm,
  }, { status: 201 });
}
