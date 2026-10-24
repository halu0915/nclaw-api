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
  // 每頁 canonical 指向 nclaw 網域的同一路徑（api 網域的同內容頁不當正本）
  alternates: { canonical: "./" },
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

const SITE = "https://nclaw.nplusstar.ai";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://nplusstar.ai/#organization",
      name: "恩加斯達國際有限公司",
      alternateName: ["N+Star International Co., Ltd.", "N+Star"],
      url: "https://nplusstar.ai",
      logo: `${SITE}/nstar-logo.png`,
      email: "support@nplusstar.ai",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE}/#software`,
      name: "N+Claw API",
      url: SITE,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      inLanguage: "zh-TW",
      description:
        "台灣機電工程專用的 AI 介面。估算、法規查詢、報價，相容 OpenAI 格式，可直接接入既有系統。",
      publisher: { "@id": "https://nplusstar.ai/#organization" },
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "TWD",
        lowPrice: 2990,
        highPrice: 29900,
        offerCount: 3,
      },
    },
  ],
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
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
        {children}
      </body>
    </html>
  );
}
