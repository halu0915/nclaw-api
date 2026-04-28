"use client";

import { useState, useEffect, useCallback } from "react";
import { useCustomer } from "../../layout";
import StatCard from "@/components/StatCard";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

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

interface ModelStat {
  model: string;
  requests: number;
}

interface DailyTrend {
  date: string;
  tokens: number;
}

const PAGE_SIZE = 20;

function shortenModel(model: string): string {
  // Shorten common long model names for chart readability
  return model
    .replace("gpt-4o-mini", "4o-mini")
    .replace("gpt-4o", "4o")
    .replace("gpt-4-turbo", "4-turbo")
    .replace("gpt-3.5-turbo", "3.5")
    .replace("claude-3-5-sonnet", "c3.5-sonnet")
    .replace("claude-3-5-haiku", "c3.5-haiku")
    .replace("claude-3-opus", "c3-opus")
    .replace("claude-sonnet-4", "c-sonnet-4")
    .replace("claude-opus-4", "c-opus-4")
    .replace("-20240620", "")
    .replace("-20241022", "")
    .replace("-latest", "");
}

function BarTooltip({
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
      <p className="text-sm font-semibold text-purple-400">
        {payload[0].value.toLocaleString()} requests
      </p>
    </div>
  );
}

function LineTooltip({
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
        {payload[0].value.toLocaleString()} tokens
      </p>
    </div>
  );
}

function toDateInputValue(date: Date): string {
  return date.toISOString().split("T")[0];
}

