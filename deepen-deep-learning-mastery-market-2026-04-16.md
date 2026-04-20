# Deepen 시장 리서치 보고서 — 학습 완결성(Deep Learning Mastery) 시장과 초기 성장 스탠스

> 작성일: 2026-04-16
> 리서치 범위: 글로벌(주) + 한국(서브)
> 분석 기간: 2024 ~ 2030 (예측 일부 2035)
> 대상 제품: Deepen — 강의안·논문 입력 → 개념 노드 자동 매핑 + Prerequisite DAG + 노드별 이해 확인 루프 → "완전 이해" 보증 도구

---

## 1. Executive Summary

Deepen이 속한 시장은 단일 카테고리가 아니라 **AI in Education(거시) ⊃ AI 학습/지식 도구(중간) ⊃ "학습 완결성 보증"(Deepen이 정의하려는 새 카테고리)**의 중첩 구조다. 거시 시장은 폭발 성장(2025 $6.9~8.3B → 2030 $32.3B, CAGR 31~43%) 중이고[1][2][3], 그 안에서 NotebookLM·Quizlet·Anki·Lilys·유니브 AI 등은 각각 **요약/검색·플래시카드·범용 LLM 챗·한국 학생용 PDF 요약**의 빈자리를 차지했지만, **"사용자가 업로드한 임의의 강의안에 대해 완결성·DAG·이해 검증을 동시에 보증하는 사분면은 비어 있다**[4][5].

전략적 결론: Deepen은 (1) **AI 베끼기 백래시·Active Recall 부활·LLM의 chunk-DAG 추출 가능성**이라는 3중 거시 변수가 동시에 정렬된 2026년에 진입한다는 타이밍 정합성을 가졌다. (2) 그러나 NotebookLM의 가격 압박과 StudyFetch의 College Board 제휴[5], 유니브 AI의 한국 캠퍼스 선점 같은 압력이 12~18개월 윈도우를 좁히고 있다. (3) 추천 스탠스는 **"카테고리 정의자(Category Creator) + 대학원·전문시험·연구실 high-trust 진입"**이며, 한국 학부 9,900원 시장과 NotebookLM의 무료 소비층은 의도적으로 회피한다. (4) 초기 성장은 페이드 광고가 아니라 **창업자 콘텐츠·공유 가능한 그래프 아티팩트·연구실 파일럿** 3축으로 굴린다[18][19][20].

| 지표 | 수치 | 출처 |
|---|---|---|
| AI in Education 시장 규모 (2025) | $6.9~8.3B | [1][2] |
| AI in Education CAGR (2025–2030) | 31.2~42.83% | [1][2] |
| AI Tutors 단독 세그먼트 (2024) | $1.63B, CAGR 30.5% | [3] |
| 글로벌 플래시카드 앱 시장 (2025) | $2.5B, CAGR 15% | [6] |
| 한국 에듀테크 시장 (2025) | ~9.98조 원, CAGR 7.7% | [7] |
| NotebookLM 월방문 (2025초) | 48M+, MAU QoQ +120% | [4] |
| 학생 GenAI 사용률 (2025) | 학부생 92%, 평가 사용 88% | [8][9] |
| 유니브 AI 월매출 (2025) | ~1.5억 원 | [10] |
| Lilys.ai 누적 사용자 (2년) | 100만+ | [11] |

---

## 2. 시장 정의

### 범위
본 보고서는 다음 3개 동심원으로 시장을 정의한다.

1. **외곽(거시)**: AI in Education — K-12·고등교육·기업교육 전반의 AI 적용 시장.
2. **중간(Deepen이 직접 경쟁하는 풀)**: AI 학습/지식 워크스페이스 — NotebookLM, Claude Projects, Perplexity Spaces, Quizlet AI, RemNote, Lilys, 유니브 AI, StudyFetch.
3. **내부(Deepen이 정의하려는 새 카테고리)**: **Learning Mastery Assurance** — 사용자가 올린 임의 자료에 대해 (a) 모든 chunk가 노드로 매핑되었는지 추적하는 **완결성**, (b) 개념 간 의존성을 그리는 **prerequisite DAG**, (c) 노드별 행동으로만 통과되는 **이해 확인 루프**의 3원칙을 동시에 만족하는 도구군.

