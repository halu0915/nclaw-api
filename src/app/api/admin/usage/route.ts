import { NextRequest, NextResponse } from "next/server";
import { getUsageSummary, getUsage } from "@/lib/usage";

const ADMIN_SECRET = process.env.ADMIN_SECRET || "nclaw-admin-2026";

function checkAdmin(req: NextRequest): boolean {
  const auth = req.headers.get("x-admin-secret");
  return auth === ADMIN_SECRET;
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

  const summary = getUsageSummary(tenantId);

  if (detail) {
    const records = getUsage({ tenantId, startDate, endDate });
    return NextResponse.json({ summary, records });
  }

  return NextResponse.json({ summary });
}
