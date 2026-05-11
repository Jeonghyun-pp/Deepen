# 01 · 기술 스택 + 환경

> 모든 선택은 lock. 변경은 INDEX 변경 관리 절차 따름.

## 런타임

| 영역 | 선택 | 버전 | 비고 |
|---|---|---|---|
| Node.js | LTS | ≥ 22 | Next.js 16 요구사항 |
| 패키지 매니저 | pnpm | ≥ 10 | 워크스페이스 단일 lock |
| 프레임워크 | Next.js | 16.x | App Router, Server Components, Edge Routes |
| UI | React | 19.x | Server Components 활용 |
| 언어 | TypeScript | 5.6+ | strict: true |
| DB | PostgreSQL | 15 (Supabase) | pgvector 확장 (Q3+) |
| ORM | Drizzle ORM | latest | drizzle-kit 마이그레이션 |
| Auth | Supabase Auth | — | RLS 적극 활용 |
| Storage | Supabase Storage | — | PDF 업로드용 버킷 `documents` |
| Edge Functions | Supabase Functions | Deno | cron job (Q3+) |
| 스타일 | Tailwind CSS | 4.x | CSS variables 테마 |
| 상태 (클라) | Zustand | 5.x | 도메인별 store 분리 |
| 그래프 | @xyflow/react | 12.x | reagraph는 동적 force-directed 백업 |
| 그래프 layout | @dagrejs/dagre | latest | DAG 토폴로지 정렬 |
| 애니메이션 | framer-motion | 11.x | 패널/카드 전환 |
| PDF 파싱 | unpdf | latest | text + 좌표 |
| 결제 | Toss Payments | 표준 결제창 | KR 시장 우선 |
| 이메일 | Resend | latest | 보호자 리포트 |
| 이메일 템플릿 | @react-email/components | latest | TSX |
| 펜슬 (웹) | tldraw | 3.x | M2.1+ |
| 모니터링 | Sentry | latest | Web Vitals + error |
| 로깅 | Pino | latest | structured JSON |
| 테스트 (단위) | Vitest | latest | |
| 테스트 (E2E) | Playwright | latest | |

## LLM 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 메인 LLM | `claude-opus-4-7` | AI 코치, 리캡 생성 |
| 보조 LLM | `claude-haiku-4-5-20251001` | 분류·태깅 (저비용) |
| Vision | `claude-opus-4-7` | OCR (M2.2) |
| 임베딩 | `text-embedding-3-large` (OpenAI) | 1536-dim, M3.3+ |
| Prompt 캐싱 | Anthropic `cache_control` | 시스템 프롬프트 5분 TTL |
| SDK | `@anthropic-ai/sdk` ≥ 0.40, `openai` ≥ 5.0 | |

## iOS (Q3+, 경로 B)

| 영역 | 선택 |
|---|---|
| 언어 | Swift 5.9+ |
| UI | SwiftUI |
| 비동기 | async/await + Combine |
| 아키텍처 | TCA (The Composable Architecture) |
| 펜슬 | PencilKit |
| 웹뷰 | WKWebView (메인 라우트 wrapping) |
| 빌드 | fastlane |
| 최소 OS | iPadOS 17+ |

## 디렉터리 구조 (lock)

