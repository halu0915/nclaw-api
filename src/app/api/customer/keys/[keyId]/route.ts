import { NextRequest, NextResponse } from "next/server";
import { authenticateCustomer } from "@/lib/customer-auth";
import { revokeApiKey, getKeysByTenant } from "@/lib/auth";

/**
 * DELETE /api/customer/keys/[keyId]
 * Revokes (disables) an API key belonging to the customer's tenant.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  const customerAuth = await authenticateCustomer();
  if (!customerAuth) {
    return NextResponse.json(
      { error: { message: "未登入", type: "unauthorized" } },
      { status: 401 }
    );
  }

  const { keyId } = await params;

  if (!keyId) {
    return NextResponse.json(
      { error: { message: "keyId is required", type: "validation_error" } },
      { status: 400 }
    );
  }

  try {
    // Verify the key belongs to this tenant before revoking
    const keys = await getKeysByTenant(customerAuth.tenantId);
    const keyBelongsToTenant = keys.some((k) => k.id === keyId);

    if (!keyBelongsToTenant) {
      return NextResponse.json(
        { error: { message: "找不到此 API 金鑰", type: "not_found" } },
        { status: 404 }
      );
    }

    await revokeApiKey(keyId);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[customer/keys/revoke] DELETE error:", err);
    return NextResponse.json(
      { error: { message: "無法撤銷 API 金鑰", type: "internal_error" } },
      { status: 500 }
    );
  }
}
