// 성능·정확도 측정 스크립트. node scripts/bench.mjs [라벨]
// 결과는 docs/bench-<라벨>.json 에 저장.
import Database from "better-sqlite3";
import { writeFileSync } from "fs";

const db = new Database("data/jobs.sqlite", { readonly: true });
const label = process.argv[2] ?? "run";
const N = 200; // 반복 횟수

function time(fn) {
  fn(); // 워밍업
  const t = process.hrtime.bigint();
  for (let i = 0; i < N; i++) fn();
  return Number(process.hrtime.bigint() - t) / 1e6 / N; // ms/회
}
const plan = (sql, ...p) => db.prepare("EXPLAIN QUERY PLAN " + sql).all(...p).map((r) => r.detail);

// 1. 역량 검색 정확도: 'React'로 검색했을 때 매칭되는 표기 종류 수
const skillLike = db.prepare("SELECT COUNT(DISTINCT skill) AS n FROM job_skill WHERE skill LIKE ?");
const hasCanonical = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='skill_alias'").get();
const distinctReact = skillLike.get("%React%").n;
const canonicalReact = hasCanonical
  ? db.prepare("SELECT COUNT(DISTINCT s.skill) AS n FROM job_skill s JOIN skill_alias a ON a.raw = s.skill WHERE a.canonical = 'React'").get().n
  : null;

// 2. 역량 필터 쿼리 시간 + 플랜
const skillSql = `SELECT j.id FROM job j JOIN job_analysis a ON a.job_id = j.id
  WHERE j.id IN (SELECT job_id FROM job_skill WHERE skill LIKE ?)`;
const skillQuery = { ms: time(() => db.prepare(skillSql).all("%React%")), plan: plan(skillSql, "%React%") };

// 3. 통계 페이지: 직무별 상위 역량을 구하는 데 드는 쿼리 수와 시간
const roles = db.prepare("SELECT role FROM job_analysis WHERE role IS NOT NULL AND role != '' GROUP BY role HAVING COUNT(*) >= 20").all().map((r) => r.role);
const perRole = db.prepare(`SELECT s.skill, COUNT(DISTINCT s.job_id) AS n FROM job_skill s JOIN job_analysis a ON a.job_id = s.job_id
  WHERE a.role = ? AND s.kind = ? GROUP BY s.skill ORDER BY n DESC LIMIT 12`);
const statsNplus1 = { queries: roles.length * 2, ms: time(() => { for (const r of roles) { perRole.all(r, "required"); perRole.all(r, "preferred"); } }) };
const oneShotSql = `SELECT role, kind, skill, n FROM (
    SELECT a.role, s.kind, s.skill, COUNT(DISTINCT s.job_id) AS n,
           ROW_NUMBER() OVER (PARTITION BY a.role, s.kind ORDER BY COUNT(DISTINCT s.job_id) DESC) AS rn
    FROM job_skill s JOIN job_analysis a ON a.job_id = s.job_id
    GROUP BY a.role, s.kind, s.skill)
  WHERE rn <= 12`;
const statsOneShot = { queries: 1, ms: time(() => db.prepare(oneShotSql).all()) };

const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'").all().map((r) => r.name);

const result = { label, at: new Date().toISOString(), indexes,
  skillSearch: { distinctSpellingsForReact: distinctReact, canonicalSpellingsForReact: canonicalReact, queryMs: +skillQuery.ms.toFixed(3), plan: skillQuery.plan },
  statsPage: { nPlus1: { queries: statsNplus1.queries, ms: +statsNplus1.ms.toFixed(2) }, oneShot: { queries: 1, ms: +statsOneShot.ms.toFixed(2) } } };
writeFileSync(`docs/bench-${label}.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
