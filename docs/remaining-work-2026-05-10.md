# 남은 할일 + UX 연결관계 (2026-05-10 기준)

> 마지막 갱신: Phase A + Phase B(P0-2~4 코드) + P1-1 완료 직후. 끊김 1~6 모두 fix.
>
> 본 문서는 "어디서 멈췄고, 어디부터 어디로 흘러가야 하고, 무엇이 끊겨 있는지" 의 single source.
> 마일스톤 정의는 `docs/build-spec/`, 결정 lock 은 `MEMORY.md` 참조.

---

## 0 · 한 줄 요약

| 시나리오 | 준비 상태 | 추가 필요 |
|---|---|---|
| 무료 베타 5명 cohort | 🟢 즉시 가능 | `npm run db:migrate` (0010·0011) + env 5개 + 시드 30개 |
| **유료 출시** | 🟢 코드 완료 | Toss 가맹점 등록 + webhook URL + 실제 카드 1건 검증 |
| 본격 운영 (1000명+) | 🟡 미완 | LLM microtweak + 폴리싱 7개 + 환불 운영 + 디자인 검수 |

**코드는 Phase A·B(P0)·P1-1 모두 완료** — 이제 외부 등록(Toss·Resend 도메인) 과 콘텐츠
시드 외주(H1, 6~8주 리드타임) 가 베타·유료 출시의 critical path.

---

## 1 · 현재까지 누적

| | |
|---|---|
| 코드 라우트 | 60 (+ billing confirm/webhook/cancel/cron + onboard complete) |
| DB 마이그레이션 | 0000 ~ 0011 (12개) |
| Cron | 5 (embed-items, daily-challenge, weekly-snapshot, parent-report, **billing-renewal**) |
| 단위 테스트 | 143 통과 (+11 신규 — billing/verify-webhook, billing/orders) |
| 커밋 (이번 세션) | 31 (cleanup ~ Phase A·B·P1-1) |

| Q | 마일스톤 | 상태 |
|---|---|---|
| Q1 | M1.1 ~ M1.6 (풀이 → 채점 → 진단 → 리캡 → 지도) | ✅ |
| Q2 | M2.1 ~ M2.6 (펜슬·OCR·BN·모드·batch·듀얼) | ✅ |
| Q3 | M3.1 (결제 placeholder → **본격 통합 코드**) | ✅ 코드 / ⏳ Toss 등록 |
| Q3 | M3.2 ~ M3.5 (추천 + 데일리 + 보호자 + 통계) | ✅ |
| Q3 | M3.6 (iOS 베타) | ⏳ Q4 |

---

## 2 · UX 연결관계

### 2.1 진입점 → 전이 매트릭스

