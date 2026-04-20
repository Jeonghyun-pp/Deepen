# Deepen과 비슷한 6개 서비스의 초기 성장 과정 비교 리서치

> 리서치 일자: 2026-04-19
> 질문: Deepen(강의안 마스터리 + AI 지식 그래프 도구)과 비슷한 서비스들의 처음 성장 과정이 어땠는가?
> 범위: NotebookLM, Obsidian, Anki, Heptabase, Readwise, 유니브 AI
> 리서치 라운드: Phase 1(병렬 탐색 6 에이전트) + Phase 2(교차검증 3 에이전트), 약 170회 WebSearch
> 아키타입: 비교 분석 (Comparative Analysis)

---

## Executive Summary

6개 서비스의 초기 성장은 **세 가지 공통 궤도**를 탄다.

첫째, **창업자 본인이 "철학 콘텐츠"로 기능**한다. Alan Chan(Heptabase)의 Engelbart/Bret Victor 계보 장문 에세이, Readwise의 "Why We're Bootstrapping" 선언, Damien Elmes의 19년 solo dev 서사가 모두 **리드 자석**이었다. 제품이 아니라 "왜 이 제품을 만드는가"가 먼저 공유됐다.

둘째, **인접 생태계의 유민(refugee)을 흡수**하는 것이 0→N 변곡점이었다. Obsidian은 Roam Research의 $15/월 구독 논란 직후 대량 유입, Readwise Reader는 Instapaper/Pocket 쇠퇴 타이밍에 피봇, Anki는 SuperMemo의 UX·플랫폼 한계를 대체. **Deepen의 유민 후보**: ChatGPT 할루시네이션에 지친 학생, NotebookLM 한국어 부족에 불만인 대학생, Anki의 수동 카드 제작이 번거로운 의대생.

셋째, **초기부터 "누군가 지갑을 여는 경로"가 있었던 서비스만 독립성을 유지**했다. Readwise $7.99(2017), Heptabase early-bird $7(2022), Anki iOS $24.99(2010), 유니브 AI 9,900원(2024) — 전부 0일차부터 유료화. 유일한 반례 NotebookLM은 Google 인프라 보조금이라는 특수 조건이었다. Deepen이 bootstrap/lean 노선이면 **Freemium이 아니라 비대칭 모델**(Anki식: 코어 무료 + 모바일·집중기능 유료)이 학생 지갑에 맞는다.

**Deepen에 적용할 3가지 베팅** (본문 말미 상세):
1. 창업자 에세이 + 월간 메이저 릴리즈 12개월로 **Heptabase 플레이북** 복제
2. 의대/공대 **"DAG 친화 전공"** 먼저 → 유니브 AI가 검증한 ICP에 DAG 뷰라는 차별화 얹기
3. **시험기간 한정 "시험팩" 비대칭 유료 모델** + 에브리타임 학교별 타깃 시딩

---

## Key Findings

