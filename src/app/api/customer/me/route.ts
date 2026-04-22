import { NextRequest, NextResponse } from "next/server";
import { getCustomerByToken, getCustomerPublic, registerCustomer, loginCustomer } from "@/lib/customers";
import { auth } from "@/lib/auth-config";

export async function GET(req: NextRequest) {
  // Method 1: Check our custom token
  const token = req.cookies.get("nclaw_token")?.value;
  if (token) {
    const customer = getCustomerByToken(token);
    if (customer) {
      return NextResponse.json({ customer: getCustomerPublic(customer) });
    }
  }

  // Method 2: Check next-auth session (Google login)
  const session = await auth();
  if (session?.user?.email) {
    // Find or create customer from Google session
    const login = loginCustomer(session.user.email, "__google_oauth__");
    if ("error" in login && login.error === "帳號不存在") {
      // Auto-register Google user
      const reg = registerCustomer({
        email: session.user.email,
        password: "__google_oauth__" + Math.random().toString(36),
        companyName: session.user.name || "未設定",
        contactName: session.user.name || "用戶",
        phone: "",
      });
      if (!("error" in reg)) {
        return NextResponse.json({ customer: getCustomerPublic(reg.customer) });
      }
    } else if (!("error" in login)) {
      return NextResponse.json({ customer: getCustomerPublic(login.customer) });
    }
  }

  return NextResponse.json({ error: "未登入" }, { status: 401 });
}
