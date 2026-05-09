import { NextRequest, NextResponse } from "next/server";
import { resolveCustomerOrKey } from "@/lib/customer-or-key-auth";
import { revokeApiKey, getKeysByTenant } from "@/lib/auth";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * DELETE /api/customer/keys/[keyId] — revoke (disable) an api_key.
 * Verifies the key belongs to caller's tenant before disabling.
 * Does NOT delete the row (usage_logs FK references it).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  const auth = await resolveCustomerOrKey(req);
  if (!auth) {
    return NextResponse.json(
      { error: { message: "未登入", type: "unauthorized" } },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  const { keyId } = await params;
  if (!keyId) {
    return NextResponse.json(
      { error: { message: "keyId is required", type: "validation_error" } },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  try {
    const keys = await getKeysByTenant(auth.tenantId);
    if (!keys.some((k) => k.id === keyId)) {
      return NextResponse.json(
        { error: { message: "找不到此 API 金鑰", type: "not_found" } },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    await revokeApiKey(keyId);
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("[customer/keys/revoke] DELETE error:", err);
    return NextResponse.json(
      { error: { message: "無法撤銷 API 金鑰", type: "internal_error" } },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
