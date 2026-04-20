import { NextRequest, NextResponse } from "next/server";
import { getCustomerByToken, getCustomerPublic } from "@/lib/customers";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("nclaw_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const customer = getCustomerByToken(token);
  if (!customer) {
    return NextResponse.json({ error: "登入已過期" }, { status: 401 });
  }

  return NextResponse.json({ customer: getCustomerPublic(customer) });
}
