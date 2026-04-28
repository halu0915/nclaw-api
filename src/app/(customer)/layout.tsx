"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

interface CustomerCtx {
  id: string;
  email: string;
  companyName: string;
  contactName: string;
  plan: string;
  apiKey: string;
  status: string;
  tokenQuota: number;
  tokensUsed: number;
  tenantId: string;
}

const CustomerContext = createContext<CustomerCtx | null>(null);
export function useCustomer() {
  return useContext(CustomerContext);
}

const PUBLIC_PATHS = ["/login", "/register"];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [customer, setCustomer] = useState<CustomerCtx | null>(null);
  const [loading, setLoading] = useState(true);
  const isPublicPage = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (isPublicPage) {
      setLoading(false);
      return;
    }
    fetch("/api/customer/me")
      .then((res) => {
        if (!res.ok) throw new Error("未登入");
        return res.json();
      })
      .then((data) => {
        const c = data.customer;
        setCustomer({
          ...c,
          tenantId: c.tenantId || "a0000000-0000-4000-8000-000000000001",
        });
      })
      .catch(async () => {
        try {
          const sessionRes = await fetch("/api/auth/session");
          const session = await sessionRes.json();
          if (session?.user?.email) {
            setCustomer({
              id: "google-user",
              email: session.user.email,
              companyName: session.user.name || "Google 用戶",
              contactName: session.user.name || "用戶",
              plan: "free",
              apiKey: "",
              status: "trial",
              tokenQuota: 100000,
              tokensUsed: 0,
              tenantId: "a0000000-0000-4000-8000-000000000001",
            });
            return;
          }
        } catch {}
        router.push("/login");
      })
      .finally(() => setLoading(false));
  }, [router, isPublicPage]);

  const logout = async () => {
    document.cookie = "nclaw_token=; path=/; max-age=0";
    try {
      const csrfRes = await fetch("/api/auth/csrf");
      const { csrfToken } = await csrfRes.json();
      await fetch("/api/auth/signout", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `csrfToken=${csrfToken}`,
      });
    } catch {}
    document.cookie.split(";").forEach((c) => {
      const name = c.trim().split("=")[0];
      if (name.includes("authjs") || name.includes("next-auth")) {
        document.cookie = `${name}=; path=/; max-age=0; secure`;
      }
    });
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-gray-400">載入中...</div>
      </div>
    );
  }

  if (isPublicPage) {
    return <>{children}</>;
  }

  if (!customer) return null;

  return (
    <CustomerContext value={customer}>
      <div className="min-h-screen bg-gray-950 text-white flex">
        <Sidebar companyName={customer.companyName} onLogout={logout} />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 lg:px-6 pt-16 lg:pt-8 pb-8">
            {children}
          </div>
        </main>
      </div>
    </CustomerContext>
  );
}
