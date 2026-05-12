# Deepen × Upstage API — 갈아끼울 지점 매핑

> 연고전 AI 해커톤 Business Track (2026-05-16). Upstage 제품 1개 이상 필수. 작성 2026-05-11.

## 현재 스택 (Before)

| 책임 | 사용 모델 / 라이브러리 | 위치 |
|---|---|---|
| PDF → text 분할 | `unpdf` (휴리스틱, layout 무시) | `lib/pipeline/parse-pdf.ts:98` |
| chunk → node 추출 | OpenAI `gpt-4o-mini` + JSON schema | `lib/pipeline/extract-nodes.ts:14` |
| chunk → node 매핑 | **미구현 placeholder** (`return []`) | `lib/north-star/chunk-mapping.ts:41-56` |
| 손글씨 풀이 OCR | Claude Vision (opus) | `lib/ocr/extract-steps.ts:86` |
| 문서 분류 (기출/EBS/강의안) | **없음** — `.pdf` 확장자 검증만 | `app/api/documents/upload/route.ts:20` |

## 갈아끼울 지점 (After)

| # | 위치 (file:line) | 현재 | Upstage 제품 | 기대 효과 | 우선순위 |
|---|---|---|---|---|---|
| **1** | `lib/pipeline/parse-pdf.ts:98` `parsePdf()` | `unpdf` 텍스트 추출 + 정규식 분할. 표·차트·수식 모두 `placeholder` 마킹으로 누락 | **Document Parse** | TEDS 94.48 / 3.79s/page. 한국 기출 PDF 표·그래프·수식 보존 → 노드 추출 분모(`allChunks`) 정확도↑. 자체 메모리 ‘노이즈 감소 Phase 1(a) 정규식 필터’를 Layout-aware parsing으로 대체 → **선언했던 4-layer plan의 Layer 1 ship** | **P0** (가장 큰 한방, 데모 시각화 강력) |
| **2** | `lib/pipeline/extract-nodes.ts:14,136` `extractNodesFromSection()` | OpenAI gpt-4o-mini로 nodes+edges JSON 추출. 한국어 강의안은 환각·누락 빈발 | **Information Extract** | 스키마 기반(`{nodes, edges}` 그대로 매핑) + 한국어 우위 + 범용 LLM 대비 정확도 +10%. 의도 기반 추출이라 ‘500단어당 1노드’ 같은 휴리스틱도 더 잘 지킴 | **P0** (코드 변경량 작음, 효과 큼) |
| **3** | `lib/north-star/chunk-mapping.ts:41-56` `proposeChunkMappings()` | placeholder. 현재 `return []` | **Information Extract** (스키마: `{chunkId, nodeId, confidence, justification}`) | 북극성 Stage 2 ‘chunk-mapping LLM wiring’를 Upstage로 바로 ship. confidence ≥ 0.7 auto-confirm 정책은 그대로 (코드 그대로). 한 번에 메모리 ‘다음 할 일’ 하나 소진 | **P1** (데모 시연용으로 좋음 — 어드민에서 confidence 슬라이더로 매핑 결과 시각화) |
| **4** | `app/api/documents/upload/route.ts:20` 업로드 직후 | 확장자 검증만, 분류 없음 | **Document Classify** | 100+개 클래스 학습 불필요. 업로드 PDF를 `{기출, 강의안, EBS, 노트}` 4-class로 자동 라우팅 → 강의안은 Concept 노드 파이프라인, 기출은 Pattern–Item 파이프라인으로 자동 분기. 메모리 ‘콘텐츠 시드 전략’의 평가원 기출/EBS/강의 자동 구분에 정확히 매칭 | **P2** (시간 남으면) |
| **5** | `lib/ocr/extract-steps.ts:86` `extractSteps()` | Claude Vision opus — 손글씨 LaTeX 추출 + 답 인식 | (선택) **Document Parse** 이미지 모드 + **Solar Pro 2** 한국어 추론 | Claude Vision은 강하지만 비용 높음. Document Parse가 손글씨 영역 detect → Solar Pro 2(한국어 추론)가 LaTeX·답·풀이 단계 분류. 가격 절감 + 한국어 입시 도메인 핏 | **P3** (위험: 손글씨 OCR 품질은 검증 필요) |

