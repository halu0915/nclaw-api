import { NextRequest, NextResponse } from "next/server";
import { authenticateCustomer } from "@/lib/customer-auth";
import { deleteEmployee } from "@/lib/employees";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const customerAuth = await authenticateCustomer();
  if (!customerAuth) {
    return NextResponse.json(
      { error: { message: "未登入", type: "unauthorized" } },
      { status: 401 }
    );
  }

  const { employeeId } = await params;

  try {
    const deleted = await deleteEmployee(employeeId, customerAuth.tenantId);
    if (!deleted) {
      return NextResponse.json(
        { error: { message: "員工不存在", type: "not_found" } },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[customer/employees] DELETE error:", err);
    return NextResponse.json(
      { error: { message: "無法刪除員工", type: "internal_error" } },
      { status: 500 }
    );
  }
}
