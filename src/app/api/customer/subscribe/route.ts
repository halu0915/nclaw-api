import { NextRequest, NextResponse } from "next/server";
import { getCustomerByToken, updatePlan, getCustomerPublic } from "@/lib/customers";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("nclaw_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const customer = getCustomerByToken(token);
  if (!customer) {
    return NextResponse.json({ error: "登入已過期" }, { status: 401 });
  }

  const body = await req.json();
  const { plan } = body;

  if (!["free", "light", "standard", "pro", "enterprise"].includes(plan)) {
    return NextResponse.json({ error: "無效的方案" }, { status: 400 });
  }

  // MVP: 直接更新方案（正式版需串接綠界付款後才更新）
  const updated = updatePlan(customer.id, plan);
  if (!updated) {
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }

  return NextResponse.json({
    message: `已升級為${plan}方案`,
    customer: getCustomerPublic(updated),
  });
}
