"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface CustomerData {
  plan: string;
  status: string;
}

const plans = [
  { id: "free", name: "免費試用", price: 0, agents: 1, rpm: 5, tokens: "100K", features: ["單一模型", "公開知識庫", "網頁聊天室"] },
  { id: "light", name: "輕量版", price: 2990, agents: 3, rpm: 10, tokens: "1M", features: ["3 個 Agent", "公開知識庫", "Telegram Bot", "Email 支援"] },
  { id: "standard", name: "標準版", price: 9900, agents: 5, rpm: 30, tokens: "5M", features: ["5 個 Agent", "訂閱知識庫", "Telegram + Line Bot", "圖片分析", "報告產出"] },
  { id: "pro", name: "專業版", price: 29900, agents: 7, rpm: 100, tokens: "20M", features: ["7 個 Agent（全部）", "完整知識庫 + 私有", "全平台 Bot", "所有技能", "優先支援", "專屬客服"], popular: true },
  { id: "enterprise", name: "企業版", price: -1, agents: 0, rpm: 500, tokens: "無上限", features: ["客製 Agent", "私有部署選項", "SLA 99.95%", "駐點技術支援", "專屬知識庫建置"] },
];

export default function PlansPage() {
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/customer/me")
      .then((res) => res.ok ? res.json() : null)
      .then(async (data) => {
        if (data) { setCurrentPlan(data.customer.plan); return; }
        // Fallback: check next-auth session
        const s = await fetch("/api/auth/session").then(r => r.json()).catch(() => null);
        if (s?.user) setCurrentPlan("free");
      })
      .catch(() => {});
  }, []);

  const subscribe = async (planId: string) => {
    if (planId === "enterprise") {
      window.open("mailto:halu0915@gmail.com?subject=N%2BClaw%20企業版洽詢", "_blank");
      return;
    }

    setLoading(planId);
    // MVP: show success message, actual billing integration later
    setTimeout(() => {
      alert(`已選擇${planId}方案。金流串接建置中，正式上線後將自動扣款。`);
      setCurrentPlan(planId);
      setLoading(null);
    }, 1000);
  };

  return (
    <div>
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-3">選擇適合你的方案</h1>
        <p className="text-gray-400">14 天免費試用，隨時可升級或降級</p>
      </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-xl p-6 border flex flex-col ${
                plan.popular ? "border-blue-500 bg-blue-950/20 ring-1 ring-blue-500" : "border-gray-800 bg-gray-900"
              }`}
            >
              {plan.popular && (
                <div className="text-xs text-blue-400 font-semibold mb-2">最受歡迎</div>
              )}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <div className="text-2xl font-bold my-3">
                {plan.price === -1 ? "聯繫我們" : plan.price === 0 ? "免費" : `NT$${plan.price.toLocaleString()}`}
                {plan.price > 0 && <span className="text-sm text-gray-400 font-normal">/月</span>}
              </div>

              <ul className="space-y-2 text-sm text-gray-400 mb-6 flex-1">
                {plan.tokens !== "無上限" && <li>{plan.tokens} tokens/月</li>}
                {plan.tokens === "無上限" && <li>無上限 tokens</li>}
                <li>{plan.rpm} RPM</li>
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>

              {currentPlan === plan.id ? (
                <div className="text-center py-2 text-sm text-gray-500 border border-gray-700 rounded-lg">目前方案</div>
              ) : (
                <button
                  onClick={() => subscribe(plan.id)}
                  disabled={loading === plan.id}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    plan.popular
                      ? "bg-blue-600 hover:bg-blue-500"
                      : "border border-gray-700 hover:bg-gray-800"
                  } disabled:opacity-50`}
                >
                  {loading === plan.id ? "處理中..." : plan.price === -1 ? "聯繫業務" : currentPlan === "free" ? "開始使用" : "切換方案"}
                </button>
              )}
            </div>
          ))}
        </div>

      <div className="text-center mt-8">
        <a href="/dashboard" className="text-gray-500 hover:text-gray-300 text-sm">返回後台</a>
      </div>
    </div>
  );
}
