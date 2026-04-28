import { NextRequest, NextResponse } from "next/server";
import { authenticateCustomer } from "@/lib/customer-auth";
import { getDepartments, createDepartment } from "@/lib/departments";

/**
 * GET /api/customer/departments
 * Returns all departments for the authenticated customer's tenant.
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
    const departments = await getDepartments(customerAuth.tenantId);
    return NextResponse.json({ departments });
  } catch (err) {
    console.error("[customer/departments] GET error:", err);
    return NextResponse.json(
      { error: { message: "無法取得部門列表", type: "internal_error" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customer/departments
 * Creates a new department for the customer's tenant.
 * Body: { name, monthlyQuotaTokens }
 */
export async function POST(req: NextRequest) {
  const customerAuth = await authenticateCustomer();
  if (!customerAuth) {
    return NextResponse.json(
      { error: { message: "未登入", type: "unauthorized" } },
      { status: 401 }
    );
  }

  let body: { name?: string; monthlyQuotaTokens?: number };

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

  if (body.monthlyQuotaTokens == null || typeof body.monthlyQuotaTokens !== "number") {
    return NextResponse.json(
      { error: { message: "monthlyQuotaTokens is required and must be a number", type: "validation_error" } },
      { status: 400 }
    );
  }

  try {
    const department = await createDepartment(
      customerAuth.tenantId,
      body.name.trim(),
      body.monthlyQuotaTokens
    );
    return NextResponse.json({ department }, { status: 201 });
  } catch (err) {
    console.error("[customer/departments] POST error:", err);
    return NextResponse.json(
      { error: { message: "無法建立部門", type: "internal_error" } },
      { status: 500 }
    );
  }
}
