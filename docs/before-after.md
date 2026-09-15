# 코드 개선 전/후 기록

측정: `node scripts/bench.mjs <라벨>` → `docs/bench-before.json`, `docs/bench-after.json`.
before는 첫 커밋(f6d9662)의 DB, after는 현재 DB. 각 항목 200회 반복 평균, MacBook 로컬.

## 1. 역량 검색 정확도 — LIKE 부분일치 → 표준명 정확일치

**문제 발견**: 검색창에 `React`를 치면 React Native, React Query, "Vue.js/React" 등 46가지 표기가 섞여 나왔다.
DBeaver에서 `SELECT skill, COUNT(*) FROM job_skill WHERE skill LIKE '%React%' GROUP BY skill`로 확인.

**원인**: LLM이 추출한 역량 문자열을 그대로 저장하고 `LIKE '%검색어%'`로 비교.

**수정** (커밋 `역량 검색 정확도`): `skill_alias(raw, canonical)` 테이블을 규칙 기반으로 생성(`scripts/prepare-db.mjs`). 복합 표기("React 또는 Vue")는 분리해 각각 매핑. 검색은 `canonical = ?` 정확일치.

| | before (LIKE) | after (alias) |
|---|---|---|
| 'React' 검색 결과 | 92건 | 87건 (오탐 5건 제거) |
| 매칭되는 표기 종류 | 46종 | 1종(표준명) |
| 쿼리 시간 | 1.56 ms | 0.20 ms |
| 쿼리 플랜 | `SCAN job_skill` | `SEARCH ... USING INDEX` |

남은 한계: 규칙 매핑이라 새 표기가 들어오면 규칙을 추가해야 한다. 원문 6,203종 중 규칙에 안 걸린 것은 원문 그대로 표준명이 된다.

## 2. 인덱스 부재

**문제 발견**: `EXPLAIN QUERY PLAN`에 `SCAN job_skill`. 8,285행을 검색마다 전체 탐색.

**수정** (커밋 `인덱스 추가`): `job_skill(job_id)`, `job_skill(skill)`, `skill_alias(canonical)`, `job_analysis(role)`, `job_category(job_id)`, `job(company_id)`.

| | before | after |
|---|---|---|
| 인덱스 | 0개 (PK 자동 인덱스 제외) | 6개 |
| 통계용 직무별 쿼리 28회 합계 | 63 ms | 13 ms |

## 3. 통계 페이지 N+1 — 쿼리 28회 → 1회

**문제 발견**: `stats/page.tsx`에서 직무 14개를 `map` 돌며 필수·우대 2번씩 `getRoleSkills()` 호출. 반복문 안의 쿼리.

**수정** (커밋 `통계 페이지 N+1 제거`): `ROW_NUMBER() OVER (PARTITION BY role, kind)` 윈도우 함수로 직무·종류별 상위 12개를 한 번에 조회.

| | 28회 (N+1) | 1회 (윈도우) |
|---|---|---|
| 인덱스 없을 때 | 63 ms | 28 ms |
| 인덱스 있을 때 | 13 ms | 28 ms |

**정직한 결론**: 인덱스를 넣고 나니 이 데이터 규모(8천 행)에서는 28회 인덱스 조회가 윈도우 집계 1회보다 빠르다. 윈도우 쿼리는 매번 전체 행을 집계하기 때문.
그래도 1회 쿼리를 유지한 이유: (1) 이 페이지는 빌드 시 1회만 실행되는 정적 페이지라 15ms 차이는 무의미, (2) 직무가 100개로 늘면 N+1은 200회가 되지만 윈도우 쿼리는 그대로 1회, (3) DB 왕복이 네트워크를 타는 외부 DB(Postgres 등)로 옮기면 왕복 횟수가 시간을 지배한다.
배운 것: "N+1은 항상 느리다"가 아니라 "측정해서 결정한다".

## 재현
```bash
node scripts/prepare-db.mjs   # alias 테이블 + 인덱스 생성
node scripts/bench.mjs after  # 측정
git log --oneline             # 커밋별 diff: git show <해시>
```
