# 콘텐츠 시드 운영 런북 (Q1 임시)

> 강사 외주 + 팀원 1명이 수학Ⅱ 미분/적분 단원의 Pattern 15~20 + Item 100~300을 시드하는 절차.
> 본격 어드민 화면은 M2.6에서 redesign.

## 1. 환경 변수

`.env.local`에 다음 추가:

```bash
# 시드 작업자 이메일 (콤마 구분, 소문자)
ADMIN_EMAILS=admin@deepen.kr,instructor@deepen.kr
```

가드 동작:
- `/admin/seed-review` 페이지: 미인증 → `/login` redirect, 비관리자 → `/v2` redirect
- `/api/admin/*` 라우트: 미인증 401, 비관리자 403

## 2. 작업 흐름

### S1 데이터 수집 (1주)
1. 한국교육과정평가원 (https://www.suneung.re.kr/) 에서 수학Ⅱ 미분 단원 PDF 30~50개 다운로드
2. 정답표 별도 텍스트화 (csv 또는 json)

### S2 Pattern 카탈로그 정의 (강사 1주)
1. 강사가 상위 Pattern 5~10개 + 하위 Pattern 10~20개 정의
2. 각 Pattern의 signature[] (sub-skill 3~7개) 작성
3. 임시 어드민에서 Pattern 노드 직접 생성 (또는 SQL INSERT)

### S3 DAG prereq 구성 (강사 1주)
1. Pattern → Pattern prereq 엣지 추가
2. 사이클 검증은 `/api/admin/edges` POST 가 자동 수행 (`would_create_cycle` 응답 시 거부)

### S4 Item 태깅 + 해설 (강사·팀원 2주)
1. PDF 업로드 (현 `/upload` 라우트 활용 — 파이프라인이 draft 추출)
2. 추출된 draft Item 들이 `/admin/seed-review` 큐에 표시됨
3. 각 Item 에 대해:
   - 라벨(문제 본문) 정리 (OCR 오타 등)
   - 출처·연도·번호 메타 입력
   - 보기 5개 (Enter 줄 분리) 입력
   - 정답 입력
   - 난이도 0.0~1.0 (강사 추정)
   - 해설 1~2문장 (핵심 조건 + 답 도출 한 줄)
   - Pattern 태깅: "엣지 관리" 섹션에서 Pattern UUID 입력 후 `contains` 추가
4. 모두 채우면 "Publish" 클릭 → `status='published'` → 학생 화면 노출

### S5 검수 + 시연 (1주)
1. `/v2/solve/<published_item_uuid>` 진입해서 D1 시나리오 시연
2. GraphPanel 시각 확인
3. 강사 1차 cohort 1주 운영

## 3. 임시 어드민 화면 사용법

### 진입
1. ADMIN_EMAILS 에 등록된 계정으로 로그인
2. `/admin/seed-review` 접속

### 큐 필터
- `검수 대기 / 발행됨` × `전체 / 유형 / 문제`

### 노드 편집
- 좌측 list 클릭 → 우측 편집 폼
- 저장 버튼 (PATCH) — 라벨·메타 수정
- Publish 버튼 (POST publish) — 필수 필드 검증 후 발행
  - Pattern: grade + signature 필수
  - Item: itemAnswer 필수
- 삭제 버튼 (POST discard) — draft 만 가능

### 엣지 관리 (Pattern 편집 시만)
- 다른 노드 UUID 입력 + 종류 선택 (`prerequisite` / `contains`) → 추가
- 사이클이면 `would_create_cycle` 에러
- 기존 엣지 list 에서 "제거" 버튼

## 4. PDF 자동 draft 추출 (선택)

`/upload` 화면에서 PDF 업로드하면 `lib/pipeline/process-document.ts`가:
1. unpdf 로 텍스트 청크 분리
2. GPT-4o-mini 가 노드/엣지 후보 추출
3. `status='draft'` 로 저장 (M1.1 + A-2 결정)
4. 어드민 큐에 자동 등장

## 5. 한국교육과정평가원 자료 사용 시 주의

- 본문·정답표 = 공공 (출처 표기 권장)
- EBS 해설 사용 X — 직접 1~2문장 해설 작성
- Q3 유료 런칭 직전 변호사 자문 1회 권장 (메모리 `project_content_seed_strategy.md` 참조)

## 6. 알려진 한계

- 공동 작업 lock 없음 — 같은 노드를 두 명이 동시 편집 시 last-write-wins
- 변경 이력 없음 — Q2 audit log 추가 검토
- 일괄 업로드 X — 한 건씩 publish (csv 일괄 import 는 Q2)
- Pattern UUID 를 손으로 입력해야 함 (Pattern 검색 UI 는 Q2 polish)
