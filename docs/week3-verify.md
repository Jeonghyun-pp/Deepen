# Week 3 내가 해야 할 것 (사용자 체크리스트)

> Week 3 D1~D7 코드 작업 완료. Week 4 (배포) 진입 전 당신이 직접 돌려야 할 명령과 눈으로 확인할 항목만 간추렸다.
> 상세 시나리오·배경은 `docs/week3-smoke-tests.md` 참조.

---

## A. 셋업 명령 (한 번만)

```bash
# 1) token_usage 테이블 마이그레이션 생성
npm run db:generate

# 2) DB 적용 + RLS 재적용 (token_usage 포함)
npm run db:migrate
```

Supabase 대시보드 → SQL editor에서:
```sql
    alter publication supabase_realtime add table public.documents;
```

완료 후:
```bash
npm run dev
```

- [ ] `db:generate` 성공, `drizzle/` 아래 `0001_*_token_usage.sql` 생성됨
- [ ] `db:migrate` 에러 없이 통과
- [ ] Supabase `token_usage` 테이블 생성 확인
- [ ] `alter publication` 실행 완료

---

## B. 기능 검증 — 브라우저 2개 (A 계정, B 계정) 띄운 상태

### B1. Agent DB 쓰기 + persistence (G1, G3)
1. A 계정 `/graph` 접속 → 우측 챗 패널
2. "'강화학습' 개념 노드 추가해줘" 입력
3. 승인 UI 뜨면 **승인** 클릭
4. Canvas에 노드 즉시 등장
5. **새로고침** → 노드 유지

- [ ] 승인 후 Canvas에 즉시 반영
- [ ] 새로고침 후에도 노드 존재
- [ ] Supabase `nodes` 테이블에 row 1개 확인 (`user_id` 일치)

### B2. Agent edge 추가 (G1)
1. 노드 2개 있는 상태에서 챗에 "노드 X와 Y를 prerequisite 관계로 연결해줘"
2. 승인 → edge 등장 → 새로고침 유지

- [ ] edges 테이블에 row 1개
- [ ] 새로고침 후 유지

### B3. 승인 거부
1. "메모 노드 '테스트' 추가" 챗
2. 승인 UI에서 **거부**
3. Canvas 변화 없음, 새로고침 후에도 없음

- [ ] DB insert 안 됨
- [ ] tool 결과에 "rejected" 표시

### B4. 출처 chunk (G2) — Week 2에서 이미 완료됐지만 재확인
1. PDF 업로드한 문서의 노드 클릭
2. 우측 패널 Graph 탭에 출처 섹션 표시 (chunk 스니펫 + 페이지 번호)

- [ ] 출처 텍스트 보임
- [ ] 페이지 범위 보임
- [ ] 수식/figure 섹션에서 나온 노드는 "미지원" 뱃지

### B5. Cascade delete (G4)
1. `/documents` 접속 → PDF 1개 삭제 버튼
2. 확인 → 문서 사라짐
3. `/graph`에서 해당 PDF만 출처였던 노드·엣지 사라짐
4. 수동 추가 노드나 다른 문서 공유 노드는 그대로

- [ ] 문서 row 삭제
- [ ] orphan 노드(해당 문서에만 속한) 삭제
- [ ] 공유 노드는 유지
- [ ] Supabase Storage에서 PDF 파일도 제거됐는지 (`documents/{user_id}/` 폴더 확인)

### B6. Dedup fuzzy 매칭 (D3)
1. 이미 "Transformer" 노드 있는 상태에서
2. 같은 주제 PDF 업로드
3. "Transformers" (복수형) 또는 "transformer" (소문자) 같은 변형이 추출되면 별도 row 생성 대신 기존 "Transformer"에 chunk mapping만 추가되는지

- [ ] `nodes` 테이블에 중복 row 없음
- [ ] `chunk_node_mappings`에 해당 chunk→기존 nodeId mapping 추가

### B7. Realtime 업로드 진행률 (D6)
1. 브라우저 탭 2개로 같은 계정 로그인 (탭1: `/upload`, 탭2: `/graph`)
2. 탭1에서 PDF 업로드
3. 탭2의 UploadPanel 상태가 자동으로 `parsing → extracting → ready` 변함

- [ ] 8초 이상 지연 없이 상태 변화 반영

### B8. Token 로깅 (D5)
Agent 호출과 PDF 업로드 후 Supabase SQL editor에서:
```sql
select source, model, sum(total_tokens), sum(cost_usd)
from public.token_usage
where user_id = auth.uid()
group by 1, 2;
```

- [ ] `agent` / `extract_nodes` 두 source 모두 row 존재
- [ ] totalTokens > 0, costUsd > 0

### B9. RLS 교차 방어 (Week 1 재확인)
1. B 계정 로그인 → 챗에 "노드 `<A의 id>`를 source로 엣지 추가" (A 계정 노드 id를 수동 입력)
2. tool 에러 "source/target 노드가 DB에 없거나 소유자가 다름"

- [ ] A 그래프에 B 쪽 mutation 안 새어나감
- [ ] B `/documents`에 A 문서 안 보임

---

## C. 이슈 있을 때

| 증상 | 체크 |
|---|---|
| `db:migrate` 실패 | Supabase connection string, service_role key 확인 |
| Realtime 안 바뀜 | `alter publication` 실행 여부. Supabase 대시보드 > Realtime > documents 테이블 활성화 |
| Agent 승인 후 403 | `/api/agent/chat` 서버 로그. `requireUser()` 실패면 세션 만료 — 재로그인 |
| `token_usage` insert 실패 | 마이그레이션 안 됐을 가능성. 기능은 안 막히지만 로깅만 누락됨 |
| Cascade delete 후 "고아" edge 남음 | 스키마상 nodes.id → edges FK cascade이므로 이론상 불가. 실제 발생 시 보고 |

---

## D. 전부 통과하면

`docs/week3-smoke-tests.md` 하단의 "Gate 4종" 체크박스 모두 완료 → Week 4 (배포) 진입.

Week 4 착수 전 추가로 결정할 것:
- 초대 10명 이메일 리스트
- 프라이버시 문구
- Sentry 활성화 여부 (`npm install @sentry/nextjs` + `instrumentation.ts`)
- Supabase Pro tier ($25) 전환 여부 (storage 1GB 여유 판단)
