import type { MetadataRoute } from "next";
import { headers } from "next/headers";

const SITE = "https://nclaw.nplusstar.ai";

// 同一個部署掛兩個網域：api.nplusstar.ai 只給程式呼叫，nclaw.nplusstar.ai 是產品網站。
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = ((await headers()).get("host") || "").toLowerCase();

  if (host.startsWith("api.")) {
    // 不整站封鎖：搜尋引擎要能讀到首頁等頁面的 301，才會把舊收錄轉給 nclaw。
    return {
      rules: { userAgent: "*", disallow: ["/v1/", "/api/", "/admin", "/monitoring"] },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/v1/",
        "/admin",
        "/dashboard",
        "/billing",
        "/credits/",
        "/auth-error",
        "/monitoring",
        "/download/",
      ],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
