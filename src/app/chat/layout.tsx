import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "聊天試用 — N+Claw API",
  description: "直接在瀏覽器與 N+Claw 多模型 AI 對話，測試 MEP 工程相關問題。",
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
