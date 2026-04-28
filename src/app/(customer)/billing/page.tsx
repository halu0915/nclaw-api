"use client";

import { useState, useEffect } from "react";
import { useCustomer } from "../layout";
import StatCard from "@/components/StatCard";

interface BillingSummary {
  totalRequests: number;
  totalTokens: number;
  totalBilledNtd: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  byModel: Record<string, { requests: number; tokens: number; billedNtd: number }>;
}

interface BillingMonth {
  year: number;
  month: number;
  label: string;
}

const PLAN_LABELS: Record<string, string> = {
  free: "免費試用", light: "輕量版", standard: "標準版", pro: "專業版", enterprise: "企業版",
};

const PLAN_PRICES: Record<string, number> = {
  free: 0, light: 2990, standard: 9900, pro: 29900, enterprise: 0,
};

function getLast6Months(): BillingMonth[] {
  const months: BillingMonth[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: d.toLocaleDateString("zh-TW", { year: "numeric", month: "long" }),
    });
  }
  return months;
}

export default function BillingPage() {
  const customer = useCustomer();
  const [selectedMonth, setSelectedMonth] = useState<BillingMonth>(getLast6Months()[0]);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const months = getLast6Months();

  useEffect(() => {
    if (!customer) return;
    setLoading(true);
    fetch(`/api/customer/billing-summary?tenantId=${customer.tenantId}&year=${selectedMonth.year}&month=${selectedMonth.month}`)
      .then((r) => r.json())
      .then((data) => {
        const s = data.summary || data;
        setSummary(s.totalRequests !== undefined ? s : null);
      })
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [customer, selectedMonth]);

  if (!customer) return null;

  const planPrice = PLAN_PRICES[customer.plan] || 0;
  const usageCost = summary?.totalBilledNtd || 0;
  const totalCost = planPrice + usageCost;
  const modelEntries = summary?.byModel ? Object.entries(summary.byModel).sort((a, b) => b[1].billedNtd - a[1].billedNtd) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">帳單中心</h1>
        <select
          value={`${selectedMonth.year}-${selectedMonth.month}`}
          onChange={(e) => {
            const [y, m] = e.target.value.split("-").map(Number);
            const found = months.find((mo) => mo.year === y && mo.month === m);
            if (found) setSelectedMonth(found);
          }}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          {months.map((m) => (
            <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="方案月費" value={`NT$${planPrice.toLocaleString()}`} sub={PLAN_LABELS[customer.plan]} color="blue" />
        <StatCard label="用量費用" value={loading ? "..." : `NT$${Math.round(usageCost).toLocaleString()}`} sub={`${summary?.totalRequests || 0} 次請求`} color="purple" />
        <StatCard label="本月合計" value={loading ? "..." : `NT$${Math.round(totalCost).toLocaleString()}`} color={totalCost > 10000 ? "yellow" : "green"} />
        <StatCard label="平均延遲" value={loading ? "..." : `${summary?.avgLatencyMs || 0}ms`} color="blue" />
      </div>

      {/* Billing Detail Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">費用明細</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-800">
              <th className="text-left py-3">項目</th>
              <th className="text-right py-3">數量</th>
              <th className="text-right py-3">金額</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            <tr>
              <td className="py-3">{PLAN_LABELS[customer.plan]} 月費</td>
              <td className="py-3 text-right text-gray-400">1</td>
              <td className="py-3 text-right">NT${planPrice.toLocaleString()}</td>
            </tr>
            {loading ? (
              <tr><td colSpan={3} className="py-3 text-center text-gray-500">載入中...</td></tr>
            ) : modelEntries.length > 0 ? (
              modelEntries.map(([model, data]) => (
                <tr key={model}>
                  <td className="py-3">
                    <span className="text-gray-300">{model}</span>
                    <span className="text-xs text-gray-500 ml-2">{data.requests} 次</span>
                  </td>
                  <td className="py-3 text-right text-gray-400">{(data.tokens / 1000).toFixed(0)}K tokens</td>
                  <td className="py-3 text-right">NT${Math.round(data.billedNtd).toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={3} className="py-3 text-center text-gray-500">本月尚無 API 用量</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-700">
              <td className="py-4 font-semibold text-lg">合計</td>
              <td></td>
              <td className="py-4 text-right font-semibold text-lg text-blue-400">
                NT${loading ? "..." : Math.round(totalCost).toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Invoice Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">發票</h2>
          <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">即將上線</span>
        </div>
        <p className="text-sm text-gray-400">
          電子發票功能建置中。正式上線後將支援 B2B 三聯式電子發票（含統編），以及 B2C 二聯式發票。
        </p>
        <p className="text-sm text-gray-500 mt-2">
          請至「設定」頁面填寫統一編號，以便開立三聯式發票。
        </p>
      </div>

      {/* Payment Section */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">付款方式</h2>
          <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">即將上線</span>
        </div>
        {planPrice === 0 ? (
          <div className="text-sm text-gray-400">
            免費方案無需付款。<a href="/plans" className="text-blue-400 hover:text-blue-300">升級方案</a>以解鎖更多功能。
          </div>
        ) : (
          <div className="text-sm text-gray-400">
            付款整合建置中，正式上線後將支援信用卡自動扣款（綠界 ECPay）。
          </div>
        )}
      </div>
    </div>
  );
}
