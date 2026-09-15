import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

const SITE = process.env.SITE_URL ?? "http://localhost:3000";

// 사이트 공통 메타데이터. 각 페이지는 title만 덮어쓴다 (template의 %s 자리).
export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "JobScope – AI 직무 채용공고 탐색", template: "%s | JobScope" },
  description: "사람인·잡코리아 AI 관련 공고 1,300여 건을 실제 업무 기준으로 재분류하고 요구 역량을 집계한 채용공고 탐색기",
  openGraph: { type: "website", siteName: "JobScope", locale: "ko_KR" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-zinc-50 text-zinc-900 antialiased">
        <header className="border-b bg-white">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3 text-sm">
            <Link href="/" className="text-base font-bold tracking-tight">JobScope</Link>
            <Link href="/" className="text-zinc-600 hover:text-zinc-900">공고 검색</Link>
            <Link href="/stats" className="text-zinc-600 hover:text-zinc-900">직무별 요구 역량</Link>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-8 text-xs text-zinc-500">
          데이터: 사람인·잡코리아 공개 공고 (2026-09 수집). 직무 분류·역량 추출은 LLM 기반 추정치입니다.
        </footer>
      </body>
    </html>
  );
}
