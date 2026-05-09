/**
 * Unified auth for customer-self-service endpoints.
 *
 * Two auth methods, tried in order:
 *   1. Customer cookie (`nclaw_token`) — primary path for browser / Electron after login.
 *   2. Bearer api_key — for desktop / CLI clients carrying a master key.
 *
 * Both must resolve to the SAME tenantId scope. All downstream queries must
 * filter by the returned `tenantId` to maintain cross-tenant isolation.
 */

import { NextRequest } from "next/server";
import { authenticateCustomer, type CustomerAuth } from "./customer-auth";
import { validateApiKey } from "./auth";

export interface ResolvedAuth {
  tenantId: string;
  source: "cookie" | "apiKey";
  customer?: CustomerAuth["customer"];
  apiKeyId?: string;
  plan: string;
}

export async function resolveCustomerOrKey(req: NextRequest): Promise<ResolvedAuth | null> {
  // 1) cookie first (cheaper — no Bearer header parse, single SQL query)
  const cookieAuth = await authenticateCustomer();
  if (cookieAuth) {
    return {
      tenantId: cookieAuth.tenantId,
      source: "cookie",
      customer: cookieAuth.customer,
      plan: cookieAuth.customer.plan,
    };
  }

  // 2) Bearer api_key fallback
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return null;

  const result = await validateApiKey(req);
  if (!result.valid) return null;

  return {
    tenantId: result.apiKey.tenantId,
    source: "apiKey",
    apiKeyId: result.apiKey.id,
    plan: result.apiKey.plan,
  };
}
