"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-400">登入錯誤</h1>
        <p className="text-gray-400 mb-4">Error: {error || "Unknown"}</p>
        <pre className="bg-gray-900 rounded-lg p-4 text-xs text-left text-gray-500 mb-6 overflow-auto">
          {JSON.stringify(Object.fromEntries(searchParams.entries()), null, 2)}
        </pre>
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
