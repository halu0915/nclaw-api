import { NextRequest, NextResponse } from "next/server";
import { deductDesignCreditAtomic } from "@/lib/customers";

function checkAdmin(req: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) return false;
  return req.headers.get("x-admin-secret") === adminSecret;
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const customerId: string | undefined = body?.customerId;
  if (!customerId) {
    return NextResponse.json({ error: "customerId required" }, { status: 400 });
  }
  const result = await deductDesignCreditAtomic(customerId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 402 });
  }
  return NextResponse.json({ customerId, designCredits: result.designCredits });
}
