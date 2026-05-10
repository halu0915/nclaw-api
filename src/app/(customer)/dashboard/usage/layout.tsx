import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "用量明細 — N+Claw API",
  description: "依日期區間查詢 API 請求數、Token 數、費用與每日趨勢圖。",
};

export default function UsageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
