import { NextRequest, NextResponse } from "next/server";
import { authenticateCustomer } from "@/lib/customer-auth";
import { getUsage } from "@/lib/usage";

/**
 * GET /api/customer/usage
 * Returns usage records for the authenticated customer's tenant.
 * Query params: ?model=&startDate=&endDate=&limit=&offset=
 */
export async function GET(req: NextRequest) {
  const customerAuth = await authenticateCustomer();
  if (!customerAuth) {
    return NextResponse.json(
      { error: { message: "未登入", type: "unauthorized" } },
      { status: 401 }
    );
  }

  const { searchParams } = req.nextUrl;

  const model = searchParams.get("model") || undefined;
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");

  const limit = limitParam ? parseInt(limitParam, 10) : undefined;
  const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;

  try {
    const records = await getUsage({
      tenantId: customerAuth.tenantId,
      model,
      startDate,
      endDate,
      limit: Number.isNaN(limit) ? undefined : limit,
      offset: Number.isNaN(offset) ? undefined : offset,
    });

    return NextResponse.json({ usage: records, total: records.length });
  } catch (err) {
    console.error("[customer/usage] GET error:", err);
    return NextResponse.json(
      { error: { message: "無法取得用量資料", type: "internal_error" } },
      { status: 500 }
    );
  }
}