### 세그먼트 분류
| 축 | 분류 |
|---|---|
| 콘텐츠 소스 | 사용자 업로드 / 플랫폼 제공 커리큘럼 |
| 학습 깊이 | 요약 → Q&A → 플래시카드(SR) → DAG 마스터리 |
| 구조화 수준 | 텍스트 → 카드 → 그래프 → DAG |
| 사용자 페르소나 | K-12 / 학부 / 대학원·연구자 / 전문시험 / 사내교육 |

Deepen의 좌표: **사용자 업로드 + DAG 마스터리 + 그래프/DAG 구조 + 대학원·전문시험·연구자**.

---

## 3. 시장 규모 & 성장률

### TAM (Total Addressable Market)
거시 AI in Education 시장은 리서치 기관마다 시장 정의 범위가 달라 큰 편차가 있다.

| 기관 | 2024/25 규모 | 2030/35 전망 | CAGR |
|---|---|---|---|
| Grand View Research | $5.88B (2024) → $8.30B (2025) | $32.27B (2030) | 31.2% [1] |
| Mordor Intelligence | $6.90B (2025) | $41.01B (2030) | 42.83% [2] |
| MarketsandMarkets | $2.21B (2024) | $5.82B (2030) | 17.5% [12] |
| Precedence Research | $7.05B (2025) | $136.79B (2035) | 34.52% [13] |

**채택 수치**: 본 보고서는 **Grand View Research 기준($8.3B 2025 → $32.3B 2030, CAGR 31.2%)**을 채택한다. 이유: (a) 두 개 메이저 기관(Grand View·Mordor) 수치가 $6.9~8.3B 범위로 수렴, (b) MarketsandMarkets는 시장 정의가 좁아(B2B 솔루션 한정 추정) 본 분석 범위와 불일치, (c) Precedence의 10년 예측은 외삽 불확실성 큼.

### SAM (Serviceable Addressable Market)
Deepen이 직접 노릴 수 있는 풀:
- **AI Tutors 글로벌**: $1.63B (2024) → $6.45~8.0B (2030)[3]
- **플래시카드/Active Recall 글로벌**: $2.5B (2025), CAGR 15%[6]
- **AI 연구 도구(Elicit·SciSpace 류)**: 정량 추정 부재, 그러나 PhD/연구자 ~5M 글로벌, ARPU $10~25/월 가정 시 ~$0.5~1.5B 잠재
- **합산 SAM 추정**: ~$5~10B (2025), 2030년 ~$20~30B

### SOM (Serviceable Obtainable Market)
초기 5년 합리적 도달 범위:
- **한국**: 대학원생 ~33만 명 + 전문시험 응시자 ~30만 명/년 → 페이잉 유저 1~3% 침투 시 6,000~2만 명 × ARPU 20만원/년 = **연 12~40억 원**
- **글로벌(영어권)**: 대학원생 + 전문시험(USMLE·CFA) 마이크로 니치 → 1~5만 페이잉 유저 × ARPU $200/년 = **$2~10M ARR**
- **B2B(대학·연구기관·시험준비 기관)**: 시드 10~50개 기관 × $5K~50K/년 = **$50K~2.5M ARR**

### 성장 전망
거시 AI in Education의 31% CAGR을 그대로 누리지는 못한다. Deepen이 속한 **AI Tutors + 학습 마스터리** 하위 세그먼트는 30~45% CAGR이 일관되게 보고[3]. 핵심 드라이버: ① 학생 GenAI 사용률 폭증(평가 사용 53%→88% 단 1년)[9] → "이해 검증" 수요 동반 폭증, ② NotebookLM·Claude Projects의 enterprise 확산이 카테고리 자체를 대중화, ③ FSRS·Active Recall의 학습과학적 정당성 확립[14].

---

## 4. 고객 분석

### 타깃 세그먼트별 매력도

| 세그먼트 | 시장 규모 | 지불의사 | Deepen 적합도 | 도달 난이도 | 종합 |
|---|---|---|---|---|---|
| 한국 학부 시험 | 대(연 200만 학생) | 낮음(<1만 원/월) | 중 | 낮음 | △ — 유니브 AI 선점·가격 압박 |
| **한국 대학원생** | 중(~33만) | 중(2~5만 원/월) | **상** | 중 | **◎** |
| **글로벌 의료 시험(USMLE)** | 대($1.85B 북미 시험프렙)[15] | 매우 높음($500~3K/년 AnKing+UWorld) | **상** | 중(AnKing 커뮤니티 진입) | **◎** |
| CFA·회계사·변호사 | 중(연 ~10만 응시 글로벌) | 높음 | 상 | 높음(브랜드 신뢰 진입장벽) | ○ |
| 연구자(PhD·Postdoc) | 중(~5M 글로벌) | 중 | 상 | 중(랩 단위 침투) | ○ |
| B2B 사내 컴플라이언스(제약·금융) | 대($2.5B 컴플라이언스 서비스)[16] | 매우 높음 | 중-상 | 매우 높음(엔터프라이즈 세일즈) | △ — 장기 옵션 |
| 출판사·MOOC·인강사 | 중 | 높음 | 중 | 매우 높음 | △ |

