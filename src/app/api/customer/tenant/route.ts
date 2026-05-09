import { NextRequest, NextResponse } from "next/server";
import { resolveCustomerOrKey } from "@/lib/customer-or-key-auth";
import { query } from "@/lib/db";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

interface TenantRow {
  id: string;
  name: string;
  plan: string;
  status: string;
  monthly_budget_ntd: string | number | null;
  created_at: string;
}

/**
 * GET /api/customer/tenant — return caller's tenant info.
 * Falls back to a synthesized record from customer cookie if tenants row missing.
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
    const result = await query<TenantRow>(
      `SELECT id, name, plan, status, monthly_budget_ntd, created_at
       FROM tenants WHERE id = $1`,
      [auth.tenantId]
    );

    if (result.rows.length > 0) {
      const r = result.rows[0];
      return NextResponse.json(
        {
          tenant: {
            id: r.id,
            name: r.name,
            plan: r.plan,
            status: r.status,
            monthlyBudgetNtd: r.monthly_budget_ntd != null ? Number(r.monthly_budget_ntd) : 0,
            createdAt: r.created_at,
          },
          authSource: auth.source,
        },
        { headers: CORS_HEADERS }
      );
    }

    // No tenants row — derive minimal info from customer (cookie path) or apiKey (key path)
    return NextResponse.json(
      {
        tenant: {
          id: auth.tenantId,
          name: auth.customer?.companyName || "(unknown)",
          plan: auth.plan,
          status: "active",
          monthlyBudgetNtd: 0,
          createdAt: null,
        },
        authSource: auth.source,
      },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("[customer/tenant] GET error:", err);
    return NextResponse.json(
      { error: { message: "無法取得 tenant 資訊", type: "internal_error" } },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
