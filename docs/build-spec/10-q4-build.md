# 10 · Q4 빌드 — B2B 진입 (M4.1~M4.6)

> **분기 목표**: 학원 SaaS 베타 30곳 + ARR 5억 + M12 KPI 유료 5,000명. 12주, 6 마일스톤. Q3에서 이미 깔린 결제·통계·보호자 리포트 위에 **다중 테넌트 인프라 + 교사 워크플로우 + 학원별 콘텐츠 격리 + 사회적 accountability hook**을 얹는다.
>
> **본 문서가 다루지 않는 것**: 신규 알고리즘·LLM 프롬프트·DB 컬럼은 모두 02~05 계약 문서에서 lock 되어 있다. 본 문서는 마일스톤별 빌드 시퀀스·파일 경로·작업량·acceptance 만 담는다. 계약과 충돌 시 계약이 이긴다.
>
> **상위 의존**: Q1 (M1.x) 그래프·연습, Q2 (M2.x) 펜슬·OCR·어드민 검수, Q3 (M3.x) 결제·통계·보호자 리포트가 모두 안정 출시된 상태를 전제로 한다.

## 0. Q4 전체 의존 그래프

```
M4.1 (Multi-role 인증 + 학원 스키마)
  ├─→ M4.2 (교사 대시보드)
  ├─→ M4.3 (화이트라벨)
  ├─→ M4.4 (교사가 보고 있다 배지)        ← M4.2 의존
  └─→ M4.5 (어드민 콘텐츠 스튜디오)
            └─→ M4.6 (Pre-test diagnostic, 선택)
                       └─→ Β (베타 1곳 1주 무사고)
```

M4.1은 Q4 전체의 토대. M4.6은 선택이지만 베타 학원의 "신규 학생 콜드스타트" 만족도를 좌우하므로 들어가는 게 권장.

## 0.1 Q4 KPI 게이트 (lock)

본 분기 종료 시점에 다음이 모두 충족되지 않으면 정식 GA 보류, 베타 연장:

| KPI | 임계 | 측정 |
|---|---|---|
| 학원 베타 cohort | ≥ 1곳 30일 무사고 (00-INDEX.md DoD §3과 일치) | Sentry 무에러 + churn 0 |
| 누적 베타 학원 | ≥ 30곳 onboarding | organizations 테이블 row count |
| 유료 사용자 | ≥ 5,000명 | subscriptions.tier ∈ {pro, pro_plus} active |
| ARR | ≥ 5억 KRW | invoices 누적 12개월 환산 |
| 화이트라벨 가용성 | ≥ 99.5% | Vercel/Sentry availability |
| 교사 대시보드 첫 페인트 | ≤ 1.5s p75 | Web Vitals |

ARR/유료 5,000은 GTM 변수로, 본 spec은 인프라·UX·데이터 정확성만 책임진다. 다만 "결제 → 학원 청구서" 같은 B2B billing 변환은 M4.1에서 다룬다.

## 0.2 공용 약속

- **테넌트 식별**: `org_id` (UUID) 가 모든 학원-범위 데이터의 1차 키. URL slug (`mathking`)는 **표시·라우팅용**, JOIN/RLS 조건엔 절대 쓰지 않음.
- **콘텐츠 격리 규칙** (lock):
  - `nodes.org_id IS NULL` → 시스템 콘텐츠 (모든 학원·B2C 사용자에게 보임)
  - `nodes.org_id = X` → 학원 X 멤버에게만 보임. 다른 학원 멤버에게는 절대 노출 X
  - 학원 멤버는 시스템 콘텐츠 ∪ 자기 학원 콘텐츠 모두 본다 (UNION). 충돌 시 학원 콘텐츠 우선 (frontend dedup).
- **권한 위계**: `org_owner` ⊃ `teacher` ⊃ `curator`. owner는 모든 권한, teacher는 자기 클래스만, curator는 콘텐츠 검수만.
- **교사 ≠ 학생**: 한 user가 동시에 여러 학원 멤버일 수 있으나 (`org_members.role`), 학생 role은 별도 enum 안 만든다 — `class_students` 행이 곧 학생.
- **사회적 hook lock**: H.5 메시지 카피 변경은 PR + 카피라이팅 리뷰 필수. 위협 톤 금지 — 오르조 `"태도가 바뀌는 것 같습니다"` 정도의 부드러운 visibility 강조.
- **B2C 보호자 리포트**: Q3에서 옴, Q4에서 **학원 educator 리포트** 추가 (M4.2 산출물).

---

## M4.1 · Multi-role 인증 + 학원 스키마 (2주)

### Goals

1. `organizations` / `org_members` / `org_classes` / `class_students` 테이블 + RLS lock-in
2. `nodes.org_id` 컬럼 추가 + 콘텐츠 격리 RLS 정책
3. `withRole(['org_owner','teacher','curator'])` 헬퍼 + `AuthContext`에 `orgMemberships` 주입
4. owner 가입 → 빈 organization auto-create + 결제 plan 'team' tier 옵션 (Q3 subscriptions에 컬럼 1개 추가)
5. teacher / student 초대 플로우 (이메일 토큰 또는 학생 import CSV)

### 신규 파일

```
app/api/orgs/route.ts                                     # POST 신규 가입 시 org 자동 생성
app/api/orgs/me/route.ts                                  # GET 내 소속 학원
app/api/orgs/members/invite/route.ts                      # POST 초대
app/api/orgs/members/accept/route.ts                      # POST 토큰으로 수락
app/api/orgs/classes/route.ts                             # POST/GET
app/api/orgs/classes/[id]/route.ts                        # GET/PATCH/DELETE
app/api/orgs/classes/[id]/students/import/route.ts        # POST CSV 업로드
app/api/orgs/classes/[id]/students/[sid]/route.ts         # DELETE 학생 제거

lib/auth/role.ts                                          # ★ 수정 — OrgRole 추가
lib/auth/with-role.ts                                     # ★ 신규 — withRole 헬퍼
lib/auth/load-memberships.ts                              # 신규 — auth context 확장
lib/orgs/invite-token.ts                                  # 신규 — JWT 또는 단일 사용 토큰
lib/orgs/import-students.ts                               # 신규 — CSV 파서 (이메일 또는 학생코드)
lib/orgs/auto-create.ts                                   # 신규 — owner 가입 시 빈 org 생성

drizzle/0011_org_saas.sql                                 # 02 §8 SQL 그대로
```

### 수정 파일

```
lib/db/schema.ts                                          # organizations, org_members, org_classes, class_students, org_role enum
lib/auth/require-user.ts                                  # AuthContext에 orgMemberships, currentOrgId 추가
lib/api/handler.ts                                        # withRole이 OrgRole도 받도록 시그니처 확장
lib/api/errors.ts                                         # ORG_REQUIRED, INSUFFICIENT_ORG_ROLE 추가
app/(auth)/signup/page.tsx                                # owner 가입 토글 (학원 만들기 vs 학생으로 가입)
```

### 스키마 변경

