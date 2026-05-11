# 오르조 기술스택 + 클론 개발 가이드

> 작성일: 2026-05-09
> 후속 문서: `orzo-benchmarking-2026-05-09.md` (제품 UX 벤치마킹)
> 본 문서 목적: (1) 오르조 실제 기술스택 정리, (2) Deepen 현재 자산 위에서 오르조 핵심 기능을 재구현할 수 있는 단계별 가이드

---

## 1. 오르조 확인된 기술스택 (공개 채용공고 기반)

> 슬링(오르조 운영사)은 직원 24명 / 특허 8건 / 4년 CAGR 180%의 작은 팀이다. 스택을 과대평가하지 말 것 — 평범한 표준 셋 + 데이터 자산이 진짜 무기.

### 1.1 iOS 앱 (★★★ 확인)

| 영역 | 사용 기술 | 출처 |
|---|---|---|
| 언어 | Swift | wanted/wd/96095 |
| UI | **SwiftUI** | 동상 |
| 비동기 | **Combine** | 동상 |
| 아키텍처 | **TCA (The Composable Architecture)** | 동상 |
| 필기 | **PencilKit** (Apple 표준) | 사용자 후기 [src 6,7] |
| CI/CD | **fastlane** | 동상 |
| 자격요건 | 7년+ 경력, 강남 대면 근무 | 동상 |

**해석**: iOS 표준 모던 스택. 자체 ink 엔진 만들지 않음 — PencilKit 위에 export/sync 파이프라인만. TCA 채택은 상태 관리가 복잡(채점 결과·필기·AI 응답·사용량 캡)하다는 신호.

### 1.2 ML/AI (★★★ 확인)

| 영역 | 사용 기술 | 출처 |
|---|---|---|
| 프레임워크 | **PyTorch / TensorFlow** | wanted/wd/185040 |
| 모델 영역 | **Knowledge Tracing (KT)**, 추천, NLP, Vision, LLM | 동상 |
| 외부 LLM | **Anthropic Claude** (텍스트+이미지 멀티모달) | 공식 블로그 [src 3] |
| 학습 데이터 | 학생 **정오답 + 필기 + 문항별 풀이시간** + 로그 | 동상 |
| 자격요건 | 석사 이상, 2년+ 경력 | 동상 |

**해석**: 자체 SDKT(Self-developed Deep Knowledge Tracing) = PyTorch로 학습한 KT 모델. 학술적으로 SAKT(Self-Attentive KT, 2019), SAINT(2020), DKT(2015) 등의 오픈소스 reference 풍부. 학원 SaaS의 "초개인화"는 이 KT 모델의 산출물.

### 1.3 Android 앱 (★ 추정)

- 2024-2025 출시됨 (Play Store: `kr.slingcorp.orzocsat`)
- **언어/프레임워크 미공개** — Kotlin 네이티브일 가능성이 가장 높지만, KMP/Flutter 가능성도 배제 못함
- 자체 빌드인지 iOS 코드 일부 공유인지 미확인

### 1.4 Backend (☓ 미공개)

채용공고 검색에서 백엔드 스택이 노출된 자료를 찾지 못함. ML이 PyTorch라는 점, 한국 스타트업 표준이라는 점에서 다음 추정이 합리적:

| 추정 | 근거 |
|---|---|
| **Python (Django REST 또는 FastAPI)** | ML 팀과 같은 언어 → 모델 서빙 일관성. 한국 에듀테크 다수 패턴 |
| AWS (RDS PostgreSQL + S3 + CloudFront) | 한국 스타트업 디폴트. 8.5만원/연 가격대로 운영 가능한 비용 |
| Redis | 사용량 캡 카운터(일 50회) 같은 rate limit에 필요 |

> ⚠️ 위 4행은 모두 **추정**. 정확한 스택은 슬링 측 직접 문의 또는 면접/네트워킹으로만 확인 가능.

### 1.5 데이터/콘텐츠 자산 (★★★ 가장 중요)

