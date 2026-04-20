# Deepen Information Architecture

> 작성일: 2026-04-14
> 기준: **강의안 마스터리 North Star** (docs/strategy-lecture-mastery.md)
> 스코프: UI surface + 데이터 온톨로지 + user flow 통합
> 관통 원칙: **완결성 증명 · Prerequisite DAG · 이해 확인 루프** (3원칙)

---

## 0. 한 줄 요약

```
 [강의안 PDF] ──► [Chunk+Node 추출] ──► [DAG Roadmap] ──► [Mastery Loop] ──► [완주 배지]
      원문               온톨로지              학습 경로         이해 확인         불변식 통과
      (완결성)          (traceability)         (DAG)          (증명)           (judge)
```

세 원칙은 세 단계가 아니라 **동시에 surface** 되어야 한다. 한 화면 안에서 "어디까지 커버됐나 / 어디로 가야 하나 / 내가 어디까지 이해했나" 세 질문에 항상 답할 수 있어야 한다.

---

## 1. User Journey (North Star)

```
 ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
 │ 1. DROP  │──►│ 2. MAP   │──►│ 3. PLAN  │──►│ 4. LEARN │──►│ 5. PROVE │
 │ 강의안    │   │ Chunk→   │   │ DAG      │   │ 노드별    │   │ 완주     │
 │ 업로드    │   │ Node     │   │ Roadmap  │   │ check    │   │ 배지     │
 └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
     PDF          원문 진실     학습 순서       이해 증명       불변식
     Drop        unclaimed=0    acyclic        mastered       AND 통과

 ── 각 단계에서 사용자는 "반박할 권한"을 가진다 (user override → 불변식 재계산)
```

---

## 2. UI Surface (화면 구조)

```
 ╔══════════════════════════════════════════════════════════════════════════╗
 ║                           DEEPEN APP SHELL                               ║
 ╠═══════════════╦══════════════════════════════════════╦═══════════════════╣
 ║  LEFT NAV     ║           MAIN CANVAS                ║   RIGHT PANEL     ║
 ║  (Projects)   ║  (Graph / Roadmap / Doc / Note)      ║   (4 tabs)        ║
 ║               ║                                      ║                   ║
 ║ • 강의안 A     ║  ┌────────────────────────────────┐  ║ ┌───────────────┐ ║
 ║ • 강의안 B ◄   ║  │ [Graph] [Roadmap] [Doc] [Note] │  ║ │ Inspector     │ ║
 ║ • 연구 프로젝트║  ├────────────────────────────────┤  ║ │ Evidence      │ ║
 ║               ║  │                                │  ║ │ Check         │ ║
 ║  + 새 프로젝트 ║  │    (active view renders)       │  ║ │ Chat          │ ║
 ║               ║  │                                │  ║ └───────────────┘ ║
 ║               ║  │                                │  ║                   ║
 ║               ║  └────────────────────────────────┘  ║ selected node의   ║
 ║               ║  Coverage: 94% · Mastery: 12/54      ║ context 고정       ║
 ╚═══════════════╩══════════════════════════════════════╩═══════════════════╝
     (상단 전역 bar: 프로젝트명 · 완결성 배지 · 완주 상태 · 사용자)
```

### 2.1 Main Canvas — 4 tabs

```
 ┌─ Graph ────────────────────────────────────────────────────────────────┐
 │  개념 노드의 공간 지도 (force / layered)                                 │
 │  엣지: logical-prerequisite, pedagogical-order, contradiction          │
 │  노드 상태 색상: unseen · viewed · tested · mastered · unclaimed       │
 │  "미매핑 블록" floating 표시 (완결성 원칙)                              │
 └────────────────────────────────────────────────────────────────────────┘

 ┌─ Roadmap ──────────────────────────────────────────────────────────────┐
 │  DAG의 topological layer 뷰 (Level 1 → N)                              │
 │  같은 layer = 순서 자유, 다른 layer = 선후 엄격                          │
 │  진행률 게이지, "여기까지 하면 끝" 종점 가시화                            │
 └────────────────────────────────────────────────────────────────────────┘

 ┌─ Doc ──────────────────────────────────────────────────────────────────┐
 │  원문 PDF/마크다운 뷰 (진실의 단일 소스)                                 │
 │  chunk 하이라이트 · 노드 역추적 링크                                     │
 │  unclaimed block은 붉게 highlight (침묵하지 않는다)                     │
 └────────────────────────────────────────────────────────────────────────┘

 ┌─ Note ─────────────────────────────────────────────────────────────────┐
 │  사용자 필기 · 플로팅 메모 · 노드/청크 양방향 링크                       │
 │  학습자 주도 공간 (시스템이 침범하지 않는 영역)                          │
 └────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Right Panel — 4 tabs (selected node 기준)

```
 [Inspector]   노드 메타 · 타입(정의/정리/절차/개념/논증) · 상태
 [Evidence]    역추적된 원문 chunk (주장 옆에 증거)
 [Check]       check item (cloze/순서/객관/서술) · 시도 이력 · mastery 전이
 [Chat]        노드 scoped 에이전트 대화 (설명/반례/예시 요청)
```

### 2.3 전역 Status Bar (항상 보임)

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │ Coverage 94% (unclaimed 4)  │  DAG ✓ acyclic  │  Mastered 12 / 54     │
 │ ───────────────────────────────────────────── 완주 배지: ☐ 미완        │
 └────────────────────────────────────────────────────────────────────────┘
     ↑ 세 원칙의 실시간 상태. 배지는 불변식 AND 통과 시에만 점등
```

