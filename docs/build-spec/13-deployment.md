# 13 · 배포 · 운영 · 런북 (lock)

> 본 문서만 보고 환경 셋업, CI/CD, 모니터링, 사고 대응이 가능해야 한다. 변경 시 INDEX 변경 관리 절차 따름. 인프라 비용·계약은 별도 문서.

**Source of truth**: 본 문서 > Vercel/Supabase 콘솔 설정 > GitHub Actions 워크플로 파일. 충돌 시 본 문서 우선, 콘솔/YAML 동기화 PR 발행.

---

## 1. 인프라 구성 (lock)

### 1.1 호스팅 매핑

| 컴포넌트 | 공급자 | 플랜 | 비고 |
|---|---|---|---|
| Next.js (web) | Vercel | Pro | Edge runtime + Node runtime 혼합 |
| PostgreSQL + Auth + Storage | Supabase | Pro (Q2까지 Free → Q3 Pro 승격) | RLS, branching, PITR |
| Edge Functions (cron) | Supabase Functions | Pro 포함 | Deno 1.x |
| 결제 | Toss Payments | KR 표준 결제창 | 사업자 등록 필요 |
| 이메일 | Resend | Free 3K → Pro 50K | Q3 Pro 승격 |
| 모니터링 | Sentry | Team | source map 업로드 + Web Vitals |
| 로그 집계 | Better Stack (Logtail) | Free → Team Q3 | Vercel drain |
| Uptime | Better Stack Uptime | Free | /api/health 1분 간격 |
| 도메인/DNS | Cloudflare | Free | A/CNAME만, proxy 비활성 (Vercel SSL 충돌 회피) |
| iOS 빌드 | Xcode Cloud 또는 fastlane | Apple Developer Program | Q3+ |

### 1.2 도메인 매핑

| 도메인 | 환경 | 라우팅 |
|---|---|---|
| `deepen.kr` | production | Vercel `main` |
| `www.deepen.kr` | production | 301 → `deepen.kr` |
| `staging.deepen.kr` | staging | Vercel `staging` 브랜치 |
| `*.deepen.kr` (학원 화이트라벨) | production | Vercel wildcard + 미들웨어에서 `org_slug` 추출 |
| `api.deepen.kr` | (예약) | Q4 외부 API 공개 시 사용 |
| `cdn.deepen.kr` | production | Supabase Storage 공개 버킷 CNAME |

**DNS 레코드 (Cloudflare)**:
```
deepen.kr            A      76.76.21.21              (Vercel)
www.deepen.kr        CNAME  cname.vercel-dns.com.    (proxy off)
staging.deepen.kr    CNAME  cname.vercel-dns.com.    (proxy off)
*.deepen.kr          CNAME  cname.vercel-dns.com.    (proxy off)
cdn.deepen.kr        CNAME  <project>.supabase.co.   (proxy off)
```

Cloudflare proxy(주황 구름)는 **반드시 off**. Vercel SSL이 직접 발급되어야 함.

### 1.3 CDN

- **정적 자산** (`_next/static/*`, `public/*`): Vercel CDN 자동
- **사용자 업로드 PDF + 이미지**: Supabase Storage. `documents` 버킷은 RLS, `public-cdn` 버킷은 공개(브랜드 이미지·아바타 등)
- **이미지 최적화**: `next/image` (Vercel) 사용. 외부 호스트는 `next.config.ts`의 `images.remotePatterns`에 명시

---

## 2. 환경 분리

| 환경 | 트리거 | 호스팅 | DB | 비고 |
|---|---|---|---|---|
| local | 개발자 머신 | `pnpm dev` | Supabase Local (Docker) | 시드 자동 |
| preview | 모든 PR | Vercel Preview | Supabase Branch (PR마다 자동 생성) | 머지·close 시 정리 |
| staging | `staging` 브랜치 push | `staging.deepen.kr` | Supabase Staging 프로젝트 | 데모·QA 용 |
| production | `main` 브랜치 push (release tag 권장) | `deepen.kr` | Supabase Production 프로젝트 | 사용자 트래픽 |

### 2.1 local 셋업 절차

```bash
# 1) 저장소 + Node + pnpm
git clone git@github.com:deepen-team/deepy-prototype.git
cd deepy-prototype
nvm install 22 && nvm use 22
corepack enable && corepack prepare pnpm@latest --activate
pnpm install

# 2) Supabase Local
brew install supabase/tap/supabase   # 또는 scoop install supabase
supabase start                        # postgres + auth + storage 컨테이너 기동

# 3) 환경 변수
cp .env.example .env.local
# Supabase Local URL/key는 `supabase status` 출력 사용

# 4) 마이그레이션 + 시드
pnpm db:migrate
pnpm db:seed

# 5) 개발 서버
pnpm dev                              # http://localhost:3000
```

`supabase start` 실패 시: Docker Desktop 실행 여부 + WSL2 (Windows) 활성화 확인.

### 2.2 preview (PR) 흐름

1. PR 생성 → GitHub Actions가 Supabase Branch 생성 (`supabase branches create pr-<num>`)
2. Vercel Preview에 해당 branch URL/key 환경 변수 자동 주입
3. PR `Closed`/`Merged` 시 Actions가 Supabase Branch 삭제

### 2.3 staging 프로모션

`main`에 누적된 변경을 `staging` 브랜치에 머지 → 자동 배포. 매주 월요일 release notes 작성.

### 2.4 production 프로모션

- `main` push = production 배포 (Vercel auto)
- **release tag** (`v1.2.3`)는 release notes + Sentry release marker 발행 트리거
- hotfix는 `hotfix/*` 브랜치 → `main` 직접 머지 후 `staging` cherry-pick

---

## 3. 환경 변수 매트릭스

`docs/build-spec/01-tech-stack.md` 환경 변수 목록의 **저장 위치 + 클라이언트 노출 여부** 매트릭스. `lib/env.ts`에서 zod 검증.

### 3.1 키별 매트릭스

