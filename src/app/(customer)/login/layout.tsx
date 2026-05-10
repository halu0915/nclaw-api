import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "客戶登入 — N+Claw API",
  description: "登入 N+Claw 客戶後台，管理 API Key、用量與帳務。",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
