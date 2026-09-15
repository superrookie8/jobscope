import type { MetadataRoute } from "next";
import { getAllJobIds } from "@/lib/db";

const SITE = process.env.SITE_URL ?? "http://localhost:3000";

// /sitemap.xml 자동 생성. 검색엔진이 전체 페이지 목록을 한 번에 읽는다.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/stats`, changeFrequency: "weekly", priority: 0.8 },
    ...getAllJobIds().map((id) => ({ url: `${SITE}/jobs/${encodeURIComponent(id)}`, changeFrequency: "weekly" as const, priority: 0.5 })),
  ];
}