| 키 | 노출 | local | preview | staging | production | 저장소 |
|---|---|---|---|---|---|---|
| `SUPABASE_URL` | server | `.env.local` | Vercel env | Vercel env | Vercel env | Vercel |
| `NEXT_PUBLIC_SUPABASE_URL` | **client** | `.env.local` | Vercel env | Vercel env | Vercel env | Vercel |
| `SUPABASE_ANON_KEY` | server | `.env.local` | Vercel env | Vercel env | Vercel env | Vercel |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **client** | `.env.local` | Vercel env | Vercel env | Vercel env | Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | `.env.local` | Vercel env (encrypted) | Vercel env | Vercel env | Vercel |
| `DATABASE_URL` | server only | `.env.local` | Vercel env | Vercel env | Vercel env | Vercel |
| `ANTHROPIC_API_KEY` | server only | `.env.local` | Vercel env | Vercel env | Vercel env | Vercel + 1Password |
| `OPENAI_API_KEY` | server only | `.env.local` | Vercel env | Vercel env | Vercel env | Vercel + 1Password |
| `RESEND_API_KEY` | server only | `.env.local` | Vercel env | Vercel env | Vercel env | Vercel |
| `TOSS_CLIENT_KEY` | **client** | sandbox | sandbox | sandbox | live | Vercel |
| `TOSS_SECRET_KEY` | server only | sandbox | sandbox | sandbox | live | Vercel + 1Password |
| `NEXT_PUBLIC_APP_URL` | client | `http://localhost:3000` | Vercel auto preview URL | `https://staging.deepen.kr` | `https://deepen.kr` | Vercel |
| `NEXT_PUBLIC_SENTRY_DSN` | client | (off) | dev DSN | staging DSN | prod DSN | Vercel |
| `SENTRY_AUTH_TOKEN` | server only (build time) | — | GitHub Secret | GitHub Secret | GitHub Secret | GitHub Actions |
| `DOCUMENT_JOB_WORKER_TOKEN` | server only | random local | Vercel env | Vercel env | Vercel env | Vercel |
| `CRON_SECRET` | server only | random local | Vercel env | Vercel env | Vercel env | Vercel + Supabase secrets |
| `SUPABASE_FUNCTIONS_DEPLOY_TOKEN` | CI only | — | — | GitHub Secret | GitHub Secret | GitHub Actions |
| `VERCEL_TOKEN` | CI only | — | — | GitHub Secret | GitHub Secret | GitHub Actions |
| `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` | CI only | — | — | GitHub Secret | GitHub Secret | GitHub Actions |

**규칙**:
- `NEXT_PUBLIC_*` 만 클라이언트 번들에 포함
- `SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` 등 **절대 클라이언트 컴포넌트에서 import 금지** — `import 'server-only'` 가드
- 1Password Vault `Deepen / Production` 에 매스터 사본, Vercel은 작업 사본
- 키 회전(§10.3) 후 1Password ↔ Vercel ↔ Supabase 모두 동기화

### 3.2 zod 검증 (`lib/env.ts`)

```typescript
import 'server-only'
import { z } from 'zod'

const ServerEnv = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  DATABASE_URL: z.string().url(),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-'),
  OPENAI_API_KEY: z.string().startsWith('sk-'),
  RESEND_API_KEY: z.string().startsWith('re_'),
  TOSS_SECRET_KEY: z.string().min(10),
  CRON_SECRET: z.string().min(32),
  DOCUMENT_JOB_WORKER_TOKEN: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url(),
})

const ClientEnv = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  TOSS_CLIENT_KEY: z.string().min(10),
})

export const env = ServerEnv.parse(process.env)
export const publicEnv = ClientEnv.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  TOSS_CLIENT_KEY: process.env.TOSS_CLIENT_KEY,
})
```

**부팅 시 1회**: `app/layout.tsx`에서 `import '@/lib/env'` 강제 → 누락 시 빌드/부팅 실패.

---

## 4. CI/CD 파이프라인 (GitHub Actions)

### 4.1 워크플로 매트릭스

| 파일 | 트리거 | 실행 |
|---|---|---|
| `.github/workflows/pr.yml` | `pull_request` | lint + typecheck + unit test + Supabase branch |
| `.github/workflows/main.yml` | `push: main` | build + E2E + DB migrate(prod) + Vercel deploy |
| `.github/workflows/staging.yml` | `push: staging` | build + DB migrate(staging) + Vercel deploy |
| `.github/workflows/release.yml` | `push: tag v*` | smoke + Sentry release + 보호자 공지 |
| `.github/workflows/nightly.yml` | `schedule: 02:00 KST` | full E2E + RLS lint + dependency audit |
| `.github/workflows/edge-functions.yml` | `push: main` (paths: `supabase/functions/**`) | Supabase Functions 배포 |

### 4.2 PR 워크플로

```yaml
# .github/workflows/pr.yml
name: pr
on:
  pull_request:
    branches: [main, staging]
jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test:unit -- --coverage
      - run: pnpm test:rls         # RLS 정책 정적 lint (§10.1)
      - uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  supabase-branch:
    runs-on: ubuntu-latest
    needs: verify
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase branches create pr-${{ github.event.number }} --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
      - run: supabase db push --branch pr-${{ github.event.number }}
```

### 4.3 main 브랜치 워크플로

```yaml
# .github/workflows/main.yml
name: main
on:
  push:
    branches: [main]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    environment: production
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile

      # 1) DB 마이그레이션 (먼저 실행 - 새 코드가 새 스키마를 기대)
      - name: DB migrate (production)
        run: pnpm db:migrate:prod
        env:
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}

      # 2) 빌드 + Sentry source map
      - name: Build
        run: pnpm build
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          NEXT_PUBLIC_SENTRY_DSN: ${{ secrets.PROD_SENTRY_DSN }}

      # 3) E2E (preview URL 대상, prod 배포 직전 게이트)
      - name: Vercel pre-deploy
        id: deploy
        run: |
          DEPLOY_URL=$(npx vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }})
          echo "url=$DEPLOY_URL" >> $GITHUB_OUTPUT
      - name: E2E
        run: pnpm test:e2e
        env:
          PLAYWRIGHT_BASE_URL: ${{ steps.deploy.outputs.url }}

      # 4) production promote
      - name: Promote to production
        run: npx vercel promote ${{ steps.deploy.outputs.url }} --token=${{ secrets.VERCEL_TOKEN }}

      # 5) Sentry release
      - uses: getsentry/action-release@v1
        env:
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
          SENTRY_ORG: deepen
          SENTRY_PROJECT: web
        with:
          environment: production
          version: ${{ github.sha }}
```

