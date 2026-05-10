import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "帳務 / 用量 — N+Claw API",
  description: "查看本月方案費用、API 用量明細與發票資訊。",
};

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