- **1억 건+ 역대 기출문제, 해설** (블로그·인터뷰 다수 인용)
- **출판사 IP 라이선싱**: 메가스터디·이투스·EBS 등 기출 라이선스 추정 — 슬링이 "기출문제집"을 합법적으로 디지털 배포 가능한 권리 확보
- **8건 특허**: 상세 내용 미공개. KT 알고리즘·UI 관련 가능성

> Deepen이 오르조를 "기능적으로" 클론할 수 있어도, **콘텐츠 자산을 클론하는 건 다른 차원의 일**이다. 합법적 콘텐츠 확보 경로는 별도 사업 실사 필요.

---

## 2. Deepen 현재 스택 (출발점)

`package.json` 기준:

| 영역 | 사용 중 |
|---|---|
| 프레임워크 | **Next.js 16 + React 19** |
| 언어 | TypeScript |
| DB | **Supabase (PostgreSQL) + Drizzle ORM** |
| Auth | Supabase Auth |
| AI | **@anthropic-ai/sdk + openai** (이미 멀티 LLM) |
| 그래프 | @xyflow/react + @dagrejs/dagre + reagraph |
| 상태 | Zustand |
| 애니메이션 | framer-motion |
| PDF | **unpdf** |
| 스타일 | Tailwind 4 |

**해석**: Deepen은 **웹 풀스택**, 오르조는 **iPad 네이티브 + ML 백엔드**. 직접 비교 불가능. 클론 전에 "어느 플랫폼으로 갈지" 먼저 결정해야 한다.

---

## 3. 클론 개발 3가지 경로

### 경로 A — 풀 iPad 네이티브 클론 (오르조 정공법)

**스택 (오르조 그대로)**:
- Swift + SwiftUI + Combine + TCA + PencilKit + fastlane
- 백엔드: Python (Django/FastAPI) + PostgreSQL + Redis + S3
- ML: PyTorch + KT 모델 (SAKT/SAINT 베이스) + Claude API

**필요 인력 (최소)**:
- iOS Senior (TCA 경험) ×2
- Backend Python ×1
- ML Engineer (KT 경험) ×1
- 디자이너 ×1

**기간**: MVP 9~12개월
**비용**: 인건비만 연 5~8억 추정

**Deepen 현실 평가**: ❌ 비현실적
- 팀 5인 연세대 학부생, 풀스택 TS 경험 위주
- iOS Swift 경력 0
- pitch deck Q1 일정(3개월 MVP)과 정면충돌

### 경로 B — 웹 + iPad 하이브리드 (Deepen 추천)

**아이디어**: 핵심 분석/그래프/PDF/AI는 **웹**에 두고, **펜슬 입력만 얇은 iPad 앱**으로 분리. iPad 앱은 PencilKit 캔버스 + 웹뷰 wrapping 정도.

**스택**:

| 레이어 | Deepen 기존 | 추가 |
|---|---|---|
| 웹 (그래프/PDF/리캡카드/AI 코치) | Next.js 16 ✅ | — |
| iPad 앱 (펜슬 캔버스만) | — | **SwiftUI + PencilKit + WKWebView**. 최소 코드 |
| 채점 | — | 웹에서 — 학생이 선택지 탭하거나 OCR 후 텍스트 비교 |
| OCR | — | **Claude Vision API** (Anthropic SDK 기존) — 자체 OCR 모델 X |
| KT | — | **Phase 3까지 미루고**, 초기엔 룰베이스 약점 추적으로 시작 |

**필요 추가 인력**:
- Swift 개발자 ×1 (계약직/외주도 가능 — iPad 앱이 단순)

**기간**: MVP 4~6개월 (Deepen 기존 웹 위에 iPad 얹는 방식)
**비용**: 추가 인건비 1~2억