| From | 트리거 | To | 상태 |
|---|---|---|---|
| `/` | 진입 | `/login` | 🟢 |
| `/login` | magic link 클릭 | `/auth/callback` → `/v2/home` | 🟢 |
| `/v2/home` | UnitCard 클릭 | `/v2/study/[unitId]` | 🟢 |
| `/v2/home` | DailyChallengeBadge 클릭 | `/v2/solve/[firstId]?from=daily&batch=...&idx=0` → 3문제 chain → `/v2/home?dailyDone=1` 축하 배너 | 🟢 (끊김2 fix) |
| `/v2/home` | QuotaCard mini 클릭 | (없음 — 읽기 전용) | 🟢 |
| `/v2/home` | "내 통계" | `/v2/stats` | 🟢 |
| `/v2/home` | "요금" | `/v2/billing` | 🟢 |
| `/v2/home` | "보호자 리포트" | `/v2/settings/parents` | 🟢 |
| `/v2/home` | "전체 학습 지도" | `/v2/graph` | 🟢 |
| `/v2/home` | (관리자만) "어드민" | `/admin/seed-review` | 🟢 |
| **신규 사용자** | 첫 진입 (`/v2/home`) | `users.onboarded_at` NULL 이면 `/v2/onboard/profile` redirect | 🟢 (끊김1 fix) |
| `/v2/study/[unitId]` | "풀이 시작" | `/v2/solve/[firstItem]` | 🟢 |
| `/v2/study/[unitId]` | ModeSelector 연습 | `/v2/solve/[firstItem]` | 🟢 |
| `/v2/study/[unitId]` | ModeSelector 실전 | `/v2/exam/[unitId]` | 🟢 |
| `/v2/study/[unitId]` | ModeSelector 오답복구 | `/v2/recovery` | 🟢 |
| `/v2/study/[unitId]` | Pattern 옆 "챌린지 →" | `/api/recommend/next mode=challenge` → `/v2/solve mode=challenge` | 🟢 |
| `/v2/study/[unitId]` | "듀얼 모드" | `/v2/study/[unitId]/dual` | 🟢 |
| `/v2/solve` | submit | ResultPanel 오버레이 | 🟢 |
| `/v2/solve` | ResultPanel "다음 문제" | `/api/recommend/next` → `/v2/solve/[next]` | 🟢 |
| `/v2/solve` | ResultPanel "리캡 보기" | RecapOverlay 오버레이 | 🟢 |
| `/v2/solve` | RecapOverlay onAllPassed | RetryPrompt 모달 | 🟢 |
| `/v2/solve` | RetryPrompt "재도전" | `/v2/solve/[same] mode=retry&recap=...` | 🟢 |
| `/v2/solve` | RetryPrompt "skip" | begin(itemId) reset | 🟢 |
| `/v2/solve` mode=challenge | 5연속 정답 → level_up | `/v2/study/default?leveledUp=1` → emerald 배너 + "이어서 도전" CTA | 🟢 (끊김3 fix) |
| `/v2/solve` mode=challenge | 2연속 오답 → session_end | `/v2/study/default` | 🟢 |
| `/v2/solve` mode=exam batch | 마지막 문제 submit | `/v2/exam/[unitId]/result?items=...` | 🟢 |
| `/v2/solve` mode=retry | 1회 attempt 종료 | `/v2/study/default` | 🟢 |
| `/v2/solve` | Hint 버튼 | (카운터만 증가, 코치 안 열림) | 🟡 폴리싱 |
| `/v2/solve` | ChipBar 칩 클릭 | CoachPanel open | 🟢 |
| `/v2/solve` | submit error | inline 빨간 박스 (toast X) | 🟡 폴리싱 |
| `/v2/solve` | OCR 실패 | inline 빨간 박스 (재시도 버튼 X) | 🟡 폴리싱 |
| `/v2/solve` | Recap 중간 X | begin(itemId) reset (확인 X) | 🟡 폴리싱 |
| `/v2/solve` | browser back | 직전 페이지 (timer 손실 무경고) | 🟡 폴리싱 |
| `/v2/billing` | "Pro 업그레이드" | `/api/billing/checkout` → orderId+sdkConfig → Toss SDK widget → `/v2/billing/success` → `/api/billing/confirm` → subscription active | 🟢 코드 / ⏳ Toss 등록 |
| `/v2/billing` | "구독 해지" | `/api/billing/cancel` → period_end 까지 유지 + canceled_at | 🟢 |
| Toss webhook | PAYMENT_STATUS_CHANGED / BILLING_KEY_DELETED | `/api/billing/webhook` (HMAC 검증 + idempotent) | 🟢 코드 / ⏳ webhook URL 등록 |
| 자동 결제 cron | 매일 03:00 KST | `/api/cron/billing-renewal` chargeBillingKey + 만료 전이 | 🟢 코드 / ⏳ CRON_SECRET 설정 |
| `/v2/settings/parents` | "동의 메일 보내기" | `/api/parents/register` → 동의 메일 (Resend or dryRun) | 🟢 |
| 보호자 메일 | 동의 클릭 | `/api/parents/confirm?token` → HTML "완료" + footer "학생 화면 보러가기" | 🟢 (끊김6 fix) |
| 보호자 메일 | unsubscribe 클릭 | `/api/parents/unsubscribe?token` → HTML "해지" + footer "학생 화면 보러가기" | 🟢 (끊김6 fix) |
| `/v2/recovery` | 빈 상태 | 친절한 안내 카피 + "단원 열기" + "홈으로" CTA | 🟢 (끊김4 fix) |
| `/v2/stats` | 빈 상태 | "stats-empty" 배너 | 🟢 |
| `/v2/home` | 시드 0 | "콘텐츠 시드 진행 중" + 어드민 링크 (관리자만) | 🟢 |
| `/v2/home` | 모바일 헤더 | flex-wrap + email `hidden sm:`, 하단 네비 dot 제거 후 gap 분리 | 🟢 (끊김5 fix — home 우선, 다른 페이지는 단순 헤더라 OK) |

### 2.2 끊김 분류

🔴 = 사용자가 길을 잃음 (즉시 fix)
🟡 = 동작은 하지만 어색 (폴리싱)
🟢 = OK
✅ = fix 완료

