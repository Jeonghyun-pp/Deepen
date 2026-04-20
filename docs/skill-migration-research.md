# Skill 기반 에이전트 전환 검토

CrossBeam 사례 분석과, Deepen 에이전트 도메인 지식을 Claude Skill 파일로 분리·서비스화할 수 있는지에 대한 조사 노트.

작성일: 2026-04-11

---

## 1. CrossBeam 개요

**Built with Opus 4.6: Claude Code Hackathon 우승작** (1위, Mike Brown).
13,000명이 지원해 500명이 선발된 해커톤에서 1주일 만에 만들어진 ADU 허가 자동화 서비스.

### 1.1 풀려는 문제

- 캘리포니아 ADU(Accessory Dwelling Unit) 허가의 **첫 제출 거부율 90% 이상**
- 거부 사유 대부분이 엔지니어링 결함이 아닌 **관료적 서류 문제**
- 평균 6개월 지연 → 주택소유자에게 약 $30,000 추가 비용
- 도시별로 코드가 다르고, 정정 편지 해석에 변호사·건축사 수준의 전문성 필요

### 1.2 핵심 워크플로우

| Flow | 입력 | 결과 |
|---|---|---|
| **정정 편지 해석** (메인) | 건축 도면 PDF + 도시 정정 편지 | 분석 보고서, 작업 범위, 회신 초안 |
| **사전 제출 체크리스트** | 주소, ADU 타입, 크기, 부지 유형 | 주법 + 도시별 요건 결합 체크리스트 |
| **도시 사전 심사** (로드맵) | 도시 직원이 제출물 업로드 | 미서명/누락 문서 자동 플래그 |

### 1.3 아키텍처

```
Browser (Next.js 16 / React 19 / shadcn)
   ↓ REST + Supabase Realtime
Cloud Run (Express 5 오케스트레이터)
   ↓ 격리 sandbox 실행
Vercel Sandbox (Agent SDK + Opus 4.6 + claude_code preset)
   ↓
Supabase (Postgres / Realtime / Storage)
```

**3가지 핵심 설계 결정**

1. **Cloud Run 오케스트레이터** — 에이전트 작업이 10~30분 걸리는데 Vercel 함수는 60~300초 한도. 장시간 작업을 외부 워커에 위임
2. **Vercel Sandbox** — Agent SDK의 `claude_code` preset이 파일시스템 접근을 요구해서 격리 컨테이너 필요
3. **Supabase Realtime** — 폴링 대신 push로 진행 상황 스트리밍

### 1.4 Skills-First 설계 (가장 인상적인 부분)

도메인 지식을 프롬프트에 박지 않고 **4개의 파일시스템 기반 Skill**로 구조화:

| Skill | 내용 |
|---|---|
| **California ADU** | HCD 핸드북 54p, Government Code 66310–66342, 의사결정 트리(부지→건설타입→수정자→프로세스), 임계값 테이블 — 28개 참조 파일 |
| **ADU 정정 해석** | 멀티스텝 분석 워크플로우 가이드 |
| **ADU 도시 리서치** | 3-모드 폴백: WebSearch 발견 → WebFetch 추출 → 브라우저 폴백 |
| **CrossBeam Ops** | 배포된 시스템 API 조작 방법 |

추가로 **Vision**(도면·편지 직독)과 **WebSearch**(도시 조례 실시간 조사)를 결합.

### 1.5 Repo

- GitHub: `mikeOnBreeze/cc-crossbeam`
- 라이선스: MIT
- 음성 로그(`progress.md`)로 해커톤 의사결정 과정 투명 공개

---

## 2. Deepen에 적용 가능한가

### 2.1 결론: 가능하다

Skill은 Claude Code CLI 전용 기능이 아니라 **Agent SDK + 파일시스템**만 있으면 어디서든 동작한다. CrossBeam이 그 증거 — 사용자는 웹 UI만 보지만 백엔드는 Sandbox 안에서 Claude Code 환경을 돌린다.

핵심 트릭: **"Claude Code를 서버 안에서 SDK로 돌린다"**

### 2.2 배포 옵션 비교

| 옵션 | 방식 | 장점 | 단점 |
|---|---|---|---|
| **A. Agent SDK + Sandbox** | CrossBeam 동일. `.claude/skills/` 디렉터리에 skill 배치, `claude_code` preset이 자동 로드 | 가장 강력. 도구 호출, Read tool로 progressive disclosure 가능 | 인프라 무거움 (Cloud Run + Sandbox) |
| **B. Messages API + system prompt 주입** | 빌드 시 skill 마크다운을 읽어 system prompt로 합침 | 가볍고 Vercel 함수만으로 OK | 파일시스템 도구 사용 불가, 캐시 안 쓰면 비쌈 |
| **C. Prompt Caching + skill 파일** | B에 더해 system block에 `cache_control` 마킹 | 비용 90% 절감, Vercel 단일 배포 유지 | 5분 TTL 관리, 캐시 미스 시 비용 상승 |

### 2.3 추천: C안 → 트래픽 늘면 A로 승격

**근거**
- 현재 Deepen projection은 장시간 파일 조작이 없음
- Vercel 단일 배포 유지가 운영 단순성 측면에서 유리
- skill 마크다운을 빌드 타임에 묶어 캐시된 system 블록으로 주입하는 게 비용/복잡도/효과 균형이 가장 좋음