export default function UsagePage() {
  const customer = useCustomer();

  // Default date range: first of current month to today
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [startDate, setStartDate] = useState(toDateInputValue(monthStart));
  const [endDate, setEndDate] = useState(toDateInputValue(now));

  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Summary stats
  const [totalRequests, setTotalRequests] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [avgLatency, setAvgLatency] = useState(0);

  // Chart data
  const [modelStats, setModelStats] = useState<ModelStat[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyTrend[]>([]);

  const fetchUsage = useCallback(async () => {
    if (!customer) return;
    setLoading(true);

    try {
      const res = await fetch(
        `/api/customer/usage?tenantId=${customer.tenantId}&startDate=${startDate}&endDate=${endDate}`
      );
      if (!res.ok) throw new Error("Failed to fetch usage");
      const data = await res.json();
      const usageRecords: UsageRecord[] = data.records || data.usage || [];

      setRecords(usageRecords);
      setPage(1);

      // Compute summary
      const reqCount = usageRecords.length;
      const tokSum = usageRecords.reduce(
        (s, r) => s + (r.totalTokens || 0),
        0
      );
      const costSum = usageRecords.reduce((s, r) => s + (r.billedNtd || 0), 0);
      const latSum = usageRecords.reduce(
        (s, r) => s + (r.latencyMs || 0),
        0
      );

      setTotalRequests(reqCount);
      setTotalTokens(tokSum);
      setTotalCost(costSum);
      setAvgLatency(reqCount > 0 ? Math.round(latSum / reqCount) : 0);

      // Model breakdown
      const modelMap: Record<string, number> = {};
      usageRecords.forEach((r) => {
        const m = r.model || "unknown";
        modelMap[m] = (modelMap[m] || 0) + 1;
      });
      const mStats = Object.entries(modelMap)
        .map(([model, requests]) => ({ model: shortenModel(model), requests }))
        .sort((a, b) => b.requests - a.requests);
      setModelStats(mStats);

      // Daily trend
      const dayMap: Record<string, number> = {};
      // Initialize all days in range
      const start = new Date(startDate);
      const end = new Date(endDate);
      for (
        let d = new Date(start);
        d <= end;
        d.setDate(d.getDate() + 1)
      ) {
        dayMap[toDateInputValue(new Date(d))] = 0;
      }
      usageRecords.forEach((r) => {
        const day = new Date(r.timestamp).toISOString().split("T")[0];
        if (day in dayMap) {
          dayMap[day] += r.totalTokens || 0;
        }
      });
      const trend = Object.entries(dayMap).map(([date, tokens]) => ({
        date: new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        tokens,
      }));
      setDailyTrend(trend);
    } catch {
      setRecords([]);
      setTotalRequests(0);
      setTotalTokens(0);
      setTotalCost(0);
      setAvgLatency(0);
      setModelStats([]);
      setDailyTrend([]);
    }

    setLoading(false);
  }, [customer, startDate, endDate]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  if (!customer) return null;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const pagedRecords = records.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">用量分析</h1>
          <p className="text-gray-400 mt-1">
            API 使用量詳細分析
          </p>
        </div>

        {/* Date Range Picker */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="startDate" className="text-sm text-gray-400">
              起始
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="endDate" className="text-sm text-gray-400">
              結束
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="總請求數"
          value={loading ? "..." : totalRequests.toLocaleString()}
          color="blue"
        />
        <StatCard
          label="總 Tokens"
          value={
            loading
              ? "..."
              : totalTokens >= 1_000_000
                ? `${(totalTokens / 1_000_000).toFixed(2)}M`
                : totalTokens >= 1_000
                  ? `${(totalTokens / 1_000).toFixed(1)}K`
                  : totalTokens.toLocaleString()
          }
          color="green"
        />
        <StatCard
          label="總費用 (NTD)"
          value={loading ? "..." : `NT$${totalCost.toFixed(2)}`}
          color="purple"
        />
        <StatCard
          label="平均延遲"
          value={loading ? "..." : `${avgLatency.toLocaleString()} ms`}
          color="yellow"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Bar Chart - Usage by Model */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            模型用量分佈
          </h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              載入中...
            </div>
          ) : modelStats.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              所選期間暫無資料
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={modelStats}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#374151"
                  vertical={false}
                />
                <XAxis
                  dataKey="model"
                  stroke="#6b7280"
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  axisLine={{ stroke: "#374151" }}
                  tickLine={false}
                  angle={-30}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  stroke="#6b7280"
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<BarTooltip />} />
                <Bar
                  dataKey="requests"
                  fill="#a855f7"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Line Chart - Daily Token Trend */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            每日 Token 趨勢
          </h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              載入中...
            </div>
          ) : dailyTrend.every((d) => d.tokens === 0) ? (
            <div className="h-64 flex items-center justify-center text-gray-500">
              所選期間暫無資料
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyTrend}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#374151"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  axisLine={{ stroke: "#374151" }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#6b7280"
                  tick={{ fill: "#9ca3af", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(1)}M`
                      : v >= 1_000
                        ? `${(v / 1_000).toFixed(0)}K`
                        : String(v)
                  }
                />
                <Tooltip content={<LineTooltip />} />
                <Line
                  type="monotone"
                  dataKey="tokens"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 3 }}
                  activeDot={{ r: 5, fill: "#60a5fa" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            用量紀錄
          </h2>
          <span className="text-sm text-gray-400">
            共 {records.length} 筆
          </span>
        </div>

        {loading ? (
          <div className="h-48 flex items-center justify-center text-gray-500">
            載入紀錄中...
          </div>
        ) : records.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-500">
            所選期間無用量紀錄
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-800">
                    <th className="text-left pb-3 font-medium">時間</th>
                    <th className="text-left pb-3 font-medium">模型</th>
                    <th className="text-left pb-3 font-medium">Provider</th>
                    <th className="text-right pb-3 font-medium">Input</th>
                    <th className="text-right pb-3 font-medium">Output</th>
                    <th className="text-right pb-3 font-medium">費用</th>
                    <th className="text-right pb-3 font-medium">延遲</th>
                    <th className="text-right pb-3 font-medium">狀態</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {pagedRecords.map((r) => (
                    <tr
                      key={r.id}
                      className={
                        r.status !== "success"
                          ? "text-red-300"
                          : "text-gray-300"
                      }
                    >
                      <td className="py-3 text-gray-400 whitespace-nowrap">
                        {new Date(r.timestamp).toLocaleString("zh-TW", {
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="py-3">
                        <span className="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded-md">
                          {r.model}
                        </span>
                      </td>
                      <td className="py-3 text-gray-400">{r.provider}</td>
                      <td className="py-3 text-right tabular-nums">
                        {(r.inputTokens || 0).toLocaleString()}
                      </td>
                      <td className="py-3 text-right tabular-nums">
                        {(r.outputTokens || 0).toLocaleString()}
                      </td>
                      <td className="py-3 text-right tabular-nums">
                        NT${(r.billedNtd || 0).toFixed(2)}
                      </td>
                      <td className="py-3 text-right tabular-nums">
                        {(r.latencyMs || 0).toLocaleString()} ms
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            r.status === "success"
                              ? "bg-green-500/10 text-green-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {r.status === "success" ? "OK" : "Error"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
                <span className="text-sm text-gray-400">
                  第 {page} / {totalPages} 頁
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-sm border border-gray-700 rounded-lg hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    上一頁
                  </button>
                  {/* Page number buttons - show up to 5 pages around current */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                          pageNum === page
                            ? "bg-blue-600 text-white"
                            : "border border-gray-700 hover:bg-gray-800 text-gray-400"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-700 rounded-lg hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    下一頁
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