| ID | 끊김 | 영향 | 분류 | 커밋 |
|---|---|---|---|---|
| ~~끊김1~~ | ~~신규 사용자 onboarding 미연결~~ | ~~첫 진입 시 빈 홈만 봄~~ | ✅ Phase A | `1561d16` |
| ~~끊김2~~ | ~~데일리 챌린지 3문제 chaining 없음~~ | ~~"오늘의 도전" 1번만 열림~~ | ✅ Phase A | `1561d16` |
| ~~끊김3~~ | ~~챌린지 LEVEL_UP → 단순 단원 복귀~~ | ~~5연속 정답의 보상감 없음~~ | ✅ P1-1 | `3592e3c` |
| ~~끊김4~~ | ~~빈 상태 안내 일관성 (Recovery)~~ | ~~Pattern 0개일 때 dead-end~~ | ✅ P1-1 | `3592e3c` |
| ~~끊김5~~ | ~~모바일 헤더 wrap (sm: breakpoint 0개)~~ | ~~좁은 화면에서 깨짐~~ | ✅ Phase A | `1561d16` |
| ~~끊김6~~ | ~~보호자 페이지 → 앱 진입 링크 없음~~ | ~~보호자가 외부 페이지에 갇힘~~ | ✅ P1-1 | `3592e3c` |

**모든 끊김 1~6 fix 완료.** 다음 끊김 발견 시 이 표에 추가.

### 2.3 폴리싱 7개 (P2)

| | 현재 | 권장 | 상태 |
|---|---|---|---|
| Hint 버튼 | 카운터만 증가 | 코치 패널 자동 open + "힌트" 톤 prefill | ✅ 2026-05-11 |
| Submit error | inline 빨간 박스 | toast + 자동 dismiss + 재시도 | ⏳ (toast 시스템 별도 라운드) |
| OCR 실패 | inline 빨간 박스 | "다시 그리기" 버튼 | ✅ 2026-05-11 |
| Recap 중간 X | reset 손실 | 확인 다이얼로그 | ✅ 2026-05-11 |
| Exam 시간 종료 | 무응답 시 아무 일 X | "시간 초과" 안내 + 자동 진행 | ✅ 2026-05-11 (배너만, 자동 진행은 X) |
| Logout | / redirect | 확인 다이얼로그 | ✅ 2026-05-11 |
| Browser back | 풀이 중 무경고 | beforeunload 또는 라우터 confirm | ⏳ 별도 라운드 |

---

## 3 · 남은 할일 분류

### 3.1 🔴 P0 — 유료 출시 막힘

| # | 작업 | 추정 | 상태 |
|---|---|---|---|
| ~~P0-1~~ | ~~UX 끊김 1·2·5 fix (onboarding 라우팅 + daily chaining + 모바일 헤더)~~ | ~~1.5일~~ | ✅ `1561d16` |
| ~~P0-2~~ | ~~Toss webhook + 서명검증 + idempotency~~ | ~~3일~~ | ✅ 코드 `157155e` |
| ~~P0-3~~ | ~~`/api/billing/cancel` + 자가 해지 흐름~~ | ~~1일~~ | ✅ 코드 `157155e` |
| ~~P0-4~~ | ~~`/api/cron/billing-renewal` (Vercel cron)~~ | ~~1일~~ | ✅ 코드 `157155e` |
| | **P0 코드 합계** | ~~6.5일~~ | **✅ 완료** |

**남은 P0 (사용자 작업, 코드 X)**:
- `npm run db:migrate` — 0010·0011 적용
- env: `TOSS_CLIENT_KEY`, `TOSS_SECRET_KEY`, `TOSS_WEBHOOK_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`
- Toss 가맹점 등록 + webhook URL + success/fail URL 등록
- 실제 카드 1건 결제 검증 (Toss 테스트 모드 또는 production)

### 3.2 🟡 P1 — 신뢰·완결성

| # | 작업 | 추정 | 상태 |
|---|---|---|---|
| ~~P1-1~~ | ~~UX 끊김 3·4·6 fix (LEVEL_UP 축하 + 빈 상태 일관성 + 보호자 앱 진입)~~ | ~~1.5일~~ | ✅ `3592e3c` |
| **P1-2** | Resend 도메인 / DKIM / bounce webhook | 1.5일 | ⏳ 외부 등록 |
| **P1-3** | Haiku microtweak — 데일리 챌린지 카피 (05 §9) | 1일 | ⏳ |
| **P1-4** | Opus 4문장 요약 — 보호자 리포트 본문 (05 §8) | 1일 | ⏳ |
| **P1-5** | 폴리싱 7개 (toast, 확인 다이얼로그, browser back 등) | 2일 | ⏳ |
| **P1-6** | 환불 / 세금계산서 운영 흐름 | 2일 | ⏳ |
| | **P1 잔여 합계** | **7.5일 (1.5주)** | |