| # | 발견 사항 | 신뢰도 | 출처 |
|---|----------|--------|------|
| 1 | NotebookLM은 2023-07 출시 후 **14개월 slow burn**, 2024-09 Audio Overview로 MoM +371% 바이럴 | confirmed | [1][2][3] |
| 2 | Obsidian은 Roam의 $15/월 가격표 공개(2020-06) 직후 "Roam refugees" 흡수가 결정적 | confirmed | [4][5] |
| 3 | Anki의 미국 의대 침투율 **2015년 31% → 2024년 86.2%** (2.8배 도약) | confirmed | [6][7] |
| 4 | Damien Elmes **2026-02-02 은퇴**, AnkiHub(Nick Flint=AnKing)로 stewardship 이관 | confirmed | [8][9] |
| 5 | Heptabase는 **Series A 없이 Seed $1.68M만으로 $1M+ ARR** 달성, bootstrap 유지 | confirmed | [10][11] |
| 6 | Readwise는 2018년 "Why We're Bootstrapping" 공개 선언, BASB/David Perell에 embedded | confirmed | [12][13] |
| 7 | 유니브 AI(싱귤래러티, 2024-06 설립)는 **언론 보도 0, 에브리타임 공식 캠페인 0**으로 10만 유저·월 1.5억 매출 | confirmed | [14][15] |
| 8 | AnkiMobile iOS $24.99 매출 **Sensor Tower 추정 US 월 $700k + UK 월 $900k** (연 $10M+) | estimated | [16] |
| 9 | **Shareable artifact = viral trigger** 가설은 부분 성립 — Heptabase 반례(public share 2025-09에야 도입) | contested | [17][18] |
| 10 | **초기 유료화 = bootstrap 지속가능성의 조건** 가설은 6개 중 5개에서 성립 (NotebookLM은 Google 보조금 예외) | confirmed | [19][20][21] |
| 11 | 한국은 "의대 × 시험문화" 조합에도 불구 **Anki 저변 실패** → 코리안키(세무사)·오늘학습(공무원) 파편화만 존재 | confirmed | [22][23] |
| 12 | 에브리타임 학교별 타깃 광고 **학교당 2만원**, 바이럴 포스팅 건당 9,900원 — 초기 시딩 가성비 최고 | confirmed | [24][25] |

---

## Comparison Framework

비교 차원 6가지:
1. **창업 계기·포지셔닝**: 창업자의 문제의식과 초기 메시징
2. **0→1K 채널**: 첫 1,000명 유저를 어떻게 확보했는가
3. **1K→10K 변곡점**: 본격 성장으로 전환된 사건·결정
4. **10K→100K+ 바이럴/확산**: 대중화 단계 동력
5. **유료화 모델·시점**: 초기 수익화 전략
6. **커뮤니티·인플루언서 embedding**: 외부 생태계와의 연결 방식

---

## Comparison Matrix

