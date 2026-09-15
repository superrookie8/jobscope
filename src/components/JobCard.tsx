import Link from "next/link";
import type { JobRow } from "@/lib/db";

export function JobCard({ job }: { job: JobRow }) {
  const fitColor = job.fit === "적합" ? "bg-emerald-100 text-emerald-800" : job.fit === "조건부" ? "bg-amber-100 text-amber-800" : "bg-zinc-100 text-zinc-700";
  return (
    <li className="rounded-lg border bg-white p-4 transition hover:shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/jobs/${encodeURIComponent(job.id)}`} className="font-semibold hover:underline">{job.title || "(제목 없음)"}</Link>
          <p className="text-sm text-zinc-700">{job.company} · {job.location || "지역 미상"} · {job.exp_text || (job.exp_min === 0 ? "신입" : job.exp_min ? `경력 ${job.exp_min}년↑` : "경력 미상")}</p>
        </div>
        <div className="flex flex-wrap gap-1 text-xs">
          {job.role && <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-800">{job.role}</span>}
          {job.fit && <span className={`rounded px-2 py-0.5 ${fitColor}`}>{job.fit}</span>}
          {job.is_real_hiring === 0 && <span className="rounded bg-red-50 px-2 py-0.5 text-red-700">상시성</span>}
        </div>
      </div>
      {job.role_note && <p className="mt-2 text-sm text-zinc-700">{job.role_note}</p>}
    </li>
  );
}
