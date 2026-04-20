# Week 3 스모크 테스트 시나리오 + Gate 검증

> D1~D6 구현 후 Week 4 (배포) 진입 전에 실행하는 수동 검증 목록. dev server (`npm run dev`) + 로그인된 브라우저 2개(A/B 계정)로 실행.

## 0. 사전 셋업 (D5/D7 신규 필요)

D5에서 `token_usage` 테이블, D6에서 Realtime 구독이 추가됐다. 아래를 먼저 실행하지 않으면 S1~S5 중 일부가 실패한다.

```bash
# 1) 새 스키마 반영 — drizzle이 0001_xxx_token_usage.sql 생성
npm run db:generate

# 2) 마이그레이션 적용 + RLS 재적용
npm run db:migrate
```

그 다음 Supabase SQL editor에서:

```sql
-- documents/token_usage 테이블을 Realtime publication에 추가
alter publication supabase_realtime add table public.documents;
-- token_usage는 서버만 읽으면 충분하므로 publication 불필요
```

Sentry는 현재 stub(`lib/observability/report-error.ts`). Week 4 배포 직전에 `@sentry/nextjs` 설치 + `instrumentation.ts` 작성으로 활성화.

## 전제
- `/graph` 우측 패널 챗 탭에서 메시지 전송 후 승인 UI가 뜨는지 확인
- 각 시나리오 끝에 **새로고침** 해서 DB에 저장됐는지 검증
- 브라우저 DevTools Network 탭에서 `/api/agent/chat` SSE 응답 관찰

## S1. 기본 추가 (add_node → approve → persist)
1. 챗에 "'강화학습' 개념 노드를 추가해줘"
2. 승인 UI에 `+ concept 노드 "강화학습" 추가` 표시 → 승인
3. 그래프 canvas에 새 노드 즉시 등장
4. 새로고침 후에도 노드 유지
5. `/api/graph/current` 응답에 해당 노드 포함

**Pass 조건**: DB `nodes` 테이블에 row 1개 추가, `user_id`가 현재 사용자

## S2. 엣지 추가 (기존 두 노드 연결)
1. 그래프에 노드 2개 이상 있는 상태에서
2. 챗에 "노드 X와 Y를 prerequisite 관계로 연결해줘"
3. 승인 UI에 `+ 엣지 ... --[relatedTo]--> ...` 표시 → 승인
4. 엣지 즉시 canvas 반영, 새로고침 유지

**Pass 조건**: DB `edges` 테이블에 row 1개, 두 노드 모두 user 소유

## S3. 중복 라벨 추가 (D3에서 dedup 도입 전까지는 허용)
1. 이미 "Transformer" 노드가 있는 상태에서 "Transformer" 다시 추가 요청
2. 승인 → 두 번째 row 생성 (D1 기준은 raw insert, 중복 방지 없음)

**현재 기대**: DB에 중복 row 생성. **D3 이후 기대**: 기존 노드 id 반환, insert 스킵

## S4. 거부 (approval rejection)
1. 챗에 "메모 노드 '테스트'를 추가"
2. 승인 UI에서 **거부** 클릭
3. 그래프 변화 없음 + tool_result에 "rejected" 표시
4. 새로고침 — 노드 없음

**Pass 조건**: DB insert 안 됨, `approve` endpoint가 `{testCallId: false}` 전송

## S5. 교차 사용자 방어 (RLS)
1. A 계정에서 노드 생성, 노드 id 복사 (DevTools)
2. B 계정 로그인 후 챗에 "노드 `<A의 id>`를 source로 엣지 추가"
3. `add-edge` tool이 "source/target 노드가 DB에 없거나 소유자가 다름" 에러
4. B 그래프 변화 없음

**Pass 조건**: `owned.length !== 2` 에러 경로 작동, DB에 leak 없음

---

## 알려진 Race Condition 및 대응

| 상황 | 대응 |
|---|---|
| 같은 LLM turn에서 add_node + 막 만든 노드로 add_edge | system prompt에 "다음 턴에서 tool_result uuid 사용" 명시. 잘못된 id면 add-edge가 throw → LLM이 다음 iteration에서 정정 |
| 두 브라우저 탭에서 같은 sessionId로 동시 approval | `approval.ts`에서 기존 pending 자동 reject. 새 요청이 승리 |
| approval 대기 중 서버 재시작 | 5분 timeout + SSE 연결 끊김. 클라이언트가 재전송 필요 |
| MAX_ITERATIONS (5) 초과 | LLM이 add_node → edge 시퀀스 완성 못 하면 중단. 현재 턴 수 충분 |

실패 시 Sentry (D5 이후) 또는 서버 로그 `[POST /api/agent/chat]` 확인.

---

## Week 3 Gate 4종 — Week 4 진입 조건

| # | Gate | 검증 방법 |
|---|---|---|
| G1 | 챗으로 "X를 Y의 prerequisite로 추가" → 승인 → DB 반영 → UI 즉시 업데이트 | S1 + S2 통과 |
| G2 | 노드 클릭 시 출처 chunk 뜸 | Week 2에서 이미 완료. PDF 업로드한 노드 클릭 → RightPanel > Graph 탭 > 출처 섹션에 chunk 스니펫 + 페이지 번호 표시 확인 |
| G3 | 새로고침해도 챗 결과 유지 | S1/S2 승인 후 F5 → 해당 노드·엣지가 여전히 존재 |
| G4 | 업로드 히스토리에서 문서 삭제 시 관련 노드 cascade 삭제 | `/documents` 페이지에서 PDF 업로드 문서 삭제 → 해당 문서 고유 노드·엣지 사라짐, 수동 add_node나 다른 문서와 공유된 노드는 유지 |

## 추가 점검 (release gate는 아니지만 Week 4 전에 확인)

- [ ] `token_usage` 테이블에 agent/extract_nodes 호출 기록됨 (SQL: `select source, model, sum(total_tokens) from token_usage group by 1, 2`)
- [ ] Realtime 구독 동작: 업로드 진행 중 다른 탭에서 상태 자동 갱신
- [ ] Whiteboard localStorage ↔ DB nodes 동기화: Whiteboard 뷰에서 노드 드래그 → 새로고침 후 whiteboardPos 유지되는지 (별 이슈 없으면 스코프 외)
- [ ] 2 계정 교차 테스트 재검증 (S5 재확인 — 삭제 API도 보호되는지)

## D5 이후 마이그레이션 순서 요약

```bash
npm run db:generate    # token_usage 반영
npm run db:migrate     # DB 적용 + RLS 갱신
# Supabase SQL editor에서
alter publication supabase_realtime add table public.documents;
# 마지막
npm run dev            # 위 S1~S5 + G1~G4 실행
```
