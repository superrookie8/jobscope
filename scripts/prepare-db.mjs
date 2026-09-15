// DB 후처리: 역량 표기 정규화 테이블 생성. node scripts/prepare-db.mjs
import Database from "better-sqlite3";
const db = new Database("data/jobs.sqlite");

// 원문 표기 → 표준명 규칙. 위에서부터 첫 매칭.
const RULES = [
  [/react\s*native|^rn$/i, "React Native"], [/react[\s-]*query|tanstack/i, "React Query"],
  [/next(\.js)?/i, "Next.js"], [/react|리액트/i, "React"], [/vue|nuxt/i, "Vue"],
  [/typescript|^ts$|타입스크립트/i, "TypeScript"], [/javascript|^js$|자바스크립트|es6/i, "JavaScript"],
  [/node(\.js)?|express|nest/i, "Node.js"], [/^python|파이썬/i, "Python"], [/fastapi|django|flask/i, "Python 웹 프레임워크"],
  [/java\b(?!script)|spring|kotlin/i, "Java/Spring"], [/c#|\.net/i, "C#/.NET"], [/c\+\+|\bc언어|^c$/i, "C/C++"], [/golang|\bgo\b/i, "Go"],
  [/langchain|langgraph/i, "LangChain/LangGraph"], [/\brag\b|검색증강/i, "RAG"], [/벡터|vector|embedding|임베딩/i, "벡터DB/임베딩"],
  [/에이전트|agent/i, "AI 에이전트 구축"], [/프롬프트|prompt/i, "프롬프트 엔지니어링"], [/llm|openai|gpt|claude|gemini|생성형|generative|genai/i, "LLM/생성형 AI 활용"],
  [/파인튜닝|fine[\s-]*tun|lora/i, "파인튜닝"], [/pytorch|tensorflow|딥러닝|머신러닝|machine learning|deep learning|\bml\b/i, "ML 프레임워크"],
  [/mlops|서빙|serving/i, "MLOps/모델 서빙"], [/n8n|make\.com|zapier|자동화 (툴|도구)|워크플로/i, "자동화 툴(n8n/Make)"], [/rpa|uipath|power automate|power platform/i, "RPA/Power Platform"],
  [/cursor|copilot|ai (도구|툴)|ai 활용|ai 코딩/i, "AI 도구 활용"], [/\bsql|mysql|postgres|oracle|mariadb|쿼리|rdb/i, "SQL/RDB"], [/mongo|redis|nosql|elasticsearch/i, "NoSQL"],
  [/aws|gcp|azure|클라우드|cloud/i, "클라우드(AWS/GCP/Azure)"], [/docker|kubernetes|k8s|컨테이너/i, "Docker/K8s"], [/ci\/?cd|github actions|jenkins/i, "CI/CD"], [/\bgit\b|github|gitlab/i, "Git"],
  [/rest|api 설계|api 개발|graphql/i, "REST/GraphQL API"], [/figma|피그마/i, "Figma"], [/photoshop|illustrator|포토샵|일러스트/i, "Adobe 디자인 툴"], [/ui\/?ux|\bux\b|\bui\b/i, "UI/UX"],
  [/seo|검색엔진/i, "SEO"], [/데이터 분석|pandas|분석 역량|통계/i, "데이터 분석"], [/excel|엑셀|스프레드시트|google sheet/i, "Excel/스프레드시트"],
  [/광고|마케팅|퍼포먼스|ga4|gtm|메타 광고/i, "광고/마케팅 경험"], [/기획|\bpm\b|\bpo\b|prd|요구사항/i, "서비스 기획"], [/커뮤니케이션|소통|협업|협력/i, "커뮤니케이션/협업"],
  [/영어|english|토익|toeic/i, "영어"], [/컴퓨터공학|cs 전공|관련 전공|관련학과|전산/i, "CS/관련 전공"], [/포트폴리오/i, "포트폴리오"],
  [/학사|대졸|4년제|석사|박사|학위/i, "학위 요건"], [/경력 ?\d|년 ?이상|년차/i, "경력 연차 요건"], [/linux|리눅스|unix|shell/i, "Linux"],
];
// "Vue.js/React", "React 또는 Vue" 같은 복합 표기는 구분자로 나눠 각각 매칭 → 한 원문이 여러 표준명에 대응
const canon = (raw) => {
  const parts = raw.split(/\s*(?:\/|\+|,|·|또는|\bor\b|중 하나|중 1)\s*/i).filter(Boolean);
  const out = new Set();
  for (const part of parts.length ? parts : [raw]) {
    let hit = null;
    for (const [re, name] of RULES) if (re.test(part)) { hit = name; break; }
    if (hit) out.add(hit);
  }
  if (out.size === 0) out.add(raw.trim());
  return [...out];
};

db.exec(`DROP TABLE IF EXISTS skill_alias;
  CREATE TABLE skill_alias(raw TEXT NOT NULL, canonical TEXT NOT NULL, PRIMARY KEY(raw, canonical));`);
const ins = db.prepare("INSERT INTO skill_alias(raw, canonical) VALUES(?, ?)");
const raws = db.prepare("SELECT DISTINCT skill FROM job_skill").all().map((r) => r.skill);
db.transaction(() => raws.forEach((r) => canon(r).forEach((c) => ins.run(r, c))))();
// 인덱스: 검색·조인에 쓰이는 컬럼. 없으면 job_skill(8,285행)을 매 검색마다 전체 탐색한다.
db.exec(`CREATE INDEX IF NOT EXISTS idx_job_skill_job ON job_skill(job_id);
  CREATE INDEX IF NOT EXISTS idx_job_skill_skill ON job_skill(skill);
  CREATE INDEX IF NOT EXISTS idx_skill_alias_canonical ON skill_alias(canonical);
  CREATE INDEX IF NOT EXISTS idx_job_analysis_role ON job_analysis(role);
  CREATE INDEX IF NOT EXISTS idx_job_category_job ON job_category(job_id);
  CREATE INDEX IF NOT EXISTS idx_job_company ON job(company_id);
  ANALYZE;`);
const n = db.prepare("SELECT COUNT(DISTINCT canonical) AS n FROM skill_alias").get().n;
console.log(`skill_alias: ${raws.length} raw → ${n} canonical`);
db.close();
