import { NextRequest, NextResponse } from "next/server";
import { getCustomerByToken, getCustomerByEmail, updatePlan, getCustomerPublic, registerCustomer } from "@/lib/customers";
import { auth } from "@/lib/auth-config";

export async function POST(req: NextRequest) {
  let customerId: string | null = null;

  const token = req.cookies.get("nclaw_token")?.value;
  if (token) {
    const customer = await getCustomerByToken(token);
    if (customer) customerId = customer.id;
  }

  if (!customerId) {
    const session = await auth();
    if (session?.user?.email) {
      let customer = await getCustomerByEmail(session.user.email);
      if (!customer) {
        const reg = await registerCustomer({
          email: session.user.email,
          password: "__google_oauth__" + Math.random().toString(36),
          companyName: session.user.name || "未設定",
          contactName: session.user.name || "用戶",
          phone: "",
        });
        if (!("error" in reg)) customer = reg.customer;
      }
      if (customer) customerId = customer.id;
    }
  }

  if (!customerId) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const body = await req.json();
  const { plan } = body;

  if (!["free", "light", "standard", "pro", "enterprise"].includes(plan)) {
    return NextResponse.json({ error: "無效的方案" }, { status: 400 });
  }

  // P1 #4: 客戶只能 downgrade 到 free。付費方案必須走 Stripe Checkout（webhook 觸發 updatePlan）。
  // 原本任何客戶都能直接 POST {plan: "enterprise"} → updatePlan，等於免費升級到 enterprise。
  if (plan !== "free") {
    return NextResponse.json(
      {
        error: "付費方案必須透過結帳完成。請從方案頁建立 Stripe Checkout Session。",
        code: "payment_required",
        suggested_endpoint: "/api/v1/credits/purchase 或方案結帳頁",
      },
      { status: 402 }
    );
  }

  const updated = await updatePlan(customerId, "free");
  if (!updated) {
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }

  return NextResponse.json({
    message: "已切回免費方案",
    customer: getCustomerPublic(updated),
  });
}
