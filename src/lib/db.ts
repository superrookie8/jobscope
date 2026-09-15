// SQLite 연결. 서버 컴포넌트에서만 import 한다 (브라우저에서는 못 씀).
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "jobs.sqlite");

// 개발 중 핫리로드마다 연결이 새로 열리는 걸 막기 위해 전역에 캐시
const g = globalThis as unknown as { __db?: Database.Database };
export const db =
  g.__db ?? (g.__db = new Database(DB_PATH, { readonly: true, fileMustExist: true }));

export type JobRow = {
  id: string;
  site: string;
  title: string;
  url: string;
  company: string;
  location: string;
  exp_text: string;
  deadline: string;
  role: string | null;
  role_note: string | null;
  ai_level: number | null;
  exp_min: number | null;
  domain: string | null;
  employment: string | null;
  is_real_hiring: number | null;
  fit: string | null;
  fit_hint: string | null;
};

export type Filters = {
  q?: string;
  role?: string;
  exp?: "entry" | "junior" | "mid" | "senior";
  skill?: string;
  real?: "1";
  page?: number;
};

const PAGE_SIZE = 30;

// 목록 조회. WHERE 절을 조건에 따라 조립하고, 값은 전부 ? 바인딩으로 넘긴다 (SQL 인젝션 방지).
export function searchJobs(f: Filters) {
  const where: string[] = [];
  const params: (string | number)[] = [];

  if (f.q) {
    where.push("(j.title LIKE ? OR c.name LIKE ? OR a.role_note LIKE ?)");
    params.push(`%${f.q}%`, `%${f.q}%`, `%${f.q}%`);
  }
  if (f.role) { where.push("a.role = ?"); params.push(f.role); }
  if (f.exp === "entry") where.push("a.exp_min = 0");
  if (f.exp === "junior") where.push("a.exp_min BETWEEN 1 AND 2");
  if (f.exp === "mid") where.push("a.exp_min BETWEEN 3 AND 5");
  if (f.exp === "senior") where.push("a.exp_min >= 6");
  if (f.real) where.push("a.is_real_hiring = 1");
  if (f.skill) {
    // 표준명 정확 일치. 'React'가 'React Native'·'React Query'에 섞이지 않도록 skill_alias를 거친다.
    where.push("j.id IN (SELECT s.job_id FROM job_skill s JOIN skill_alias al ON al.raw = s.skill WHERE al.canonical = ?)");
    params.push(f.skill);
  }

  const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";
  const base = `
    FROM job j
    JOIN company c ON c.id = j.company_id
    LEFT JOIN job_analysis a ON a.job_id = j.id
    ${whereSql}`;

  const total = (db.prepare(`SELECT COUNT(*) AS n ${base}`).get(...params) as { n: number }).n;
  const page = Math.max(1, f.page ?? 1);
  const rows = db
    .prepare(`SELECT j.id, j.site, j.title, j.url, c.name AS company, j.location, j.exp_text, j.deadline,
                     a.role, a.role_note, a.ai_level, a.exp_min, a.domain, a.employment, a.is_real_hiring, a.fit, a.fit_hint
              ${base}
              ORDER BY a.is_real_hiring DESC, j.crawled_at DESC, j.id DESC
              LIMIT ? OFFSET ?`)
    .all(...params, PAGE_SIZE, (page - 1) * PAGE_SIZE) as JobRow[];

  return { rows, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export function getJob(id: string) {
  const job = db
    .prepare(`SELECT j.id, j.site, j.title, j.url, c.name AS company, j.location, j.exp_text, j.deadline,
                     a.role, a.role_note, a.ai_level, a.exp_min, a.domain, a.employment, a.is_real_hiring, a.fit, a.fit_hint
              FROM job j JOIN company c ON c.id = j.company_id
              LEFT JOIN job_analysis a ON a.job_id = j.id
              WHERE j.id = ?`)
    .get(id) as JobRow | undefined;
  if (!job) return null;
  // 원문 표기와 함께 표준명(canonical)을 가져와 링크는 표준명으로 건다
  const skills = db
    .prepare(`SELECT s.skill, s.kind, GROUP_CONCAT(al.canonical, '|') AS canonical
              FROM job_skill s LEFT JOIN skill_alias al ON al.raw = s.skill
              WHERE s.job_id = ? GROUP BY s.skill, s.kind ORDER BY s.kind DESC, s.skill`)
    .all(id) as { skill: string; kind: string; canonical: string | null }[];
  const categories = (db.prepare(`SELECT category FROM job_category WHERE job_id = ?`).all(id) as { category: string }[]).map((r) => r.category);
  return { ...job, skills, categories };
}

export function getRoles() {
  return db
    .prepare(`SELECT role, COUNT(*) AS n FROM job_analysis WHERE role IS NOT NULL AND role != '' GROUP BY role ORDER BY n DESC`)
    .all() as { role: string; n: number }[];
}

// 직무별 필수/우대 역량 상위 N개 (통계 페이지용)
export function getRoleSkills(role: string, kind: "required" | "preferred", limit = 12) {
  return db
    .prepare(`SELECT s.skill, COUNT(DISTINCT s.job_id) AS n,
                     ROUND(100.0 * COUNT(DISTINCT s.job_id) / (SELECT COUNT(*) FROM job_analysis WHERE role = ?), 0) AS pct
              FROM job_skill s JOIN job_analysis a ON a.job_id = s.job_id
              WHERE a.role = ? AND s.kind = ?
              GROUP BY s.skill ORDER BY n DESC LIMIT ?`)
    .all(role, role, kind, limit) as { skill: string; n: number; pct: number }[];
}

export function getRoleStats() {
  return db
    .prepare(`SELECT role, COUNT(*) AS n,
                     SUM(CASE WHEN exp_min = 0 THEN 1 ELSE 0 END) AS entry,
                     SUM(CASE WHEN is_real_hiring = 1 THEN 1 ELSE 0 END) AS real,
                     SUM(CASE WHEN ai_level >= 2 THEN 1 ELSE 0 END) AS ai_core
              FROM job_analysis WHERE role IS NOT NULL AND role != ''
              GROUP BY role ORDER BY n DESC`)
    .all() as { role: string; n: number; entry: number; real: number; ai_core: number }[];
}

// 검색 자동완성용 표준 역량 목록 (많이 언급된 순)
export function getCanonicalSkills(limit = 60) {
  return db
    .prepare(`SELECT al.canonical, COUNT(DISTINCT s.job_id) AS n FROM job_skill s JOIN skill_alias al ON al.raw = s.skill
              GROUP BY al.canonical ORDER BY n DESC LIMIT ?`)
    .all(limit) as { canonical: string; n: number }[];
}

export function getAllJobIds() {
  return (db.prepare(`SELECT id FROM job`).all() as { id: string }[]).map((r) => r.id);
}
