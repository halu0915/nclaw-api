import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "客戶後台 — N+Claw API",
  description: "查看本月用量、費用、API Key 與部門概覽。",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