**중요한 순서**: DB migrate → build → deploy. 코드 배포 전에 스키마가 준비되어야 함. forward-only 원칙(§5).

### 4.4 release tag 워크플로

```yaml
# .github/workflows/release.yml
name: release
on:
  push:
    tags: ['v*.*.*']
jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:smoke
        env:
          SMOKE_BASE_URL: https://deepen.kr
      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            { "text": ":rocket: Release ${{ github.ref_name }} smoke OK" }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_RELEASE_WEBHOOK }}
```

### 4.5 nightly 워크플로

매일 02:00 KST (UTC 17:00):
- 전체 E2E (M*당 시나리오 + acceptance 12)
- RLS 정책 정적 lint (`pnpm test:rls`)
- `pnpm audit --prod`
- Lighthouse CI (홈, /v2/home, /v2/solve/[id])
- 실패 시 #alerts 슬랙 + GitHub Issue 자동 생성

---

## 5. DB 마이그레이션 운영

### 5.1 도구

- **drizzle-kit** 마이그레이션 생성: `pnpm db:generate -- --name <slug>`
- **drizzle-kit migrate** 적용: `pnpm db:migrate` (local/preview/staging/prod 모두)
- **forward-only**: `down` 마이그레이션 작성 금지. 잘못된 마이그레이션은 새 hotfix 마이그레이션으로 보정

### 5.2 마이그레이션 ID 매핑 (lock)

| 분기 | 마이그레이션 범위 | 내용 |
|---|---|---|
| Q1 | `0004` ~ `0006` | attempts, items, patterns 확장 |
| Q2 | `0007` ~ `0008` | recap_cards, ocr 캐시 |
| Q3 | `0009` ~ `0011` | embeddings (pgvector), billing, ai_coach_quota |
| Q4 | `0012` | teacher/org RLS, exam_packs |

`drizzle/meta/_journal.json`이 단일 진실. 충돌 시 절대 직접 수정하지 말고 `drizzle-kit drop` 후 재생성.

### 5.3 package.json 스크립트

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:migrate:staging": "DATABASE_URL=$STAGING_DATABASE_URL drizzle-kit migrate",
    "db:migrate:prod": "DATABASE_URL=$PROD_DATABASE_URL drizzle-kit migrate",
    "db:seed": "tsx scripts/seed/index.ts",
    "db:seed:prod": "tsx scripts/seed/index.ts --env=production --only=patterns,units"
  }
}
```

### 5.4 락 충돌 회피

Supabase는 `pg_advisory_lock` 기반 마이그레이션 락을 사용. 동시에 두 워크플로(예: main push + edge function deploy)가 마이그레이션을 시도하면 후자가 대기 → 60초 timeout.

**완화책**:
- 마이그레이션은 `main.yml`만 실행. `edge-functions.yml`은 의존만 하고 마이그레이션 자체는 안 함
- `concurrency: group: db-migrate-prod, cancel-in-progress: false` 설정

```yaml
concurrency:
  group: db-migrate-${{ github.ref }}
  cancel-in-progress: false
```

### 5.5 마이그레이션 실패 시 절차

1. 즉시 Vercel 배포 롤백 (`vercel rollback <previous-sha>`)
2. 마이그레이션 SQL 직접 검사 (Supabase SQL editor)
3. 부분 적용 상태면 hotfix 마이그레이션 작성 (예: `0011_5_fix_constraint.sql`)
4. staging에서 재현 + 검증
5. main 재푸시
6. PIR 작성 (§14)

**금지**: production DB에서 `DROP TABLE`, `ALTER TYPE` 직접 실행. 모두 마이그레이션 파일을 거쳐야 감사 추적 가능.

### 5.6 큰 테이블 마이그레이션

`attempts`, `embeddings` 등 row가 많은 테이블에 `ALTER TABLE` 적용 시:
- `lock_timeout = '5s'` 설정 후 시작
- 새 컬럼 추가 + 기본값은 두 단계: (1) NULLable으로 추가 (2) 백필 (3) NOT NULL 제약
- 인덱스는 `CREATE INDEX CONCURRENTLY`

---

## 6. Supabase Edge Functions 배포

### 6.1 함수 목록

| 함수 | 트리거 | KST 일정 | 설명 |
|---|---|---|---|
| `daily-challenge` | cron | 매일 00:00 | 어제 풀이 분석 → 오늘의 도전 카드 생성 |
| `weekly-parent-report` | cron | 일 09:00 | 보호자 주간 리포트 메일 |
| `embed-items` | cron | 매일 03:00 | 신규 item 임베딩 (incremental) |
| `document-jobs-process` | cron | 1분마다 | document_jobs 큐 워커 (백업, 메인은 Vercel) |
| `daily-cleanup` | cron | 매일 04:00 | 만료 세션·OTP·preview branch 정리 |
| `toss-webhook` | HTTP | (실시간) | 결제 웹훅 (signature 검증) |

### 6.2 디렉터리 구조

```
supabase/
├── config.toml
├── migrations/                # Drizzle 산출물 미러 (자동 동기화)
└── functions/
    ├── _shared/               # 공통 유틸 (Deno)
    ├── daily-challenge/
    │   └── index.ts
    ├── weekly-parent-report/
    │   └── index.ts
    ├── embed-items/
    │   └── index.ts
    ├── document-jobs-process/
    │   └── index.ts
    ├── daily-cleanup/
    │   └── index.ts
    └── toss-webhook/
        └── index.ts
