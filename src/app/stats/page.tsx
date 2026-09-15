import type { Metadata } from "next";
import Link from "next/link";
import { getRoleStats, getAllRoleSkills } from "@/lib/db";

export const metadata: Metadata = {
  title: "직무별 요구 역량 통계",
  description: "AI 관련 채용공고를 실제 업무 기준으로 분류하고, 직무별 필수·우대 역량 언급 비율을 집계했습니다.",
  alternates: { canonical: "/stats" },
};

export default function StatsPage() {
  const stats = getRoleStats();
  const skillsByRole = getAllRoleSkills(); // 쿼리 1회
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">직무별 요구 역량</h1>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-100 text-left">
            <tr><th className="p-2">직무</th><th className="p-2 text-right">공고</th><th className="p-2 text-right">신입가능</th><th className="p-2 text-right">실채용</th><th className="p-2 text-right">AI 핵심</th></tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.role} className="border-t">
                <td className="p-2"><Link href={`/?role=${encodeURIComponent(s.role)}`} className="hover:underline">{s.role}</Link></td>
                <td className="p-2 text-right">{s.n}</td>
                <td className="p-2 text-right">{Math.round(100 * s.entry / s.n)}%</td>
                <td className="p-2 text-right">{Math.round(100 * s.real / s.n)}%</td>
                <td className="p-2 text-right">{Math.round(100 * s.ai_core / s.n)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {stats.filter((s) => s.n >= 20).map((s) => (
        <section key={s.role} className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">{s.role} <span className="text-sm font-normal text-zinc-700">({s.n}건)</span></h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Bars title="필수" items={skillsByRole[s.role]?.required ?? []} />
            <Bars title="우대" items={skillsByRole[s.role]?.preferred ?? []} />
          </div>
        </section>
      ))}
    </div>
  );
}

function Bars({ title, items }: { title: string; items: { skill: string; n: number; pct: number }[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-zinc-700">{title}</h3>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.skill} className="text-sm">
            <div className="flex justify-between"><span>{it.skill}</span><span className="text-zinc-700">{it.pct}%</span></div>
            <div className="h-1.5 rounded bg-zinc-100"><div className="h-1.5 rounded bg-blue-500" style={{ width: `${Math.min(100, it.pct)}%` }} /></div>
          </li>
        ))}
      </ul>
    </div>
  );
}
