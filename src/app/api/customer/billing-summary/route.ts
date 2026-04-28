import { NextRequest, NextResponse } from "next/server";
import { authenticateCustomer } from "@/lib/customer-auth";
import { getMonthlyBilling } from "@/lib/usage";

/**
 * GET /api/customer/billing-summary
 * Returns a monthly billing summary for the authenticated customer's tenant.
 * Query params: ?year=&month=
 * Defaults to the current year/month when omitted.
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
  const now = new Date();

  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");

  const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
  const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;

  if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json(
      { error: { message: "Invalid year or month", type: "validation_error" } },
      { status: 400 }
    );
  }

  try {
    const summary = await getMonthlyBilling(customerAuth.tenantId, year, month);
    return NextResponse.json({ summary });
  } catch (err) {
    console.error("[customer/billing-summary] GET error:", err);
    return NextResponse.json(
      { error: { message: "無法取得帳單摘要", type: "internal_error" } },
      { status: 500 }
    );
  }
}