```
/
├── app/                          # Next.js App Router
│   ├── (marketing)/              # 마케팅·랜딩
│   ├── (auth)/                   # login, signup
│   ├── v2/                       # 학습자 앱 (메인)
│   │   ├── home/                 # 단원 선택
│   │   ├── study/[unitId]/       # 그래프 + 코치
│   │   ├── solve/[itemId]/       # 풀이 화면 (hero)
│   │   ├── stats/                # 통계 대시보드
│   │   └── _components/          # v2 공용
│   ├── teacher/                  # 교사 대시보드 (Q4)
│   ├── admin/                    # 어드민 검수 (Q2+)
│   │   ├── review/
│   │   └── studio/               # 학원 콘텐츠 스튜디오 (Q4)
│   └── api/
│       ├── attempts/             # 풀이 제출
│       ├── ai-coach/             # 코치 chat·suggest
│       ├── recap/                # 진단·카드 생성
│       ├── recommend/            # 다음 액션·유사
│       ├── ocr/                  # 풀이 OCR (Q2+)
│       ├── billing/              # 결제 (Q3+)
│       ├── admin/                # 어드민 액션
│       └── ...
├── lib/
│   ├── db/
│   │   ├── schema.ts             # Drizzle 정의
│   │   └── client.ts             # 연결
│   ├── auth/
│   │   ├── require-user.ts       # 미들웨어
│   │   └── role.ts               # RBAC
│   ├── grading/                  # Phase 2
│   │   ├── score.ts              # 3분기 채점
│   │   └── elo.ts                # 숙련도
│   ├── recap/                    # Phase 3
│   │   ├── diagnose.ts           # BN
│   │   └── build-card.ts         # 카드 생성
│   ├── recommend/                # Phase 5
│   │   ├── policy.ts             # 모드별 정책
│   │   └── score.ts              # 하이브리드 랭킹
│   ├── ai-coach/                 # Phase 6
│   │   ├── build-context.ts
│   │   └── quota.ts
│   ├── session/                  # Phase 7
│   │   ├── practice-machine.ts
│   │   ├── exam-machine.ts
│   │   └── ...
│   ├── pipeline/                 # PDF 파이프라인
│   │   ├── parse-pdf.ts
│   │   ├── extract-nodes.ts
│   │   └── document-job-runner.ts
│   ├── graph/
│   │   └── encode-visual.ts
│   ├── stats/
│   ├── email/
│   └── clients/
│       ├── claude.ts
│       └── openai.ts
├── drizzle/                      # 마이그레이션
├── docs/
│   └── build-spec/               # 본 spec
├── deepy-ios/                    # iOS 앱 (Q3+, 별도 git 또는 monorepo subdir)
└── tests/
    ├── unit/
    └── e2e/
```

## 환경 변수 (lock)

`.env.local` 키 목록 (값은 secret manager). 누락 시 부팅 실패하도록 zod 검증.

```bash
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # 서버 전용

# DB
DATABASE_URL=                       # Drizzle용 직접 연결

# LLM
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Email
RESEND_API_KEY=

# Billing
TOSS_CLIENT_KEY=
TOSS_SECRET_KEY=

# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# Worker (document jobs)
DOCUMENT_JOB_WORKER_TOKEN=

# Cron (Q3+)
CRON_SECRET=
```

검증: `lib/env.ts` 모듈에서 zod로 parse, 부팅 시 1회.

## 코딩 컨벤션 (lock)

- ESLint: `eslint-config-next` + `@typescript-eslint/recommended-strict`
- Prettier: 기본 + tailwindcss 플러그인
- Import 순서: 외부 → `@/` → 상대
- 파일명: kebab-case 디렉터리, PascalCase React 컴포넌트, kebab-case lib 모듈
- 함수명: 동사 + 명사 (예: `classifyAttempt`, `buildRecapCard`)
- 한글 주석 OK, 코드 식별자는 영문
- 주석은 WHY만. WHAT 금지
- TypeScript `any` 금지. 부득이 시 `// eslint-disable-next-line` + 사유

## 라이브러리 추가 정책

- 5KB 미만 또는 pure utility: PR로 자유 추가
- 5KB 이상 또는 런타임 영향 있음: PR description에 (1) 대안 비교 (2) 도입 사유 (3) 라이선스 명시

## API 라우트 정책

- 모든 API는 `withAuth(handler)` 또는 `withRole(role, handler)` 래퍼 강제
- request body는 zod 스키마 + `parse` (실패 시 400)
- response는 `{ ok: true, data: ... }` 또는 `{ ok: false, error: { code, message } }` 균일
- 에러 코드 enum은 `lib/api/errors.ts`에 lock (03 문서 참조)

## 타임존 / 로캘

- DB: 모든 timestamp `WITH TIME ZONE`
- 서버 처리: UTC 기준
- 사용자 표시: KST (`Asia/Seoul`)
- 통화: KRW (Toss)

## 보안 기본

- 모든 사용자 데이터 테이블에 RLS enable + `user_id = auth.uid()` 정책
- service role key는 서버 전용, 클라 노출 금지
- Anthropic/OpenAI 키는 서버에서만 사용
- 사용자 업로드 PDF는 `user_id/uuid.pdf` 경로로 격리