## ROI 순서 — 해커톤 5일짜리 우선순위

```
P0 → P0 → P1 → (P2 선택)
 1     2     3     4
```

### Day 1 (5/12 화): 사전 검증 → P0 두 개 wiring
- 오전 (2~3h): **사전 검증 게이트** (아래 「사전 검증 필요」 참고) — Document Parse / Information Extract가 한국 평가원 문서에서 실제 우위인지 실측
- 오후: **Document Parse**로 `parsePdf` 교체. 같은 `RawChunk[]` 시그니처 유지 → 다운스트림 코드 무변경
- 저녁: **Information Extract**로 `extractNodesFromSection` 교체. JSON schema 그대로 재사용

### Day 2 (5/13 수): P1 + 1p 기획서 마감
- **Information Extract**로 `proposeChunkMappings` 활성. confidence + justification 그대로 사용
- **1페이지 기획서 제출 (23:59 마감)** ← 가장 큰 게이트

### Day 3 (5/14 목): 데모 시나리오 구현 + 장표 1차 드래프트
- 평가원 미적분 기출 1세트 + 강의안 1세트 업로드 → 자동 분류 → 그래프 자동 생성 → 학생이 풀이 → 오답 → 결손 역추적 → 리캡 카드. **5분 안에 전체 루프 시연** 가능하게
- 저녁: 발표 장표 **1차 드래프트** 시작 (D2SF v2 deck 16장 → 해커톤용 7분 압축 버전 ~ 10-12장)

### Day 4 (5/15 금): 장표 마무리 + GitHub 정리
- 장표 다듬기 + GitHub README·1p 기획서·장표·데모 가이드 정리
- 23:59 발표 장표 PDF + GitHub 레포 (UpstageAI org 산하) 제출

### Day 5 (5/16 토): 본행사
- 15:30~17:30 피치 (7분 + Q&A)
- 17:30~18:30 부스 데모 — **피어 투자 시스템이 50% 평가**

## 회피 결정

| 제품 | 사용 안 함 이유 |
|---|---|
| **Upstage Studio** | 드래그앤드롭 워크플로우 빌더. 사용자 UI 아니라 사내 도구. Deepen은 이미 자체 파이프라인이 있어 통합 어색. |
| **Solar Pro 3 (102B MoE)** | 비용 대비 ROI 낮음. Information Extract만으로 한국어 우위 충분히 노출. (위험: 만약 Information Extract가 한국어 강의안에서 실측 부진하면 Solar Pro 2 fallback 필요) |

## 사전 검증 필요 (Day 1 오전 2~3시간)

해커톤 안전을 위해 가장 큰 가정 2개부터 검증. 두 게이트 모두 통과해야 P0×2 ship 진행. 실패 시 아래 fallback.

1. **Document Parse가 한국어 평가원 PDF의 수식·도표를 살리는가?**
   - 테스트 입력: 2024학년 수능 미적분 30번 (수식+도표 혼합)
   - 합격 기준: 표 셀 구조 + 인라인 수식 LaTeX 또는 MathML로 살아 있어야 함

2. **Information Extract가 한국 강의안에서 OpenAI보다 실제 우위인가?**
   - 테스트: 도메인 문서 1개(메모리 ‘재무관리’ 도메인 — 이미 precision 측정해본 적 있음)에 동일 스키마 던져 노드 수·정확도 비교
   - 합격 기준: 정밀도 +5%p 이상 (메모리상 자체 60.5%→74.3% 베이스라인)

둘 다 실패 시 fallback: Document Parse만 P0로 ship하고, extract-nodes는 OpenAI 유지 + Solar Pro 2를 ‘리캡카드 한국어 생성기’로 도입 (별도 신규 기능).

## 메시징 (피치에서 쓸 한 줄)

> Deepen은 한국 평가원 기출 PDF를 그대로 먹여 **유형(Pattern) 단위 학습 지도**를 자동 생성한다. Upstage Document Parse가 표·수식·도표를 살리고, Information Extract가 한국어 강의안에서 Concept–Pattern을 뽑는다. 자체 LLM 스택 대비 분모 정확도(allChunks)와 노드 추출 정밀도가 동시에 오르며, 이는 우리가 측정해 온 60.5%→74.3% precision 곡선을 다음 단계로 끌어올린다.