### 3.3 🔵 P2 — 측정·최적화

| # | 작업 | 추정 |
|---|---|---|
| **P2-1** | A/B EPSILON=0 vs 0.10 측정 + 리포트 (M3.3 후속) | 2일 |
| **P2-2** | Redis 캐시 (similar 1분 TTL) (M3.3 후속) | 1일 |
| **P2-3** | ivfflat lists=sqrt(N) 자동 튜닝 cron | 0.5일 |
| **P2-4** | retry meta 위변조 hardening (M3.2 후속) | 0.5일 |
| **P2-5** | materialized view + 30분 refresh (M3.5 후속) | 1일 |
| **P2-6** | 그래프 우클릭 컨텍스트 메뉴 (Pattern 카드 버튼 외) | 1일 |
| **P2-7** | PatternHeatmap (Pattern × week) (M3.5 outside-scope) | 1일 |
| **P2-8** | timeline event types 확장 (recap_pass, level_up) | 0.5일 |
| | **P2 합계** | **7.5일 (1.5주)** |

### 3.4 🟣 P3 — Q4 모바일 + 확장

| # | 작업 | 추정 |
|---|---|---|
| **P3-1** | M3.6 iOS 베타 (Swift+TCA+PencilKit, 11-ios-app spec) | 4주 |
| **P3-2** | EBS 라이선스 자문 + 통합 (Q4) | 외부 대응 |
| **P3-3** | iPad 네이티브 wrapping vs PWA A/B | 1주 |

### 3.5 👤 사람 작업 (병렬, 코드 외)

| # | 작업 | 비고 |
|---|---|---|
| **H1** | 콘텐츠 시드 1차 — 수학Ⅱ 미적분 30~50문제 (강사 외주 + 어드민 검수) | **6~8주 외주** |
| **H2** | EBS 라이선스 자문 (Q3 직전) | 외부 대응 |
| **H3** | Pre-α cohort 5명 모집 + 1주 latency A/B | 출시 검증 |
| **H4** | 디자이너 합류 + 디자인 토큰 정의 + WCAG | 디자인 폴리싱 |

---

## 4 · 권장 실행 순서

### ✅ Phase A · 무료 베타 가능 (코드 완료, `1561d16`)

```
✅ onboarding 라우팅 연결         (끊김1)
✅ daily challenge 3문제 chaining (끊김2)
✅ 모바일 헤더 sm: breakpoint     (끊김5)

남은 사용자 작업:
  □ npm run db:migrate (0010 적용)
  □ env 5개 설정 (ANTHROPIC_API_KEY, OPENAI_API_KEY, CRON_SECRET,
                  NEXT_PUBLIC_APP_URL, RESEND_API_KEY)
  □ 콘텐츠 시드 30개 강사 외주 발주 (H1, 6~8주 리드타임)
  □ Pre-α 5명 cohort 안내
```

### ✅ Phase B · 유료 출시 가능 (코드 완료, `157155e`)

```
✅ Toss webhook + 서명검증 + idempotency      (P0-2)
✅ /api/billing/cancel + 자가 해지 흐름       (P0-3)
✅ /api/cron/billing-renewal (Vercel cron)    (P0-4)

남은 사용자 작업:
  □ npm run db:migrate (0011 적용)
  □ Toss 가맹점 등록 → TOSS_CLIENT_KEY / TOSS_SECRET_KEY / TOSS_WEBHOOK_SECRET
  □ Toss 콘솔에서 webhook URL 등록 (${NEXT_PUBLIC_APP_URL}/api/billing/webhook)
  □ Toss 콘솔에서 success/fail URL 등록 (`/v2/billing/{success,fail}`)
  □ 실제 카드 1건 결제 검증

병렬 (P1-2):
  □ Resend 도메인·DKIM 설정 (보호자 메일 production 발송)
```

### Phase C · 본격 운영 (잔여 1.5주)

```
✅ UX 끊김 3·4·6 fix           (P1-1, `3592e3c`)

남은 코드 작업:
  □ Haiku microtweak — 데일리 챌린지 카피  (P1-3, 1일)
  □ Opus 4문장 요약 — 보호자 리포트 본문   (P1-4, 1일)
  □ 폴리싱 7개 (toast / 확인 다이얼로그 / browser back beforeunload 등) (P1-5, 2일)
  □ 환불 / 세금계산서 운영 흐름            (P1-6, 2일)
```