**Deepen 현실 평가**: ✅ 추천
- pitch deck Q1 MVP "수학Ⅱ 미분/적분 3계층 그래프"는 웹만으로 가능
- Q2 OCR 베타 시점에 iPad 앱 추가 — 일정 정렬 가능
- TS 풀스택 5인이 80%를 만들고, iPad 부분만 외부 협업

### 경로 C — 웹 only + Apple Pencil 웹 입력 (가장 저렴)

**아이디어**: iPad Safari에서 Apple Pencil 입력을 **`PointerEvent + pressure`**로 받음. 네이티브 앱 없이 시작.

**스택**: Deepen 기존 그대로 + 다음 추가:

| 추가 | 기술 |
|---|---|
| 캔버스 | **`<canvas>` + Pointer Events API** — `event.pointerType === 'pen'`으로 펜 감지, `event.pressure`로 두께 |
| 또는 | **Excalidraw** 라이브러리 (오픈소스, 펜 지원) |
| 또는 | **tldraw** 라이브러리 (펜 지원 + UX 더 깔끔) |
| OCR | Claude Vision API |
| PWA | Next.js + manifest.json — iPad 홈화면 추가 가능 |

**기간**: MVP 2~3개월
**비용**: 추가 인건비 거의 없음

**Deepen 현실 평가**: ⚠️ 제약 있지만 검증용으로 OK
- 장점: pitch deck Q1 일정 안에 펜슬 UX까지 포함 가능. 코드 100% TS
- 단점: iPad Safari Pointer Events는 PencilKit보다 latency 높음 (~30ms vs ~9ms). 학생 후기에서 "펜이 끊긴다" 컴플레인 위험
- **사용 시나리오**: Q1~Q2 베타까지 경로 C로, Q3 유료 런칭 시점에 경로 B로 전환

---

## 4. 핵심 기능별 구현 가이드 (벤치마킹 보고서 매핑)

### 4.1 영역 A — AI 코치 호출 UX

**오르조 구현**: SwiftUI 풀이 화면 위에 sticky 버튼 → 시트 모달 → TCA로 상태 관리

**Deepen 구현 (Next.js)**:
```
app/
  (study)/                    # 풀이/그래프/PDF 라우트 그룹
    layout.tsx                # 사이드 패널 sticky 영역 정의
    _components/
      AICoachButton.tsx       # 우하단 sticky FAB
      AICoachPanel.tsx        # bottom sheet 또는 right drawer
      QuestionChips.tsx       # 추천 질문 5칩
      MessageBubble.tsx       # 답변 메시지 + "이 부분 더" 화살표
api/
  ai-coach/
    chat/route.ts             # Claude streaming 엔드포인트
    suggest/route.ts          # 추천 질문 생성
```

**기술 결정**:
- 상태: `zustand` (이미 사용 중) — `useCoachStore` 분리
- 스트리밍: Anthropic SDK `messages.stream()` + Next.js Edge Route
- 패널: **vaul** (bottom sheet) 또는 자체 구현 — framer-motion 이미 있음
- 패널 크기 조절: `react-resizable-panels`

**일 사용량 캡**:
```ts
// Supabase RLS + Postgres function
create function check_ai_quota(user_id uuid)
returns boolean as $$
  select count(*) < 30
  from ai_coach_calls
  where user_id = $1
    and created_at > current_date;
$$ language sql;
```

### 4.2 영역 B — 개념카드(리캡카드) 인서트

**오르조 구현**: AI 응답 메시지 안에 카드 컴포넌트 삽입

**Deepen 구현**:
```tsx
// AICoachPanel 안의 메시지 렌더링
<MessageBubble>
  <Markdown>{response.text}</Markdown>
  {response.recapCards?.map(card => (
    <RecapCard
      key={card.nodeId}
      gradeBadge={card.grade}     // "중3"
      conceptName={card.concept}  // "이차방정식 판별식"
      whyNeeded={card.why}
      coreBullets={card.bullets}
      checkQuiz={card.quiz}
      onReturn={() => returnToProblem()}
    />
  ))}
</MessageBubble>
```

