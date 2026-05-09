import { NextRequest, NextResponse } from "next/server";
import { resolveCustomerOrKey } from "@/lib/customer-or-key-auth";
import { getDepartments, createDepartment } from "@/lib/departments";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** GET /api/customer/departments — list departments for caller's tenant. */
export async function GET(req: NextRequest) {
  const auth = await resolveCustomerOrKey(req);
  if (!auth) {
    return NextResponse.json(
      { error: { message: "未登入", type: "unauthorized" } },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  try {
    const departments = await getDepartments(auth.tenantId);
    return NextResponse.json({ departments }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("[customer/departments] GET error:", err);
    return NextResponse.json(
      { error: { message: "無法取得部門列表", type: "internal_error" } },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

/**
 * POST /api/customer/departments
 * Body: { name, monthlyQuotaTokens?, parentId? }
 *   parentId is accepted but currently ignored (schema gap — no parent_id column).
 *   monthlyQuotaTokens defaults to 0 (unlimited) when omitted.
 */
export async function POST(req: NextRequest) {
  const auth = await resolveCustomerOrKey(req);
  if (!auth) {
    return NextResponse.json(
      { error: { message: "未登入", type: "unauthorized" } },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  let body: { name?: string; monthlyQuotaTokens?: number; parentId?: string };
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

  const quota = typeof body.monthlyQuotaTokens === "number" ? body.monthlyQuotaTokens : 0;

  try {
    const department = await createDepartment(auth.tenantId, body.name.trim(), quota);
    return NextResponse.json(
      { department },
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("[customer/departments] POST error:", err);
    return NextResponse.json(
      { error: { message: "無法建立部門", type: "internal_error" } },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
