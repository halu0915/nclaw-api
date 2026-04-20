import { NextRequest, NextResponse } from "next/server";
import { loginCustomer, getCustomerPublic } from "@/lib/customers";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "請輸入 Email 和密碼" }, { status: 400 });
  }

  const result = loginCustomer(email, password);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  const res = NextResponse.json({
    message: "登入成功",
    customer: getCustomerPublic(result.customer),
  });

  res.cookies.set("nclaw_token", result.token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  return res;
}
