import { NextRequest, NextResponse } from "next/server";
import { getCustomerByToken, getCustomerByEmail, getCustomerPublic, registerCustomer } from "@/lib/customers";
import { auth } from "@/lib/auth-config";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("nclaw_token")?.value;
  if (token) {
    const customer = await getCustomerByToken(token);
    if (customer) {
      return NextResponse.json({ customer: getCustomerPublic(customer) });
    }
  }

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
      if (!("error" in reg)) {
        customer = reg.customer;
      }
    }
    if (customer) {
      return NextResponse.json({ customer: getCustomerPublic(customer) });
    }
  }

  return NextResponse.json({ error: "未登入" }, { status: 401 });
}
