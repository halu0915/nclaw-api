import { NextRequest, NextResponse } from "next/server";
import { getCustomerByToken, updatePlan, getCustomerPublic, registerCustomer, loginCustomer } from "@/lib/customers";

export async function POST(req: NextRequest) {
  let customerId: string | null = null;

  // Method 1: Check custom token
  const token = req.cookies.get("nclaw_token")?.value;
  if (token) {
    const customer = getCustomerByToken(token);
    if (customer) customerId = customer.id;
  }

  // Method 2: Check next-auth session via session endpoint
  if (!customerId) {
    try {
      const sessionRes = await fetch(new URL("/api/auth/session", req.url).toString(), {
        headers: { cookie: req.headers.get("cookie") || "" },
      });
      const session = await sessionRes.json();
      if (session?.user?.email) {
        const login = loginCustomer(session.user.email, "__google_oauth__");
        if ("error" in login) {
          const reg = registerCustomer({
            email: session.user.email,
            password: "__google_oauth__",
            companyName: session.user.name || "未設定",
            contactName: session.user.name || "用戶",
            phone: "",
          });
          if (!("error" in reg)) customerId = reg.customer.id;
        } else {
          customerId = login.customer.id;
        }
      }
    } catch {}
  }

  if (!customerId) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const body = await req.json();
  const { plan } = body;

  if (!["free", "light", "standard", "pro", "enterprise"].includes(plan)) {
    return NextResponse.json({ error: "無效的方案" }, { status: 400 });
  }

  const updated = updatePlan(customerId, plan);
  if (!updated) {
    return NextResponse.json({ error: "更新失敗" }, { status: 500 });
  }

  return NextResponse.json({
    message: `已升級為${plan}方案`,
    customer: getCustomerPublic(updated),
  });
}