02-schema.md §8 `0011_org_saas.sql` 그대로 적용. **본 spec에서 명시하는 추가 사항** (계약에 lock 안 된 부분):

```sql
-- subscriptions team plan 추가
ALTER TABLE subscriptions
  ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN seat_count INTEGER NOT NULL DEFAULT 1;
ALTER TYPE subscription_tier ADD VALUE 'team';

-- 초대 토큰
CREATE TABLE org_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role org_role NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  invited_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX org_invitations_email_idx ON org_invitations(email);
```

**RLS 정책 갱신** (lock):

- `nodes_select_org`: `(org_id IS NULL AND status='published')` OR `(org_id 매칭되는 org_members 있음)` OR `auth.uid()=user_id` OR service_role
- `user_item_history`/`pattern_state`에 `*_teacher_read` 정책: 본인 OR 자기 클래스 학생의 teacher (`class_students` JOIN `org_classes WHERE teacher_id = auth.uid()`)

기존 `nodes_select_published`는 DROP. 정책 본문은 `drizzle/0011_org_saas.sql`에 동봉.

### API 엔드포인트

03-api-contracts.md §12 그대로 + 본 spec에서 추가 명시:

| 메서드 | 경로 | role | 비고 |
|---|---|---|---|
| GET | `/api/orgs/me` | any auth | 응답 `{ memberships: { orgId, role, orgName, slug }[] }` |
| POST | `/api/orgs` | owner 가입 시 자동 호출 (signup 플로우 내부) | `{ name, slug }` → org 생성 + owner 등록 |
| POST | `/api/orgs/members/invite` | `org_owner` | `{ email, role: 'teacher'\|'curator' }` → org_invitations row + Resend 메일 |
| POST | `/api/orgs/members/accept` | any auth | `{ token }` → org_members insert + invitation accepted_at |
| POST | `/api/orgs/classes` | `org_owner` | `{ name, teacherId? }` |
| GET | `/api/orgs/classes` | `org_owner` \| `teacher` (자기 것만) | |
| POST | `/api/orgs/classes/[id]/students/import` | `org_owner` \| `teacher` | multipart CSV. 행: `email,name?` 또는 `student_code,name?` |
| DELETE | `/api/orgs/classes/[id]/students/[sid]` | `org_owner` \| `teacher` (해당 클래스) | |

요청/응답 zod 스키마는 `lib/api/schemas/org.ts`에 lock. 03 문서와 본 spec이 충돌 없을 것.

### 컴포넌트 props (signup 분기)

```typescript
// app/(auth)/signup/_components/RoleToggle.tsx
type RoleToggleProps = {
  initialRole?: 'student' | 'org_owner'
  onSubmit: (data: SignupPayload) => void
}

type SignupPayload =
  | { kind: 'student'; email: string; password: string; classCode?: string }   // classCode = 학원 학생코드
  | { kind: 'org_owner'; email: string; password: string; orgName: string; orgSlug: string }
```

slug는 클라에서 [a-z0-9-]+ 검증 후 서버에서 unique 검사. 충돌 시 409 CONFLICT.

### 권한 검증 (RBAC + RLS)

- `withRole(['org_owner'])`: `AuthContext.orgMemberships` 중 role='owner'인 row가 1개 이상 + 요청 path의 `orgId`(또는 자식 리소스에서 derive)와 일치
- `withRole(['teacher'])`: 자기 owner 또는 teacher인 org 내부 리소스만
- 교차 학원 접근: 다른 org_id 리소스 요청 시 즉시 403 FORBIDDEN (`INSUFFICIENT_ORG_ROLE`)
- service role key 클라 노출 절대 금지 (01 §보안 기본)
- RLS는 PostgreSQL 레벨에서 한 번 더 차단 — 애플리케이션 RBAC가 뚫려도 테이블 row가 안 새도록 이중 방어

### 알고리즘 함수

해당 마일스톤에 lock된 신규 알고리즘 없음. 04-algorithms.md 참조 X.

### 의존 마일스톤

- Q3 M3.1 결제 (subscriptions 테이블 존재 전제)
- Q1 M1.1 nodes 스키마 (org_id 컬럼 추가만)

### 작업량 추정

| 작업 | 일 |
|---|---|
| 마이그레이션 + RLS 정책 작성·테스트 | 2 |
| AuthContext 확장 + withRole | 1 |
| signup 플로우 분기 + auto-create org | 1.5 |
| invite/accept 플로우 + Resend 템플릿 | 1.5 |
| classes CRUD + students import (CSV 파싱 포함) | 2 |
| org 단위 결제 (subscriptions.org_id, seat_count) | 1.5 |
| 단위 테스트 + supabase db reset 검증 | 0.5 |
| **합계** | **10일 ≈ 2주 (1 FE + 1 BE)** |

### Acceptance criteria

1. owner 가입 → `organizations` row 1개 자동 생성 + 본인 `org_members.role='owner'`
2. owner가 teacher 1명 초대 → 메일 수신 → 토큰 클릭 → `org_members.role='teacher'` insert
3. teacher가 클래스 1개 생성 → CSV 5명 import → `class_students` 5 rows
4. 학원 A 학생이 학원 B teacher 대시보드 API 호출 → 403 FORBIDDEN
5. RLS 점검: service role 없이 학원 A teacher가 학원 B의 `pattern_state` SELECT → 0 rows
6. signup 시 slug 중복 → 409 CONFLICT, 클라가 메시지 표시
7. team plan 가입 → `subscriptions.tier='team'`, `seat_count=N` 정확
8. invitation 만료 토큰 사용 → 410 GONE 또는 400 VALIDATION

---

## M4.2 · 교사 대시보드 (2주)

### Goals

1. `app/teacher/` 라우트 그룹 — 교사 전용 진입점 (학생용 `app/v2/`와 완전 분리)
2. 클래스 마스터리 히트맵 — 학생 × Pattern 매트릭스 (theta 기반 색)
3. 학생 상세 — 그래프(읽기 전용) + 최근 attempt 목록 + 약점 Pattern + 메모
4. 학원 educator 리포트 — 주간 PDF (Q3 보호자 리포트와 다른 종류, 학원 단위 Top-N 약점·진도 통계)
5. M4.4 의존성: 교사가 학생 페이지를 열면 `teacher_views` row insert (M4.4가 그 row를 읽음)

### 신규 파일

