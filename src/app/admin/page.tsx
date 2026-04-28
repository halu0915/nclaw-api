"use client";

import { useState, useEffect, useCallback } from "react";

interface Customer {
  id: string;
  tenantId: string;
  email: string;
  companyName: string;
  contactName: string;
  phone: string;
  plan: string;
  status: string;
  tokenQuota: number;
  tokensUsed: number;
  createdAt: string;
}

interface ApiKeyRow {
  id: string;
  tenantId: string;
  keyPrefix: string;
  name: string;
  plan: string;
  rateLimitRpm: number;
  enabled: boolean;
  createdAt: string;
}

interface UsageSummary {
  totalRequests: number;
  totalTokens: number;
  totalCostUsd: number;
  totalBilledNtd: number;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [secret, setSecret] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [tab, setTab] = useState<"customers" | "keys" | "usage">("customers");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const headers = { "x-admin-secret": secret };

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/customers", { headers });
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/keys", { headers });
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/usage", { headers });
      if (res.ok) {
        const data = await res.json();
        setUsage(data.summary ?? null);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authed) return;
    if (tab === "customers") fetchCustomers();
    else if (tab === "keys") fetchKeys();
    else if (tab === "usage") fetchUsage();
  }, [authed, tab, fetchCustomers, fetchKeys, fetchUsage]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(false);
    try {
      const res = await fetch("/api/admin/customers", {
        headers: { "x-admin-secret": secret },
      });
      if (res.ok) {
        setAuthed(true);
      } else {
        setLoginError(true);
      }
    } catch {
      setLoginError(true);
    }
  };

  const revokeKey = async (keyId: string, keyName: string) => {
    if (!confirm(`確定撤銷「${keyName}」？此操作無法復原。`)) return;
    await fetch(`/api/admin/keys/${keyId}`, {
      method: "DELETE",
      headers,
    });
    fetchKeys();
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <form onSubmit={handleLogin} className="bg-gray-900 border border-gray-800 rounded-xl p-8 w-96">
          <h1 className="text-xl font-bold mb-6 text-center">N+Claw Admin</h1>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Admin Secret"
            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 mb-4"
          />
          {loginError && (
            <p className="text-red-400 text-sm mb-3 text-center">密碼錯誤</p>
          )}
          <button
            type="submit"
            className="w-full px-4 py-3 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors"
          >
            登入管理後台
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">N+Claw 管理後台</h1>
          <button
            onClick={() => setAuthed(false)}
            className="px-4 py-2 text-sm border border-gray-700 rounded-lg text-gray-400 hover:bg-gray-800 transition-colors"
          >
            登出
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-900 rounded-lg p-1 w-fit">
          {[
            { key: "customers" as const, label: "客戶列表" },
            { key: "keys" as const, label: "API Keys" },
            { key: "usage" as const, label: "用量統計" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm rounded-md transition-colors ${
                tab === t.key
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-gray-400 py-8 text-center">載入中...</div>
        )}

        {/* Customers Tab */}
        {tab === "customers" && !loading && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex justify-between items-center">
              <span className="text-sm text-gray-400">
                共 {customers.length} 位客戶
              </span>
              <button
                onClick={fetchCustomers}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                重新整理
              </button>
            </div>
            {customers.length === 0 ? (
              <div className="p-12 text-center text-gray-500">尚無客戶註冊</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400 text-left">
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">公司</th>
                      <th className="px-4 py-3 font-medium">聯絡人</th>
                      <th className="px-4 py-3 font-medium">方案</th>
                      <th className="px-4 py-3 font-medium">狀態</th>
                      <th className="px-4 py-3 font-medium">Token 用量</th>
                      <th className="px-4 py-3 font-medium">註冊時間</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50"
                      >
                        <td className="px-4 py-3 text-white">{c.email}</td>
                        <td className="px-4 py-3 text-gray-300">
                          {c.companyName || "—"}
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {c.contactName || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded text-xs">
                            {c.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`flex items-center gap-1.5 ${
                              c.status === "active"
                                ? "text-green-400"
                                : c.status === "trial"
                                ? "text-yellow-400"
                                : "text-red-400"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                c.status === "active"
                                  ? "bg-green-400"
                                  : c.status === "trial"
                                  ? "bg-yellow-400"
                                  : "bg-red-400"
                              }`}
                            />
                            {c.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-300 font-mono text-xs">
                          {c.tokensUsed.toLocaleString()} /{" "}
                          {c.tokenQuota.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {new Date(c.createdAt).toLocaleDateString("zh-TW")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Keys Tab */}
        {tab === "keys" && !loading && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800 flex justify-between items-center">
              <span className="text-sm text-gray-400">
                共 {keys.length} 把 Key（含已撤銷）
              </span>
              <button
                onClick={fetchKeys}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                重新整理
              </button>
            </div>
            {keys.length === 0 ? (
              <div className="p-12 text-center text-gray-500">尚無 API Key</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400 text-left">
                      <th className="px-4 py-3 font-medium">名稱</th>
                      <th className="px-4 py-3 font-medium">Key Prefix</th>
                      <th className="px-4 py-3 font-medium">Plan</th>
                      <th className="px-4 py-3 font-medium">RPM</th>
                      <th className="px-4 py-3 font-medium">狀態</th>
                      <th className="px-4 py-3 font-medium">建立時間</th>
                      <th className="px-4 py-3 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((k) => (
                      <tr
                        key={k.id}
                        className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50"
                      >
                        <td className="px-4 py-3 text-white font-medium">
                          {k.name}
                        </td>
                        <td className="px-4 py-3 font-mono text-gray-400">
                          {k.keyPrefix}...
                        </td>
                        <td className="px-4 py-3 text-gray-300">{k.plan}</td>
                        <td className="px-4 py-3 text-gray-300">
                          {k.rateLimitRpm}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`flex items-center gap-1.5 ${
                              k.enabled ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                k.enabled ? "bg-green-400" : "bg-red-400"
                              }`}
                            />
                            {k.enabled ? "Active" : "Revoked"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {new Date(k.createdAt).toLocaleDateString("zh-TW")}
                        </td>
                        <td className="px-4 py-3">
                          {k.enabled && (
                            <button
                              onClick={() => revokeKey(k.id, k.name)}
                              className="px-3 py-1 text-xs border border-red-800 text-red-400 rounded-lg hover:bg-red-900/50 transition-colors"
                            >
                              撤銷
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Usage Tab */}
        {tab === "usage" && !loading && usage && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "總請求數",
                value: usage.totalRequests.toLocaleString(),
              },
              {
                label: "總 Token 數",
                value: usage.totalTokens.toLocaleString(),
              },
              {
                label: "總成本 (USD)",
                value: `$${usage.totalCostUsd.toFixed(4)}`,
              },
              {
                label: "總計費 (NTD)",
                value: `NT$${usage.totalBilledNtd.toFixed(2)}`,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-gray-900 border border-gray-800 rounded-xl p-6"
              >
                <div className="text-sm text-gray-400 mb-2">{stat.label}</div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
