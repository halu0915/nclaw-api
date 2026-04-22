"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface CustomerData {
  id: string;
  email: string;
  companyName: string;
  contactName: string;
  plan: string;
  apiKey: string;
  status: string;
  tokenQuota: number;
  tokensUsed: number;
  createdAt: string;
  trialEndsAt: string;
  planPrice: number;
}

const PLAN_LABELS: Record<string, string> = {
  free: "免費試用",
  light: "輕量版",
  standard: "標準版",
  pro: "專業版",
  enterprise: "企業版",
};

export default function DashboardPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Try our customer API first, then fall back to next-auth session
    fetch("/api/customer/me")
      .then((res) => {
        if (!res.ok) throw new Error("未登入");
        return res.json();
      })
      .then((data) => setCustomer(data.customer))
      .catch(async () => {
        // Check next-auth session
        try {
          const sessionRes = await fetch("/api/auth/session");
          const session = await sessionRes.json();
          if (session?.user?.email) {
            // Show Google session data as customer
            setCustomer({
              id: "google-user",
              email: session.user.email,
              companyName: session.user.name || "Google 用戶",
              contactName: session.user.name || "用戶",
              plan: "free",
              apiKey: "nplus_sk_google_login_pending_setup",
              status: "trial",
              tokenQuota: 100000,
              tokensUsed: 0,
              createdAt: new Date().toISOString(),
              trialEndsAt: new Date(Date.now() + 14 * 86400000).toISOString(),
              planPrice: 0,
            });
            return;
          }
        } catch {}
        router.push("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const copyKey = () => {
    if (customer) {
      navigator.clipboard.writeText(customer.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const logout = async () => {
    document.cookie = "nclaw_token=; path=/; max-age=0";
    // Sign out from next-auth with CSRF token
    try {
      const csrfRes = await fetch("/api/auth/csrf");
      const { csrfToken } = await csrfRes.json();
      await fetch("/api/auth/signout", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `csrfToken=${csrfToken}`,
      });
    } catch {}
    // Clear all auth cookies manually
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

  if (!customer) return null;

  const usagePercent = customer.tokenQuota > 0 ? (customer.tokensUsed / customer.tokenQuota) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">N+</div>
            </a>
            <span className="font-semibold">客戶後台</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{customer.companyName}</span>
            <button onClick={logout} className="text-sm text-gray-500 hover:text-white transition-colors">登出</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">歡迎，{customer.contactName}</h1>
          <p className="text-gray-400 mt-1">{customer.companyName}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-sm text-gray-400 mb-1">目前方案</div>
            <div className="text-xl font-bold">{PLAN_LABELS[customer.plan]}</div>
            {customer.planPrice > 0 && (
              <div className="text-sm text-gray-500 mt-1">NT${customer.planPrice.toLocaleString()}/月</div>
            )}
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-sm text-gray-400 mb-1">帳號狀態</div>
            <div className={`text-xl font-bold ${customer.status === "active" ? "text-green-400" : customer.status === "trial" ? "text-yellow-400" : "text-red-400"}`}>
              {customer.status === "active" ? "使用中" : customer.status === "trial" ? "試用中" : "已暫停"}
            </div>
            {customer.status === "trial" && (
              <div className="text-sm text-gray-500 mt-1">到期：{new Date(customer.trialEndsAt).toLocaleDateString("zh-TW")}</div>
            )}
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-sm text-gray-400 mb-1">已用 Token</div>
            <div className="text-xl font-bold">{(customer.tokensUsed / 1000).toFixed(0)}K</div>
            <div className="text-sm text-gray-500 mt-1">/ {(customer.tokenQuota / 1_000_000).toFixed(0)}M 額度</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-sm text-gray-400 mb-1">使用率</div>
            <div className="text-xl font-bold">{usagePercent.toFixed(1)}%</div>
            <div className="w-full bg-gray-800 rounded-full h-2 mt-2">
              <div className={`h-2 rounded-full ${usagePercent > 80 ? "bg-red-500" : usagePercent > 50 ? "bg-yellow-500" : "bg-blue-500"}`} style={{ width: `${Math.min(usagePercent, 100)}%` }} />
            </div>
          </div>
        </div>

        {/* API Key */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">API Key</h2>
          <div className="flex items-center gap-3">
            <code className="flex-1 bg-gray-950 rounded-lg px-4 py-3 text-sm text-gray-300 font-mono">
              {showKey ? customer.apiKey : customer.apiKey.slice(0, 15) + "..." + customer.apiKey.slice(-4)}
            </code>
            <button onClick={() => setShowKey(!showKey)} className="px-4 py-3 border border-gray-700 rounded-lg text-sm hover:bg-gray-800 transition-colors">
              {showKey ? "隱藏" : "顯示"}
            </button>
            <button onClick={copyKey} className="px-4 py-3 bg-blue-600 rounded-lg text-sm hover:bg-blue-500 transition-colors">
              {copied ? "已複製" : "複製"}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Base URL: https://api.nplusstar.ai/v1 | 使用方式與 OpenAI API 相同
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <a href="/chat" className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition-colors block">
            <h3 className="font-semibold mb-1">AI 聊天室</h3>
            <p className="text-sm text-gray-400">直接跟 AI 對話</p>
          </a>
          <a href="/plans" className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition-colors block">
            <h3 className="font-semibold mb-1">升級方案</h3>
            <p className="text-sm text-gray-400">解鎖更多 Agent 和額度</p>
          </a>
          <a href="/billing" className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition-colors block">
            <h3 className="font-semibold mb-1">帳單記錄</h3>
            <p className="text-sm text-gray-400">查看用量和費用明細</p>
          </a>
        </div>

        {/* Usage Guide */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">快速開始</h2>
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex gap-3">
              <span className="bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs shrink-0">1</span>
              <span>複製上方 API Key</span>
            </div>
            <div className="flex gap-3">
              <span className="bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs shrink-0">2</span>
              <span>設定 base_url 為 https://api.nplusstar.ai/v1</span>
            </div>
            <div className="flex gap-3">
              <span className="bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-xs shrink-0">3</span>
              <span>使用 OpenAI 格式呼叫 API，或直接使用上方 AI 聊天室</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
