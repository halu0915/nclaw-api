"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useCustomer } from "../layout";
import StatCard from "@/components/StatCard";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const PLAN_LABELS: Record<string, string> = {
  free: "免費試用",
  light: "輕量版",
  standard: "標準版",
  pro: "專業版",
  enterprise: "企業版",
};

interface UsageRecord {
  id: string;
  timestamp: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  billedNtd: number;
  latencyMs: number;
  status: string;
}

interface BillingSummary {
  totalRequests: number;
  totalTokens: number;
  totalBilledNtd: number;
  totalCostUsd: number;
  avgLatencyMs: number;
}

interface DailyPoint {
  date: string;
  requests: number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-blue-400">
        {payload[0].value.toLocaleString()} requests
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const customer = useCustomer();
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [chartData, setChartData] = useState<DailyPoint[]>([]);
  const [recentCalls, setRecentCalls] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!customer) return;
    setLoading(true);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Last 7 days range
    const endDate = now.toISOString().split("T")[0];
    const startDate = new Date(Date.now() - 6 * 86400000)
      .toISOString()
      .split("T")[0];

    const [billingRes, usageRes, recentRes] = await Promise.allSettled([
      fetch(
        `/api/customer/billing-summary?year=${year}&month=${month}&tenantId=${customer.tenantId}`
      ),
      fetch(
        `/api/customer/usage?tenantId=${customer.tenantId}&startDate=${startDate}&endDate=${endDate}`
      ),
      fetch(
        `/api/customer/usage?tenantId=${customer.tenantId}&limit=10`
      ),
    ]);

    // Billing
    if (billingRes.status === "fulfilled" && billingRes.value.ok) {
      const data = await billingRes.value.json();
      setBilling(data.summary || data);
    }

    // Chart - group by day
    if (usageRes.status === "fulfilled" && usageRes.value.ok) {
      const data = await usageRes.value.json();
      const records: UsageRecord[] = data.records || data.usage || [];
      const dayMap: Record<string, number> = {};

      // Initialize all 7 days to 0
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const key = d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        dayMap[key] = 0;
      }

      records.forEach((r) => {
        const d = new Date(r.timestamp);
        const key = d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        if (key in dayMap) {
          dayMap[key]++;
        }
      });

      setChartData(
        Object.entries(dayMap).map(([date, requests]) => ({
          date,
          requests,
        }))
      );
    } else {
      // Fallback empty chart
      const empty: DailyPoint[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        empty.push({
          date: d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          requests: 0,
        });
      }
      setChartData(empty);
    }

    // Recent calls
    if (recentRes.status === "fulfilled" && recentRes.value.ok) {
      const data = await recentRes.value.json();
      setRecentCalls(data.records || data.usage || []);
    }

    setLoading(false);
  }, [customer]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!customer) return null;

  const statusColor =
    customer.status === "active"
      ? "green"
      : customer.status === "trial"
        ? "yellow"
        : "red";
  const statusLabel =
    customer.status === "active"
      ? "使用中"
      : customer.status === "trial"
        ? "試用中"
        : "已暫停";

  const usagePercent =
    customer.tokenQuota > 0
      ? (customer.tokensUsed / customer.tokenQuota) * 100
      : 0;

  const quickActions = [
    {
      href: "/chat",
      title: "AI 聊天室",
      desc: "直接與 AI 模型對話",
      icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    },
    {
      href: "/dashboard/keys",
      title: "API Keys",
      desc: "管理 API 金鑰與權限",
      icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z",
    },
    {
      href: "/dashboard/usage",
      title: "用量分析",
      desc: "詳細用量數據與圖表",
      icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    },
    {
      href: "/plans",
      title: "升級方案",
      desc: "解鎖更多額度與模型",
      icon: "M13 10V3L4 14h7v7l9-11h-7z",
    },
  ];

  return (
    <div>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          歡迎，{customer.contactName || customer.companyName}
        </h1>
        <p className="text-gray-400 mt-1">{customer.companyName}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="目前方案"
          value={PLAN_LABELS[customer.plan] || customer.plan}
          sub={`額度：${(customer.tokenQuota / 1_000_000).toFixed(1)}M tokens`}
          color="blue"
        />
        <StatCard
          label="帳號狀態"
          value={statusLabel}
          color={statusColor as "green" | "yellow" | "red"}
        />
        <StatCard
          label="本月費用"
          value={
            billing
              ? `NT$${Math.round(billing.totalBilledNtd).toLocaleString()}`
              : loading
                ? "..."
                : "NT$0"
          }
          sub={
            billing
              ? `${billing.totalRequests} 次請求`
              : undefined
          }
          color="purple"
        />
        <StatCard
          label="使用率"
          value={`${usagePercent.toFixed(1)}%`}
          sub={`${(customer.tokensUsed / 1000).toFixed(0)}K / ${(customer.tokenQuota / 1_000_000).toFixed(0)}M`}
          color={usagePercent > 80 ? "red" : usagePercent > 50 ? "yellow" : "green"}
          progress={usagePercent}
        />
      </div>

      {/* Mini Usage Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            近 7 天請求量
          </h2>
          <Link
            href="/dashboard/usage"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            查看詳情
          </Link>
        </div>
        {loading ? (
          <div className="h-48 flex items-center justify-center text-gray-500">
            載入圖表中...
          </div>
        ) : chartData.every((d) => d.requests === 0) ? (
          <div className="h-48 flex items-center justify-center text-gray-500">
            過去 7 天暫無用量資料
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                axisLine={{ stroke: "#374151" }}
                tickLine={false}
              />
              <YAxis
                stroke="#6b7280"
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="requests"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorReq)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent API Calls */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            最近 API 呼叫
          </h2>
          <Link
            href="/dashboard/usage"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            查看全部
          </Link>
        </div>
        {loading ? (
          <div className="h-32 flex items-center justify-center text-gray-500">
            載入中...
          </div>
        ) : recentCalls.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-gray-500">
            尚無 API 呼叫紀錄
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left pb-3 font-medium">時間</th>
                  <th className="text-left pb-3 font-medium">模型</th>
                  <th className="text-right pb-3 font-medium">Tokens</th>
                  <th className="text-right pb-3 font-medium">費用</th>
                  <th className="text-right pb-3 font-medium">狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {recentCalls.map((call) => (
                  <tr key={call.id} className="text-gray-300">
                    <td className="py-3 text-gray-400">
                      {new Date(call.timestamp).toLocaleString("zh-TW", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3">
                      <span className="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded-md">
                        {call.model}
                      </span>
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {call.totalTokens?.toLocaleString() ?? "---"}
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      NT${call.billedNtd?.toFixed(2) ?? "0.00"}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          call.status === "success"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {call.status === "success" ? "OK" : "Error"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 hover:bg-gray-900/80 transition-all group block"
          >
            <div className="flex items-center gap-3 mb-2">
              <svg
                className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={action.icon}
                />
              </svg>
              <h3 className="font-semibold text-white">{action.title}</h3>
            </div>
            <p className="text-sm text-gray-400">{action.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
