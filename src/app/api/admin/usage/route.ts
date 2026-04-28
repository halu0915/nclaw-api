import { NextRequest, NextResponse } from "next/server";
import { getUsageSummary, getUsage } from "@/lib/usage";

function checkAdmin(req: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    console.error("[admin] ADMIN_SECRET env not set — admin endpoint disabled");
    return false;
  }
  const auth = req.headers.get("x-admin-secret");
  return auth === adminSecret;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get("tenantId") || undefined;
  const startDate = searchParams.get("start") || undefined;
  const endDate = searchParams.get("end") || undefined;
  const detail = searchParams.get("detail") === "true";

  const summary = await getUsageSummary(tenantId);

  if (detail) {
    const records = await getUsage({ tenantId, startDate, endDate });
    return NextResponse.json({ summary, records });
  }

  return NextResponse.json({ summary });
}