**우선 세그먼트 추천**: ① **한국 대학원생(대학원 세미나·논문 리뷰 시장)** — 한국어 자료 + 페르소나 정합 + 유니브 AI/콴다와 비충돌. ② **글로벌 의료 시험(USMLE)** — AnKing 70% 점유[17]에도 "수천 카드 번아웃 + 이해 없는 암기" 페인포인트가 강함. Deepen은 **"AnKing을 만들 수 없는 사람을 위해 자동으로 만들어주는"** 포지션으로 침투 가능.

### 구매 동기 & 페인포인트
- **대학원생/연구자**: "논문 50편 종합시험에서 어디까지 이해했는지 모른다", "Anki 카드 만들 시간이 없다", "교수가 묻는 핵심 개념 의존성을 놓친다"
- **의대생**: "AnKing 수만 카드 → 번아웃, 이해 없는 암기", "WHY를 묻는 NBME-style 시험에 약함"
- **연구자**: Elicit/SciSpace는 탐색·요약은 잘하나 **"이 논문을 정말 이해했는지" 검증 메커니즘 없음**. r/PhDStress, r/AskAcademia에서 빈번한 호소
- **공통**: AI로 빠르게 답을 받지만 **"내가 모른다는 것을 모르는 상태"**에 대한 불안 — Deepen의 완결성 보증이 정확히 해소

---

## 5. 경쟁 구도

### 주요 플레이어 매트릭스

| 카테고리 | 대표 제품 | 사용자/매출 | 가격 | 강점 | Deepen 관점 약점 |
|---|---|---|---|---|---|
| AI 노트북 | **NotebookLM** | 월방문 48M+, 교육 AI 14% [4] | Plus $19.99/월 | 멀티모달, 오디오 오버뷰 | DAG·이해 검증 없음 |
| 범용 LLM 워크스페이스 | **Claude Projects** | Anthropic ARR $14B (2026 초) | Pro $20, Max $100~200 | 200K 컨텍스트, 추론 | 학습 루프 자가구성 필요 |
| 한국 요약 | **Lilys.ai** | 100만+ 유저 [11] | Freemium | 한국어 요약, 바이럴 | 일회성 소비, 마스터리 없음 |
| 한국 학부 시험 | **유니브 AI(싱귤래러티)** | MRR ~1.5억 [10] | 학생 저가 구독 | 페르소나 밀착, 빠른 iteration | 요약/퀴즈 얕음, DAG 없음 |
| 한국 K-12 풀이 | **콴다(Qanda)** | 누적 ~9천만 [20] | Plus 구독 | 동남아·일본 침투 | 문제풀이 한정, 강의 마스터리 없음 |
| 플래시카드 AI | **Quizlet** | 월 60M 학습자 | Plus $7.99/월 | 브랜드, 공유 덱 | DAG·prerequisite 없음 |
| 의대 표준 | **Anki + AnKing** | 의대 1학년 70% 일일 사용 [17] | 데스크탑 무료, AnkiHub $5~10/월 | 학습과학 정당성 | 카드 제작 사용자 책임 |
| SR + PKM | **RemNote** | 100만+ 학생 자칭 | $8~10/월 | 노트-카드 이중화 | DAG·자동 노드화 없음 |
| 학생 AI 튜터 | **StudyFetch** | 600만+ 학생, Series A $11.5M (Owl Ventures + College Board) [21] | $99.99/년 | 강의 grounding, 제휴 | 마스터리 배지 없음 |
| AI 연구 도구 | **Elicit / SciSpace** | Elicit 200만+ 연구자 | Elicit $12/월~ | 논문 탐색·요약 | 이해 검증 부재 |
| K-12 마스터리 | **Khanmigo** | Khan Academy 1.5억 등록 | $4/월 | 교과정렬, 비영리 신뢰 | K-12 한정, 사용자 업로드 불가 |
| AI 네이티브 학교 | **Eureka Labs(Karpathy)** | 미출시 (LLM101n) | 미정 | 브랜드 | 자체 콘텐츠만, 사용자 자료 미대응 |

