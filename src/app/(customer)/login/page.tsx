"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Check if already logged in
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => { if (s?.user) router.push("/dashboard"); })
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/customer/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Email 或密碼錯誤");
      return;
    }

    router.push("/dashboard");
  };

  const handleGoogleLogin = async () => {
    // Get CSRF token first, then POST to signin
    const csrfRes = await fetch("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();

    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/auth/signin/google";

    const csrfInput = document.createElement("input");
    csrfInput.type = "hidden";
    csrfInput.name = "csrfToken";
    csrfInput.value = csrfToken;
    form.appendChild(csrfInput);

    const callbackInput = document.createElement("input");
    callbackInput.type = "hidden";
    callbackInput.name = "callbackUrl";
    callbackInput.value = "/dashboard";
    form.appendChild(callbackInput);

    document.body.appendChild(form);
    form.submit();
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold">N+</div>
          </a>
          <h1 className="text-2xl font-bold">登入</h1>
          <p className="text-gray-400 mt-2">登入 N+Claw 客戶後台</p>
        </div>

        {/* Google Login */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 rounded-lg py-3 font-medium hover:bg-gray-100 transition-colors mb-4"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          使用 Google 帳號登入
        </button>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-sm text-gray-500">或使用 Email</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        {/* Email Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500" placeholder="user@company.com" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">密碼</label>
            <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500" placeholder="輸入密碼" />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg py-3 font-medium transition-colors">
            {loading ? "登入中..." : "登入"}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-6">
          還沒有帳號？<a href="/register" className="text-blue-400 hover:text-blue-300"> 免費註冊</a>
        </p>
      </div>
    </div>
  );
}
