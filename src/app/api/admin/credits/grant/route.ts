import { NextRequest, NextResponse } from "next/server";
import { adjustDesignCredits } from "@/lib/customers";

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
  const delta: number = Number(body?.delta);

  if (!customerId || !Number.isFinite(delta) || delta === 0) {
    return NextResponse.json(
      { error: "customerId 和非零 delta（整數）必填" },
      { status: 400 }
    );
  }

  const result = await adjustDesignCredits(customerId, Math.trunc(delta));
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    customerId,
    delta: Math.trunc(delta),
    designCredits: result.designCredits,
  });
}
