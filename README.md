# JobScope

배포: https://jobscope-mu.vercel.app  
Lighthouse (2026-09-16, 목록 페이지): Performance 100 · Accessibility 100 · Best Practices 100 · SEO 100

사람인·잡코리아의 AI 관련 채용공고 1,323건을 수집해, 공고 제목이 아니라 **실제 수행 업무 기준**으로 직무를 재분류하고 요구 역량을 집계한 탐색 사이트입니다.

플랫폼 추천은 직무명 키워드로만 매칭해서 "프론트엔드 경력 → 프론트엔드 공고만" 같은 편중이 생깁니다. 본문을 읽어 재분류하면 "AI 자동화 빌더"처럼 아직 이름이 정착되지 않은 직무도 잡을 수 있습니다.

## 기능
- 공고 검색: 키워드, 실제 직무, 경력 구간, 요구 역량, 실채용 여부로 필터 (`/`)
- 공고 상세: 분류 결과, 필수·우대 역량, 원문 링크. 역량 클릭 시 해당 역량 요구 공고로 이동 (`/jobs/[id]`)
- 직무별 통계: 공고 수, 신입 가능 비율, 필수·우대 역량 언급 비율 (`/stats`)

## 기술
- **Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS**
- **SQLite + better-sqlite3**: 서버 컴포넌트에서 직접 SQL 실행. 목록 필터는 조건별 WHERE 절 조립 + 파라미터 바인딩, 통계는 JOIN/GROUP BY 집계 (`src/lib/db.ts`)
- **SEO**: 공고 1,323건을 빌드 시 정적 생성(`generateStaticParams`), 페이지별 `generateMetadata`로 title/description/canonical/OG, JSON-LD `JobPosting`, `sitemap.xml`·`robots.txt` 자동 생성
- 데이터 파이프라인(수집·LLM 분류·집계)은 별도 Python 스크립트로 구성

## 데이터 구조
```
company(id, name)
job(id, site, company_id → company.id, title, url, location, exp_text, deadline, keyword, body_len, crawled_at)
job_category(job_id → job.id, category)
job_analysis(job_id → job.id, role, role_note, ai_level, exp_min, domain, employment, is_real_hiring, fit, fit_hint)
job_skill(job_id → job.id, skill, kind: required | preferred)
```

## 실행
```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```
배포 시 `SITE_URL`에 실제 주소를 넣어야 sitemap·canonical이 올바른 도메인으로 생성됩니다.

## 코드 개선 기록
[docs/before-after.md](docs/before-after.md): 역량 검색 정확도, 인덱스, 통계 N+1 — 측정값과 함께 전/후 비교.

## 한계
- 직무 분류와 역량 추출은 LLM 추정치라 오분류가 있을 수 있습니다.
- 사람인 이미지 공고 일부는 본문 없이 제목·카테고리만으로 분류됐습니다.
