import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "管理控制台 — N+Claw API",
  description: "N+Claw 內部管理後台：客戶、API Key、用量總覽。",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
