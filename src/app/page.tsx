import type { Metadata } from "next";
import Link from "next/link";
import { searchJobs, getRoles, getCanonicalSkills, type Filters } from "@/lib/db";
import { JobCard } from "@/components/JobCard";

export const metadata: Metadata = {
  title: "AI 직무 채용공고 검색",
  description: "직무·경력·요구 역량으로 사람인·잡코리아 AI 관련 공고를 검색합니다.",
  alternates: { canonical: "/" },
};

// Next.js 15+에서 searchParams는 Promise라서 await 해야 한다.
type SP = Record<string, string | string[] | undefined>;

export default async function Home({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const f: Filters = {
    q: str("q"),
    role: str("role"),
    exp: str("exp") as Filters["exp"],
    skill: str("skill"),
    real: str("real") === "1" ? "1" : undefined,
    page: Number(str("page") ?? 1) || 1,
  };
  const { rows, total, page, pages } = searchJobs(f);
  const roles = getRoles();
  const skills = getCanonicalSkills();

  // 페이지 링크에 현재 필터를 유지하기 위한 헬퍼
  const pageHref = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...f, page: p })) if (v) u.set(k, String(v));
    return `/?${u.toString()}`;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">AI 직무 채용공고 검색</h1>

      {/* 검색 폼. GET 방식이라 URL에 조건이 남아 공유·북마크가 된다. */}
      <form className="grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-6" method="get">
        <input name="q" defaultValue={f.q} placeholder="제목·회사·업무 검색" className="rounded border px-3 py-2 sm:col-span-2" />
        <select name="role" defaultValue={f.role ?? ""} className="rounded border px-3 py-2">
          <option value="">직무 전체</option>
          {roles.map((r) => (
            <option key={r.role} value={r.role}>{r.role} ({r.n})</option>
          ))}
        </select>
        <select name="exp" defaultValue={f.exp ?? ""} className="rounded border px-3 py-2">
          <option value="">경력 전체</option>
          <option value="entry">신입 가능</option>
          <option value="junior">1~2년</option>
          <option value="mid">3~5년</option>
          <option value="senior">6년 이상</option>
        </select>
        <input name="skill" list="skills" defaultValue={f.skill} placeholder="역량 (예: React)" className="rounded border px-3 py-2" />
        <datalist id="skills">{skills.map((s) => <option key={s.canonical} value={s.canonical}>{`${s.n}건`}</option>)}</datalist>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" name="real" value="1" defaultChecked={!!f.real} /> 실채용만
          </label>
          <button className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white">검색</button>
        </div>
      </form>

      <p className="text-sm text-zinc-600">{total.toLocaleString()}건 · {page}/{pages} 페이지</p>

      <ul className="grid gap-3">
        {rows.map((j) => <JobCard key={j.id} job={j} />)}
      </ul>

      <nav className="flex items-center justify-center gap-4 text-sm">
        {page > 1 && <Link href={pageHref(page - 1)} className="rounded border bg-white px-3 py-1">이전</Link>}
        {page < pages && <Link href={pageHref(page + 1)} className="rounded border bg-white px-3 py-1">다음</Link>}
      </nav>
    </div>
  );
}
