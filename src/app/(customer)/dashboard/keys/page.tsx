"use client";

import { useState, useEffect, useCallback } from "react";
import { useCustomer } from "../../layout";
import Modal from "@/components/Modal";

interface ApiKeyRow {
  id: string;
  tenantId: string;
  departmentId: string | null;
  keyPrefix: string;
  name: string;
  plan: string;
  rateLimitRpm: number;
  allowedModels: string[] | null;
  enabled: boolean;
  createdAt: string;
}

interface Department {
  id: string;
  tenantId: string;
  name: string;
  monthlyQuotaTokens: number;
  tokensUsedThisMonth: number;
  createdAt: string;
}

interface Employee {
  id: string;
  name: string;
  email: string | null;
  departmentId: string;
}

export default function KeysPage() {
  const customer = useCustomer();

  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [rateLimitRpm, setRateLimitRpm] = useState(60);
  const [allowedModels, setAllowedModels] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [employeeId, setEmployeeId] = useState("");

  // Raw key display
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const tenantId = customer?.tenantId;

  const fetchKeys = useCallback(async () => {
    if (!tenantId) return;
    try {
      const res = await fetch(`/api/customer/keys?tenantId=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys ?? []);
      }
    } catch {
      /* ignore */
    }
  }, [tenantId]);

  const fetchDepartments = useCallback(async () => {
    if (!tenantId) return;
    try {
      const res = await fetch(`/api/customer/departments?tenantId=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments ?? []);
      }
    } catch {
      /* ignore */
    }
  }, [tenantId]);

  const fetchEmployees = useCallback(async () => {
    if (!tenantId) return;
    try {
      const res = await fetch("/api/customer/employees");
      if (res.ok) {
        const data = await res.json();
        setEmployees(data.employees ?? []);
      }
    } catch { /* ignore */ }
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    Promise.all([fetchKeys(), fetchDepartments(), fetchEmployees()]).finally(() =>
      setLoading(false),
    );
  }, [tenantId, fetchKeys, fetchDepartments, fetchEmployees]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !name.trim()) return;
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        tenantId,
        name: name.trim(),
        rateLimitRpm,
      };
      if (allowedModels.trim()) {
        body.allowedModels = allowedModels
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean);
      }
      if (departmentId) {
        body.departmentId = departmentId;
      }
      if (employeeId) {
        body.employeeId = employeeId;
      }
      const res = await fetch("/api/customer/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setRawKey(data.rawKey);
        setShowCreate(false);
        resetForm();
        await fetchKeys();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId: string, keyName: string) => {
    if (!confirm(`確定要撤銷金鑰「${keyName}」嗎？此操作無法復原。`)) return;
    const res = await fetch(`/api/customer/keys/${keyId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await fetchKeys();
    }
  };

  const resetForm = () => {
    setName("");
    setRateLimitRpm(60);
    setAllowedModels("");
    setDepartmentId("");
    setEmployeeId("");
  };

  const filteredEmployees = departmentId
    ? employees.filter((e) => e.departmentId === departmentId)
    : employees;

  const copyRawKey = () => {
    if (rawKey) {
      navigator.clipboard.writeText(rawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const deptNameMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));

  if (loading) {
    return <div className="text-gray-400 py-12 text-center">載入中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">API Key 管理</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors"
        >
          建立新 Key
        </button>
      </div>

      {/* Raw key display (shown once after creation) */}
      {rawKey && (
        <div className="mb-6 bg-yellow-950 border border-yellow-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-yellow-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-semibold text-yellow-300">
              此金鑰只會顯示一次
            </span>
          </div>
          <div className="flex items-center gap-3">
            <code className="flex-1 bg-gray-950 rounded-lg px-4 py-3 text-sm text-yellow-200 font-mono break-all">
              {rawKey}
            </code>
            <button
              onClick={copyRawKey}
              className="px-4 py-3 bg-yellow-700 rounded-lg text-sm hover:bg-yellow-600 transition-colors shrink-0"
            >
              {copied ? "已複製" : "複製"}
            </button>
          </div>
          <button
            onClick={() => setRawKey(null)}
            className="mt-3 text-sm text-yellow-500 hover:text-yellow-300 transition-colors"
          >
            我已儲存金鑰，關閉此提示
          </button>
        </div>
      )}

      {/* Keys table */}
      {keys.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <div className="text-gray-500 text-lg mb-2">尚未建立 API Key</div>
          <p className="text-gray-600 text-sm">
            點擊「建立新 Key」來建立您的第一個 API 金鑰
          </p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-left">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Key Prefix</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">RPM Limit</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr
                    key={key.id}
                    className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-white">
                      {key.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-400">
                      {key.keyPrefix}...
                    </td>
                    <td className="px-4 py-3 text-gray-300">{key.plan}</td>
                    <td className="px-4 py-3 text-gray-300">
                      {key.rateLimitRpm}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {key.departmentId
                        ? deptNameMap[key.departmentId] ?? key.departmentId
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            key.enabled ? "bg-green-400" : "bg-red-400"
                          }`}
                        />
                        <span
                          className={
                            key.enabled ? "text-green-400" : "text-red-400"
                          }
                        >
                          {key.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(key.createdAt).toLocaleDateString("zh-TW")}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRevoke(key.id, key.name)}
                        className="px-3 py-1 text-xs border border-red-800 text-red-400 rounded-lg hover:bg-red-900/50 transition-colors"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create key modal */}
      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          resetForm();
        }}
        title="建立新 API Key"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              名稱 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="例如：Production Key"
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Rate Limit (RPM)
            </label>
            <input
              type="number"
              value={rateLimitRpm}
              onChange={(e) => setRateLimitRpm(Number(e.target.value))}
              min={1}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Allowed Models
            </label>
            <input
              type="text"
              value={allowedModels}
              onChange={(e) => setAllowedModels(e.target.value)}
              placeholder="留空 = 全部模型"
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-600 mt-1">
              以逗號分隔，例如：gpt-4o, claude-sonnet-4
            </p>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Department
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">-- 不指定 --</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              指定員工
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">-- 不指定（部門共用） --</option>
              {filteredEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}{e.email ? ` (${e.email})` : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-600 mt-1">指定後可追蹤個人用量</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                resetForm();
              }}
              className="px-4 py-2 text-sm border border-gray-700 rounded-lg text-gray-400 hover:bg-gray-800 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="px-4 py-2 text-sm bg-blue-600 rounded-lg font-medium hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? "建立中..." : "建立"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
