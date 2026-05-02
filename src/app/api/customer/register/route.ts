import { NextRequest, NextResponse } from "next/server";
import { registerCustomer, getCustomerPublic } from "@/lib/customers";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password, companyName, contactName, phone } = body;

  if (!email || !password || !companyName || !contactName) {
    return NextResponse.json({ error: "請填寫所有必填欄位" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "密碼至少 6 碼" }, { status: 400 });
  }

  const result = await registerCustomer({ email, password, companyName, contactName, phone: phone || "" });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  const res = NextResponse.json({
    message: "註冊成功",
    customer: getCustomerPublic(result.customer),
  });

  res.cookies.set("nclaw_token", result.token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 24 * 60 * 60,
    path: "/",
  });

  return res;
}