```
app/teacher/layout.tsx                                    # withRole(['teacher','org_owner']) 가드
app/teacher/page.tsx                                      # 클래스 목록
app/teacher/classes/[id]/page.tsx                         # 클래스 상세 + 히트맵
app/teacher/classes/[id]/students/[sid]/page.tsx          # 학생 상세
app/teacher/reports/page.tsx                              # 주간 educator 리포트 archive

app/teacher/_components/HeatmapMatrix.tsx                 # ★ 핵심 시각화
app/teacher/_components/StudentRow.tsx
app/teacher/_components/WeakPatternList.tsx
app/teacher/_components/TeacherNoteEditor.tsx             # 학생당 1 note row
app/teacher/_components/AttemptTimeline.tsx               # 최근 attempt 시간순

app/api/teacher/classes/route.ts
app/api/teacher/classes/[id]/heatmap/route.ts
app/api/teacher/students/[id]/route.ts
app/api/teacher/students/[id]/note/route.ts
app/api/teacher/reports/weekly/route.ts                   # PDF 생성 트리거 (cron 또는 on-demand)

lib/teacher/build-heatmap.ts                              # 매트릭스 집계
lib/teacher/select-class-patterns.ts                      # 클래스에서 다루는 Pattern 우선순위
lib/teacher/educator-report.tsx                           # @react-email TSX 또는 puppeteer PDF
lib/teacher/log-view.ts                                   # teacher_views insert (M4.4 의존)
```

### 수정 파일

```
app/teacher/layout.tsx                                    # 학생용과 격리된 nav
lib/auth/role.ts                                          # M4.1에서 만든 OrgRole 그대로 사용
```

### API 엔드포인트

03-api-contracts.md §11 그대로. 본 spec에서 명시하는 추가:

| 메서드 | 경로 | resp 추가 필드 (03 위에) |
|---|---|---|
| GET | `/api/teacher/classes/[id]/heatmap` | `weakPatternIds: string[]` (클래스 평균 theta 하위 5) |
| GET | `/api/teacher/students/[id]` | `recordedView: true` 항상 (서버에서 teacher_views insert 후 응답) |
| GET | `/api/teacher/reports/weekly?orgId=&from=&to=` | `{ report: { url, summary, topWeakPatterns, topStudentsByDelta } }` |

요청 시 path `[id]`(클래스 id) 또는 `[sid]`(학생 id)는 서버에서 `auth.uid()`가 그 클래스의 teacher 또는 owner인지 검증. 아니면 403.

### 스키마 변경

본 spec에서 추가 정의 (02에 lock 안 된 영역, 마이그레이션 `0012b_educator_reports.sql` 동봉):

- `educator_reports`: `id`, `org_id`, `class_id?`, `period_start/end`, `pdf_url`, `summary_json`, `generated_at`. index `(org_id, period_end)`.
- `teacher_notes`: `id`, `teacher_id`, `student_id`, `note`, `updated_at`. UNIQUE `(teacher_id, student_id)`. RLS `auth.uid() = teacher_id`.

### 컴포넌트 props

```typescript
// HeatmapMatrix.tsx
type HeatmapMatrixProps = {
  patterns: { id: string; label: string; grade: string; isKiller: boolean }[]
  students: { id: string; name: string }[]
  matrix: number[][]               // [studentIdx][patternIdx] = theta 0~1
  onCellClick?: (studentId: string, patternId: string) => void
  highlightWeakThreshold?: number  // 기본 0.4
}

// StudentRow.tsx
type StudentRowProps = {
  student: { id: string; name: string }
  avgTheta: number                  // 학생 모든 Pattern 평균
  weakCount: number                 // theta < 0.4인 Pattern 수
  lastActiveAt: string | null       // ISO
  unreadAlerts: number              // 누적 결손 신규 등 (TBD)
}

// TeacherNoteEditor.tsx
type TeacherNoteEditorProps = {
  studentId: string
  initialNote: string
  onSave: (note: string) => Promise<void>
}
```

히트맵 색 인코딩은 04-algorithms.md §8 `encode-visual.ts`와 동일 팔레트 차용 권장 — theta>=0.7 초록, <0.4 노랑/주황, killer는 빨간 테두리.

### 권한 검증 (RBAC + RLS)

- 모든 `app/teacher/*` 페이지: server component에서 `withRole(['teacher','org_owner'])` 통과 안 하면 redirect to `/v2/home` 또는 403
- `/api/teacher/classes/[id]/*` 모두 `auth.uid() = oc.teacher_id` OR org_owner 가드 (M4.1 RLS와 중복 방어)
- 학생 상세 fetch 시 teacher_views insert는 **서버에서만** — 클라가 이 endpoint 호출했다고 무조건 insert하면 봇 트래픽으로 학생 화면에 가짜 배지 발생 우려. user-agent + auth 둘 다 검증.

### 알고리즘 함수

`lib/teacher/build-heatmap.ts`:

```typescript
// 04 §2 Pattern Elo 결과(pattern_state.theta)를 그대로 매트릭스에 매핑.
// 신규 알고리즘 X. 단순 SELECT + GROUP BY.
async function buildClassHeatmap(classId: string): Promise<{
  patterns: PatternMeta[]
  students: StudentMeta[]
  matrix: number[][]      // null 자리는 0.5 (콜드스타트 04 §2.4)
  weakPatternIds: string[]   // 클래스 평균 theta 하위 5
}>
```

`lib/teacher/select-class-patterns.ts`:

```typescript
// 클래스가 다루는 Pattern을 어떻게 정하는가:
// (a) 학원 콘텐츠 스튜디오(M4.5)에서 클래스 → Pattern 명시 매핑이 있으면 그것
// (b) 없으면: 그 클래스 학생들이 최근 30일 attempt한 모든 Pattern (자동 추론)
```

(b)는 M4.5 출시 전까지 fallback. M4.5 이후는 (a) 우선.

`lib/teacher/educator-report.tsx`:

```typescript
// 주간 cron (Sun 09:00 KST, 03 §14 /api/cron/parent-report와 동일 cron 시간 분리)
// - 학원 단위 Top-5 약점 Pattern (학생들의 평균 theta 하위)
// - Top-3 진도 향상 학생 (이번 주 평균 theta delta)
// - 신규 누적 결손 알림 (prereq_deficit_log 7일 신규 row)
// PDF는 puppeteer chromium-aws-lambda or @react-pdf/renderer
```

### 의존 마일스톤

- M4.1 (org/teacher/class 스키마)
- Q1 M1.6 (그래프 컴포넌트 — 학생 상세에서 읽기 전용 재사용)
- Q3 M3.4 (Resend + 이메일 인프라 — 교사 알림 메일은 보호자 리포트 동일 인프라 위)

### 작업량 추정

| 작업 | 일 |
|---|---|
| 라우트 그룹 + 가드 + nav | 0.5 |
| 클래스 목록 + 학생 row 컴포넌트 | 1 |
| HeatmapMatrix (★ 핵심) — d3 또는 css grid | 2 |
| 학생 상세 (그래프 재사용 + AttemptTimeline + WeakPatternList) | 2 |
| TeacherNoteEditor + teacher_notes 테이블 | 1 |
| educator-report.tsx + cron + Resend 메일 | 2 |
| API 5개 + zod 스키마 + 권한 테스트 | 1.5 |
| **합계** | **10일 ≈ 2주 (1 FE + 1 BE)** |

### Acceptance criteria

