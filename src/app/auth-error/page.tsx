"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [retrying, setRetrying] = useState(false);
  const [retried, setRetried] = useState(false);

  // Auto-retry once on Configuration error
  useEffect(() => {
    if (error !== "Configuration" || retried) return;
    setRetried(true);
    setRetrying(true);
    const ac = new AbortController();
    // Wait 1 second then retry Google login
    const timer = setTimeout(async () => {
      try {
        const csrfRes = await fetch("/api/auth/csrf", { signal: ac.signal });
        const { csrfToken } = await csrfRes.json();
        if (ac.signal.aborted) return;

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
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return;
        setRetrying(false);
      }
    }, 1000);
    return () => {
      clearTimeout(timer);
      ac.abort();
    };
  }, [error, retried]);

  if (retrying) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">重新連線中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-400">登入錯誤</h1>
        <p className="text-gray-400 mb-6">請重試一次</p>
        <Link href="/login" className="px-6 py-3 bg-blue-600 rounded-lg text-sm inline-block">
          返回登入
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
      <ErrorContent />
    </Suspense>
  );
}
