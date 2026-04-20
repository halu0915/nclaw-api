"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "", companyName: "", contactName: "", phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/customer/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold">N+</div>
          </a>
          <h1 className="text-2xl font-bold">建立帳號</h1>
          <p className="text-gray-400 mt-2">開始使用 N+Claw AI 服務</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">公司名稱 *</label>
            <input type="text" required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500" placeholder="恩加斯達國際有限公司" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">聯絡人 *</label>
            <input type="text" required value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500" placeholder="王小明" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email *</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500" placeholder="user@company.com" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">密碼 *</label>
            <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500" placeholder="至少 6 碼" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">電話</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500" placeholder="0912-345-678" />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg py-3 font-medium transition-colors">
            {loading ? "註冊中..." : "註冊"}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          已有帳號？<a href="/login" className="text-blue-400 hover:text-blue-300"> 登入</a>
        </p>
      </div>
    </div>
  );
}
