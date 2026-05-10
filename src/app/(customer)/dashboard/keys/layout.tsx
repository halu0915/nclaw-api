import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Key 管理 — N+Claw API",
  description: "建立、撤銷、限額與指派 API Key 至部門或員工。",
};

export default function KeysLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
