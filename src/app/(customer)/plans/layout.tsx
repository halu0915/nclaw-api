import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "訂閱方案 — N+Claw API",
  description: "比較 N+Claw 各方案的額度、模型、Bot 通路與部門功能，選擇最適合的訂閱。",
};

export default function PlansLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
