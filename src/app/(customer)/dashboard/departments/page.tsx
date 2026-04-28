"use client";

import { useState, useEffect, useCallback } from "react";
import { useCustomer } from "../../layout";
import Modal from "@/components/Modal";

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
  tenantId: string;
  departmentId: string;
  name: string;
  email: string | null;
  role: string;
  createdAt: string;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) {
    const val = n / 1_000_000;
    return val % 1 === 0 ? `${val}M` : `${val.toFixed(1)}M`;
  }
  if (n >= 1_000) {
    const val = n / 1_000;
    return val % 1 === 0 ? `${val}K` : `${val.toFixed(1)}K`;
  }
  return String(n);
}

export default function DepartmentsPage() {
  const customer = useCustomer();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Department form
  const [showCreateDept, setShowCreateDept] = useState(false);
  const [creatingDept, setCreatingDept] = useState(false);
  const [deptName, setDeptName] = useState("");
  const [monthlyQuotaTokens, setMonthlyQuotaTokens] = useState(1_000_000);
  const [deptError, setDeptError] = useState("");

  // Employee form
  const [showCreateEmp, setShowCreateEmp] = useState(false);
  const [creatingEmp, setCreatingEmp] = useState(false);
  const [empName, setEmpName] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empDeptId, setEmpDeptId] = useState("");
  const [empRole, setEmpRole] = useState("member");
  const [empError, setEmpError] = useState("");

  // Expanded department
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  const tenantId = customer?.tenantId;

  const fetchDepartments = useCallback(async () => {
    if (!tenantId) return;
    try {
      const res = await fetch(`/api/customer/departments?tenantId=${tenantId}`);
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments ?? []);
      }
    } catch { /* ignore */ }
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
    Promise.all([fetchDepartments(), fetchEmployees()]).finally(() => setLoading(false));
  }, [tenantId, fetchDepartments, fetchEmployees]);

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !deptName.trim()) return;
    setCreatingDept(true);
    setDeptError("");
    try {
      const res = await fetch("/api/customer/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: deptName.trim(), monthlyQuotaTokens }),
      });
      if (res.ok) {
        setShowCreateDept(false);
        setDeptName("");
        setMonthlyQuotaTokens(1_000_000);
        await fetchDepartments();
      } else {
        const data = await res.json().catch(() => null);
        setDeptError(data?.error?.message || "建立失敗");
      }
    } catch {
      setDeptError("網路錯誤");
    } finally {
      setCreatingDept(false);
    }
  };

  const handleCreateEmp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !empName.trim() || !empDeptId) return;
    setCreatingEmp(true);
    setEmpError("");
    try {
      const res = await fetch("/api/customer/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: empName.trim(),
          email: empEmail.trim() || undefined,
          departmentId: empDeptId,
          role: empRole,
        }),
      });
      if (res.ok) {
        setShowCreateEmp(false);
        setEmpName("");
        setEmpEmail("");
        setEmpRole("member");
        await fetchEmployees();
      } else {
        const data = await res.json().catch(() => null);
        setEmpError(data?.error?.message || "建立失敗");
      }
    } catch {
      setEmpError("網路錯誤");
    } finally {
      setCreatingEmp(false);
    }
  };

  const handleDeleteEmp = async (empId: string, name: string) => {
    if (!confirm(`確定要移除員工「${name}」嗎？`)) return;
    const res = await fetch(`/api/customer/employees/${empId}`, { method: "DELETE" });
    if (res.ok) {
      await fetchEmployees();
    }
  };

  const getEmployeesForDept = (deptId: string) =>
    employees.filter((e) => e.departmentId === deptId);

  if (loading) {
    return <div className="text-gray-400 py-12 text-center">載入中...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">部門管理</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (departments.length === 0) {
                alert("請先建立部門");
                return;
              }
              setEmpDeptId(departments[0].id);
              setShowCreateEmp(true);
            }}
            className="px-4 py-2 border border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            新增員工
          </button>
          <button
            onClick={() => setShowCreateDept(true)}
            className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors"
          >
            新增部門
          </button>
        </div>
      </div>

      {departments.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <div className="text-gray-500 text-lg mb-2">尚未建立部門</div>
          <p className="text-gray-600 text-sm">點擊「新增部門」來建立您的第一個部門</p>
        </div>
      ) : (
        <div className="space-y-4">
          {departments.map((dept) => {
            const hasQuota = dept.monthlyQuotaTokens > 0;
            const usagePercent = hasQuota
              ? (dept.tokensUsedThisMonth / dept.monthlyQuotaTokens) * 100
              : 0;
            const clampedPercent = Math.min(usagePercent, 100);
            const deptEmployees = getEmployeesForDept(dept.id);
            const isExpanded = expandedDept === dept.id;

            let barColor = "bg-green-500";
            let textColor = "text-green-400";
            if (usagePercent > 80) {
              barColor = "bg-red-500";
              textColor = "text-red-400";
            } else if (usagePercent > 50) {
              barColor = "bg-yellow-500";
              textColor = "text-yellow-400";
            }

            return (
              <div key={dept.id} className="bg-gray-900 border border-gray-800 rounded-xl">
                <div
                  className="p-5 cursor-pointer hover:bg-gray-800/30 transition-colors"
                  onClick={() => setExpandedDept(isExpanded ? null : dept.id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-white text-lg">{dept.name}</h3>
                      <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded-full">
                        {deptEmployees.length} 人
                      </span>
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>

                  {hasQuota ? (
                    <>
                      <div className="w-full bg-gray-800 rounded-full h-2.5 mb-2">
                        <div
                          className={`h-2.5 rounded-full transition-all ${barColor}`}
                          style={{ width: `${clampedPercent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">
                          {formatTokens(dept.tokensUsedThisMonth)} / {formatTokens(dept.monthlyQuotaTokens)} tokens
                        </span>
                        <span className={`font-medium ${textColor}`}>{usagePercent.toFixed(1)}%</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-400">
                      <span className="inline-block bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-xs font-medium">
                        無限制
                      </span>
                      <span className="ml-2">已用 {formatTokens(dept.tokensUsedThisMonth)} tokens</span>
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-800 px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-300">員工列表</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEmpDeptId(dept.id);
                          setShowCreateEmp(true);
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        + 新增員工
                      </button>
                    </div>

                    {deptEmployees.length === 0 ? (
                      <p className="text-sm text-gray-600">此部門尚無員工</p>
                    ) : (
                      <div className="space-y-2">
                        {deptEmployees.map((emp) => (
                          <div
                            key={emp.id}
                            className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-2.5"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-medium text-gray-300">
                                {emp.name.charAt(0)}
                              </div>
                              <div>
                                <div className="text-sm text-white font-medium">{emp.name}</div>
                                <div className="text-xs text-gray-500">
                                  {emp.email || "未設定 Email"}
                                  {emp.role === "admin" && (
                                    <span className="ml-2 text-yellow-500">管理員</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteEmp(emp.id, emp.name);
                              }}
                              className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                            >
                              移除
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="text-xs text-gray-600 mt-3">
                      建立於 {new Date(dept.createdAt).toLocaleDateString("zh-TW")}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create department modal */}
      <Modal
        open={showCreateDept}
        onClose={() => { setShowCreateDept(false); setDeptError(""); }}
        title="新增部門"
      >
        <form onSubmit={handleCreateDept} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              部門名稱 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              required
              placeholder="例如：研發部"
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">每月 Token 額度</label>
            <input
              type="number"
              value={monthlyQuotaTokens}
              onChange={(e) => setMonthlyQuotaTokens(Number(e.target.value))}
              min={0}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-600 mt-1">1M = 1,000,000 tokens。設為 0 表示無限制。</p>
          </div>
          {deptError && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {deptError}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowCreateDept(false); setDeptError(""); }}
              className="px-4 py-2 text-sm border border-gray-700 rounded-lg text-gray-400 hover:bg-gray-800 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={creatingDept || !deptName.trim()}
              className="px-4 py-2 text-sm bg-blue-600 rounded-lg font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              {creatingDept ? "建立中..." : "建立"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Create employee modal */}
      <Modal
        open={showCreateEmp}
        onClose={() => { setShowCreateEmp(false); setEmpError(""); }}
        title="新增員工"
      >
        <form onSubmit={handleCreateEmp} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              姓名 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={empName}
              onChange={(e) => setEmpName(e.target.value)}
              required
              placeholder="例如：王小明"
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={empEmail}
              onChange={(e) => setEmpEmail(e.target.value)}
              placeholder="選填"
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              所屬部門 <span className="text-red-400">*</span>
            </label>
            <select
              value={empDeptId}
              onChange={(e) => setEmpDeptId(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">角色</label>
            <select
              value={empRole}
              onChange={(e) => setEmpRole(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="member">一般成員</option>
              <option value="admin">部門管理員</option>
            </select>
          </div>
          {empError && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {empError}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowCreateEmp(false); setEmpError(""); }}
              className="px-4 py-2 text-sm border border-gray-700 rounded-lg text-gray-400 hover:bg-gray-800 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={creatingEmp || !empName.trim() || !empDeptId}
              className="px-4 py-2 text-sm bg-blue-600 rounded-lg font-medium hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              {creatingEmp ? "建立中..." : "新增"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