---

## 3. 데이터 온톨로지

```
                          ┌────────────────┐
                          │    Project     │  (강의안 1개 = 1 프로젝트)
                          │  = Lecture     │
                          └───────┬────────┘
                                  │ 1
                ┌─────────────────┼─────────────────┐
                │ *               │ *               │ *
        ┌───────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
        │  SourceDoc   │   │    Node     │   │    Note     │
        │  (PDF/MD)    │   │ (concept)   │   │ (user memo) │
        └───────┬──────┘   └──────┬──────┘   └─────────────┘
                │ 1               │ *
                │ *               │
        ┌───────▼──────┐          │
        │ SourceChunk  │◄─────────┤ sourceChunks[]  (역추적)
        │ text/eq/fig/ │  *    *  │
        │ table        ├──────────┤
        └──────────────┘          │
              ▲                   │
              │ proposed / verified
              │                   │
        ┌─────┴────────┐   ┌──────▼──────────┐
        │ ChunkMapping │   │      Edge       │
        │ (LLM→검증)    │   │ logical-prereq  │
        └──────────────┘   │ pedagogical     │
                           │ contradiction   │
                           └─────────────────┘
                                  │
                           ┌──────▼──────────┐
                           │   CheckItem     │
                           │ cloze/order/    │
                           │ mcq/argument    │
                           └──────┬──────────┘
                                  │ *
                           ┌──────▼──────────┐
                           │  Attempt        │
                           │ → Mastery FSM   │
                           │ unseen→viewed→  │
                           │ tested→mastered │
                           └─────────────────┘
```

### 3.1 불변식 (DB 레벨)

```
 COMPLETION ≡
    coverage(chunks → nodes) == 100%        ← 완결성
    AND  ∀ edge: isAcyclic(graph)           ← DAG
    AND  ∀ node: mastery == mastered         ← 이해 확인
```

배지·완주 판정은 이 식의 결과. UI는 이 상태를 **보여줄 뿐** 주장하지 않는다.

---

## 4. 3원칙 × Surface 매핑

```
 ┌─────────────────┬──────────────────────┬──────────────────────┬──────────────────────┐
 │ 원칙             │ Main Canvas에서       │ Right Panel에서       │ Status Bar에서       │
 ├─────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 완결성 증명      │ Doc: unclaimed 하이라이트│ Evidence: chunk 역추적│ Coverage %           │
 │                 │ Graph: 미매핑 floating │                      │                      │
 ├─────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ Prerequisite DAG│ Roadmap: layered 뷰   │ Inspector: 선행/후속  │ DAG ✓ / cycle ⚠     │
 │                 │ Graph: edge type 색   │                      │                      │
 ├─────────────────┼──────────────────────┼──────────────────────┼──────────────────────┤
 │ 이해 확인 루프   │ Graph: mastery 색상   │ Check: 시도/전이      │ Mastered N / M      │
 │                 │ Roadmap: 진행률       │                      │ 완주 배지            │
 └─────────────────┴──────────────────────┴──────────────────────┴──────────────────────┘
```

---

## 5. LLM ↔ Code 책임 경계 (파이프라인 투영)

```
 [PDF 업로드]
      │
      ▼
 ┌─────────────────┐
 │ 결정적 전처리     │  code: 페이지/문단/수식/표 블록 분할
 │ (파서)           │
 └────────┬────────┘
          ▼
 ┌─────────────────┐
 │ 의미적 그룹핑    │  LLM 제안 → ChunkMapping(proposed)
 │ + 노드 초안      │  code 검증: 스키마·역참조 가능성
 └────────┬────────┘
          ▼
 ┌─────────────────┐
 │ Edge 추출 3pass │  code: syntactic · code: semantic · LLM: judge
 │                 │  → proposed_edges
 └────────┬────────┘
          ▼
 ┌─────────────────┐
 │ DAG 검증         │  code: Tarjan SCC, topological sort  ◄── 거부권
 └────────┬────────┘
          ▼
 ┌─────────────────┐
 │ CheckItem 생성   │  LLM 제안 → code: 정답 비교 or 재반박 가능 저장
 └────────┬────────┘
          ▼
 ┌─────────────────┐
 │ 불변식 평가      │  code (pure function) → Status Bar 갱신
 └─────────────────┘

  LLM = Untrusted Worker · Code = Trusted Judge · DB = Invariant Guard
```

---

## 6. 상호작용 규약 (요약)

```
 • click          → Right Panel context 고정 (Inspector)
 • shift+click    → 다중 선택 (비교·병합 검토)
 • Roadmap overlay= Main Canvas 위 반투명 레이어 (Graph ↔ Roadmap 전환 보조)
 • 반박 권한       = 모든 LLM 산출물 옆 "틀림" 버튼 → 불변식 재계산
 • "나중에" 허용   · "스킵" 없음 (이해 확인 원칙)
```

---

## 7. 열려 있는 결정

- SourceChunk 멀티모달 스키마 (text / equation / figure / table) 구체
- `proposed_*` 테이블과 main 테이블 이원 관리의 UI 노출 수위
- Roadmap overlay vs 독립 탭의 기본 모드
- 완주 배지의 공유 가능 형태 (link? 증거 포함 snapshot?)

---

## 참고

- docs/strategy-lecture-mastery.md — 3원칙 · 불변식 · 아키텍처 원칙
- docs/agent-evolution-roadmap.md — 에이전트 진화 경로
- memory: project_lecture_mastery_scenario, project_v2_redesign_ux_decisions