**Deepen 차별 포인트 (오르조 위에 얹기)**:
- 카드는 단일이 아니라 **DAG 역추적 결과의 시퀀스**: `중3 판별식 → 고1 함수값 대입 → 현재 곡선 밖 접선`
- 시퀀스 카드 사이에 `<NavigationDots />` (3개 점 progress)
- 백엔드: 학습자 그래프(`reagraph`/`@xyflow` 노드) → prerequisite edge 따라 BFS → 약점 노드만 카드 시퀀스로 변환

### 4.3 영역 C — 펜슬 입력

**경로 B (iPad 앱)**:
```swift
// SwiftUI iPad 앱 — 핵심 코드만
import SwiftUI
import PencilKit

struct CanvasView: UIViewRepresentable {
  @Binding var canvas: PKCanvasView
  func makeUIView(context: Context) -> PKCanvasView {
    canvas.tool = PKInkingTool(.pen, color: .black, width: 2)
    canvas.delegate = context.coordinator
    return canvas
  }
  // delegate에서 PKDrawing → PNG/PDF export → 웹뷰에 postMessage
}
```

**경로 C (웹)**:
```tsx
// Next.js 컴포넌트 — tldraw 추천
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

<Tldraw
  onMount={editor => {
    // pen-only mode 강제
    editor.user.updateUserPreferences({ ... })
  }}
/>
```
또는 raw Pointer Events:
```tsx
<canvas
  onPointerDown={e => {
    if (e.pointerType !== 'pen') return
    // e.pressure: 0.0~1.0
    drawAt(e.clientX, e.clientY, e.pressure * 6)
  }}
/>
```

**1초 자동채점**:
- 객관식: 그냥 정오답 비교 (서버 1 RTT)
- 주관식 + 손글씨: **Claude Vision** (`anthropic.messages.create` with image) — 응답 1~2초. "1초"는 마케팅 카피지 실측 아님

**오답노트 이원화 (DB 스키마)**:
```sql
-- 자동: 2회 이상 오답 + "정답이지만 헷갈림" 자동 누적
create table mistake_log (
  user_id uuid, item_id uuid, kind text,  -- 'wrong' | 'unsure'
  count int, created_at timestamp
);
-- 수동: 사용자 태그
create table mistake_tag (
  user_id uuid, item_id uuid, tag text
);
-- 통합 조회: union으로
```

### 4.4 영역 H — Retention

별도 인프라 거의 없음. 다음만 추가:
- **챌린지 퀘스트**: 매일 자정 cron (Supabase Edge Function) — 학습자 그래프에서 약점 유형 3문제 추출 → 알림
- **"월 +X시간" framing**: 통계 화면에서 단순 SQL aggregation
- **보호자 리포트**: 주간 cron + Resend (이메일) — 보호자 이메일에 그래프 변화 PNG 첨부

---

## 5. AI 통합 아키텍처 (오르조 vs Deepen)

### 오르조 (추정)
```
[iPad app]
  → POST /api/coach (질문 + 문제ID)
  → [Backend Python]
    1. 문제 메타 + 학생 컨텍스트 조회
    2. KT 모델로 학생 약점 추정
    3. Claude API 호출 (system prompt + few-shot + 문제 이미지)
    4. 응답 후처리 (개념카드 추출)
  → [iPad app] 표시
```

### Deepen (제안)
```
[Next.js Edge Route]
  → /api/ai-coach/chat
    1. Drizzle: 학생 그래프 노드 + 약점 점수 + prerequisite DAG 조회
    2. Anthropic SDK messages.stream() — system prompt에 그래프 컨텍스트 임베딩
    3. 응답 스트림에 카드 마커 detect → 클라이언트가 RecapCard 컴포넌트로 렌더
  → [React] 토큰 단위 스트리밍 표시
```