### 경쟁 역학
- **수직축(콘텐츠 소스)** vs **수평축(학습 깊이)**으로 잘라보면, "사용자 업로드 + DAG 마스터리" 사분면이 비어 있다.
- 가장 가까운 위협은 **StudyFetch** (제휴·자금력) > **유니브 AI** (한국 대학생 선점) > **NotebookLM** (대중·가격 압박) 순서.
- **압도적 1위 부재**: NotebookLM 14% 점유[4]는 분산 시장의 신호. 카테고리 정의자(Category Creator)가 차지할 여백이 존재.

---

## 6. 밸류체인 & 수익구조

### 가치사슬
**LLM 인프라(OpenAI/Anthropic/Google)** → **임베딩·벡터 DB** → **chunk·DAG 추출 엔진(Deepen 내부 IP 영역)** → **이해 검증 UX(체크 아이템·배지)** → **학습자 상태 데이터**

### 마진 분포
- **LLM 비용**: 학습자 1명 월 사용량 추정 시 $1~5 (chunk 추출 + check 생성 + 챗). 영업이익률 보호선 ARPU $15+/월.
- **고마진 영역**: 학습자 상태 데이터(어느 노드 mastered/struggling)의 누적 → 신규 사용자에게 "이 강의는 평균 6시간 걸린다" 같은 메타데이터로 환원 가능. 데이터 플라이휠.
- **저마진 함정**: 단순 요약/Q&A 경쟁(NotebookLM·Lilys 영역)으로 끌려가면 LLM 비용 직접 압박 + 가격 하방 압박.

### 수익 모델 옵션
1. **B2C 프리미엄 SaaS** ($15~25/월) — 메인
2. **B2C 시즌 패키지** (USMLE 1~6개월 $200~500)
3. **B2B 기관 라이선스** (대학·연구실 seat $5~10K/년~)
4. **공개 그래프 마켓플레이스** (수익 분배 5:5) — 장기 옵션

---

## 7. 트렌드 & 변화 동인

### 기술 트렌드
- LLM이 chunk 단위 개념 추출과 prerequisite 관계 추론을 처음으로 신뢰 가능한 정확도로 수행하는 시점 도달(2024~2025 GPT-4 / Claude 3.5+)
- FSRS 알고리즘이 SM-2를 대체하며 Active Recall 학습과학적 정당성 한 단계 상승[14]
- 그래프 UI(React Flow 등)의 성숙으로 복잡 노드 시각화 진입 비용 하락

### 사회·교육 변화
- **AI 부정행위 위기**: 학생 88%가 평가에 GenAI 사용[9], UK 2023-24 적발 7,000건(전년 대비 3배)[22], 한국 연세대 1개 강의 54.5% 자진응답 부정행위[18]. → **"이해 베끼기 vs 이해 증명"의 사회적 갈증** 폭증
- **Active Recall·Retrieval Practice의 #studytok 주류화**: TikTok·YouTube 학습 콘텐츠에서 Karpicke/Roediger 연구가 인용되는 빈도 폭증[14]
- **Tools for Thought 운동**: Andy Matuschak·Michael Nielsen의 mnemonic medium(Quantum Country)이 검증한 "텍스트 + 내장 SR" 모델이 Deepen의 사상적 토대를 정당화[23]

### 규제 변화
- 미국 다수 대학(George Mason 등)이 2025년 Honor Code 개정 — "AI 사용 인정·과정 문서화" 의무화 추세[22]
- 한국 교육부 AI 디지털교과서 도입(2025)으로 K-12에 AI 학습 도구 관제·표준 정착 → 고등교육으로 파급 예상[7]

---

## 8. 진입장벽 & 리스크

### 진입장벽
- **데이터 플라이휠**: 학습자 상태(노드별 mastered/struggling) 데이터는 누적될수록 신규 사용자 경험 개선. 후발 GPT 래퍼가 모방 어려움.
- **DAG 추출 품질 IP**: 단순 chunk 분해는 쉬우나 "교육적 prerequisite 관계" 추출은 도메인별 노하우 누적 필요.
- **신뢰·브랜드**: 대학원·전문시험·연구실 채널은 한 번 진입하면 큰 락인이지만 진입 자체가 어렵다(논문·교수 추천 기반).