1. teacher 로그인 → `/teacher` redirect 정상, 학생 role은 진입 시 403
2. 클래스 30명 학생 × 50 Pattern 히트맵 렌더 < 800ms (서버 집계 포함)
3. 약점 Pattern Top-5가 클래스 평균 theta 하위 5와 일치 (단위 테스트)
4. 학생 상세 진입 → `teacher_views` row 1개 정확히 insert (중복 5초 내는 dedup)
5. 다른 학원 학생 ID로 강제 fetch → 403
6. 주간 educator 리포트 cron 1회 실행 → `educator_reports` row + PDF URL 유효
7. 메모 저장 → 다른 teacher 로그인 시 안 보임 (RLS)
8. 히트맵 셀 클릭 → 학생 상세로 이동, 해당 Pattern 자동 강조

---

## M4.3 · 화이트라벨 시스템 (2주)

### Goals

1. 학원별 서브도메인 — `mathking.deepen.kr`, `bigschool.deepen.kr` 등
2. 커스텀 도메인 옵션 (Pro+ team 티어, M4.1 `organizations.custom_domain`)
3. 동적 테마 — 로고·primary color·브랜드명 학원별 주입
4. 학원 멤버 외 진입 시 **로그인 화면도 학원 브랜딩**으로 노출
5. SEO/canonical: 학원 서브도메인은 noindex (학원 내부 도구)

### 신규 파일

```
middleware.ts                                              # ★ 신규 (또는 기존 수정) — host 검사 + org rewrite
lib/orgs/resolve-org-from-host.ts                          # host → org_id 매핑 (cache)
lib/orgs/branding-context.tsx                              # React context provider
lib/orgs/load-branding.ts                                  # SSR loader

app/(branding)/                                            # ★ 라우트 그룹 — 학원 브랜딩 적용 영역
  layout.tsx                                               # branding context provider
  login/page.tsx                                           # 학원 로고 노출 로그인
  signup/page.tsx                                          # 학원 슬러그 자동 prefill
  v2/                                                      # 학원 멤버용 학습자 앱 (브랜딩 적용)

app/api/orgs/branding/route.ts                             # POST 브랜딩 업데이트 (M4.1 §org §branding)
app/api/orgs/branding/upload-logo/route.ts                 # POST Storage upload
app/api/orgs/branding/verify-domain/route.ts               # POST 커스텀 도메인 DNS 검증

app/admin/orgs/[id]/branding/page.tsx                      # 슈퍼 어드민이 학원 브랜딩 검수
```

### 수정 파일

```
next.config.ts                                              # rewrites/headers 정책
app/layout.tsx                                              # branding context 주입 (host에서)
tailwind.config.ts                                          # CSS variable 기반 primary color
```

### Vercel + Next.js 라우팅 전략 (lock)

오르조 클래스(공교육 30곳+)가 검증한 패턴: **별도 도메인이 아니라 `<slug>.deepen.kr` 와일드카드 서브도메인**.

| 호스트 패턴 | 처리 |
|---|---|
| `deepen.kr`, `www.deepen.kr` | 마케팅 + B2C 가입 (브랜딩 X) |
| `<slug>.deepen.kr` | middleware가 `slug` 추출 → `org` 컨텍스트 주입 → `app/(branding)/*` 렌더 |
| `<custom-domain>` | middleware가 `organizations.custom_domain` 조회 → 일치하면 동일 처리 |
| 일치 안 함 | 404 또는 marketing redirect |

**middleware.ts 책임**:

- `req.headers.host` 추출 → `resolveOrgFromHost(host)` 호출
- 일치 org 있으면 NextResponse 헤더에 `x-org-id`, `x-org-slug` 주입 → 다운스트림 server component가 읽음
- `matcher`로 `_next`, `/api/auth`, `/api/health`, `favicon.ico` 제외
- `resolveOrgFromHost`는 in-memory LRU + 60초 TTL. organizations < 5,000 row 가정, startup full-load도 OK

### 동적 테마 (CSS variables)

`tailwind.config.ts`에서 `colors.primary = 'rgb(var(--color-primary) / <alpha-value>)'`. `app/(branding)/layout.tsx`가 `loadBranding()` 결과로 `--color-primary`/`--color-primary-hover` CSS variable을 wrapper div `style`에 주입 + `BrandingProvider` (React context) 로고/이름 전달.

### API 엔드포인트

| 메서드 | 경로 | role | 비고 |
|---|---|---|---|
| POST | `/api/orgs/branding` | `org_owner` | `{ logoUrl?, primaryColor?, customDomain? }` (03 §12와 일치) |
| POST | `/api/orgs/branding/upload-logo` | `org_owner` | multipart, Supabase Storage 버킷 `org-branding/{orgId}/logo.png` |
| POST | `/api/orgs/branding/verify-domain` | `org_owner` | TXT 레코드 `_deepen-verify=<token>` 검증 |

### 스키마 변경

02 §8에서 lock된 `organizations` 컬럼 그대로 사용 (`logoUrl`, `primaryColor`, `customDomain`). 본 spec 추가:

```sql
-- 0013_branding_verify.sql
ALTER TABLE organizations
  ADD COLUMN domain_verify_token TEXT,
  ADD COLUMN domain_verified_at TIMESTAMPTZ;
```

도메인 미검증 상태에서는 customDomain 무시 (slug 서브도메인만 동작).

### 권한 검증

- 브랜딩 변경: `withRole(['org_owner'])`
- 로고 업로드: 파일 크기 ≤ 1MB, MIME `image/png`/`image/svg+xml`만
- primary color: `^#[0-9a-fA-F]{6}$` 정규식 검증 — XSS 차단
- custom domain: lowercase + RFC 1035 hostname 정규식 검증
- middleware의 host 매칭은 case-insensitive + trailing dot strip
- 학원 X 멤버가 학원 Y 슬러그 도메인으로 로그인 시도 → 인증은 성공해도 `app/(branding)/v2/*` 진입 시 학원 Y 멤버 아니면 403 + redirect

### 알고리즘 함수

해당 마일스톤에 lock된 신규 알고리즘 없음.

### 의존 마일스톤

