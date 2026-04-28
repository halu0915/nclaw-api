/**
 * Shared helper to authenticate customer portal requests.
 * Returns customer data + tenantId from cookie or NextAuth session.
 */

import { cookies } from "next/headers";
import {
  getCustomerByToken,
  getCustomerByEmail,
  getCustomerPublic,
  registerCustomer,
} from "@/lib/customers";
import { auth } from "@/lib/auth-config";
import { DEMO_TENANT_ID, ensureDemoTenant } from "@/lib/tenant";

import type { Customer } from "@/lib/customers";

export type CustomerPublic = ReturnType<typeof getCustomerPublic>;

export interface CustomerAuth {
  customer: CustomerPublic;
  tenantId: string;
}

function resolveTenantId(_customer: Customer): string {
  return DEMO_TENANT_ID;
}

export async function authenticateCustomer(): Promise<CustomerAuth | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("nclaw_token")?.value;

  if (token) {
    const customer = await getCustomerByToken(token);
    if (customer) {
      await ensureDemoTenant();
      return {
        customer: getCustomerPublic(customer),
        tenantId: resolveTenantId(customer),
      };
    }
  }

  const session = await auth();
  if (session?.user?.email) {
    let customer = await getCustomerByEmail(session.user.email);
    if (!customer) {
      const reg = await registerCustomer({
        email: session.user.email,
        password: "__google_oauth__" + Math.random().toString(36),
        companyName: session.user.name || "未設定",
        contactName: session.user.name || "用戶",
        phone: "",
      });
      if (!("error" in reg)) {
        customer = reg.customer;
      }
    }
    if (customer) {
      await ensureDemoTenant();
      return {
        customer: getCustomerPublic(customer),
        tenantId: resolveTenantId(customer),
      };
    }
  }

  return null;
}
