import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getJob, getAllJobIds } from "@/lib/db";

type Props = { params: Promise<{ id: string }> };

// 빌드 시 모든 공고 상세 페이지를 정적 HTML로 생성 → 검색엔진이 바로 읽을 수 있다.
export function generateStaticParams() {
  return getAllJobIds().map((id) => ({ id }));
}

// 페이지마다 다른 title/description/OG 태그. SEO의 핵심.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const job = getJob(decodeURIComponent(id));
  if (!job) return { title: "공고를 찾을 수 없음" };
  const title = `${job.title} – ${job.company}`;
  const description = [job.role, job.role_note, job.exp_min === 0 ? "신입 가능" : job.exp_min ? `경력 ${job.exp_min}년 이상` : null]
    .filter(Boolean).join(" · ").slice(0, 155);
  return {
    title,
    description,
    alternates: { canonical: `/jobs/${encodeURIComponent(job.id)}` },
    openGraph: { title, description, type: "article" },
  };
}

export default async function JobPage({ params }: Props) {
  const { id } = await params;
  const job = getJob(decodeURIComponent(id));
  if (!job) notFound();

  const required = job.skills.filter((s) => s.kind === "required");
  const preferred = job.skills.filter((s) => s.kind === "preferred");

  // 구조화 데이터(JSON-LD). 구글 채용공고 리치 결과가 읽는 형식.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.role_note ?? job.title,
    hiringOrganization: { "@type": "Organization", name: job.company },
    jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: job.location || "대한민국", addressCountry: "KR" } },
    employmentType: job.employment === "정규직" ? "FULL_TIME" : job.employment === "인턴" ? "INTERN" : "OTHER",
    url: job.url,
  };

  return (
    <article className="space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/" className="text-sm text-zinc-500 hover:underline">← 목록으로</Link>
      <header>
        <h1 className="text-2xl font-bold">{job.title}</h1>
        <p className="mt-1 text-zinc-600">{job.company} · {job.location || "지역 미상"} · {job.exp_text || "경력 미상"} {job.deadline && `· ${job.deadline}`}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card title="분류 결과">
          <Row k="실제 직무" v={job.role} />
          <Row k="하는 일" v={job.role_note} />
          <Row k="AI 관여도" v={job.ai_level == null ? null : ["무관", "AI 도구 활용 우대", "AI 활용이 핵심", "AI 모델·시스템 개발"][job.ai_level]} />
          <Row k="최소 경력" v={job.exp_min === 0 ? "신입" : job.exp_min ? `${job.exp_min}년` : null} />
          <Row k="도메인" v={job.domain} />
          <Row k="고용형태" v={job.employment} />
          <Row k="실채용 추정" v={job.is_real_hiring == null ? null : job.is_real_hiring ? "예" : "상시성 공고로 추정"} />
          <Row k="적합도" v={job.fit_hint} />
        </Card>
        <Card title="플랫폼 카테고리">
          <p className="text-sm">{job.categories.join(", ") || "-"}</p>
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block rounded bg-zinc-900 px-4 py-2 text-sm text-white">
            원문 보기 ({job.site === "saramin" ? "사람인" : "잡코리아"})
          </a>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <SkillList title="필수 역량" items={required} />
        <SkillList title="우대 역량" items={preferred} />
      </section>
    </article>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <h2 className="mb-2 font-semibold">{title}</h2>
      {children}
    </div>
  );
}
function Row({ k, v }: { k: string; v: string | null | undefined }) {
  if (!v) return null;
  return (
    <p className="text-sm"><span className="inline-block w-24 text-zinc-500">{k}</span>{v}</p>
  );
}
function SkillList({ title, items }: { title: string; items: { skill: string }[] }) {
  return (
    <Card title={title}>
      {items.length === 0 ? <p className="text-sm text-zinc-500">기재 없음</p> : (
        <ul className="flex flex-wrap gap-1">
          {items.map((s) => (
            <li key={s.skill}>
              <Link href={`/?skill=${encodeURIComponent(s.skill)}`} className="rounded bg-zinc-100 px-2 py-0.5 text-sm hover:bg-zinc-200">{s.skill}</Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