- M4.1 (organizations 테이블)
- Vercel project DNS 설정 — 와일드카드 SSL (`*.deepen.kr` Let's Encrypt 자동)
- Supabase Storage 버킷 `org-branding` 신설

### 작업량 추정

| 작업 | 일 |
|---|---|
| middleware + resolve-org-from-host + LRU 캐시 | 2 |
| branding context + dynamic theme + tailwind 설정 | 1.5 |
| `(branding)` 라우트 그룹 + 로그인/가입 분기 | 1.5 |
| 브랜딩 설정 페이지 (logo upload, color picker) | 1.5 |
| 커스텀 도메인 verify 플로우 + Vercel API 연동 | 1.5 |
| 와일드카드 DNS · SSL 설정 (DevOps) | 0.5 |
| E2E 테스트 (multi-host) | 1.5 |
| **합계** | **10일 ≈ 2주 (1 FE + 1 BE + 0.5 DevOps)** |

### Acceptance criteria

1. `mathking.deepen.kr` 진입 → 로고+primary color 적용된 로그인 화면
2. 학원 X owner가 색 변경 → 학원 X 멤버에게만 적용, 학원 Y 멤버는 영향 X
3. 미검증 customDomain은 무시 (slug 서브도메인은 정상)
4. middleware p95 ≤ 30ms (LRU 캐시 적중)
5. 학원 외 사용자가 학원 슬러그 진입 + 로그인 → 학원 멤버 아니면 안내 메시지 + 메인 도메인 리다이렉트
6. SSL 정상 (Vercel + Let's Encrypt)
7. `/api/orgs/branding/upload-logo` SVG 1MB 초과 → 413 PAYLOAD_TOO_LARGE
8. 잘못된 hex (`primaryColor='red'`) → 400 VALIDATION

---

## M4.4 · "교사가 보고 있다" 메시지 (1주)

### Goals

오르조 H.5 finding 그대로 구현 — **사회적 accountability hook**. 교사가 학생 페이지를 본 적이 있으면 그 학생의 학습자 앱 화면 상단에 부드러운 배지로 표시. 알림 X, 압박 X, 단순 visibility cue.

### 신규 파일

```
app/v2/_components/TeacherWatchingBadge.tsx                # ★ 핵심 컴포넌트
lib/teacher/recent-views.ts                                # 최근 7일 view 조회

app/api/teacher/views/recent/route.ts                       # GET 학생용 — 자기 데이터 보는 교사가 최근 7일 있나
```

### 수정 파일

```
app/v2/layout.tsx                                          # TeacherWatchingBadge 마운트 (학원 멤버 학생만)
lib/teacher/log-view.ts                                    # M4.2에서 만든 함수 재사용 (변경 X)
```

### 스키마 변경

02-schema.md §9 `teacher_views` 그대로. RLS 정책 추가 (학생이 자기 자신 데이터 SELECT 가능):

```sql
-- 0012_teacher_views.sql 동봉 RLS
ALTER TABLE teacher_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY tv_student_read ON teacher_views
  FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY tv_teacher_write ON teacher_views
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);
```

학생은 자기 row만 읽고, 어떤 teacher인지 user_id만 노출 — 교사 이름은 별도 join (org_members + org_classes로 같은 학원인지 확인). 다른 학원 teacher가 잘못 insert하는 건 RBAC + class_students 검증으로 막음 (M4.2 `log-view.ts`에서 학생이 자기 클래스 학생인지 confirm).

### API 엔드포인트

| 메서드 | 경로 | role | 비고 |
|---|---|---|---|
| GET | `/api/teacher/views/recent` | any auth (학생) | 응답 `{ watching: boolean, lastViewedAtIso?: string, teacherName?: string }` |

조건 (lock — 본 spec):
- `auth.uid()` 가 어떤 `class_students.student_id`로 등록되어 있고
- 해당 클래스의 `oc.teacher_id` 가 최근 7일 내 `teacher_views.viewed_at` row 존재

위 두 조건 모두 만족해야 `watching=true`.

### 컴포넌트 props

```typescript
// TeacherWatchingBadge.tsx
type TeacherWatchingBadgeProps = {
  watching: boolean
  lastViewedAtIso?: string
  teacherName?: string
}

// 표시 카피 (lock — 변경 PR + 카피 리뷰 필수):
//  "지난 N일 사이 ○○ 선생님이 회원님의 학습 현황을 확인하셨어요."
//  N=1 이면 "오늘", "어제" 자연스럽게.
//  학생을 압박하거나 위협하는 톤 절대 금지.
//  딱 1줄. 닫기 버튼 X (의식적 결정 — 사용자가 끄면 hook 실종).
//  단 마우스오버 시 "이 메시지는 학원 멤버에게만 표시됩니다" tooltip.
```

### 권한 검증

- 학원 멤버 아닌 학생(B2C)에게는 절대 표시 X — `app/v2/layout.tsx`에서 `orgMemberships.length === 0` 이면 컴포넌트 마운트 자체 안 함
- 교사 이름은 학생이 같은 학원 멤버일 때만 노출 — 다른 학원 teacher의 이름이 빠져나가면 안 됨
- teacher_views insert 시 위변조 방지: 클라가 보내는 게 아니라 서버 `app/teacher/students/[id]/page.tsx` server component에서만 호출
- 5초 dedup: 같은 (teacher, student) 쌍의 5초 내 중복 insert는 업데이트로 (또는 단순 ignore). insert 폭주 방지

### 알고리즘 함수

해당 마일스톤에 lock된 신규 알고리즘 없음. 04 참조 X.

### 의존 마일스톤

- M4.1 (`org_members`, `class_students`)
- M4.2 (`teacher_views` insert 호출 지점)

### 작업량 추정

| 작업 | 일 |
|---|---|
| `/api/teacher/views/recent` + zod | 0.5 |
| TeacherWatchingBadge 컴포넌트 + 카피 | 1 |
| layout 마운트 + 학원 멤버 분기 | 0.5 |
| 5초 dedup 로직 + 단위 테스트 | 0.5 |
| RLS 정책 검증 (다른 학원 데이터 누출 X) | 0.5 |
| Playwright E2E (교사 시점 + 학생 시점) | 1 |
| QA + 카피 리뷰 | 0.5 |
| **합계** | **4.5일 ≈ 1주 (1 FE + 0.5 BE)** |

### Acceptance criteria

1. teacher A가 학생 X 페이지 진입 → `teacher_views` 1 row insert
2. 학생 X 로그인 → 화면 상단에 "○○ 선생님이..." 배지 노출 (그 시간 ≤ 7일)
3. teacher A가 7일 전 본 적이 있고 그 사이 추가 view 없음 → 배지 미노출 (7일 정확히 끊음)
4. B2C 학생(학원 미소속) → 배지 절대 미노출 (RLS + 클라 분기 둘 다)
5. teacher B(다른 학원)가 학생 X view → 배지 미노출 (학생이 그 학원 소속 아님)
6. 같은 (teacher, student) 5초 내 중복 호출 → row 1개만 (또는 viewed_at 업데이트)
7. 카피가 위협 톤 아닌지 카피 리뷰 통과
8. tooltip "학원 멤버에게만 표시" 정상

---

## M4.5 · 어드민 콘텐츠 스튜디오 (2주)

### Goals

1. `app/admin/studio/` — 학원 owner/curator가 자기 학원 전용 Pattern·Item·Edge 만드는 워크스페이스
2. 학원별 콘텐츠 격리 — `nodes.org_id = X` 강제 (RLS는 M4.1, 본 마일스톤은 UI/UX)
3. 시스템 콘텐츠 fork → 학원 콘텐츠로 — 학원이 자기 색깔로 변형하고 싶을 때
4. 클래스 ↔ Pattern 명시 매핑 (M4.2 fallback 해소)
5. PDF 업로드 → draft 추출 → 학원 owner 검수 (Q2 M2.6 admin/review와 분리된 학원 전용 큐)

### 신규 파일

```
app/admin/studio/layout.tsx                                # withRole(['org_owner','curator'])
app/admin/studio/page.tsx                                  # 학원 콘텐츠 대시보드 (Pattern·Item 카운트)
app/admin/studio/patterns/page.tsx
app/admin/studio/patterns/new/page.tsx
app/admin/studio/patterns/[id]/page.tsx                    # 편집기 (signature, grade, isKiller 등)
app/admin/studio/items/page.tsx
app/admin/studio/items/new/page.tsx
app/admin/studio/items/[id]/page.tsx
app/admin/studio/edges/page.tsx                            # prerequisite 편집
app/admin/studio/upload/page.tsx                           # PDF 업로드 → draft 추출 → 학원 큐
app/admin/studio/classes/[id]/patterns/page.tsx            # 클래스 ↔ Pattern 매핑

app/admin/studio/_components/PatternEditor.tsx
app/admin/studio/_components/ItemEditor.tsx
app/admin/studio/_components/EdgeBuilder.tsx
app/admin/studio/_components/ForkButton.tsx                # 시스템 노드 → 학원 fork

app/api/admin/studio/patterns/route.ts                     # POST/GET (org_id 강제)
app/api/admin/studio/patterns/[id]/route.ts                # PATCH/DELETE
app/api/admin/studio/items/route.ts                        # POST/GET
app/api/admin/studio/items/[id]/route.ts
app/api/admin/studio/edges/route.ts                        # POST/DELETE (org 내부만)
app/api/admin/studio/fork/route.ts                         # POST { sourceNodeId } → org 복사
app/api/admin/studio/classes/[id]/patterns/route.ts        # 매핑 PUT (replace all)
app/api/admin/studio/upload/route.ts                       # /api/documents/upload의 학원 변형

lib/orgs/fork-node.ts                                      # 시스템 노드 deep clone with org_id
lib/orgs/class-pattern-map.ts                              # 클래스 → Pattern 매핑 lookup
```

### 수정 파일

```
lib/db/schema.ts                                           # class_pattern_map 테이블 (신규)
lib/pipeline/document-job-runner.ts                        # org 컨텍스트 추가 (job → nodes 추출 시 org_id 주입)
app/admin/review/                                          # 슈퍼 어드민(시스템 콘텐츠) 그대로 — 학원 콘텐츠는 studio가 담당
```

### API 엔드포인트

본 spec에서 추가 lock (03에 직접 명시되진 않음, §10 admin과 별개 라우트 그룹):

| 메서드 | 경로 | role | 비고 |
|---|---|---|---|
| POST | `/api/admin/studio/patterns` | `org_owner`\|`curator` | body 검증 후 `org_id = ctx.currentOrgId` 강제 주입 |
| GET | `/api/admin/studio/patterns?status=draft\|published` | 동일 | RLS로 자기 학원만 |
| PATCH | `/api/admin/studio/patterns/[id]` | 동일 + 그 노드 `org_id` 일치 | |
| POST | `/api/admin/studio/items` | 동일 | |
| POST | `/api/admin/studio/edges` | 동일 | source/target 모두 같은 학원 노드 또는 시스템 노드 |
| POST | `/api/admin/studio/fork` | 동일 | `{ sourceNodeId }` → 새 노드 생성, `org_id`+`status='draft'` |
| PUT | `/api/admin/studio/classes/[id]/patterns` | `org_owner`\|`teacher`(자기 클래스) | `{ patternIds: string[] }` |
| POST | `/api/admin/studio/upload` | `org_owner`\|`curator` | `/api/documents/upload`의 wrapper, document_jobs에 `meta.orgId` 동봉 |

### 스키마 변경

마이그레이션 `0014_class_pattern_map.sql`:

- `class_pattern_map` (PK `(class_id, pattern_id)`, `priority`). RLS는 `org_members` JOIN — 같은 학원 멤버만 R/W
- `document_jobs.org_id UUID REFERENCES organizations(id) ON DELETE SET NULL` 추가 — 추출 노드 자동 귀속용
- nodes RLS는 M4.1에서 이미 org_id 격리, 추가 X

### 컴포넌트 props

```typescript
// PatternEditor.tsx
type PatternEditorProps = {
  initial?: Partial<PatternRow>
  orgId: string
  onSubmit: (data: PatternEditPayload) => Promise<void>
  isFork?: boolean  // 시스템 노드 fork인 경우 ref 표시
  forkSourceId?: string
}

type PatternEditPayload = {
  label: string
  grade: string
  signature: string[]    // 3~7개 강제 검증
  isKiller: boolean
  frequencyRank?: number
  status: 'draft' | 'published'
  // org_id는 서버에서 주입
}

// ForkButton.tsx
type ForkButtonProps = {
  sourceNode: { id: string; label: string; type: 'pattern' | 'item' }
  targetOrgId: string
  onForked: (newNodeId: string) => void
}

// EdgeBuilder.tsx
type EdgeBuilderProps = {
  scope: { orgId: string }
  // source/target은 자기 학원 + 시스템 노드 풀에서 검색
  candidatePool: GraphNode[]
  onCreate: (edge: { sourceId: string; targetId: string; type: EdgeType; weight?: number }) => Promise<void>
}
```

### 권한 검증 (RBAC + RLS)

- `app/admin/studio/*` 라우트: `withRole(['org_owner','curator'])` 통과 안 하면 403
- 모든 mutation: 서버에서 `nodes.org_id` 또는 path 리소스의 `org_id`를 `ctx.currentOrgId`와 비교. 불일치 시 403 — 클라가 보내는 org_id 절대 신뢰 X
- fork 시: source 노드는 `status='published'` AND (`org_id IS NULL` 또는 `org_id = ctx.currentOrgId`)만 허용. 타 학원 콘텐츠 fork 절대 X
- edges: source/target 모두 자기 학원 또는 시스템. 시스템 ↔ 시스템 edge 생성은 학원이 못 함 (그건 슈퍼 어드민 영역, M2.6)
- class_pattern_map mutation: 그 클래스의 owner 또는 teacher만
- PDF 업로드 시 추출되는 모든 nodes는 자동으로 `org_id = job.org_id` 부여 — `lib/pipeline/document-job-runner.ts` 수정

### 알고리즘 함수

해당 마일스톤에 lock된 신규 알고리즘 없음. PDF 추출은 05 §4 그대로 (Pattern/Item draft 출력) + org_id 주입만 추가.

### 의존 마일스톤

- M4.1 (`org_members`, `nodes.org_id`)
- M2.6 (admin review 워크플로 — UX 패턴 재사용)
- Q2 M2.x PDF 파이프라인 (`document_jobs`, `extract-nodes.ts`)

### 작업량 추정

| 작업 | 일 |
|---|---|
| 라우트 그룹 + 가드 + 대시보드 | 1 |
| PatternEditor + ItemEditor + 검증 | 2 |
| EdgeBuilder + 후보 풀 검색 (자기 + 시스템) | 1.5 |
| ForkButton + fork-node.ts | 1 |
| class_pattern_map 테이블 + 매핑 UI | 1 |
| PDF 업로드 wrapper + document_jobs.org_id 흐름 | 1.5 |
| API 8개 + zod | 1.5 |
| 권한 leak 테스트 (학원 X에서 학원 Y 노드 접근 차단) | 0.5 |
| **합계** | **10일 ≈ 2주 (1 FE + 1 BE)** |

### Acceptance criteria

1. 학원 X owner가 만든 Pattern은 학원 Y 멤버 그래프에 절대 안 보임 (RLS + UI dedup)
2. 학원 X owner가 시스템 Pattern fork → 새 노드 `org_id=X`, `status='draft'`, label 그대로 복사
3. fork 후 편집 → 원본 시스템 노드는 변경 X (deep copy 검증)
4. EdgeBuilder가 타 학원 노드 후보 안 보여줌
5. 학원 X PDF 업로드 → 추출된 모든 nodes가 `org_id=X` 부여
6. class_pattern_map에 등록한 Pattern들이 M4.2 히트맵에서 우선 표시
7. teacher role(owner 아님)이 다른 클래스의 mapping 변경 시도 → 403
8. 노드 삭제 시 그 노드를 referencing 하는 chunk_node_mappings · class_pattern_map cascade

---

## M4.6 · Pre-test diagnostic 도입 (선택, 2주)

### Goals

오르조에 없는 차별 자산. 신규 학원 베타에서 **신규 학생이 첫 진입 시 5~10문제로 그래프 전체 mastery 초기화**. 04-algorithms.md §6 그대로 구현.

> **선택 마일스톤**: Q4 일정 빡빡하면 빼도 됨. 단 Β(베타 1곳 무사고) 만족도가 직접 영향 — 신규 학생 콜드스타트 UX가 개선됨.

### 신규 파일

```
app/v2/onboarding/pretest/page.tsx                         # ★ 진입 페이지
app/v2/onboarding/pretest/_components/PretestRunner.tsx    # 5~10 step 진행
app/v2/onboarding/pretest/_components/PretestResultMap.tsx # 결과 그래프 시각화

app/api/diagnostic/pretest/start/route.ts                  # POST { unitId } → state 초기화
app/api/diagnostic/pretest/answer/route.ts                 # POST { sessionId, itemId, correct } → 다음 itemId 또는 done
app/api/diagnostic/pretest/finish/route.ts                 # POST { sessionId } → pattern_state bulk upsert

lib/diagnostic/pretest.ts                                  # ★ 핵심 (04 §6 그대로)
lib/diagnostic/pretest-session.ts                          # 진행 상태 (Postgres pretest_sessions 테이블)
lib/diagnostic/pick-representative-item.ts                 # Pattern → 대표 Item 1개 선택
```

### 수정 파일

```
app/v2/home/page.tsx                                       # 신규 학생 + attempt 0건이면 pretest 권장 배너
lib/db/schema.ts                                           # pretest_sessions
```

### 스키마 변경

마이그레이션 `0015_pretest.sql` — `pretest_sessions(id, user_id, unit_id, state JSONB, started_at, finished_at?, written_to_pattern_state)`. `state` JSONB: `{ uncertain: string[], results: Record<patternId, theta>, asked: int }`. RLS `auth.uid() = user_id`. 세션은 서버 저장 — 클라 이탈 시 이어보기 가능.

### API 엔드포인트

| 메서드 | 경로 | resp |
|---|---|---|
| POST | `/api/diagnostic/pretest/start` | `{ sessionId, firstItem: { id, label, choices } }` |
| POST | `/api/diagnostic/pretest/answer` | `{ done: false, nextItem: ... }` 또는 `{ done: true, summary: { results: Record<patternId, theta> } }` |
| POST | `/api/diagnostic/pretest/finish` | `{ written: number }` — pattern_state bulk upsert |

### 컴포넌트 props

```typescript
// PretestRunner.tsx
type PretestRunnerProps = {
  unitId: string
  maxQuestions?: number      // 04 §6 lock = 10
  onComplete: (results: Map<string, number>) => void
}

// PretestResultMap.tsx
type PretestResultMapProps = {
  unitId: string
  initialMastery: Record<string, number>  // patternId → theta
  // 그래프 위에 색칠 (encode-visual.ts 재사용)
}
```

### 권한 검증

- `withAuth` 만 — pretest는 학생 본인 데이터
- 같은 unit pretest 재시도: 이미 `pattern_state` row가 있으면 경고 + 덮어쓸지 사용자 확인 modal
- 학원 멤버: `nodes` RLS가 자동으로 학원 콘텐츠 + 시스템 콘텐츠 union 보장 — 04 §6 `getPatternDag(unitId)`가 호출하는 query는 그대로

### 알고리즘 함수

04-algorithms.md §6 `runPreTest` 그대로 구현. lock된 핵심:

```typescript
// lib/diagnostic/pretest.ts
async function runPreTest(userId: string, unitId: string): Promise<Map<patternId, theta>>

// 04 §6.pickMaxInfo: 정보량 = ancestors + descendants 크기
// 정답 시 target + ancestors 모두 mastery 0.7
// 오답 시 target + descendants 모두 mastery 0.3
// 최대 10문제 또는 uncertain 비면 종료
```

`pickRepresentativeItem(patternId, 'mid')`:

```typescript
// 그 Pattern의 published Item 중
//  difficulty가 0.4~0.6 사이
//  사용자가 본 적 없음 (user_item_history에 없음)
//  최근 30일 cohort attempt가 충분 (≥ 10 — 신뢰도)
// 위 조건 만족하는 것 중 무작위 1개. 부족하면 fallback (조건 완화)
```

콜드스타트 결과를 04 §2.4 콜드스타트보다 우선 사용.

### 의존 마일스톤

- M4.1 (org_id 격리 RLS — 학원 콘텐츠 위에서 pretest 가능)
- Q1 M1.1 nodes 스키마 (Pattern + Item)
- Q2 M2.3 BN (pretest 결과를 BN 사전 분포로 활용은 후속 — 본 마일스톤은 단순 mastery 초기화만)

### 작업량 추정

| 작업 | 일 |
|---|---|
| `runPreTest` + 단위 테스트 (5~10 시나리오) | 2 |
| `pickRepresentativeItem` + cohort fallback | 1 |
| `pretest_sessions` 테이블 + 진행 상태 관리 | 1 |
| API 3개 + zod | 1 |
| PretestRunner 컴포넌트 | 1.5 |
| PretestResultMap (encode-visual 재사용) | 1 |
| home 배너 + 재시도 modal | 1 |
| pattern_state bulk upsert + 트랜잭션 | 0.5 |
| E2E 테스트 | 1 |
| **합계** | **10일 ≈ 2주 (1 FE + 1 BE)** |

### Acceptance criteria

1. 신규 학생 단원 단위 pretest → 정확히 ≤10문제로 종료
2. 각 답변 후 응답 시간 ≤ 500ms (다음 itemId 결정 알고리즘이 순간)
3. 정답 시 ancestors 모두 mastery=0.7, 오답 시 descendants 모두 0.3 (단위 테스트로 검증)
4. 종료 시 `pattern_state` bulk upsert — 모든 결정된 patternId에 대해 row 존재
5. 같은 unit 재시도 시 경고 modal + 명시 동의 후에만 덮어쓰기
6. 사용자가 중간 이탈 → `pretest_sessions.finished_at IS NULL` row 그대로 — 다음 진입 시 이어 보기 또는 폐기 선택 modal
7. cohort 부족한 단원에서도 pickRepresentativeItem fallback 정상
8. pretest 완료 학생 그래프 → mastery 0.5 단일 색이 아니라 다양한 회색·초록·노랑 분포 (시각 검증)

---

## Β · 통합 + 학원 베타 1곳 1주 무사고 (1주)

### Goals

00-INDEX.md DoD §3 "학원 SaaS 1개 이상 베타 cohort 30일 무사고" 의 첫 1주 게이트. 학원 1곳 (예: D 수학학원, 학생 ≤ 50, teacher ≤ 5) onboarding → 1주간 학생들이 정상 학습 → 무에러 + churn 0.

### 신규 파일

```
docs/runbook/q4-beta-onboarding.md                         # 베타 학원 onboarding 체크리스트
scripts/onboard-org.ts                                     # owner 가입 자동화 (수동 SQL 대신)
```

### 수정 파일

신규 코드 minimal — Q4 마일스톤 모두가 함께 동작하는지 확인하는 게 본 작업.

### 통합 시나리오 (lock — Playwright E2E `tests/e2e/q4-beta.spec.ts`)

1. 학원 X owner 가입 → 학원 1개 자동 생성 → team plan 결제 (Toss 테스트 카드)
2. teacher 1명 + curator 1명 초대 → 메일 수신 → 가입
3. 학생 30명 CSV import
4. teacher가 클래스 1개 생성 + 학생 30명 배정 + class_pattern_map 5개 매핑
5. owner가 자기 학원 PDF 업로드 → draft 추출 → curator가 검수 → publish
6. 학원 도메인 `mathking.deepen.kr` SSL + 브랜딩 정상
7. 학생 1명 로그인 → 학원 브랜딩 적용된 메인 → pretest 5문제 → 그래프 mastery 분포
8. 학생이 문제 5개 풀이 → AttemptResult + pattern_state 정상 갱신
9. teacher가 학생 페이지 진입 → teacher_views row → 학생 다음 로그인 시 배지 노출
10. 1주 후 educator weekly report 자동 발송 → PDF URL 유효 + 약점 Top-5 정확

### 모니터링

- Sentry release tagging: `q4-{milestone}-{sha}`
- 신규 메트릭 (Sentry custom):
  - `org.middleware_resolve_ms` (M4.3)
  - `teacher.heatmap_query_ms` (M4.2)
  - `pretest.completion_rate` (M4.6)
  - `org.content_count` (M4.5)
- 알람: 학원 멤버가 타 학원 데이터에 접근 시도 → Sentry critical (RLS 거부 로그를 capture)

### 작업량 추정

| 작업 | 일 |
|---|---|
| onboard-org.ts 자동화 + runbook | 1 |
| E2E 시나리오 작성 + CI 통합 | 2 |
| 베타 학원과 onboarding 미팅 + 실데이터 입력 | 1 |
| Sentry custom metric 셋업 | 0.5 |
| 1주 모니터링 + 즉시 패치 버퍼 | 0.5 |
| **합계** | **5일 ≈ 1주 (1 FS + 1 PM)** |

### Acceptance criteria

1. E2E 10단계 시나리오 모두 패스
2. 1주 운영 중 P0 incident 0건
3. 학원 멤버 churn 0
4. 교사 NPS 또는 만족도 자유 피드백 수집 ≥ 5건
5. 다음 주차 운영 안정 확인 시 30일 게이트 시작

---

## 1. Q4 횡단 약속 (lock)

### 1.1 다중 테넌트 캐싱

- LRU 캐시 키에 항상 `orgId` prefix
- React Query `queryKey: ['teacher','heatmap', classId]` 등 `classId`가 이미 학원 격리되니 안전, 단 학생용 그래프 캐시 키도 `orgId` prefix 권장 (학원 전환 시 invalidate)

### 1.2 로깅

- Pino 모든 로그 라인에 `orgId`, `userId` 컨텍스트 강제 (lib/logger.ts)
- 학원 데이터 누출 사고 사후 추적 가능하도록

### 1.3 결제

- B2C(개인 Pro/Pro+)와 B2B(team) `subscriptions`에서 분리 — `org_id IS NOT NULL` 이면 team
- team plan은 `seat_count` × KRW. 매월 학원 owner에게 인보이스 (Toss 정기결제)
- 학생은 학원 멤버인 동안 자기 개인 결제 불필요 — 학원 시트가 cover (UX: 학생 결제 페이지에 "학원 멤버는 무료" 배너)

### 1.4 데이터 보호

- 학원 X 탈퇴 시: `org_members` row 삭제만으로 학생 학습 데이터(user_item_history, pattern_state)는 보존 — 그 학생 개인 자산. 단 `class_students`도 cascade로 삭제되어 그 학원 클래스에서는 빠짐.
- 학원 자체 삭제: organizations cascade → org_members + org_classes + class_students + class_pattern_map + 학원 nodes (org_id=X) 모두 삭제. 학생 본인 학습 데이터는 보존.

### 1.5 Q5+ 이월 (본 spec 범위 외)

- B2G (공교육) 진출 — 오르조 클래스 30곳+ 패턴
- 의료·CFA 등 도메인 확장 — 결정 보류 (00-INDEX C-8)
- iPad 네이티브 앱 v2 — 11-ios-app.md 참조

---

## 2. Q4 일정 게이트 (12주)

```
W01-W02 │ M4.1
W03-W04 │ M4.2 (M4.4 메모도 함께)
W05-W06 │ M4.3
W07     │ M4.4
W08-W09 │ M4.5
W10-W11 │ M4.6 (선택 — drop 가능 시 Β를 W10 시작)
W12     │ Β (베타 1곳 1주 무사고)
```

M4.6 drop 시: W10에 베타 onboarding 시작 → 30일 무사고 게이트(W10~W13)가 Q4 종료 후 첫 주에 끝나는 일정. PM 결정 사항.

---

## 3. 인수 테스트 (12-acceptance.md 위임)

본 spec의 마일스톤별 acceptance criteria는 12-acceptance.md의 D4(B2B 학원 SaaS) 시나리오에 통합. D4 시나리오 lock은 본 spec과 일관성 유지. 충돌 시 본 spec이 진실, 12 update.

---

## 4. 변경 관리

- 본 spec 변경 PR 제목: `[spec/10-q4-build] <summary>`
- 계약 문서(02~06) 변경이 본 spec에 영향 시: 동시 PR 또는 본 spec section 갱신 명시
- M4.x 마일스톤 추가/삭제: 분기 KPI 게이트(§0.1) 영향 검토 필수
