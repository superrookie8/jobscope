import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3는 네이티브 모듈이라 번들에 넣지 않고 그대로 require 한다.
  serverExternalPackages: ["better-sqlite3"],
  // Vercel 서버리스 함수에 DB 파일이 같이 올라가도록 명시.
  outputFileTracingIncludes: { "/**": ["./data/jobs.sqlite"] },
};

export default nextConfig;
