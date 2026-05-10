import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "驗證錯誤 — N+Claw API",
  description: "登入流程發生錯誤，請重試或返回登入頁。",
};

export default function AuthErrorLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