### 주요 리스크
1. **Google/Anthropic의 학습 마스터리 수직 통합**: NotebookLM이 "이해 확인" 기능을 추가하면 가격(번들)에서 압살. 대응: 대학원·전문시험 niche에 깊이 박혀 빠르게 도메인 특화.
2. **유니브 AI/StudyFetch의 마스터리 레이어 진입**: 상위로 올라오는 시도 가능. 대응: DAG·완결성 보증 UX의 기술적 해자 확보 + 카테고리 정의 선점.
3. **AI 부정행위 도구로 오인**: "AI로 시험 잘 보는 도구"로 라벨링되면 교수·연구실 채널 영구 차단. 대응: 메시징·광고를 "이해 증명" 일관 유지.
4. **LLM 비용 변동**: API 가격 상승 시 단위 경제 악화. 대응: 핵심 추론 경로의 자체 모델/임베딩 + 캐싱.
5. **학습과학 백래시**: SR·DAG의 효과가 자료 종류(서술형 인문학 등)별로 차이. 대응: 적합한 자료 유형 가이드.

---

## 9. 기회 & 시사점 — Deepen의 가치 제안과 성장 스탠스

### 9.1 시장에서의 가치
Deepen이 시장에 던지는 단 하나의 약속은 다음과 같다:

> **"당신이 업로드한 이 강의·논문에 대해, 빠뜨린 개념이 무엇인지, 어떤 순서로 배워야 하는지, 그리고 정말 이해했는지를 행동 증거로 보증한다."**

이는 NotebookLM(소비), Quizlet(파편 암기), Anki(사용자 수작업), Khanmigo(자체 커리큘럼), 유니브 AI(요약/퀴즈) 어느 누구도 **동시에** 약속하지 않는 명제다. 시장 가치는 세 가지로 환원된다.

1. **학습자 가치**: "내가 모른다는 것을 모르는 상태"의 해소 — AI 시대 학습 불안의 핵심
2. **교육자/기관 가치**: AI 부정행위 대체재 — "이해를 증명하는 도구"로 평가 무결성 보완
3. **사회적 가치**: 정보 소비형 AI 사용에서 학습 완결성 검증으로의 패러다임 전환을 선도

### 9.2 추천 시장 스탠스 (4개 옵션 중 추천)

| 옵션 | 요지 | 평가 |
|---|---|---|
| (a) **카테고리 정의자 + High-Trust Niche** ✅ 추천 | "Learning Mastery Assurance" 카테고리를 명명하고, 대학원·USMLE·연구실로 high-trust 진입 | 철학 정합 / 가격 방어 / 데이터 플라이휠 / 12~18개월 윈도우 활용 |
| (b) B2B 기관 번들 우선 | 대학·시험준비기관·R&D랩 license-first | LTV 큼 / 성장 느림 / 초기 PMF 검증 늦음 |
| (c) PKM Plugin/Integration | Obsidian·Notion 플러그인으로 piggyback | 기술 부담 / 브랜드 종속 / 가격 천장 |
| (d) Mass 학생 시장 | 유니브 AI와 정면 경쟁 | 가격 압박 / 철학 훼손 / 부정행위 라벨링 위험 |

**(a) 채택 근거**: 카테고리 자체가 비어 있고(섹션 5), 거시 트렌드(섹션 7)가 정렬되어 있으며, 데이터·신뢰·기술 3중 해자 구축 가능(섹션 8). (b)~(d)는 (a) 안에서 단계적으로 흡수한다 — 12개월 후 B2B, 24개월 후 PKM 통합, 36개월 후 mass.

### 9.3 단계별 스탠스
- **0~6개월 (PMF)**: 한국 대학원 5~10개 랩 + 미국 USMLE 베타 100명. 메시징은 **"빠짐없이 이해했음을 증명"**. 가격 미공개(베타).
- **6~18개월 (확장)**: 한국 대학원 → 의·약·로스쿨 전문시험 → 영어권 PhD. 가격 도입 ($15~25/월 또는 시즌 $200~500). B2B 기관 라이선스 첫 계약.
- **18~36개월 (카테고리화)**: "Learning Mastery Assurance" 컨퍼런스/표준화 시도, 학습과학자·Matuschak 라인 인플루언서 협력. 공개 그래프 마켓플레이스 베타.

