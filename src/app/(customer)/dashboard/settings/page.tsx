"use client";

import { useState } from "react";
import { useCustomer } from "../../layout";

const PLAN_LABELS: Record<string, string> = {
  free: "免費試用",
  light: "輕量版",
  standard: "標準版",
  pro: "專業版",
  enterprise: "企業版",
};

const PLAN_FEATURES: Record<string, string[]> = {
  free: ["100K tokens/月", "1 RPM", "基本模型"],
  light: ["1M tokens/月", "30 RPM", "全部模型"],
  standard: ["5M tokens/月", "100 RPM", "全部模型", "部門管理"],
  pro: ["20M tokens/月", "300 RPM", "全部模型", "部門管理", "優先支援"],
  enterprise: ["無限 tokens", "500 RPM", "全部模型", "部門管理", "專屬支援", "SLA"],
};

export default function SettingsPage() {
  const customer = useCustomer();
  const [taxId, setTaxId] = useState("");
  const [companyAddr, setCompanyAddr] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(customer?.email || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!customer) return null;

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">帳戶設定</h1>

      {/* Company Info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">公司資料</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">公司名稱</label>
            <div className="px-4 py-2.5 bg-gray-800 rounded-lg text-gray-300">{customer.companyName}</div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">聯絡人</label>
            <div className="px-4 py-2.5 bg-gray-800 rounded-lg text-gray-300">{customer.contactName}</div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">統一編號</label>
            <input
              type="text"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="12345678"
              maxLength={8}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">公司地址</label>
            <input
              type="text"
              value={companyAddr}
              onChange={(e) => setCompanyAddr(e.target.value)}
              placeholder="台北市..."
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Notification */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">通知設定</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">帳單通知信箱</label>
            <input
              type="email"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-blue-500" />
            <span className="text-sm text-gray-300">用量超過 80% 時通知</span>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-blue-500" />
            <span className="text-sm text-gray-300">每月帳單產生時通知</span>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-blue-500" />
            <span className="text-sm text-gray-300">API Key 使用異常通知</span>
          </div>
        </div>
      </div>

      {/* Current Plan */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">目前方案</h2>
          <a href="/plans" className="text-sm text-blue-400 hover:text-blue-300">變更方案</a>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <span className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-sm font-medium">
            {PLAN_LABELS[customer.plan] || customer.plan}
          </span>
          <span className="text-gray-400 text-sm">
            {customer.status === "active" ? "使用中" : customer.status === "trial" ? "試用中" : "已暫停"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(PLAN_FEATURES[customer.plan] || []).map((f) => (
            <span key={f} className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-400">{f}</span>
          ))}
        </div>
      </div>

      {/* API Endpoint Info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">API 連線資訊</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="text-gray-400 w-24 shrink-0">Base URL</span>
            <code className="px-3 py-1 bg-gray-800 rounded text-blue-400 text-xs">https://api.nplusstar.ai/v1</code>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-400 w-24 shrink-0">認證方式</span>
            <code className="px-3 py-1 bg-gray-800 rounded text-gray-300 text-xs">Authorization: Bearer &lt;your-key&gt;</code>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-400 w-24 shrink-0">格式</span>
            <span className="text-gray-300">OpenAI 相容格式</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-400 w-24 shrink-0">Tenant ID</span>
            <code className="px-3 py-1 bg-gray-800 rounded text-gray-300 text-xs">{customer.tenantId}</code>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? "儲存中..." : "儲存設定"}
        </button>
        {saved && <span className="text-green-400 text-sm">設定已儲存</span>}
      </div>
    </div>
  );
}