| 차원 | NotebookLM | Obsidian | Anki | Heptabase | Readwise | 유니브 AI |
|---|---|---|---|---|---|---|
| **출시 시점** | 2023-07 | 2020-03 | 2006-10 | 2022 beta / 2023-08 v1.0 | 2017-05 | 2024-06 |
| **창업자 포지셔닝** | Google Labs PM Raiza Martin + 작가 Steven Johnson 협업 | Dynalist 창업자 Shida Li · Erica Xu (COVID 락다운 개발) | Damien Elmes (일본어 학습 솔로 dev) | Alan Chan (NTU 물리→Minerva 자퇴, 학습 문제) | Daniel Doyon (sabbatical + Kindle + Anki 해킹) | 김서현 (03년생 한양대 ERICA) |
| **0→1K 채널** | Google Labs 내부 20% 프로젝트 + HN 런칭일 노출 | HN + Product Hunt 동시 런칭 (2020-06) | 일본어 학습 채팅방 구전 | 장문 Medium 에세이 + waitlist + YC W22 | Show HN (2017-09) | 연고자/학교 베타 + 프라이머 시드 |
| **1K→10K 변곡점** | 2024-06 200+ 국 확장 + Gemini 1.5 Pro 업그레이드 | **Roam $15/월 가격표 → Roam refugees 흡수** (2020-06~) + 2020-10 Plugin API | **AJATT 블로그(Khatzumoto)** evangelist 역할 | 월간 메이저 릴리즈 12개월 연속 + Ness Labs 인터뷰 | 2018-08 PH 본격 런칭 + bootstrap 선언 | 의대/약대/공대 전공서 입소문 |
| **10K→100K 바이럴** | **Audio Overview 팟캐스트 (2024-09)** — MoM +371%, Simon Willison + Axios 메인스트림 돌파 | Community Plugins 2,500+ 생태계 + Nick Milo LYT 프레임워크 | **의대 킬러 덱**: Brosencephalon(2014) → Zanki(**2017**) → AnKing(2018) 3단 로켓 | 2023 PH Golden Kitty Finalist + Discord 7K→18.7K | 2020 PKM 붐에서 "노트앱 허브" 포지션 → Roam/Obsidian/Notion integration | 시험기간 스파이크 + Threads 자발 바이럴 |
| **유료화 모델** | 17개월 무료 → 2024-12 Plus → 2025-02 Google One AI Premium ($19.99/월) | Free + **Catalyst $25(일회성)** + Sync $4/월 + Publish $8/월 (2025-02 Commercial 무료화) | **비대칭**: 데스크톱/Android 무료(OSS) + **iOS $24.99 일회성** (19년 유지) | Beta 때부터 **Early-bird $7/월 연간** → v1.0 이후 $8.99 (평생 lock-in) | 창립부터 **$7.99/월 구독**, freemium 없음 | 출시부터 **월 9,900원 Pro**, 일부 무료 |
| **커뮤니티** | Discord 60K (초기 feedback loop 핵심) | Discourse Forum + r/ObsidianMD 200K+ | r/Anki 187K + r/medicalschool · AnKing YouTube | Discord Hepta 18.7K + Public Wiki 로드맵 | BASB 코스 embedded + David Perell Twitter 리더보드 | 인스타 @univai.co.kr + Threads + 디씨 특이점갤 오가닉 |
| **인플루언서 embedding** | Simon Willison, Lenny Rachitsky, TikTok | Nick Milo (LYT), Steph Ango(Minimal 테마→CEO) | Khatzumoto(AJATT), Ali Abdaal, AnKing YouTube | Ness Labs, Paperless Movement | Tiago Forte(BASB), David Perell(Write of Passage), Ness Labs | 창업자 본인 Threads 직접 운영 |
| **funding** | Google 내부 | **VC 0원**, 팀 3~9명 | Solo dev + iOS 수익만 (19년) | YC W22 + Seed $1.68M (Series A **없음**) | **Bootstrap 명시** (2018 선언) | 프라이머 시드 1억 + 학교 2,900만 + 딥테크 1위 |
| **2026 현재 규모** | MAU ~17M, 80K+ 조직 (a16z #13) | ~1-1.5M users, ARR $2M, 밸류 $350M | ~70% 미 의대생, iOS 연 $10M+ | ARR ~$7M 추정, 밸류 $80-100M | Bootstrap 유지, 직원 11명 | 10만 유저, 월 매출 1.5억원 |

---

## Dimension-by-Dimension Analysis

### 1. 창업 계기·포지셔닝

**패턴**: 6개 중 5개는 창업자 **본인의 학습/지식 문제**에서 출발. 유일한 예외는 NotebookLM(Google 사내 프로젝트).

- **"My Vision" 장문 에세이가 리드 자석**: Alan Chan은 Medium/wiki.heptabase.com에 "A Forgotten History" 연재 — Engelbart의 Open Hyperdocument System, Ted Nelson의 Literary Machines 계보에서 자신을 위치시킴. 이 에세이 **자체가 waitlist 유입 채널**.
- **Bootstrap 선언이 커뮤니티 신뢰 조달**: Readwise 2018 "Why We're Bootstrapping" 블로그 → Indie Hackers 재포스트 → HN 재노출로 bootstrap 담론 레퍼런스 케이스가 됨.
- **창업자 본인이 SNS 운영**: 유니브 AI 김서현은 Threads @k.entrepreneur.03에서 직접 창업 스토리 공유, 광고대행 없음.

→ **Deepen 시사점**: 창업자의 "강의안 마스터리 철학" 장문 에세이가 0번째 마케팅 자산. 제품 페이지보다 먼저 공개.

### 2. 0→1K 채널: HN/PH는 게이트이지만 주 동력 아님

**공통**: 5개 서비스가 HN 또는 PH 런칭 기록 보유 — 그러나 어느 곳도 **HN/PH 자체가 10K+ 가져다주지 않음**.

- Obsidian PH 누적 upvotes ~4K — 그러나 실제 1K→10K는 "Roam refugees" 흡수
- Heptabase는 PH Golden Kitty Finalist를 **생태계 배지**로 활용 (주 성장은 Discord/Alan 트위터)
- Readwise Show HN(2017)은 최초 트래픽이었으나, BASB embedding이 본격 성장 트리거

→ **Deepen 시사점**: HN/PH 런칭은 **"tech 얼리어답터 인증"**으로 활용. 여기서 20~30명 깊은 feedback 확보 목표로 설정하고, 주 성장은 다른 채널에서 기대.

### 3. 1K→10K 변곡점: 인접 생태계의 유민 흡수

**명확한 패턴**:
- **Obsidian ← Roam Research 구독 논란** (2020-06)
- **Readwise Reader ← Instapaper/Pocket 쇠퇴** (2022-12)
- **Anki ← SuperMemo의 UX/플랫폼 한계** (2006~)
- **Heptabase ← Notion/Obsidian의 "팀 협업/MD 플러그인" 프레임 → "개인 깊은 학습" 각도** (2021~)

→ **Deepen 시사점**: 현재 유민 가능성 모니터링:
- **ChatGPT 할루시네이션 피로 누적** → "출처 있는 지식 그래프"로 이주 유인
- **NotebookLM의 한국어/전공서 약점** → 한국 대학 맥락 특화로 차별
- **Anki의 수동 카드 제작 부담** → "강의안 자동 DAG"로 대체

### 4. 10K→100K 바이럴: Shareable Artifact는 **옵션**, 킬러 덱/프레임워크는 **필수**

**수정된 가설** (Phase 2 교차검증):
- Shareable artifact가 바이럴 트리거인 명확한 사례는 **NotebookLM Audio Overview 단 1건**
- Heptabase는 public share 기능이 2025-09에야 나왔는데도 bootstrap $7M ARR 달성 → **반례**
- 대신 모든 케이스에 **공통적으로 존재하는 것**: "killer collective artifact" 또는 "killer framework"
  - Anki: Zanki/AnKing 덱 (collective)
  - Obsidian: LYT 프레임워크 (framework) + 플러그인 2,500+
  - Readwise: BASB 방법론 임베딩 (framework)
  - NotebookLM: Audio Overview (shareable artifact)

→ **Deepen 시사점**: "공유 가능한 artifact"(그래프 이미지, 이해도 뱃지)와 **"방법론"**(강의안 마스터리 프로토콜) 중 **방법론이 더 강력**. Alan Chan이 Engelbart 계보로 철학을 제공했듯, Deepen도 "DAG 기반 완결 학습법" 같은 방법론 브랜드 필요.

### 5. 유료화 전략: 비대칭 모델이 학생 타깃에 최적

**핵심 교차검증**:
- **처음부터 유료 + freemium 없음**: Readwise ($7.99/월, 14일 trial), Heptabase (beta부터 $7/월)
- **비대칭 모델 (코어 무료 + 특정 기능·서비스 유료)**: Anki(iOS $24.99), Obsidian(Sync $4/Publish $8)
- **저가 구독 (학생 지갑)**: 유니브 AI 월 9,900원 — **Ace Your Exams in One Day** 슬로건과 일치하는 "1시험당 1달 결제" 암묵적 소비 패턴
- **무료 → 늦은 유료화**: NotebookLM 17개월 무료 — Google 인프라 보조금 있을 때만 가능

→ **Deepen 시사점**: 학생 지갑 제약 + LLM API 원가 부담 → **3안 조합**
1. **Anki식 비대칭**: 지식 그래프 viewer/기본 추출 무료 + "시험 1주 전 집중 모드"(예상문제·Audio briefing·cloud sync·공유 이미지) 유료
2. **시험팩 단건 결제**: $1.99/회 또는 월 3,000~5,000원 — 학기당 2~4회 spike 수익
3. **Heptabase식 early-bird 평생가**: 초기 1,000명 lifetime lock-in

### 6. 커뮤니티·인플루언서 embedding

**공통 패턴**:
- **Discord**가 0→10K 구간 피드백 루프 (NotebookLM 60K, Heptabase 18.7K)
- **PKM/학습 인플루언서가 평가·소개**: Ness Labs, Paperless Movement, Simon Willison이 반복 등장
- **방법론 에반젤리스트** 1명이 전체 담론 주도: Khatzumoto/AJATT, Tiago Forte/BASB, Nick Milo/LYT

**한국 특이**: 한국은 **"한국판 Ali Abdaal"이 공백**. 딤디·수린 같은 스터디윗미 유튜버는 학습 루틴 소비자용이고, 생산성 도구 전문 해설자는 부재 → **Deepen이 직접 자리 점유 가능**.

→ **Deepen 시사점**:
- Discord 또는 카톡 오픈채팅 초기 운영 (50명 정예 시드)
- Ness Labs·Paperless Movement 같은 영문 PKM 인플루언서에 pitch
- 한국은 의대생 선선·조코딩·드로우앤드류 같은 **마이크로~미드 인플루언서 5~10명**과 월 단가 50~200만원으로 협업

---

## 공통 패턴 5가지 (Phase 2 검증 완료)

### 패턴 1. 창업자 장문 에세이 = 리드 자석 (확정)
Heptabase Alan Chan(Engelbart 계보), Readwise 2018 bootstrap 선언, Obsidian 5원칙 about 페이지 모두 **제품보다 철학이 먼저**. 유니브 AI 김서현의 Threads도 약한 형태로 동일 패턴.

### 패턴 2. 인접 생태계 유민 흡수 = 변곡점 (확정)
Obsidian ← Roam, Readwise Reader ← Pocket/Instapaper, Anki ← SuperMemo, Heptabase ← Notion/Obsidian "개인 deep learning" 각도. **새 서비스는 아무것도 없는 땅이 아니라 인접 유민이 몰려올 출구를 설계해야 함**.

### 패턴 3. 방법론/컬렉티브 artifact > 개별 shareable artifact (수정)
Phase 1의 "shareable artifact = viral trigger" 가설은 **NotebookLM 외엔 약함**. 실제 더 강한 공통 요소는:
- **킬러 덱/프레임워크** (Zanki, LYT, BASB)
- **집단지성 자산** (Obsidian Community Plugins 2,500개, Anki shared decks)

### 패턴 4. 0일차 유료화 = bootstrap 지속가능성 (확정, NotebookLM 예외)
Readwise·Heptabase·Anki·Obsidian(Catalyst)·유니브 AI 모두 출시와 동시에 지갑 경로 존재. **첫 유료 고객이 feedback 질이 가장 높다**는 창업자 증언 반복(Alan Chan, Readwise 파운더들).

### 패턴 5. 월간 메이저 릴리즈 12개월 연속 = 제품 기반 마케팅 (확정)
Heptabase는 2022년 내내 매달 cloud sync → mobile → PDF 지원 등 메이저 기능 출시. NotebookLM도 2024년 월간 기능 출시 페이스 유지. **"성장을 위한 마케팅" 대신 "제품 자체가 마케팅"**.

---

## Deepen에 적용할 베팅 3가지

### 베팅 1 ★ Heptabase 플레이북 복제 (Alan Chan 경로)

**실행**:
- [ ] **창업자 장문 에세이 시리즈** (Medium/브런치): "왜 강의안 마스터리가 필요한가", "Engelbart에서 DAG 학습까지", "NotebookLM으로 안 되는 것" — 2026-05 첫 편, 이후 월 1편
- [ ] **Public Wiki 로드맵** (Heptabase wiki 모방): 왜 이 기능을 만드는지 장문 설명
- [ ] **월간 메이저 릴리즈 케이던스** 12개월 락: 4월 자동 DAG 추출, 5월 이해 확인 퀴즈, 6월 공유 그래프 이미지, 7월 모바일…
- [ ] **Discord "Deepen" 커뮤니티** 50명 시드부터 시작. 분기별 AMA
- [ ] **Early-bird 평생가**: 초기 500명에게 연간 결제 시 월 4,900원 평생 lock-in

**리스크**: Alan Chan급 writing skill + 제품력 동시에 필요. 시간 집약.

### 베팅 2 ★ 유니브 AI ICP + Deepen DAG 차별화 (의대·공대 타깃)

**실행**:
- [ ] **ICP 좁히기**: 의대 본1~본4, 전기·컴공 전공필수(알고리즘·OS·신호및시스템·회로이론) — 개념 DAG이 명확한 커리큘럼 우선
- [ ] **차별화 카피**: "유니브 AI는 요약·퀴즈까지. Deepen은 개념 간 연결 지도까지." (기능 대립각, not 우열)
- [ ] **10초 Aha 데모 영상**: 20장 강의안 PDF → 지식 그래프 시각화 변환. 인스타 릴스·유튜브 쇼츠·틱톡·Threads 동시 배포
- [ ] **의대생 선선 등 마이크로 인플루언서 5명**과 협업 (건당 50~200만)
- [ ] **핵심 10개 학교 시드**: 서울대·연대·고대·카이스트·포스텍·성대·한양대·부산대·경북대·전남대 — 의대/공대 학회 대상 무료 Pro 플랜 3개월 배포

**리스크**: 유니브 AI가 DAG 기능 추가하며 역공 가능. 선제 방어선으로 "한국 대학 강의안 DB + DAG 특화 UX" 구축 필요.

### 베팅 3 ★ 비대칭 "시험팩" 가격 모델 + 에브리타임 시딩

**실행**:
- [ ] **Free tier**: 강의안 업로드·기본 DAG·노드 뷰어 무료
- [ ] **시험팩** ($1.99 단건 또는 월 3,900원): 예상문제 자동 생성, 이해도 Audio briefing, 공유 이미지 export, 7일 집중 리마인더
- [ ] **Pro** (월 7,900원): 무제한 문서, 팀플 공유, priority LLM queue
- [ ] **에브리타임 바이럴 시딩**: 학교당 2만원 × 2주 × 10개 학교 = **40만원**으로 시드 노출. 홍보게시판에 실사용자 후기 (리워드 5,000~10,000원)
- [ ] **시험기간 스파이크 캠페인 년 4회** (중간 4월·10월, 기말 6월·12월): D-14일 전 채널 PR 집중

**리스크**: 무료 코어에서 LLM API 원가 초과 시 지속 불가 → 무료 tier는 **하루 3문서/월 10그래프** 같은 명확한 할당량 필수.

---

## 빼거나 후순위로 미룰 것

- **NotebookLM 식 Audio Overview 모방**: Google 인프라 보조금 없이 TTS·LLM 원가 감당 불가. 만들면 손해.
- **클래스101·메가스터디식 장기 프리패스**: 학생 구매력 낮고 "1학기 통째 결제" UX가 아님. 단건·시험팩 구조가 맞음.
- **대학교 공식 제휴** (행정 느림, 총학 대외연대국은 "학생증 할인" 모델만 받음): 자발 확산 10K 유저 이후에 진입
- **대형 스터디튜버(100만+ 딤디급) 단독 협업**: 단가 대비 전환 불확실 + 유니브 AI도 쓰지 않은 채널
- **돈벼락티비/김미경TV**: EdTech 핵심 오디언스 아님

---

## Limitations & Caveats

- **Anki 정량 데이터 한계**: Anki 개발진이 AnkiWeb 통계 비공개 정책. Sensor Tower iOS 추정치는 upper-bound 경향
- **유니브 AI 내부 지표 불명**: 10만 유저 · 월 1.5억 매출은 공개 소스 인용이며 싱귤래러티 공식 재무제표 접근 불가. 유료 전환율·ARPU 추정뿐
- **Heptabase "Series A" 가정 오류**: 사용자 브리프에 있던 2024 Series A는 공개 데이터에 없음. Seed $1.68M만 존재 — bootstrap 의도적 유지
- **0→1K 구간 정밀 데이터 부재**: 대부분 서비스가 초기 MAU/다운로드 공개 안 함. 창업자 인터뷰 회고에 의존
- **한국 시장 정보 파편화**: 유니브 AI 언론 보도 0건 + 에브리타임 공식 마케팅 데이터 미공개 → 2차 블로그·마이크로 인플루언서 증언 의존
- **리서치 기간**: 리서치 시점은 2026-04. Damien Elmes 은퇴(2026-02), NotebookLM Gemini 3 통합(2025-12) 등 최신 사건 반영. 그 이후 변화는 미반영

---

## Sources

| # | 소스 | URL | 신뢰도 |
|---|------|-----|--------|
| 1 | Google Blog — Audio Overview announcement | https://blog.google/technology/ai/notebooklm-audio-overview/ | ★★★ |
| 2 | Similarweb — ChatGPT and NotebookLM growth | https://www.similarweb.com/blog/insights/ai-news/chatgpt-notebooklm/ | ★★☆ |
| 3 | Axios — NotebookLM goes viral | https://www.axios.com/2024/10/04/google-ai-podcast-notebooklm | ★★☆ |
| 4 | Ness Labs — Obsidian founders interview | https://nesslabs.com/obsidian-featured-tool | ★★★ |
| 5 | Obsidian 0.9.8 Changelog | https://obsidian.md/changelog/2020-10-29-desktop-v0.9.8/ | ★★★ |
| 6 | Class Central — 70% of U.S. med students | https://www.classcentral.com/report/anki-founder-steps-back/ | ★★★ |
| 7 | Anki Forums — med student study citations | https://forums.ankiweb.net/t/should-everyone-switch-to-fsrs/45382 | ★★☆ |
| 8 | Class Central — Elmes steps back | https://www.classcentral.com/report/anki-founder-steps-back/ | ★★★ |
| 9 | Byteiota — Anki Transferred to AnkiHub | https://byteiota.com/anki-transferred-to-ankihub-open-source-at-risk/ | ★★☆ |
| 10 | YC — Heptabase | https://www.ycombinator.com/companies/heptabase | ★★★ |
| 11 | Indie Hackers — Heptabase 7-figure ARR | https://www.indiehackers.com/post/tech/hitting-a-7-figure-arr-within-two-years-by-focusing-on-quality-and-letting-the-product-speak-for-itself-bHvRpjj7xxXs71R3TR4I | ★★☆ |
| 12 | Readwise Blog — Why We're Bootstrapping | https://blog.readwise.io/why-were-bootstrapping-readwise/ | ★★★ |
| 13 | Forte Labs — Readwise founder interview | https://fortelabs.com/blog/interview-with-readwise-founders/ | ★★★ |
| 14 | THE VC — 싱귤래러티 | https://thevc.kr/singularity | ★★★ |
| 15 | 유니콘팩토리 / 와우테일 — 프라이머 27기 | https://wowtale.net/2026/02/13/254612/ | ★★☆ |
| 16 | Sensor Tower — AnkiMobile Revenue | https://app.sensortower.com/overview/373493387?country=US | ★★☆ |
| 17 | Heptabase — public whiteboard link | https://support.heptabase.com/en/articles/12121546-how-do-i-publish-whiteboards-with-a-public-link | ★★★ |
| 18 | Heptabase Newsletter 2025-09-12 | https://wiki.heptabase.com/newsletters/2025-09-12 | ★★★ |
| 19 | Heptabase early-bird pricing FAQ | https://support.heptabase.com/en/articles/10364311-what-s-early-bird-pricing-and-how-do-i-keep-it | ★★★ |
| 20 | Anki FAQ — Why AnkiMobile costs more | https://faqs.ankiweb.net/why-does-ankimobile-cost-more-than-a-typical-mobile-app.html | ★★★ |
| 21 | Obsidian pricing | https://obsidian.md/pricing | ★★★ |
| 22 | 나무위키 — Anki | https://namu.wiki/w/Anki | ★★☆ |
| 23 | 코리안키 | https://www.koreanki.com/logseq-anki-essential | ★★☆ |
| 24 | 유니브립 — 에브리타임 광고 | https://univlip.com/에브리타임-광고하고-싶다면-2가지-방법-및-비용-배/ | ★★☆ |
| 25 | VINU — 에브리타임 광고 팀블로그 | https://www.vinuteam.com/blog/26 | ★★☆ |
| 26 | Lenny's Newsletter — Raiza Martin | https://www.lennysnewsletter.com/p/googles-notebooklm-raiza-martin | ★★☆ |
| 27 | a16z — State of Consumer AI 2025 | https://a16z.com/state-of-consumer-ai-2025-product-hits-misses-and-whats-next/ | ★★★ |
| 28 | 36Kr — Obsidian $350M valuation | https://eu.36kr.com/en/p/3755031628005892 | ★★☆ |
| 29 | Alan Chan — Medium essays | https://medium.com/heptabase | ★★★ |
| 30 | Dasfl — 유니브 AI 가이드 | https://dasfl.com/entry/대학생-공부-필수-앱-유니브-ai-가이드 | ★★☆ |
| 31 | MacRumors — NotebookLM Plus via Google One | https://www.macrumors.com/2025/02/11/notebooklm-plus-now-available-in-google-one/ | ★★☆ |
| 32 | TechCrunch — 200+ countries expansion | https://techcrunch.com/2024/06/06/googles-ai-powered-notebooklm-expands-to-india-uk-and-over-200-other-countries/ | ★★☆ |
| 33 | Starter Story — Heptabase breakdown | https://www.starterstory.com/heptabase-breakdown | ★★☆ |
| 34 | Latka — Heptabase $1.2M revenue | https://getlatka.com/companies/heptabase.com | ★★☆ |
| 35 | AnKing — Step Deck | https://www.ankihub.net/step-deck | ★★☆ |
| 36 | Brosencephalon — About | https://www.brosencephalon.com/about | ★★★ |
| 37 | Elite Medical Prep — Zanki review | https://elitemedicalprep.com/flashcard-resources-zanki-review/ | ★★☆ |
| 38 | Sheracaolity — Heptabase joins YC | https://sheracaolity.ghost.io/heptabase-joins-y-combinator/ | ★☆☆ |
| 39 | Obsidian Commercial license free (X) | https://x.com/obsdmd/status/1892586092882276352 | ★★★ |
| 40 | Linking Your Thinking — Nick Milo | https://www.linkingyourthinking.com | ★★★ |
| 41 | AJATT — About page | https://alljapanesealltheti.me/about/index.html | ★★☆ |
| 42 | FSRS — Anki Forum | https://forums.ankiweb.net/t/should-everyone-switch-to-fsrs/45382 | ★★★ |
| 43 | 플래텀 — 프라이머 26기 | https://platum.kr/archives/271180 | ★★☆ |
| 44 | 한국일보 — 콴다 중고생 절반 사용 | https://www.hankookilbo.com/News/Read/A2021041909070000632 | ★★☆ |
| 45 | AI타임스 — 뤼튼 MAU 500만 | https://www.aitimes.com/news/articleView.html?idxno=164836 | ★★☆ |
| 46 | 링커리어 — 뤼튼 대학생 에이전트 1기 | https://linkareer.com/activity/167984 | ★★☆ |
| 47 | 딜사이트 — 에브리타임 투자유치 | https://dealsite.co.kr/articles/128759 | ★★☆ |
| 48 | Vling — 스터디윗미 유튜버 TOP10 | https://vling.net/en/post/222936976086 | ★☆☆ |
| 49 | Wikipedia — Anki (software) | https://en.wikipedia.org/wiki/Anki_(software) | ★★★ |
| 50 | Wikipedia — Obsidian (software) | https://en.wikipedia.org/wiki/Obsidian_(software) | ★★★ |
