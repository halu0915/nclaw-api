import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "客戶註冊 — N+Claw API",
  description: "建立 N+Claw 帳號並取得 API Key。",
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
