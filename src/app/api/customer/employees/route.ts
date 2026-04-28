import { NextRequest, NextResponse } from "next/server";
import { authenticateCustomer } from "@/lib/customer-auth";
import { getEmployeesByTenant, createEmployee } from "@/lib/employees";

export async function GET() {
  const customerAuth = await authenticateCustomer();
  if (!customerAuth) {
    return NextResponse.json(
      { error: { message: "未登入", type: "unauthorized" } },
      { status: 401 }
    );
  }

  try {
    const employees = await getEmployeesByTenant(customerAuth.tenantId);
    return NextResponse.json({ employees });
  } catch (err) {
    console.error("[customer/employees] GET error:", err);
    return NextResponse.json(
      { error: { message: "無法取得員工列表", type: "internal_error" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const customerAuth = await authenticateCustomer();
  if (!customerAuth) {
    return NextResponse.json(
      { error: { message: "未登入", type: "unauthorized" } },
      { status: 401 }
    );
  }

  let body: { name?: string; email?: string; departmentId?: string; role?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid JSON body", type: "bad_request" } },
      { status: 400 }
    );
  }

  if (!body.name?.trim()) {
    return NextResponse.json(
      { error: { message: "name is required", type: "validation_error" } },
      { status: 400 }
    );
  }

  if (!body.departmentId) {
    return NextResponse.json(
      { error: { message: "departmentId is required", type: "validation_error" } },
      { status: 400 }
    );
  }

  try {
    const employee = await createEmployee(
      customerAuth.tenantId,
      body.departmentId,
      body.name.trim(),
      body.email?.trim() || null,
      body.role || "member"
    );
    return NextResponse.json({ employee }, { status: 201 });
  } catch (err) {
    console.error("[customer/employees] POST error:", err);
    return NextResponse.json(
      { error: { message: "無法建立員工", type: "internal_error" } },
      { status: 500 }
    );
  }
}
