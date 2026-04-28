import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/auth";
import { getCreditTransactions } from "@/lib/stripe";

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req);
  if (!auth.valid) {
    return NextResponse.json(
      { error: { message: auth.error, type: "authentication_error" } },
      { status: 401 }
    );
  }

  const { apiKey } = auth;
  const transactions = await getCreditTransactions(apiKey.tenantId);

  return NextResponse.json({
    tenant_id: apiKey.tenantId,
    transactions,
    total: transactions.length,
  });
}
