import type { MetadataRoute } from "next";

const SITE = "https://nclaw.nplusstar.ai";

// 只列不需登入即可看到內容的公開頁
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/pro`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE}/bot`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/chat`, changeFrequency: "monthly", priority: 0.6 },
  ];
}
