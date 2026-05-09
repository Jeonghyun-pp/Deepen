-- ============================================================
-- Row-Level Security 정책 + auth 연동
-- 마이그레이션(0000_*.sql) 적용 이후에 실행.
-- `npm run db:migrate` 가 자동 호출한다.
-- ============================================================

-- ------------------------------------------------------------
-- 1. auth.users → public.users 자동 연결
--    새 사용자가 Supabase Auth에 가입하면 public.users row 자동 생성
-- ------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 이미 가입된 사용자에도 소급 적용
insert into public.users (id)
  select id from auth.users
  on conflict do nothing;

-- ------------------------------------------------------------
-- 2. RLS 활성화
-- ------------------------------------------------------------

alter table public.users                enable row level security;
alter table public.sessions             enable row level security;
alter table public.documents            enable row level security;
alter table public.document_jobs        enable row level security;
alter table public.document_processing_events enable row level security;
alter table public.chunks               enable row level security;
alter table public.nodes                enable row level security;
alter table public.edges                enable row level security;
alter table public.chunk_node_mappings  enable row level security;
alter table public.token_usage          enable row level security;
-- M1.1 신규 테이블
alter table public.user_item_history    enable row level security;
alter table public.pattern_state        enable row level security;
alter table public.ai_coach_calls       enable row level security;

-- ------------------------------------------------------------
-- 3. 정책: 자기 데이터만 select/insert/update/delete
--    모든 테이블에 user_id 컬럼이 존재하므로 동일 패턴 반복.
-- ------------------------------------------------------------

-- users (id가 곧 user_id 역할)
drop policy if exists "users self read"   on public.users;
drop policy if exists "users self write"  on public.users;
create policy "users self read"
  on public.users for select
  using (id = auth.uid());
create policy "users self write"
  on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- 나머지 테이블 공통 패턴 (nodes 제외 — 아래 별도 정책)
do $$
declare t text;
begin
  foreach t in array array[
    'sessions', 'documents', 'document_jobs', 'document_processing_events',
    'chunks', 'edges', 'chunk_node_mappings', 'token_usage',
    'user_item_history', 'pattern_state', 'ai_coach_calls'
  ]
  loop
    execute format('drop policy if exists "%I self all" on public.%I', t, t);
    execute format($p$
      create policy "%I self all"
        on public.%I
        for all
        using (user_id = auth.uid())
        with check (user_id = auth.uid())
    $p$, t, t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- 3-b. nodes — published 콘텐츠는 모두에게 보임 + 시스템 콘텐츠(user_id IS NULL) 허용
--      쓰기는 본인 user_id 만.  (M1.1 + A-1(B)/A-2(B))
-- ------------------------------------------------------------

drop policy if exists "nodes self all"     on public.nodes;
drop policy if exists "nodes select"       on public.nodes;
drop policy if exists "nodes write"        on public.nodes;

create policy "nodes select"
  on public.nodes
  for select
  using (
    status = 'published'
    or user_id = auth.uid()
    or user_id is null
  );

create policy "nodes write"
  on public.nodes
  for insert
  with check (user_id = auth.uid());

create policy "nodes update"
  on public.nodes
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "nodes delete"
  on public.nodes
  for delete
  using (user_id = auth.uid());

-- ------------------------------------------------------------
-- 4. Storage 버킷 — PDF 업로드용 (private)
--    경로 규약: documents/{user_id}/{document_id}.pdf
--    서버(admin client)가 mediate하므로 RLS는 defensive만.
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- 본인 폴더 객체만 접근 허용 (admin client는 RLS 우회)
drop policy if exists "documents owner all" on storage.objects;
create policy "documents owner all"
  on storage.objects
  for all
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ------------------------------------------------------------
-- 5. Storage 버킷 — 펜슬 풀이 drawing (private, M2.1)
--    경로 규약: drawings/{user_id}/{item_id}.json (tldraw snapshot)
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('drawings', 'drawings', false)
on conflict (id) do nothing;

drop policy if exists "drawings owner all" on storage.objects;
create policy "drawings owner all"
  on storage.objects
  for all
  using (
    bucket_id = 'drawings'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'drawings'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