**Deepen이 오르조 대비 유리한 점**:
1. KT 자체 모델 학습 안 해도 됨 — Claude system prompt + 그래프 컨텍스트로 시작 가능 (Phase 3까지 충분)
2. 모델 서빙 인프라 없음 — Anthropic API에 위임
3. Drizzle + Postgres만으로 학습자 그래프 운영 가능
4. **단점**: Claude API 비용 (Pro+ 무제한이면 학생당 월 5~15달러 가능). 사용량 캡 필수

---

## 6. 단계별 구현 로드맵 (pitch deck 12개월에 끼워넣기)

### Q1 (MVP) — 경로 C (웹 only)
- [ ] AI 코치 sticky 버튼 + 5칩 + Anthropic 스트리밍
- [ ] 리캡카드 인서트 컴포넌트 (단일 카드)
- [ ] tldraw 또는 PointerEvent 펜 입력 (객관식만, OCR 없음)
- [ ] 3계층 그래프 (Concept-Pattern-Item) — 이미 reagraph 보유

### Q2 (선행 결손 + 리캡 + OCR) — 경로 C 유지
- [ ] DAG 역추적 → 카드 시퀀스 자동 구성
- [ ] Claude Vision으로 손글씨 풀이 OCR 베타
- [ ] 자동·수동 이원 오답노트 (DB 스키마 + UI)
- [ ] 듀얼 패널/지문 고정 스크롤 (PDF + 그래프 + 코치 3-pane)
- [ ] 챌린지 퀘스트 (매일 약점 3문제)

### Q3 (유료 런칭) — 경로 B 전환 검토
- [ ] iPad 네이티브 앱 베타 (SwiftUI + PencilKit + WKWebView)
- [ ] 가격 티어 + 일 사용량 캡 (Postgres function + Redis)
- [ ] "월 +X시간" / "약점 -N개" framing 통계 화면
- [ ] 보호자 리포트 (주간 이메일)

### Q4 (학원 SaaS 베타) — 경로 B 안정화
- [ ] 교사 대시보드 (Next.js multi-role)
- [ ] 학생 화면에 "교사가 보고 있다" 명시적 노출
- [ ] 화이트라벨 옵션 (테마 + 로고 교체)

---

## 7. 결정해야 할 4가지

1. **클론 경로 A/B/C 중 어디로?** — 권장: **C로 시작 → Q3에 B 전환**
2. **자체 KT 모델 vs Claude prompt** — 권장: **Phase 3까지 Claude only**, 데이터 1년 누적 후 KT 검토
3. **iPad 앱 시점** — Q1엔 No, Q3 베타에 진입 검토
4. **Apple Pencil 웹 입력으로 충분한가** — 베타 학생 5~10명 1주 테스트로 검증 권장 (latency 체감 차이가 cancel 결정에 핵심)

---

## 8. 출처

| # | 소스 | URL |
|---|---|---|
| 1 | 슬링 iOS 개발자 채용공고 | https://www.wanted.co.kr/wd/96095 |
| 2 | 슬링 ML 엔지니어 채용공고 | https://www.wanted.co.kr/wd/185040 |
| 3 | 슬링(오르조) 기업정보 | https://thevc.kr/sling |
| 4 | AI 코치 사용법 | https://orzo.ghost.io/ai-coach/ |
| 5 | 오르조 AI 코치 2.0 | https://orzo.ghost.io/orzoai2/ |
| 6 | 오르조 App Store | https://apps.apple.com/kr/app/오르조-orzo/id1529046013 |
| 7 | 오르조 Google Play | https://play.google.com/store/apps/details?id=kr.slingcorp.orzocsat |
| 8 | 슬링 채용 홈페이지 | https://sling.ninehire.site/84j06n95 |

> 분석 한계: 백엔드 스택·Android 빌드 도구·인프라(AWS/GCP)·DB·캐시 레이어는 공개 자료 부재로 추정 표기. 정확한 스택은 슬링 측 직접 문의 또는 면접·네트워킹으로만 확인 가능.
