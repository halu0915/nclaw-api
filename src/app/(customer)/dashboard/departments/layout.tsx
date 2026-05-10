import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "部門管理 — N+Claw API",
  description: "建立部門、設定每月 Token 額度、新增與管理員工。",
};

export default function DepartmentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