```

### 6.3 cron 등록 (Supabase Dashboard 또는 SQL)

```sql
-- pg_cron 익스텐션 (Supabase Pro에서 활성)
SELECT cron.schedule(
  'daily-challenge',
  '0 15 * * *',  -- UTC 15:00 = KST 00:00
  $$ SELECT net.http_post(
       url := 'https://<ref>.functions.supabase.co/daily-challenge',
       headers := jsonb_build_object(
         'Authorization', 'Bearer ' || current_setting('app.cron_secret'),
         'Content-Type', 'application/json'
       )
     ) $$
);

SELECT cron.schedule(
  'weekly-parent-report',
  '0 0 * * 0',    -- UTC Sun 00:00 = KST Sun 09:00
  $$ SELECT net.http_post(
       url := 'https://<ref>.functions.supabase.co/weekly-parent-report',
       headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.cron_secret'))
     ) $$
);
```

`current_setting('app.cron_secret')` 은 Supabase Dashboard `Database → Settings → Custom Postgres Config`에서 1회 등록.

### 6.4 배포 자동화

```yaml
# .github/workflows/edge-functions.yml
name: edge-functions
on:
  push:
    branches: [main]
    paths: ['supabase/functions/**', 'supabase/config.toml']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

### 6.5 secret 관리

```bash
# 함수 secret (Deno runtime에서 Deno.env.get)
supabase secrets set \
  ANTHROPIC_API_KEY=... \
  OPENAI_API_KEY=... \
  RESEND_API_KEY=... \
  CRON_SECRET=... \
  --project-ref <ref>
```

함수에서 `Authorization: Bearer ${CRON_SECRET}` 검증 후 처리. 실패 시 401.

---

## 7. 모니터링 + 알람

### 7.1 Sentry

**Web (Next.js)**:
- `instrumentation.ts` 에 `Sentry.init`
- traces sample rate: production 0.1, staging 1.0
- replay sample rate: production 0.0 (PII 위험), staging 0.1
- Web Vitals: LCP, INP, CLS 자동 수집

**서버**:
- Edge Function 내부 try/catch + `Sentry.captureException`
- API route는 `withAuth`가 자동으로 wrap

**소스맵**: 빌드 시 `@sentry/nextjs` 플러그인이 업로드 (`SENTRY_AUTH_TOKEN` 필요)

### 7.2 Custom Metrics

`lib/metrics/` 에 정의. Sentry custom metric 또는 자체 `metrics_events` 테이블.

| 지표 | 정의 | 알람 임계 |
|---|---|---|
| `llm.cache_hit_rate` | (cache_creation + cache_read) / total tokens | < 60% (1h 평균) |
| `ai_coach.first_token_ms` | 코치 chat 첫 토큰까지 ms | p95 > 1500ms |
| `ai_coach.suggest_latency_ms` | 사전 제안 생성 latency | p95 > 800ms |
| `attempt.confidence_score_dist` | 자신감 슬라이더 분포 | (분석용, 알람 없음) |
| `attempt.grading_latency_ms` | 채점 RPC 시간 | p95 > 200ms |
| `recap.diagnose_latency_ms` | BN 진단 latency | p95 > 500ms |
| `document_job.processing_seconds` | PDF 1개 처리 시간 | p95 > 60s |
| `document_job.failure_rate` | 실패 / 전체 | > 5% (1h) |
| `api.error_rate` | 5xx / 전체 | > 1% (5min) |
| `embedding.queue_depth` | 미처리 item 수 | > 1000 |

### 7.3 Healthcheck

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { sql } from 'drizzle-orm'

export const runtime = 'nodejs'
export const revalidate = 0

