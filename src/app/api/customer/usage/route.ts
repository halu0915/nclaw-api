import { NextRequest, NextResponse } from "next/server";
import { resolveCustomerOrKey } from "@/lib/customer-or-key-auth";
import { getUsage, type UsageRecord } from "@/lib/usage";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

type GroupKey = "department" | "apiKey" | "model";

interface AggregateBucket {
  key: string;
  requests: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  billedNtd: number;
}

function pickKey(r: UsageRecord, group: GroupKey): string {
  if (group === "department") return r.departmentId ?? "(unassigned)";
  if (group === "apiKey") return r.apiKeyId;
  return r.model;
}

function aggregate(records: UsageRecord[], group: GroupKey): AggregateBucket[] {
  const map = new Map<string, AggregateBucket>();
  for (const r of records) {
    const key = pickKey(r, group);
    let b = map.get(key);
    if (!b) {
      b = { key, requests: 0, totalTokens: 0, inputTokens: 0, outputTokens: 0, costUsd: 0, billedNtd: 0 };
      map.set(key, b);
    }
    b.requests++;
    b.totalTokens += r.totalTokens;
    b.inputTokens += r.inputTokens;
    b.outputTokens += r.outputTokens;
    b.costUsd += r.costUsd;
    b.billedNtd += r.billedNtd;
  }
  return Array.from(map.values()).sort((a, b) => b.totalTokens - a.totalTokens);
}

/**
 * GET /api/customer/usage
 *   ?start=YYYY-MM-DD&end=YYYY-MM-DD&groupBy=department|apiKey|model&model=&limit=&offset=
 * Without groupBy: returns raw records.
 * With groupBy: returns aggregated buckets.
 */
export async function GET(req: NextRequest) {
  const auth = await resolveCustomerOrKey(req);
  if (!auth) {
    return NextResponse.json(
      { error: { message: "未登入", type: "unauthorized" } },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  const sp = req.nextUrl.searchParams;
  const start = sp.get("start") || sp.get("startDate") || undefined;
  const end = sp.get("end") || sp.get("endDate") || undefined;
  const model = sp.get("model") || undefined;
  const groupBy = sp.get("groupBy") as GroupKey | null;

  const limitParam = sp.get("limit");
  const offsetParam = sp.get("offset");
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;
  const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;

  // Normalize YYYY-MM-DD → ISO range so endpoints behave intuitively.
  const startDate = start && /^\d{4}-\d{2}-\d{2}$/.test(start) ? `${start}T00:00:00.000Z` : start;
  const endDate = end && /^\d{4}-\d{2}-\d{2}$/.test(end) ? `${end}T23:59:59.999Z` : end;

  try {
    const records = await getUsage({
      tenantId: auth.tenantId,
      model,
      startDate,
      endDate,
      limit: groupBy ? 10000 : Number.isNaN(limit ?? NaN) ? undefined : limit,
      offset: groupBy ? 0 : Number.isNaN(offset ?? NaN) ? undefined : offset,
    });

    if (groupBy && (groupBy === "department" || groupBy === "apiKey" || groupBy === "model")) {
      const groups = aggregate(records, groupBy);
      return NextResponse.json(
        { groupBy, groups, totalRecords: records.length },
        { headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      { usage: records, total: records.length },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("[customer/usage] GET error:", err);
    return NextResponse.json(
      { error: { message: "無法取得用量資料", type: "internal_error" } },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