---

## 3. 토큰 비용 분석

### 3.1 흔한 오해: "Skill = 토큰 폭증"

순진하게 매 요청마다 모든 skill 본문을 system prompt에 박으면 사실이지만, 두 가지 메커니즘으로 거의 상쇄됨.

### 3.2 메커니즘 1: Progressive Disclosure

Claude Code의 skill 메커니즘은 원래 lazy load 구조:

```
시스템 프롬프트에 들어가는 것:
  - skill 이름 + 1~2줄 description (전체 합쳐 ~수백 토큰)

에이전트가 관련 있다고 판단했을 때만:
  - Read 도구로 SKILL.md 본문 로드
  - 본문이 또 다른 참조 파일을 가리키면 그때 추가 로드
```

CrossBeam의 28개 ADU 참조 파일도 매 요청마다 다 들어가지 않는다. 작업 종류에 따라 필요한 skill 본문만 로드되고, 라우팅이 모델 안에서 일어남.

**제약**: 이 방식은 Agent SDK / 도구 호출 루프가 있어야 작동. 단순 Messages API 1회 호출이면 직접 구현 필요.

### 3.3 메커니즘 2: Prompt Caching 90% 할인

skill 같은 정적 컨텍스트는 캐시 타겟으로 완벽:

| 항목 | Opus 4.6 단가 (input 기준) |
|---|---|
| 일반 입력 | 1.0× |
| 캐시 쓰기 (5분 TTL) | 1.25× |
| **캐시 읽기** | **0.1×** |
| 캐시 쓰기 (1시간 TTL) | 2.0× |

**예시**: skill 본문 50K 토큰을 system block에 넣는 경우

- 첫 요청: 50K × 1.25 = 62.5K 상당 (캐시 write)
- 5분 내 재요청: 50K × 0.1 = **5K 상당** (90% 할인)
- 캐시 미스: 50K × 1.0 = 50K (그냥 일반 비용)

**손익분기**: 5분 내 2회 이상 호출이면 캐싱이 이득. Deepen처럼 사용자가 그래프와 인터랙션하는 패턴이면 거의 항상 손익분기 위.

### 3.4 Deepen 기준 현실 추정

projection이 1회당 평균 ~3K input + ~2K output이라 가정.

| 시나리오 | 추정 비용 |
|---|---|
| Skill 없이 (현재) | ~$0.20/요청 (대신 정확도 낮아 retry 가능성) |
| Skill 30K + 캐시 hit | ~$0.05(skill cached) + $0.20(요청) ≈ **$0.25/요청** |
| Skill 30K + 캐시 miss | ~$0.45 + $0.20 ≈ **$0.65/요청** |

캐시 hit 비율 70%만 유지해도 평균 ~$0.37. **요청당 ~$0.17 추가**가 skill 도입의 실질 비용. 정확도 개선 효과를 고려하면 합리적 트레이드오프.

### 3.5 추가 비용 절감 전략

- **Skill을 작게 유지** — 핵심만 SKILL.md, 디테일은 참조 파일로 분리 (CrossBeam 패턴)
- **Skill 라우터 직접 구현** — Haiku로 "어떤 skill 필요?" 1차 분류 → Opus에 해당 skill만 주입
- **1h 캐시 TTL** — 2× write 단가지만 장시간 세션에 유리
- **Skill 안 쓰면 vs 모델이 매번 추론** — 출력 토큰↑ + 환각↑ + 재시도↑로 오히려 더 비싼 경우 많음

---

## 4. Deepen에 시사점

1. **Skills-First 전환** — 현재 v2 graph는 Agent tool loop를 쓰는데, 도메인 지식("논문 관계 분류 기준", "introduces vs uses 판별 가이드" 등)을 프롬프트가 아닌 skill 파일로 분리하면 일관성↑
2. **장시간 작업 분리** — projection이 길어지면 Cloud Run 같은 외부 워커가 필요할 수 있음 (현재는 불필요)
3. **Realtime 푸시** — 그래프 업데이트도 폴링 대신 SSE/Realtime으로 흘려보내면 UX 개선
4. **Voice Log 투명성** — 의사결정 음성 로그를 progress.md에 남기는 방식, 우리 프로토타입 회고에도 적용 가능

---

## 5. 다음 단계 (제안)

1. 현재 system prompt에서 "지식"에 해당하는 부분을 식별 (관계 분류 기준, projection 룰 등)
2. 그것을 `lib/agent/skills/` 하위 마크다운으로 분리
3. 빌드 타임 로더 작성 — skill 파일을 system 블록으로 주입, `cache_control: ephemeral` 마킹
4. PoC 호출로 토큰 사용량 측정 → 캐시 hit 비율 검증
5. 정확도 비교 (skill 도입 전/후 동일 입력에서 projection 결과 diff)

---

## 참고 링크

- GitHub: https://github.com/mikeOnBreeze/cc-crossbeam
- Threads (해커톤 발표): https://www.threads.com/@claudeai/post/DU_5tZrEoi-
- LinkedIn (Built with Opus 4.6 Hackathon Winners 발표): https://www.linkedin.com/posts/jason-bigman-a134a024_the-winners-of-the-built-with-opus-46-hackathon-activity-7431741611333607425-Dqax
- Digital Digging (참가자 후기): https://www.digitaldigging.org/p/a-lawyer-a-road-inspector-and-a-cardiologist