export async function GET() {
  const checks: Record<string, 'ok' | string> = {}
  try {
    await db.execute(sql`select 1`)
    checks.db = 'ok'
  } catch (e) {
    checks.db = String(e)
  }
  // 간단 체크: 외부 API는 ping 안 함 (rate limit 영향)
  const allOk = Object.values(checks).every(v => v === 'ok')
  return NextResponse.json(
    { ok: allOk, checks, version: process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev' },
    { status: allOk ? 200 : 503 }
  )
}
```

Better Stack Uptime이 1분 간격 ping. 2회 연속 실패 → #alerts.

### 7.4 알람 채널

| 채널 | 용도 | 받는 사람 |
|---|---|---|
| `#alerts` | 모든 알람 (uptime, error spike, SLO breach) | 엔지니어 전원 |
| `#alerts-critical` | DB down, 결제 실패 spike, 데이터 격리 위반 | 엔지니어 + CEO + on-call |
| `#release` | 배포 시작/완료/롤백 | 엔지니어 + PM |
| `#cs` | 사용자 보고 (Sentry user feedback) | CS + 엔지니어 1명 |

알람 룰: PagerDuty 도입 전까지 슬랙 webhook + Better Stack on-call schedule.

---

## 8. SLO / SLA

### 8.1 SLO 목록 (lock)

| SLO | 임계 | 측정 윈도우 | 측정 방법 |
|---|---|---|---|
| 가용성 | 99.5% / 월 | 30일 rolling | Better Stack Uptime |
| API p95 latency | ≤ 800ms | 5분 rolling | Vercel Analytics + Sentry |
| AI 코치 첫 토큰 | ≤ 1500ms | 5분 rolling | `ai_coach.first_token_ms` |
| DB query p95 | ≤ 100ms | 5분 rolling | Supabase Insights |
| 결제 성공률 | ≥ 98% | 24h rolling | `billing_events` 테이블 |
| Document job 성공률 | ≥ 95% | 24h rolling | `document_jobs.status` |

99.5% = 월 약 3.6시간 다운 허용. 학원 SaaS B2B 영업 시작(Q4) 후 99.9%로 상향 목표.

### 8.2 SLA (계약)

- B2C: SLA 명시 없음 (best-effort)
- B2B (학원): 월 가용성 99.5% 미달 시 해당월 요금 10% 크레딧. 별도 계약서

### 8.3 SLO 위반 대응

- **5분 budget burn 4배**: 즉시 #alerts-critical, on-call 호출
- **1일 burn 1배**: #alerts, 다음 영업일까지 RCA 작성
- **월 SLO 위반**: PIR 필수, B2B 고객 별도 통보

---

## 9. 로깅

### 9.1 structured logging (Pino)

```typescript
// lib/log.ts
import pino from 'pino'

export const log = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { env: process.env.VERCEL_ENV ?? 'local', sha: process.env.VERCEL_GIT_COMMIT_SHA },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.email',           // PII 마스킹
      '*.phone',
      '*.parentPhone',
      'req.body.solution', // 풀이 본문 (학습 데이터 보호)
    ],
    censor: '[REDACTED]',
  },
})
```

### 9.2 로그 drain

Vercel → Better Stack (Logtail). Vercel Dashboard → Project → Settings → Log Drains → Add (Logtail 통합).

보존 기간: 30일 (B2C) → 90일 (B2B Q4+).

### 9.3 PII 마스킹 정책

| 필드 | 처리 |
|---|---|
| `email`, `phone`, `parentPhone` | 로그 redact, DB는 평문 (앱 사용 필요), 표시는 마스킹 (`pj***@yonsei.ac.kr`) |
| `solution` (풀이 본문) | 로그 redact, DB 저장 |
| `password` | 어디에도 평문 저장 X (Supabase Auth 처리) |
| `studentName`, `realName` | DB 저장, 로그는 `userId`만 |
| `parent_*` | 보호자 동의 필수, 학생 18세 이상 시 자동 미수집 |

### 9.4 로그 레벨

- `trace`: 개발만, 운영 비활성
- `debug`: staging만
- `info`: 정상 흐름 (요청·응답·중요 결정)
- `warn`: 회복 가능한 이상 (재시도, fallback)
- `error`: 사용자 영향 있음 (Sentry 자동 전송)
- `fatal`: 프로세스 단위 사망 (Sentry + 슬랙 critical)

---

## 10. 보안 운영

### 10.1 RLS 자동 검증

`pnpm test:rls` 명령:
1. 모든 사용자 데이터 테이블 enumerate (information_schema)
2. RLS enabled = true 확인
3. `user_id = auth.uid()` 또는 동등 정책 존재 확인
4. anon role로 SELECT 시도 → 0 row 또는 거부 확인
5. 다른 user로 cross-tenant SELECT → 0 row 확인

```sql
-- tests/rls/check.sql 예시
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('migrations_journal', 'patterns_public')
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = t.tablename
        AND n.nspname = 'public'
        AND c.relrowsecurity = true
    ) THEN
      RAISE EXCEPTION 'RLS not enabled on %', t.tablename;
    END IF;
  END LOOP;
END $$;
```

PR + nightly에서 자동 실행. 실패 시 머지 차단.

### 10.2 키 회전 절차 (분기마다)

**Service role key**:
1. Supabase Dashboard → Settings → API → Service Role → Regenerate
2. 새 키를 Vercel env에 추가 (이름 `SUPABASE_SERVICE_ROLE_KEY_NEW`)
3. 코드에서 dual-read (있으면 NEW, 없으면 OLD) 배포
4. 5분 대기 → OLD 키 삭제, NEW를 정식으로 rename
5. 1Password 업데이트

**Anthropic / OpenAI**:
1. 콘솔에서 새 키 발급
2. Vercel env 업데이트 (즉시 교체 가능)
3. 5분 후 OLD 키 revoke
4. Sentry/로그 5xx 모니터링 30분

회전 일정: 분기 첫 영업일 (1/2/4/3/4월 첫 월요일).

### 10.3 의존성 취약점

- **Dependabot**: GitHub Settings에서 활성. weekly. 자동 PR 생성
- **pnpm audit**: nightly에서 실행, high 이상 발견 시 issue 자동 생성
- **Snyk** (Q4+): 런타임 라이선스 검사

### 10.4 HTTPS / HSTS

```typescript
// next.config.ts
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // CSP는 Toss 결제창·Supabase·Sentry 도메인 허용
  { key: 'Content-Security-Policy', value: csp() },
]

export default {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}
```

**HTTP → HTTPS** 강제: Vercel 자동. Cloudflare proxy 사용 안 하므로 redirect는 Vercel level.

### 10.5 인증 보안

- 비밀번호: Supabase Auth (bcrypt 자동)
- 세션: HttpOnly + Secure + SameSite=Lax 쿠키 (Supabase SDK)
- 토큰 회전: refresh token rotation 활성
- 이메일 OTP rate limit: 5분 내 3회

### 10.6 service role key 노출 방지

- `lib/db/admin-client.ts` 에 `import 'server-only'`
- ESLint 룰: `no-restricted-imports` 로 클라이언트 컴포넌트에서 `@/lib/db/admin-client` 차단
- nightly에 `pnpm exec grep -r "SERVICE_ROLE" app/_components` → 발견 시 alert

---

## 11. 백업 + 복구

### 11.1 DB 백업

| 종류 | 주기 | 보존 | 복구 가능 |
|---|---|---|---|
| Supabase 자동 daily | 매일 | 7일 (Pro) | 임의 시점 복원 |
| PITR (Point-in-time recovery) | 연속 | 7일 | 1초 단위 |
| 수동 logical dump | 매주 일 04:00 | 90일 | S3 별도 버킷 |
| 분기별 cold archive | 분기말 | 영구 | Glacier |

수동 dump (nightly cron):
```bash
pg_dump $PROD_DATABASE_URL --format=custom --no-owner --no-acl \
  | gzip \
  | aws s3 cp - s3://deepen-backups/pg/$(date +%Y%m%d).sql.gz
```

### 11.2 Storage 백업

```bash
# 월 1회 (1일 05:00 KST)
supabase storage download --bucket documents --recursive ./tmp-documents
tar czf documents-$(date +%Y%m).tar.gz tmp-documents
aws s3 cp documents-*.tar.gz s3://deepen-backups/storage/
```

### 11.3 RTO / RPO

- **RTO (Recovery Time Objective)**: 1시간
- **RPO (Recovery Point Objective)**: 1시간 (PITR 1분 + 작업 시간)

### 11.4 복구 시나리오 훈련

매 분기 1회 staging에서:
1. 임의 시점 PITR 복원 (지난주 데이터)
2. 복원된 DB로 staging 부팅
3. E2E 통과 확인
4. 결과 기록 → `docs/dr-drills/<YYYY-MM-DD>.md`

---

## 12. 결제 운영 (Toss Payments)

### 12.1 환경 분리

| 환경 | 키 |
|---|---|
| local / preview / staging | Toss sandbox 키 |
| production | Toss live 키 (사업자 등록 후) |

`TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY` (§3 매트릭스) 분리.

### 12.2 webhook signature 검증

```typescript
// app/api/billing/toss-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { env } from '@/lib/env'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const raw = await req.text()
  const signature = req.headers.get('toss-signature') ?? ''
  const expected = crypto
    .createHmac('sha256', env.TOSS_SECRET_KEY)
    .update(raw)
    .digest('base64')
  if (signature !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }
  const event = JSON.parse(raw)
  // billing_events에 idempotency_key (event.id)로 upsert
  // ...
  return NextResponse.json({ ok: true })
}
```

### 12.3 환불 정책

- 구독 cancel: 다음 결제일 이전까지 cancel → 다음 주기부터 미청구. 일할 환불 안 함
- 잘못된 결제: 24시간 내 신청 + 사용 흔적 없음 → 전액 환불 (Toss 환불 API)
- 학원 SaaS B2B: 별도 계약서 환불 조항 적용 (월 단위 정산)

### 12.4 영수증

- Toss가 자동 발행 (현금영수증·세금계산서)
- 사업자 정보(통신판매업, 사업자번호) `app/(legal)/business-info/page.tsx`에 표시 의무

### 12.5 결제 alert

| 이벤트 | 채널 |
|---|---|
| 첫 결제 (사용자) | #release |
| 결제 실패 spike (5분 5건+) | #alerts-critical |
| 환불 요청 | #cs |
| 월 매출 마감 | #release (1일 09:00 자동 리포트) |

---

## 13. iOS 앱 출시 운영 (Q3+)

### 13.1 빌드 파이프라인

```
develop → fastlane beta → TestFlight (내부 100명)
master  → fastlane release → App Store 심사 → release
hotfix  → fastlane release --hotfix → expedited review 신청
```

### 13.2 버전 관리

semver: `<major>.<minor>.<patch>` + build number (CFBundleVersion 자동 증가).

| 변경 종류 | major | minor | patch |
|---|---|---|---|
| 강제 업데이트 (DB schema 호환 깨짐) | + | | |
| 신규 기능 (웹뷰 호환) | | + | |
| 버그 수정 | | | + |

### 13.3 강제 업데이트 정책

서버에 `/api/ios/min-version` 엔드포인트:
```json
{ "minVersion": "1.4.0", "latestVersion": "1.6.2", "updateUrl": "itms-apps://..." }
```

앱 부팅 시 호출 → 자기 버전이 `minVersion` 미만이면 차단 화면 + 업데이트 링크.

**기준**:
- 강제 업데이트는 **DB 스키마 비호환 변경**일 때만 (예: 응답 필드 제거)
- 단순 신규 기능은 권장 업데이트 (배너만)

### 13.4 웹뷰 ↔ 네이티브 동기화

문제: 앱이 구버전인데 웹이 신규 라우트로 navigate → 화면 깨짐.

**해결**:
- WKWebView가 모든 navigation에 `X-Deepen-App-Version: 1.4.0` 헤더 주입
- 미들웨어에서 헤더 파싱 → 앱 미지원 라우트면 폴백 페이지 (`/v2/legacy-fallback`)
- 신규 라우트 도입 시 `app-min-version.ts`에 매핑 추가

```typescript
// lib/app-compat.ts
export const ROUTE_MIN_APP_VERSION: Record<string, string> = {
  '/v2/exam': '1.5.0',
  '/v2/teacher': '1.6.0',
}
```

### 13.5 App Store 심사 대응

- 심사 거부 자주: WebView-only 앱은 Apple이 거부. 네이티브 가치(PencilKit, 오프라인) 명확히
- Demo account 제공 필수 (`appstore-review@deepen.kr` / 시연용 비번)
- 약관·개인정보처리방침 URL 필수 (`/legal/terms`, `/legal/privacy`)

---

## 14. 사고 대응 런북 (incident response)

### 14.1 사고 등급

| 등급 | 정의 | 대응 시간 |
|---|---|---|
| **SEV-1** | 전체 서비스 다운, 데이터 격리 위반 | 즉시 (5분) |
| **SEV-2** | 핵심 기능 불가 (풀이 제출, 결제) | 30분 |
| **SEV-3** | 보조 기능 불가 (코치, 그래프 layout) | 4시간 |
| **SEV-4** | UX 이상 (특정 사용자, 회피 가능) | 영업일 |

### 14.2 일반 절차

1. **감지** (Sentry / Uptime / 사용자 보고)
2. **확인** (#alerts-critical 또는 on-call 호출)
3. **선언** (incident channel 생성: `#inc-<YYYYMMDD>-<slug>`)
4. **완화** (트래픽 차단 / 롤백 / maintenance page)
5. **해결** (근본 원인 픽스)
6. **PIR** (Post-Incident Review, 영업일 5일 내)

### 14.3 시나리오: DB 다운

**감지**: `/api/health` 503 + Supabase status 페이지 incident.

**대응**:
1. Vercel maintenance page 활성: `vercel env add MAINTENANCE true production && vercel deploy --prod`
2. 미들웨어가 `MAINTENANCE=true` 시 `/maintenance` 라우트로 모든 요청 redirect (정적 페이지)
3. Supabase 상태 모니터링 → 복구 시 maintenance off
4. 복구 후 `attempts` `pending_sync` 큐가 자동으로 재동기화

```typescript
// middleware.ts (단편)
if (process.env.MAINTENANCE === 'true' && !req.nextUrl.pathname.startsWith('/maintenance')) {
  return NextResponse.redirect(new URL('/maintenance', req.url))
}
```

### 14.4 시나리오: LLM API 다운 (Anthropic outage)

**감지**: `ai_coach.first_token_ms` p95 > 5s + 5xx spike.

**대응 (graceful degrade)**:
1. `lib/ai-coach/client.ts` 가 health check 실패 N회 → circuit breaker open
2. 클라이언트는 코치 패널을 "잠시 후 다시 시도해주세요" 메시지로 대체
3. **풀이·채점은 계속 작동** (LLM 의존 없음, M1.4까지 룰 기반)
4. 채점 후 코치 사전 제안만 비활성, 사용자 액션 차단 안 함
5. Anthropic status 모니터링 + 30분 후 retry

```typescript
// lib/ai-coach/circuit-breaker.ts
let failureCount = 0
let openUntil = 0

export async function callClaude(...) {
  if (Date.now() < openUntil) throw new ServiceUnavailableError('AI 코치 잠시 점검 중')
  try {
    const r = await anthropic.messages.create(...)
    failureCount = 0
    return r
  } catch (e) {
    if (++failureCount >= 5) {
      openUntil = Date.now() + 5 * 60_000
      log.warn({ failureCount }, 'AI coach circuit breaker opened')
    }
    throw e
  }
}
```

### 14.5 시나리오: 결제 실패 spike

**감지**: 5분 내 결제 실패 5건+ → #alerts-critical.

**대응**:
1. Toss 콘솔 → 가맹점 상태 확인 (휴면, 한도 초과)
2. webhook 이벤트 `billing_events` 테이블 직접 조회 (실패 사유 그룹핑)
3. 사용자별 패턴이면 카드사·잔액 문제, 시스템 패턴이면 Toss 측
4. 시스템 문제: Toss CS 즉시 연락 + 사용자에게 상태 페이지 공지
5. 사용자에게: 결제 실패 시 인앱 토스트 + 메일 (Resend)

### 14.6 시나리오: 학원 SaaS 데이터 격리 위반 발견

**위험**: `org_id` 필터 누락으로 다른 학원 데이터가 노출 (B2B 신뢰 깨짐).

**감지**: 사용자/학원 신고 또는 RLS lint 정기 검사.

**대응 (SEV-1)**:
1. **즉시** 영향 받는 라우트 비활성 (Vercel feature flag `disable_teacher=true`)
2. RLS 정책 직접 검사 + 정적 lint 재실행
3. 위반 origin 파악 (잘못된 query, RLS bypass, service role key leak)
4. 픽스 + hotfix 마이그레이션
5. 영향 범위 산정: `audit_log`에서 비정상 access 시점 ~ 픽스까지의 cross-org access count
6. 영향 받은 학원에 7일 내 통보 + B2B 계약서상 의무 이행
7. PIR + 외부 감사 (KISA 신고는 case-by-case 법무 자문)

### 14.7 시나리오: 키 leak 의심

**감지**: GitHub push protection alert, 외부 신고, 비정상 사용량.

**대응**:
1. **즉시** 키 회전 (§10.2). 5분 단축 절차
2. git history scrub (BFG repo-cleaner) — 단, force push는 신중히
3. 영향 시점 + 키 종류로 사용량 비교 (`api.error_rate`, Anthropic billing)
4. 비정상 사용 발견 시 해당 공급자에 fraud report
5. PIR

### 14.8 maintenance page

```tsx
// app/maintenance/page.tsx
export default function Maintenance() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 px-6">
      <h1 className="text-2xl font-semibold">Deepen이 잠시 점검 중입니다</h1>
      <p className="mt-3 text-zinc-600">곧 돌아올게요. 트위터 @deepen_kr 에서 진행 상황을 알려드려요.</p>
      <p className="mt-1 text-xs text-zinc-400">상태 페이지: status.deepen.kr</p>
    </main>
  )
}
```

`vercel.json`에서 maintenance 시 모든 요청을 이 페이지로:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/maintenance", "has": [{ "type": "header", "key": "x-deepen-maintenance", "value": "1" }] }]
}
```

### 14.9 PIR 템플릿

```markdown
# PIR — <incident slug>
- 일시: <YYYY-MM-DD HH:mm KST> ~ <복구 시각>
- 등급: SEV-X
- 영향 사용자: 약 N명 / 매출 영향 ₩X
- 타임라인:
  - HH:mm 감지 (Sentry alert)
  - HH:mm 선언 + on-call 호출
  - HH:mm 완화 (롤백)
  - HH:mm 해결
- 근본 원인:
- 즉시 조치:
- 영구 조치 (액션 아이템):
  - [ ] action 1 — owner — due
  - [ ] action 2 — owner — due
- 잘된 점:
- 개선할 점:
```

`docs/incidents/<YYYYMMDD>-<slug>.md` 에 저장. 분기별 회고에서 액션 아이템 진행률 점검.

---

## 15. 출시 전 final 체크리스트

> 시장 출시 D-7 ~ D-day 사이에 모두 PASS 되어야 함. 체크 결과 `docs/launch-checklist-<YYYYMMDD>.md` 기록.

### 15.1 환경 변수

- [ ] production Vercel env 모든 키 설정 (§3.1 매트릭스 전체)
- [ ] `lib/env.ts` zod parse 통과 (배포 로그 확인)
- [ ] 1Password Vault `Deepen / Production` 동기화
- [ ] CI에 필요한 GitHub Secrets 모두 등록

### 15.2 DB

- [ ] 모든 마이그레이션(`0001` ~ 현재) 적용 + journal 일치
- [ ] 시드 데이터 적용:
  - [ ] 수학Ⅱ 미분 단원 패턴·아이템
  - [ ] 수학Ⅱ 적분 단원 패턴·아이템
  - [ ] 단원 메타 (`units` 테이블)
  - [ ] 무료 티어 quota 기본값 row
- [ ] RLS 정책 모든 테이블 enable 확인 (`pnpm test:rls`)
- [ ] PITR 활성 + 백업 1회 수동 실행 검증

### 15.3 인프라

- [ ] Vercel production 도메인 SSL 발급
- [ ] Cloudflare DNS proxy 비활성 확인
- [ ] Supabase Edge Functions 모두 배포 + cron 등록
- [ ] Better Stack Uptime monitor 활성 (`/api/health` 1분)
- [ ] Sentry source map 업로드 검증 (production deploy 1회 후 stack trace 라인번호 확인)

### 15.4 기능

- [ ] D1~D4 acceptance 시나리오 모두 PASS (12-acceptance.md)
- [ ] Toss live 키 결제 1건 검증 (실제 카드 + 환불)
- [ ] 보호자 리포트 메일 1건 발송 검증
- [ ] AI 코치 prompt 캐싱 hit rate > 60% 확인 (1h 부하 후)
- [ ] PDF 업로드 → 노드 추출 → 그래프 반영 e2e 1건

### 15.5 법무·정책

- [ ] 약관 페이지 `/legal/terms` 게시 + 검토 완료
- [ ] 개인정보처리방침 `/legal/privacy` 게시 + 검토 완료
- [ ] 사업자 정보 `/legal/business-info` (통신판매업, 사업자번호)
- [ ] 14세 미만 가입 시 보호자 동의 플로우 동작
- [ ] 환불 정책 페이지

### 15.6 SEO·마케팅

- [ ] `robots.txt` (production만 index 허용, staging은 disallow)
- [ ] `sitemap.xml` 자동 생성 (`/app/sitemap.ts`)
- [ ] OG 이미지 (`/api/og`) 동작 — 학원 화이트라벨 도메인도
- [ ] Google Search Console 등록
- [ ] GA4 또는 PostHog 이벤트 트래킹 검증 (signup, first_attempt, first_recap)

### 15.7 운영 준비

- [ ] on-call schedule 등록 (Better Stack)
- [ ] CS 채널 (`support@deepen.kr` Resend 수신·발신)
- [ ] 상태 페이지 (`status.deepen.kr` Better Stack 공개)
- [ ] 모든 사고 시나리오 (§14) runbook 팀이 1회 read-through
- [ ] DR drill 1회 완료 (백업 복원 staging 검증)

### 15.8 iOS (Q3 출시 시)

- [ ] App Store Connect 앱 등록
- [ ] 데모 계정 + 시연 영상 업로드
- [ ] 약관·개인정보처리방침 URL 등록
- [ ] TestFlight 내부 테스트 100명 1주 통과
- [ ] 강제 업데이트 엔드포인트 검증

---

## 부록 A · 주요 명령어 모음

```bash
# 개발
pnpm dev                          # 로컬 서버
pnpm build                        # 프로덕션 빌드
pnpm typecheck                    # tsc --noEmit
pnpm lint                         # eslint
pnpm test:unit                    # vitest
pnpm test:e2e                     # playwright
pnpm test:smoke                   # 배포 후 hot path
pnpm test:rls                     # RLS 정책 lint

# DB
pnpm db:generate -- --name <slug> # 마이그레이션 생성
pnpm db:migrate                   # local 적용
pnpm db:migrate:staging
pnpm db:migrate:prod
pnpm db:seed
pnpm db:studio                    # drizzle-kit studio

# Supabase
supabase start                    # local
supabase status
supabase db push --branch <name>  # branch 마이그레이션
supabase functions deploy <fn>
supabase functions invoke <fn>    # 수동 호출
supabase secrets set KEY=value --project-ref <ref>

# Vercel
vercel deploy --prebuilt          # preview
vercel deploy --prod
vercel rollback <deployment-id>
vercel env pull .env.local        # production env 동기화 (디버깅 시)

# 사고 대응
vercel env add MAINTENANCE true production
vercel env rm MAINTENANCE production
```

## 부록 B · `vercel.json`

```json
{
  "framework": "nextjs",
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install --frozen-lockfile",
  "regions": ["icn1"],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store, no-cache, must-revalidate" }
      ]
    }
  ],
  "redirects": [
    { "source": "/lab/(.*)", "destination": "/v2/$1", "permanent": true },
    { "source": "/old-graph", "destination": "/v2/study", "permanent": true }
  ]
}
```

`regions: ["icn1"]` = 서울. 한국 사용자 latency 최적화.

## 부록 C · `next.config.ts` (운영 필수 부분)

```typescript
import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    serverActions: { bodySizeLimit: '5mb' },   // PDF 업로드용
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'cdn.deepen.kr' },
    ],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
    ]
  },
  async rewrites() {
    return [
      // 학원 화이트라벨: <slug>.deepen.kr → /org/[slug]
      { source: '/:path*', has: [{ type: 'host', value: '(?<slug>[^.]+)\\.deepen\\.kr' }], destination: '/org/:slug/:path*' },
    ]
  },
}

export default withSentryConfig(config, {
  org: 'deepen',
  project: 'web',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
})
```

## 부록 D · 비용 추정 (Q1 → Q4)

참고치, 분기별 검토.

| 항목 | Q1 | Q2 | Q3 | Q4 |
|---|---|---|---|---|
| Vercel | $20 | $20 | $50 | $150 |
| Supabase | $0 (Free) | $25 | $25 | $599 (Team) |
| Anthropic | $50 | $200 | $500 | $1500 |
| OpenAI (embedding) | $5 | $20 | $80 | $200 |
| Resend | $0 | $0 | $20 | $35 |
| Sentry | $0 | $26 | $26 | $80 |
| Better Stack | $0 | $0 | $25 | $25 |
| **월 합계** | **$75** | **$291** | **$726** | **$2589** |

Anthropic 비용 = 가장 큰 변수. Prompt caching hit rate 60%+ 유지 = 비용 30% 절감 효과. §7.2 알람으로 모니터링.

---

## 변경 이력

| 일자 | 변경 | 작성자 |
|---|---|---|
| 2026-05-09 | 초판 (lock) | spec/13 |
