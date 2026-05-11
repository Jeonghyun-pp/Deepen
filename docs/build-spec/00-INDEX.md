# Deepen Build Spec — 마스터 인덱스

> 이 디렉터리(`docs/build-spec/`)의 13개 문서는 Deepen 웹·앱 시장 출시까지의 **빌드 계약**이다. 엔지니어/Claude는 이 문서들만 읽고도 구현·통합·배포가 가능해야 한다. 비즈니스/마케팅/콘텐츠 시드 결정은 별도 문서로 분리.

**Source of truth 우선순위**: 본 문서 > `docs/decks/d2sf-deepen-pitch-v2/DEEPEN_소개자료.pdf` > `docs/deepen_구현_단계별_알고리즘.md` > `docs/orzo-benchmarking-2026-05-09.md` > 기존 코드. 본 문서가 다른 자료와 충돌하면 본 문서 따른다.

## 읽기 순서

| # | 파일 | 역할 | 우선 읽어야 할 사람 |
|---|---|---|---|
| 00 | INDEX.md | 본 문서 | 모두 |
| 01 | tech-stack.md | 기술 스택·버전·환경 변수 lock | 모두, 첫 셋업 시 |
| 02 | schema.md | 전체 DB 스키마 + Drizzle 정의 + 마이그레이션 SQL | 백엔드/풀스택 |
| 03 | api-contracts.md | 모든 API 엔드포인트 req/resp 계약 | 백엔드/프론트엔드 |
| 04 | algorithms.md | 채점·BN·Elo·임베딩·LCS 알고리즘 구현 사양 | 백엔드/ML |
| 05 | llm-prompts.md | 모든 LLM system prompt + tool schema | AI/백엔드 |
| 06 | state-machines.md | 5종 모드 + 세션 상태 머신 전이표 | 프론트엔드/QA |
| 07 | q1-build.md | M1.1~M1.6 마일스톤별 상세 빌드 계획 | Q1 담당 |
| 08 | q2-build.md | M2.1~M2.6 빌드 계획 | Q2 담당 |
| 09 | q3-build.md | M3.1~M3.6 빌드 계획 | Q3 담당 |
| 10 | q4-build.md | M4.1~M4.6 빌드 계획 | Q4 담당 |
| 11 | ios-app.md | iPad 네이티브 앱 빌드 spec (경로 B) | iOS 담당 |
| 12 | acceptance.md | E2E 인수 시나리오 + Playwright 테스트 | QA |
| 13 | deployment.md | 인프라·CI/CD·모니터링·런북 | DevOps |

## 빌드 단위 정의

- **마일스톤(M)** = 2주, 1 데모 가능 산출물
- **분기(Q)** = 6 마일스톤, 1 사업 마일스톤 (MVP→차별→유료→B2B)
- **계약 문서(02~06)** = 모든 마일스톤이 참조하는 lock된 인터페이스. 변경은 PR + 영향 마일스톤 전체 재검토 필요.

## 의사결정 기록 (locked)

본 spec은 다음 결정 위에 작성됨. 변경 시 본 spec 전체 재검토:

| ID | 결정 | 근거 |
|---|---|---|
| A-1 | 백엔드 Pattern only + 프론트 'Concept' alias | 알고리즘 충실 + deck 메시지 보존 |
| A-2 | PDF 파이프라인 = Phase 1-B 보조 도구 (draft → 어드민 검수) | 매몰 0 + LLM 자동 생성 배제 원칙 |
| A-3 | Q1 = 연습 모드만 | critical path 보호 |
| B-4 | 5칩 카피: 힌트/정의/오답근거/단계펼치기/유형변형 | retention 엔진 (5번 칩) |
| B-5 | 헷갈림 = 5신호 가중 합산 + 자신감 슬라이더 (w=1.0,0.3,0.4,0.2,0.5, τ=0.6) | deck Slide 10 충실 구현 |
| B-6 | "리캡카드" 명명 | deck IR 자산 보존 |
| C-7 | streak/푸시 도입 X | 사회적 hook으로 대체 |
| C-8 | Phase 3 시장 확장 1차 = 결정 보류 | Phase 2 cohort 데이터 후 결정 |
| C-9 | 가격: Free 5회 평생 / Pro 일 30회 / Pro+ 무제한 | 오르조 검증 모델 |

## 완성 정의 (Definition of Done — 시장 출시 가능)

다음 4개가 모두 충족되어야 시장 출시 가능 상태:

1. **D1~D4 통합 데모 시나리오** (12-acceptance.md) 모두 패스
2. **티어별 사용량 캡** 정상 작동 (Stripe/Toss 결제 연동 검증)
3. **학원 SaaS 1개 이상 베타 cohort** 30일 무사고 운영
4. **인프라 SLO**: API p95 ≤ 800ms, AI 코치 첫 토큰 ≤ 1.5s, 가용성 99.5%

## 본 spec이 다루지 않는 것

- 콘텐츠 시드 (Pattern·Item 큐레이션) — 별도 콘텐츠 운영 문서
- 마케팅·획득·가격 cohort 실험 — 별도 GTM 문서
- 법무·약관·개인정보처리방침 — 별도 법무 문서
- Phase 3 (M18+) 데이터 플랫폼 사양 — Q4 종료 시 별도 spec

## 변경 관리

- 모든 spec 변경은 PR 필요
- PR 제목: `[spec/<file>] <summary>`
- 영향받는 마일스톤·코드 경로를 PR description에 명시
- 계약 문서(02~06) 변경 시: 영향 분기 빌드 문서 동시 업데이트
