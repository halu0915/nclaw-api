"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [retrying, setRetrying] = useState(false);
  const [retried, setRetried] = useState(false);

  // Auto-retry once on Configuration error
  useEffect(() => {
    if (error === "Configuration" && !retried) {
      setRetried(true);
      setRetrying(true);
      // Wait 1 second then retry Google login
      setTimeout(async () => {
        try {
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
        } catch {
          setRetrying(false);
        }
      }, 1000);
    }
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
        <a href="/login" className="px-6 py-3 bg-blue-600 rounded-lg text-sm inline-block">
          返回登入
        </a>
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
