import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "N+Claw API | MEP 機電工程 AI",
  description: "台灣機電工程專用的 AI 介面。估算、法規查詢、報價，相容 OpenAI 格式，可直接接入既有系統。",
  metadataBase: new URL("https://nclaw.nplusstar.ai"),
  openGraph: {
    title: "N+Claw API | MEP 機電工程 AI",
    description: "台灣機電工程專用的 AI 介面。估算、法規查詢、報價，相容 OpenAI 格式，可直接接入既有系統。",
    url: "/",
    siteName: "N+Star 恩加斯達國際",
    locale: "zh_TW",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-TW"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