### 9.4 성장 과정의 행동 원칙
1. **회피해야 할 카테고리 라벨링**: "AI 시험 정답기", "AI 요약기", "AI 노트앱"
2. **방어해야 할 카테고리 라벨링**: "학습 완결성 도구", "이해 증명 도구", "AI 시대의 학습 검증"
3. **회피 시장**: 한국 학부 9,900원 시장, K-12, 무료 NotebookLM 소비층
4. **방어 시장**: 대학원·전문시험·연구실의 **고지불·고신뢰 페르소나**

---

## 10. 초기 성장 광고/마케팅 모델 (사용자 추가 요청)

### 10.1 핵심 명제
Deepen은 **페이드 광고로 0→1만을 뚫는 제품이 아니다**. "심층 학습 완결성"은 15초 영상으로 전달 불가능하고, 학생 페이드 광고의 CAC는 LTV를 압살한다(미국 B2C 온라인 교육 평균 CAC $1,617)[24]. 대신 유사 제품(Lilys, NotebookLM, Notion, Readwise, RemNote)이 모두 사용한 **3축 플레이북**을 채택한다.

### 10.2 유사 제품 초기 성장 사례 (요약)
| 제품 | 0→1만 달성 방식 | 핵심 채널 | 페이드 비중 |
|---|---|---|---|
| **Lilys.ai** | 2주 만에 1만 유저, 6개월 MAU 4.5만, 외부투자·유료 마케팅 0[11][25] | 카카오톡 공유 인센티브 + 자발적 테크 인플루언서 리뷰(GeekNews·Threads) | 0% |
| **NotebookLM** | 2024.9 Audio Overviews 출시 후 X·Reddit 자발 바이럴[26] | "내 PDF → 팟캐스트" 공유 가능 아티팩트 | 0% |
| **유니브 AI** | 학교 지원 2,900만 원 → 월매출 1.5억[10] | 에브리타임 바이럴 + 인스타 릴스 + 학교별 학생회 | 저 |
| **Quizlet** | 252일 만에 5만, 2년 만에 100만[27] | UGC SEO 플라이휠(공개 study set의 구글 색인) | 0% |
| **Notion** | 캠퍼스 리더 60개 도시 + 템플릿 갤러리 SEO[28] | 커뮤니티 + 템플릿 갤러리 | 저 |
| **AnKing** | 의대생 10만+ 사실상 표준[17] | Reddit r/medicalschool + YouTube "내 Anki 루틴" 브이로그 | 0 |
| **RemNote** | HN·r/Zettelkasten·r/medicalschool 시드[29] | 학습과학 커뮤니티 | 0 |

공통점: **(a) 결과물이 SNS에 공유 가능한 형태, (b) 창업자/얼리유저의 founder-led 콘텐츠, (c) 고밀도 커뮤니티(의대·PhD·노트테이커) 시드 진입**.

### 10.3 한국 채널 효율
- **에브리타임**: 가입 700만, MAU 450만, 대학생 9/10 사용. 도달당 비용 타 매체 대비 ~1/4[30]. 그러나 배너는 대기업 포화 — 스타트업은 **유저 UGC 게시물(대행 10~30만 원/건)**이 효율.
- **인스타 릴스·유튜브 학습 브이로그**: 건당 50~300만 원, 대학원생 타깃은 "의대생 Anki 루틴", "대학원생 Obsidian 세팅" 류 소수 고관여 크리에이터가 효율.
- **캠퍼스 앰버서더**: 학교당 1~2명, 월 제품 크레딧 + 소액 스타이펜드($50~100). 5~10개 학교 파일럿 권장.
- **교수 추천(syllabus 진입)**: 한 강의에 들어가면 수강생 전원 자연 유입 — Deepen 페르소나에 가장 정합.

### 10.4 B2C 학습 SaaS CAC/LTV 벤치마크
- 냉담 트래픽 전환 2~5%, freemium 모델 8~12%[24]
- 인도 B2C 에듀테크 CAC $18~48, LTV $36~96, **LTV:CAC 5~7x**[31]
- 미국 B2C 온라인 교육 평균 CAC $1,617, LTV $4,500~5,000, 3:1[24]
- **시사**: 학생 페이드 광고는 Deepen 가격대($15~25/월 ARPU)에서 payback 18개월+ — 비효율.

### 10.5 추천 채널 믹스 (우선순위)

