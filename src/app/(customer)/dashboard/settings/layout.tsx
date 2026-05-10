import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "後台設定 — N+Claw API",
  description: "管理公司資料、統一編號、通知信箱與目前訂閱方案。",
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
