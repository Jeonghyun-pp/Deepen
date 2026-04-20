# Deepen 대용량 문서 처리 설계

> 작성일: 2026-04-14
> 기준: 강의안 마스터리 North Star · 3원칙 · LLM=Untrusted Worker / Code=Trusted Judge / DB=Invariant Guard
> 관련: docs/strategy-lecture-mastery.md, docs/information-architecture.md

---

## 0. 설계 원칙

다른 제품의 질문: *"어떻게 LLM에 다 집어넣을까?"*
Deepen의 질문: *"어떻게 모든 chunk를 **잊지 않고** 회계할까?"*

→ **"컨텍스트 윈도우 확장"이 아니라 "전수 회계"가 1순위**. LLM 호출은 그 회계 위에서 부분적·병렬적으로만 사용.

핵심 불변식: `allChunks`의 **분모(denominator)가 파이프라인 시작 시점에 고정**되고, 이후 어떤 단계도 이를 축소하지 못한다. Truncation 금지. "못 처리함"은 있어도 "몰래 빠짐"은 없음.

---

## 1. 7단계 파이프라인

```
┌─ Stage 1 ──────────────────────────────────────────────────┐
│ Deterministic Decomposition     [Code only, LLM 없음]       │
│ PDF → 블록 단위 chunk 전수 생성                             │
│   type ∈ {text, equation, figure, table}                   │
│   id 안정, page/bbox 보존                                   │
│ ▶ allChunks 집합 확정 (커버리지 분모 고정)                   │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─ Stage 2 ──────────────────────────────────────────────────┐
│ Hierarchical Segmentation       [Code + 작은 LLM 선택]      │
│ TOC·heading 있으면 구조 그대로                              │
│ 없으면 semantic window (임베딩 변곡점) 분절                 │
│ ▶ Section tree. 각 leaf = LLM 컨텍스트에 들어가는 크기      │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─ Stage 3 ──────────────────────────────────────────────────┐
│ MAP: Local Extraction           [LLM, 섹션별 병렬]          │
│ 각 섹션 → LLM 제안:                                        │
│   · node 후보 (정의/정리/절차/개념/논증)                   │
│   · chunk→node 매핑                                         │
│ ▶ proposed_nodes[section], proposed_mappings[section]       │
│ 실패 격리: 한 섹션 실패 → 다른 섹션 영향 X                  │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─ Stage 4 ──────────────────────────────────────────────────┐
│ REDUCE: Cross-section Dedup     [Code + LLM judge]          │
│ 1) Code: 후보 노드 임베딩 유사도 → 클러스터                 │
│ 2) LLM: "같은 개념인가?" binary judge (클러스터 내만)       │
│ 3) Code: 병합, sourceChunks[] 합집합                        │
│ ▶ 글로벌 node 집합                                          │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─ Stage 5 ──────────────────────────────────────────────────┐
│ Coverage Accounting             [Code only]                 │
│ unclaimed = allChunks − ∪(node.sourceChunks)               │
│ ▶ UI에 붉게 표시. 사용자가:                                 │
│   (a) 기존 노드에 매핑   (b) 새 노드 추가   (c) "무관" 마킹  │
│ 수렴될 때까지 human-in-loop                                 │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─ Stage 6 ──────────────────────────────────────────────────┐
│ Edge Extraction                 [3-pass: Code·Code·LLM]     │
│ Pass A (Code): 명시 참조 (syntactic)                        │
│ Pass B (Code): 정의문 내 개념 언급 (semantic, 임베딩)       │
│ Pass C (LLM judge): "A 이해에 B가 필요?" binary            │
│   ↑ 여기서 long-context 활용 — 전체 노드 목록을 한 번에 봄  │
│ Code: Tarjan SCC → cycle 거부. Topological layer.          │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─ Stage 7 ──────────────────────────────────────────────────┐
│ Check Items                     [LLM, 노드별]               │
│ 노드 1개 단위 → 컨텍스트 작음, 스케일 문제 없음             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. "누락 없음"이 담보되는 지점

```
Stage 1에서 |allChunks| = N (고정)
          ↓
Stage 5에서 coverage = |∪node.sourceChunks| / N
          ↓
불변식: coverage < 1.0 이면 완주 배지 불점등

