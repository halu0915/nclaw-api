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

  const updated = await updatePlan(customerId, plan);
  if (!updated) {
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }

  return NextResponse.json({
    message: `已升級為${plan}方案`,
    customer: getCustomerPublic(updated),
  });
}