#### #1 (Must) — 연구실·대학원 파일럿 + Founder-led 콘텐츠
- 월 예산 0~300만 원
- 10개 국내 주요 연구실 무료 팀 시트 + 온사이트 워크숍, 조건은 1회 케이스 스터디 공개
- 창업자의 X/LinkedIn/Substack 주 2회 에세이 ("논문 50편에서 DAG 만드는 법", "종합시험 2주 프레임" 류)
- 왜 1순위: CAC 극저, 철학 일관, 고LTV, B2B 게이트로 확장 가능. Readwise·RemNote·Mem 모두 이 공식

#### #2 (Should) — 공개 가능한 그래프 URL + 롱테일 SEO
- 엔지니어링 주도, 광고비 ~0
- Deepen 그래프/로드맵을 공개 링크 공유 기본값으로 설계, OG 이미지·구조화 데이터 최적화 → Quizlet/Notion 공식
- 병행: "Ebbinghaus curve", "literature review workflow", "QUALS 준비" 등 롱테일 에세이 월 4편
- 왜 2순위: 복리 자산. 6~12개월 지연되지만 한 번 쌓이면 페이드 영구 대체

#### #3 (Tactical) — 에브리타임·대학원생 유튜버 마이크로 바이럴
- 월 100~500만 원
- 대학원/전문시험 게시판 UGC 기반 바이럴 글 월 5~10건 + 전문 분야 유튜버(의대·로스쿨·대학원 브이로그) 2~3명 진정성 리뷰 협찬
- **카피 가드레일**: "AI로 시험 1등" 류 절대 금지. "하루 논문 7편", "종합시험 2주 준비 프레임" 등 진지한 학습 프레이밍 고수
- 왜 3순위: 1·2번이 돌기 시작한 6개월차부터 보조

### 10.6 광고 모델의 함정
- **"AI 치트" 단기 유혹**: 연세대 600명 수업 54.5% 부정행위 자진응답[18], 서울대 통계 강의 30+명 AI 답안[19] — 사회적 스티그마가 급격히 형성. Deepen이 이 프레이밍에 발 들이면 단기 트래픽은 오나 교수·연구실·학회 채널 영구 차단되고 카테고리 정의자 포지션 붕괴.
- **에브리타임 배너 포화**: 대기업 공세로 단가 상승, 릴스 학생 광고 스킵률 80%+. 스타트업은 페이드 대신 **유저 콘텐츠 자체가 광고가 되는 구조**가 정답.

---

## 11. 결론 — Deepen의 한 줄 스탠스

> **"학습이 정보 소비에서 완결성 검증으로 패러다임 전환되는 12~18개월 윈도우에, '이해를 행동으로 증명하는 도구'라는 새 카테고리를 정의하면서, 한국 대학원 + 글로벌 의료시험의 high-trust niche로 깊이 박힌 후 단계적 확장한다. 페이드 광고가 아니라 창업자 콘텐츠·공유 가능한 그래프·연구실 파일럿 3축으로 0→1만을 뚫는다."**

---

## 12. 출처 목록