→ N은 절대 줄지 않음. LLM이 바쁘거나 틀려도 N은 그대로.
→ "못 본 chunk"가 UI에 항상 drift 없이 드러남.
```

다른 제품과의 결정적 차이: **LLM 파이프라인 실패의 결과가 "조용한 누락"이 아니라 "시끄러운 unclaimed"**.

---

## 3. LLM 호출의 스케일 전략

| 단계 | 호출 단위 | 컨텍스트 크기 | 병렬성 | 모델 선택 |
|---|---|---|---|---|
| 3 Map | 섹션 | 작음 (~수천 토큰) | 높음 | 빠른·저렴 |
| 4 judge | 클러스터 쌍 | 매우 작음 | 높음 | 작은 모델 |
| 6 judge | 노드 쌍 + 컨텍스트 | **중~큼** | 중간 | **장문 강한 모델** |
| 7 생성 | 노드 1개 | 작음 | 매우 높음 | 중간 |

**관찰**: Deepen은 "한 번의 대형 호출"을 필요로 하지 않는다. **작은 호출의 병렬**이 기본. 장문 모델은 6단계 judge에서 "전체 노드 목록을 한눈에 보며 prerequisite 판단"할 때만 선택적으로 사용. 즉 컨텍스트 윈도우는 **정확도 강화용 사치**이지 **정보 누락 방지책이 아님**.

---

## 4. 점진적/스트리밍 UX

```
t=0s     Stage 1 완료     Coverage denominator 확정. UI: "74 blocks detected"
t=20s    Stage 2·3 진행   Section별로 노드 뜨기 시작. Coverage % 상승 중.
t=90s    Stage 4·5        Coverage 94%, unclaimed 4 blocks 붉게 표시.
t=사용자 unclaimed 처리    사용자가 figure 2를 노드로 승인 → 100%.
t=백그라운드              Stage 6·7 계속 진행. Graph/Roadmap 점진 갱신.
```

사용자는 전체 완료를 기다리지 않는다. **분모 확정(Stage 1)이 끝나면 coverage 게이지가 바로 의미를 가짐**.

---

## 5. 증분 업데이트 (강의안 v2 발행 시)

```
diff(v1, v2) → {added_chunks, removed_chunks, modified_chunks}

added      → Stage 3부터 재실행 (영향 섹션만)
removed    → 해당 node.sourceChunks에서 제거 → coverage 재계산
modified   → 매핑된 노드 "stale" 마킹 → 사용자 재검토 유도
```

NotebookLM의 "정적 사본 + 수동 재동기화"와 대비되는 **diff 기반 부분 재매핑**. 큰 문서에서도 전체 재처리 불필요.

---

## 6. 실패 모드 매트릭스

| 실패 지점 | 결과 | 회복 |
|---|---|---|
| Stage 1 파서 오류 | 분모 부정확 → **치명적** | 파서 강건성이 최우선. LLM으로 회피 불가 |
| Stage 3 LLM 오류 | 해당 섹션 노드 부실 → unclaimed로 드러남 | 재시도 or 사용자 수동 매핑 |
| Stage 4 병합 오판 | 노드 중복/과병합 | 사용자 반박 → 분리/병합 |
| Stage 6 cycle | Code가 거부 | 사용자가 axiom 지정 |
| Stage 7 문항 저품질 | mastery 불안정 | 사용자 신고 → 재생성 |

**파서만 확정적이면, 나머지 실패는 전부 UI에 드러나고 회복 가능**. 이것이 대용량에서 Deepen이 조용히 실패하지 않는 구조적 이유.

---

## 7. 구현 우선순위 (MVP 관점)

전략 문서의 "한 강의안 → 한 과목 완주" 최소 경로에 맞추면:

```
1순위: Stage 1 파서 + Stage 5 coverage 계산 + UI의 unclaimed 가시화
       → "분모 고정 + 누락 가시화"가 다른 모든 것의 기반
2순위: Stage 3 Map + Stage 4 naive dedup (임베딩만, LLM judge 없이)
3순위: Stage 6 Pass A·B (LLM judge는 나중)
4순위: Stage 7 cloze 1타입
```

**역설**: 대용량 처리의 1순위는 **LLM이 아니라 파서**다. Deepen의 강의안 마스터리 약속은 파서의 신뢰도 위에 서 있다.

---

## 8. 열린 결정 포인트

- Stage 1 파서 기술 선택 (PyMuPDF / pdfplumber / GROBID / 상용 API)
- Figure·수식 OCR 파이프라인 (멀티모달 LLM vs 전용 OCR)
- Stage 2 semantic segmentation의 임베딩 모델
- Stage 4 병합 judge의 false-merge vs false-split 트레이드오프 기본값
- 증분 diff의 chunk ID 안정성 전략 (content hash vs position anchor)
