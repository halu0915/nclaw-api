"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface CustomerData {
  companyName: string;
  plan: string;
  planPrice: number;
  tokensUsed: number;
  tokenQuota: number;
  createdAt: string;
}

const PLAN_LABELS: Record<string, string> = {
  free: "免費試用", light: "輕量版", standard: "標準版", pro: "專業版", enterprise: "企業版",
};

export default function BillingPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerData | null>(null);

  useEffect(() => {
    fetch("/api/customer/me")
      .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data) => setCustomer(data.customer))
      .catch(() => router.push("/login"));
  }, [router]);

  if (!customer) {
    return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center"><div className="text-gray-400">載入中...</div></div>;
  }

  const currentMonth = new Date().toLocaleDateString("zh-TW", { year: "numeric", month: "long" });
  const overageTokens = Math.max(0, customer.tokensUsed - customer.tokenQuota);
  const overageCost = Math.round(overageTokens * 0.00015 * 100) / 100;
  const totalCost = customer.planPrice + overageCost;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <a href="/dashboard">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">N+</div>
          </a>
          <span className="font-semibold">帳單記錄</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">{currentMonth} 帳單</h1>

        {/* Current Bill */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">本月費用明細</h2>
            <span className="text-sm text-gray-400">{customer.companyName}</span>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-800">
                <th className="text-left py-3">項目</th>
                <th className="text-right py-3">金額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              <tr>
                <td className="py-3">{PLAN_LABELS[customer.plan]} 月費</td>
                <td className="py-3 text-right">NT${customer.planPrice.toLocaleString()}</td>
              </tr>
              <tr>
                <td className="py-3">
                  Token 用量：{(customer.tokensUsed / 1000).toFixed(0)}K / {(customer.tokenQuota / 1_000_000).toFixed(0)}M
                </td>
                <td className="py-3 text-right text-gray-400">含在月費中</td>
              </tr>
              {overageTokens > 0 && (
                <tr>
                  <td className="py-3 text-yellow-400">
                    超額用量：{(overageTokens / 1000).toFixed(0)}K tokens
                  </td>
                  <td className="py-3 text-right text-yellow-400">NT${overageCost.toLocaleString()}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-700">
                <td className="py-4 font-semibold text-lg">合計</td>
                <td className="py-4 text-right font-semibold text-lg">NT${totalCost.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payment Status */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">付款方式</h2>
          {customer.planPrice === 0 ? (
            <div className="text-gray-400 text-sm">
              免費方案無需付款。<a href="/plans" className="text-blue-400 hover:text-blue-300"> 升級方案</a>以解鎖更多功能。
            </div>
          ) : (
            <div className="text-gray-400 text-sm">
              付款整合建置中，目前為試營運階段。
              <br />
              正式上線後將支援信用卡自動扣款（綠界 ECPay）。
            </div>
          )}
        </div>

        {/* History */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">歷史帳單</h2>
          <div className="text-gray-500 text-sm text-center py-8">
            尚無歷史帳單記錄
          </div>
        </div>

        <div className="text-center mt-6">
          <a href="/dashboard" className="text-gray-500 hover:text-gray-300 text-sm">返回後台</a>
        </div>
      </main>
    </div>
  );
}