| # | 소스 | URL | 접근일 | 신뢰도 |
|---|---|---|---|---|
| 1 | Grand View Research — AI in Education Market | https://www.grandviewresearch.com/industry-analysis/artificial-intelligence-ai-education-market-report | 2026-04-16 | ★★★ |
| 2 | Mordor Intelligence — AI in Education Market | https://www.mordorintelligence.com/industry-reports/ai-in-education-market | 2026-04-16 | ★★★ |
| 3 | Mordor Intelligence — AI Tutors Market | https://www.mordorintelligence.com/industry-reports/ai-tutors-market | 2026-04-16 | ★★★ |
| 4 | NotebookLM Statistics (SEOSandwich) | https://seosandwitch.com/notebooklm-statistics/ | 2026-04-16 | ★★☆ |
| 5 | StudyFetch Series A — Dupple | https://dupple.com/tools/study-fetch | 2026-04-16 | ★★☆ |
| 6 | Archive Market Research — Flashcard App | https://www.archivemarketresearch.com/reports/flashcard-app-558570 | 2026-04-16 | ★★☆ |
| 7 | 2025 한국 에듀테크 산업 종합분석 (네이버 SCS) | https://files-scs.pstatic.net/2025/02/27/4mWAAoFOE8/2025년%20에듀테크산업%20및%20디지털%20교육혁신%20시장%20종합%20분석%20보고서(1차).pdf | 2026-04-16 | ★★★ |
| 8 | DemandSage — AI in Education Statistics 2026 | https://www.demandsage.com/ai-in-education-statistics/ | 2026-04-16 | ★★☆ |
| 9 | Engageli — 25 AI in Education Statistics 2026 | https://www.engageli.com/blog/ai-in-education-statistics | 2026-04-16 | ★★☆ |
| 10 | THE VC — 싱귤래러티(유니브AI) | https://thevc.kr/singularity | 2026-04-16 | ★★☆ |
| 11 | Lilys AI — Next Unicorn 기업정보 | https://www.nextunicorn.kr/company/323d2fb220e84657 | 2026-04-16 | ★★☆ |
| 12 | MarketsandMarkets — AI in Education | https://www.marketsandmarkets.com/Market-Reports/ai-in-education-market-200371366.html | 2026-04-16 | ★★★ |
| 13 | Precedence Research — AI in Education to $136B | https://www.precedenceresearch.com/ai-in-education-market | 2026-04-16 | ★★☆ |
| 14 | NeuroLearn Lab — Active Recall AI Tools | https://neurolearnlab.com/the-5-best-ai-study-tools-to-master-recall-faster/ | 2026-04-16 | ★★☆ |
| 15 | Market Intelo — Medical Exam Prep Market (북미 $1.85B 2025) | (검색 인덱스 경유) | 2026-04-16 | ★★☆ |
| 16 | Verified Markets — Pharma Compliance Services $2.5B | (검색 인덱스 경유) | 2026-04-16 | ★★☆ |
| 17 | PMC — Anki Use in Medical Education (UCF 70%) | https://pmc.ncbi.nlm.nih.gov/articles/PMC10563486/ | 2026-04-16 | ★★★ |
| 18 | 오마이뉴스 — 연세대 AI 부정행위 | https://www.ohmynews.com/NWS_Web/View/at_pg.aspx?CNTN_CD=A0003181700 | 2026-04-16 | ★★☆ |
| 19 | 경향신문 — SKY AI 컨닝 | https://www.khan.co.kr/article/202511111545001 | 2026-04-16 | ★★☆ |
| 20 | ZDNet Korea — 콴다 9천만 유저 | https://zdnet.co.kr/view/?no=20220118092601 | 2026-04-16 | ★★☆ |
| 21 | Anthropic ARR $14B — PYMNTS | https://www.pymnts.com/artificial-intelligence-2/2026/third-party-agents-lose-access-as-anthropic-tightens-claude-usage-rules/ | 2026-04-16 | ★★☆ |
| 22 | University World News — AI Integrity 2025 | https://www.universityworldnews.com/post.php?story=20251104143144527 | 2026-04-16 | ★★☆ |
| 23 | Numinous Productions — Tools for Thought (Matuschak·Nielsen) | https://numinous.productions/ttft/ | 2026-04-16 | ★★★ |
| 24 | First Page Sage — SaaS Freemium Conversion | https://firstpagesage.com/seo-blog/saas-freemium-conversion-rates/ | 2026-04-16 | ★★☆ |
| 25 | GeekNews — Lilys AI | https://news.hada.io/topic?id=13150 | 2026-04-16 | ★★☆ |
| 26 | Simon Willison — NotebookLM Audio Overviews | https://simonwillison.net/2024/Sep/29/notebooklm-audio-overview/ | 2026-04-16 | ★★★ |
| 27 | Quizlet — Wikipedia | https://en.wikipedia.org/wiki/Quizlet | 2026-04-16 | ★★☆ |
| 28 | First Round — How Notion Does Marketing | https://review.firstround.com/how-notion-does-marketing-a-deep-dive-into-its-community-influencers-growth-playbooks/ | 2026-04-16 | ★★★ |
| 29 | RemNote (공식) | https://www.remnote.com/ | 2026-04-16 | ★★☆ |
| 30 | 머니투데이 — 에브리타임 가입 700만 | https://news.mt.co.kr/mtview.php?no=2024022617174893171 | 2026-04-16 | ★★☆ |
| 31 | upGrowth — EdTech B2C GTM 벤치마크 | https://upgrowth.in/edtech-gtm-b2c-b2b-b2b2c-customer-type/ | 2026-04-16 | ★★☆ |

---

*본 보고서는 공개 소스만을 활용했으며, 유료 리서치 DB의 비공개 수치는 인용하지 않았다. 시장 규모 수치는 기관별 정의 차이가 크므로 본문 채택 근거를 함께 참조할 것.*