### Phase D · 측정·최적화 (+1.5주)

```
P2-1 ~ P2-8 (필요 시):
  ✓ A/B 측정·캐시·hardening·heatmap
```

### Phase E · Q4 모바일

```
P3-1 ~ P3-3:
  ✓ M3.6 iOS 베타
  ✓ iPad wrapping vs PWA 결정
```

### 사람 작업 (H1~H4) 병렬 진행

> H1 (콘텐츠 시드) 가 6~8주 걸려, 코드 작업과 무관하게 **지금 즉시 발주**해야 Phase B 출시 시점에 시드 충분.

---

## 5 · 출시 시점별 acceptance

### 무료 베타 출시 (Phase A 완료)

- [x] **코드** — onboard 라우팅 / daily chaining / 모바일 헤더 (`1561d16`)
- [ ] `npm run db:migrate` (0010)
- [ ] env 5개 설정됨 (필수 + 권장)
- [ ] 콘텐츠 30개 published
- [ ] dev server 에서 신규 사용자 → onboarding → 첫 풀이 마우스 검증
- [ ] DailyChallengeBadge → 3문제 연속 풀이 → 축하 배너 마우스 검증
- [ ] 모바일 화면 (≤640px) 에서 헤더·네비 깨지지 않음

### 유료 출시 (Phase B 완료)

- [x] **코드** — Toss checkout/confirm/webhook/cancel/renewal (`157155e`)
- [ ] `npm run db:migrate` (0011)
- [ ] Toss 가맹점 등록 + TOSS_* env 3개 설정
- [ ] Toss 콘솔에서 webhook URL 등록
- [ ] Toss 결제창에서 실제 카드 결제 1건 성공
- [ ] webhook 수신 → subscription 갱신 → quota 변경 즉시 반영
- [ ] 자가 해지 → current_period_end 까지 Pro 혜택 → free 자동 전이
- [ ] cron renewal — 30일 후 자동 다음 주기 결제
- [ ] 보호자 메일 실제 도착 (DKIM 통과)
- [ ] Pre-α 5명 1주 시연 — 끊김 신고 0건

### 본격 운영 (Phase C 완료)

- [x] UX 끊김 3·4·6 fix (`3592e3c`)
- [ ] LLM 카피 톤이 학생별로 microtweak 됨 (P1-3)
- [ ] 보호자 리포트 4문장 요약이 학생 데이터를 반영 (P1-4)
- [ ] 모든 폴리싱 7개 처리 — toast, 확인 다이얼로그, browser back beforeunload (P1-5)
- [ ] 환불 1건 처리 가능 (P1-6)

---

## 6 · 진행 트래킹

매주 본 문서 갱신:
- 완료 항목은 ~~취소선~~
- 신규 끊김·작업은 적절한 Phase 섹션에 추가
- Phase 완료 시 `acceptance` 체크박스 갱신

### 이번 세션 (2026-05-10) 성과

- 끊김 1~6 모두 fix (Phase A 3개 + P1-1 3개)
- M3.1 Toss 결제 placeholder → 본격 통합 코드 (P0-2~4)
- 마이그레이션 0010 (onboarded_at), 0011 (billing idempotency) 추가
- 단위 테스트 132 → 143 (+11, billing 모듈)
- 커밋 3개: `1561d16` (Phase A), `157155e` (Phase B 빌링), `3592e3c` (P1-1)

### 다음 결정 지점

1. **사용자 작업** — `npm run db:migrate` + dev server 마우스 검증 (Phase A·C 흐름)
2. **외부 등록** — Toss 가맹점 + Resend DKIM (병렬 진행 가능, 코드 무관)
3. **H1 콘텐츠 시드** — 강사 외주 발주 가이드 작성 (6~8주 critical path)
4. **다음 코드 세션** — P1-3/4 (LLM microtweak) 또는 P1-5 (폴리싱 7개) 중 택일

---

## 7 · 참조

- 마일스톤 정의: `docs/build-spec/00-INDEX.md` ~ `13-deployment.md`
- 결정 lock: `~/.claude/projects/.../memory/MEMORY.md`
- 시각 상태: `docs/status-2026-05-10.html`
- 콘텐츠 시드 전략: 메모리 `project_content_seed_strategy.md`
- 강의안 마스터리 시나리오: `docs/strategy-lecture-mastery.md`
