import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

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

  const result = await query(
    `SELECT id, tenant_id, email, company_name, contact_name, phone, plan, status, token_quota, tokens_used, created_at
     FROM customers ORDER BY created_at DESC`
  );

  return NextResponse.json({
    customers: result.rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      email: r.email,
      companyName: r.company_name,
      contactName: r.contact_name,
      phone: r.phone,
      plan: r.plan,
      status: r.status,
      tokenQuota: Number(r.token_quota),
      tokensUsed: Number(r.tokens_used),
      createdAt: r.created_at,
    })),
  });
}
