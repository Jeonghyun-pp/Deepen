# Phase 0 Baseline

Date: 2026-04-28

This document records the current implementation baseline before starting the five stabilization phases:

1. PDF processing job queue
2. LLM cost and speed control
3. Agent approval persistence
4. Server-side search and roadmap persistence
5. Whiteboard server synchronization

## Current Worktree Notes

The repository already has unrelated local changes. They were not reverted.

Observed before Phase 0:

- Modified: `.claude/settings.local.json`
- Modified: `app/_components/UploadPanel.tsx`
- Untracked generated planning artifacts under `docs/`
- Untracked local PDF: `재무관리_Ch04.pdf`

## Current Runtime Stack

- Next.js `16.2.2`
- React `19.2.4`
- Supabase SSR/client SDK
- Drizzle ORM
- Postgres via Supabase
- Supabase Auth, Storage, Realtime
- OpenAI SDK
- Anthropic SDK present, but current `.env.local` has `OPENAI_MODEL=gpt-4o-mini`

## Current DB Model

Defined in `lib/db/schema.ts`.

Existing tables:

- `users`
- `sessions`
- `documents`
- `chunks`
- `nodes`
- `edges`
- `chunk_node_mappings`
- `token_usage`

Existing enums:

- `document_status`: `uploaded`, `parsing`, `extracting`, `ready`, `failed`
- `node_type`: `paper`, `concept`, `technique`, `application`, `question`, `memo`, `document`
- `edge_type`: `prerequisite`, `contains`, `relatedTo`
- `chunk_content_type`: `text`, `equation_placeholder`, `figure_placeholder`

RLS and storage policies are defined separately in `drizzle/rls.sql`.

## Current PDF Upload Contract

Route: `POST /api/documents/upload`

File: `app/api/documents/upload/route.ts`

Current behavior:

1. Requires authenticated user through `withAuth`.
2. Accepts multipart `file`.
3. Rejects missing file with `file_required`.
4. Rejects non-PDF with `pdf_only`.
5. Rejects files larger than 30 MB with `file_too_large`.
6. Creates `documentId = randomUUID()`.
7. Uploads PDF to Supabase Storage bucket `documents` at:
   - `${user.id}/${documentId}.pdf`
8. Inserts a `documents` row:
   - `id`
   - `userId`
   - `title`
   - `storagePath`
   - `status = uploaded`
9. Starts `processDocument()` via `after()`.
10. Returns the created document row with HTTP `202`.

Important current coupling:

- The upload response returns a `Document` directly.
- UI expects `documents.status` to drive progress.
- The pipeline starts inside the same route lifecycle through `after()`.

Phase 1 must preserve:

- `POST /api/documents/upload` response status `202`.
- Existing validation error codes.
- Existing Storage path convention.
- Existing `documents.status` values for UI compatibility.

## Current PDF Processing Contract

Entry point: `processDocument(documentId, userId, storagePath)`

File: `lib/pipeline/process-document.ts`

Current status flow:

```text
uploaded -> parsing -> extracting -> ready
uploaded/parsing/extracting -> failed
```

Current processing steps:

1. Set `documents.status = parsing`.
2. Download PDF from Supabase Storage.
3. Parse PDF with `parsePdf()`.
4. Update `documents.pageCount`.
5. Insert `chunks`.
6. Group chunks into sections with `groupSections()`.
7. Set `documents.status = extracting`.
8. Extract nodes and typed edges per section with `extractNodesFromSections()`.
9. Record token usage with source `extract_nodes`.
10. Filter noisy nodes.
11. Deduplicate labels with fuzzy matching.
12. Insert new `nodes`.
13. Insert `chunk_node_mappings`.
14. Insert typed `prerequisite` / `contains` edges.
15. Insert co-occurrence `relatedTo` edges.
16. Set `documents.status = ready`.
17. On fatal error, set `documents.status = failed` and `errorMessage`.

Important current behavior:

- Stage 3 section-level LLM failures are tolerated by returning empty results.
- Fatal parse/storage/DB errors fail the whole document.
- `processDocument()` catches errors and returns `null`; it does not throw to callers in normal failure paths.
- Inserts are not currently idempotent for all stages. A repeated full run can duplicate chunks and some graph data.

Phase 1 must preserve:

- Existing final DB shape: `documents`, `chunks`, `nodes`, `edges`, `chunk_node_mappings`.
- Existing graph load behavior through `/api/graph/current`.
- Existing `ready` transition used by `UploadPanel` to refresh graph data.

Phase 1 should improve:

- Job ownership and retry state.
- Duplicate execution prevention.
- Event/progress visibility.

## Current Upload UI Contract

File: `app/_components/UploadPanel.tsx`

Current behavior:

- Fetches `GET /api/documents`.
- Redirects unauthenticated users to `/login?redirect=<current path>`.
- Subscribes to Supabase Realtime changes on `public.documents` filtered by `user_id`.
- Falls back to polling every 8 seconds while any document is `uploaded`, `parsing`, or `extracting`.
- Calls `onDocumentReady(doc)` when a document first transitions to `ready`.

Current UI states depend only on:

- `documents.status`
- `documents.errorMessage`
- `documents.title`

Phase 1 can add job progress, but should not remove these document-level fields.

## Current Document Management Contract

Routes:

- `GET /api/documents`
- `GET /api/documents/[id]`
- `DELETE /api/documents/[id]`

Current delete behavior:

1. Verify document belongs to user.
2. Collect chunks for the document.
3. Find node mappings tied to those chunks.
4. Delete nodes that are only mapped to the deleted document.
5. Remove PDF object from Supabase Storage.
6. Delete `documents` row.
7. Let FK cascade delete chunks and mappings.

Known limitation:

- Storage deletion failure is logged but not compensated by a retry job.

## Current Graph Load Contract

Route: `GET /api/graph/current`

File: `app/api/graph/current/route.ts`

Current behavior:

- Requires auth through `withAuth`.
- Loads all `nodes` for current user.
- Loads all `edges` for current user.
- Returns `{ nodes, edges }`.

Current limitation:

- No pagination or server-side filtering.
- Large graphs will load all rows at once.

Phase 1 should avoid changing this route unless needed for upload refresh compatibility.

## Current Agent Contract

Routes:

- `POST /api/agent/chat`
- `POST /api/agent/approve`

Core files:

- `lib/agent/runner.ts`
- `lib/agent/approval.ts`
- `lib/agent/tools/*`
- `app/graph/_hooks/useAgent.ts`

Current behavior:

- `POST /api/agent/chat` returns an SSE stream.
- `runAgent()` builds a system prompt from DB stats and relevant graph context.
- OpenAI tool calling is used through `callOpenAIWithTools()`.
- Tool calls are split into:
  - auto-exec tools
  - approval-required tools
- Approval-required tools emit `batch_approval`.
- `waitForApproval(sessionId)` waits in an in-memory `Map`.
- `/api/agent/approve` calls `resolveApproval(sessionId, decisions)`.
- `add_node` and `add_edge` require approval and mutate DB after approval.
- Agent token usage is recorded with source `agent`.

Known limitation:

- Approval state is in-memory only.
- Pending approval is not durable across instances or restarts.
- Tool call args/results are not persisted as an audit trail.

Phase 3 must preserve:

- Existing SSE event types where possible:
  - `text_delta`
  - `tool_calls`
  - `tool_call_start`
  - `tool_result`
  - `batch_approval`
  - `approval_resolved`
  - `done`
  - `error`
- Existing client hook behavior in `useAgent()`.

## Current LLM Usage Points

Pipeline:

- `lib/pipeline/extract-nodes.ts`
- One OpenAI structured-output call per section.
- Model: `process.env.OPENAI_MODEL || "gpt-4o-mini"`.
- Usage is aggregated and recorded once per document as `extract_nodes`.

Agent:

- `lib/agent/runner.ts`
- OpenAI tool-calling loop, up to `MAX_ITERATIONS = 5`.
- Usage recorded per iteration as `agent`.

Current limitations:

- `OPENAI_MODEL` is shared by extraction and agent.
- No quota check before calls.
- No LLM extraction cache.
- No per-document cost cap.
- No tool-call rate limit.

## Static Verification

Commands run:

```bash
npm run lint
npx tsc --noEmit
```

Results:

- `npm run lint`: passed with 8 warnings, 0 errors.
- `npx tsc --noEmit`: passed.

Existing lint warnings:

- `app/graph/_components/GraphShell.tsx`
  - `pathIds` logical expression can affect `useMemo` dependencies.
- `app/graph/_components/GraphStatusBar.tsx`
  - `edgeStyle`, `onEdgeStyleChange`, `nodeCount`, `edgeCount` unused.
- `app/graph/_hooks/useGraphData.ts`
  - `NodeType` unused.
- `app/graph/whiteboard/_components/WhiteboardCanvas.tsx`
  - missing `data` dependency in `useMemo`.
- `lib/clients/semantic-scholar.ts`
  - `openalexId` unused.

## Connection Verification

Command run:

```bash
npm run verify
```

First run failed inside sandbox with `spawn EPERM` from `tsx` / `esbuild`.

Escalated run result:

- `DATABASE_URL`: OK, `SELECT 1` succeeded.
- `ANON_KEY`: OK, auth session API responded.
- `SERVICE_ROLE_KEY`: OK, `listUsers` succeeded.
- Script printed: `모든 연결 정상. Week 1 착수 가능.`
- Process then exited non-zero due to a Windows/Node assertion:
  - `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 76`

Interpretation:

- External service connectivity is currently OK.
- The verify script/process teardown is unstable in this local environment.
- This should not block Phase 1, but should be noted as a tooling issue.

## Phase 1 Readiness Notes

The safest Phase 1 implementation path is:

1. Add job/event tables without removing document status.
2. Keep `processDocument()` behavior mostly intact.
3. Wrap `processDocument()` in a job runner that owns:
   - job status
   - attempts
   - lock
   - errors
   - processing events
4. Keep `/api/documents/upload` returning the created document row with `202`.
5. Add job creation during upload.
6. Replace `after()` with either:
   - a worker route call, or
   - a polling worker script, or
   - a temporary `after()` trigger that only nudges job processing while DB remains source of truth.

Recommended first Phase 1 cut:

- Add `document_jobs`.
- Add `document_processing_events`.
- Add helper functions:
  - `createDocumentJob`
  - `claimNextDocumentJob`
  - `markDocumentJobSucceeded`
  - `markDocumentJobFailed`
  - `recordDocumentProcessingEvent`
- Add worker route:
  - `POST /api/jobs/process-documents`
- Keep the existing `documents.status` transitions inside `processDocument()` for compatibility.

## Risks To Watch During Phase 1

- Re-running `processDocument()` is not fully idempotent today.
- If a job is retried after partial DB writes, chunks can duplicate.
- Upload UI currently watches `documents`, not jobs.
- Realtime currently listens only to `documents`.
- Worker route must not allow arbitrary public users to process all jobs without authorization.
- Service-role operations must stay server-only.
- Storage cleanup remains separate from DB transaction semantics.

## Do Not Change Yet

During the first Phase 1 cut, avoid changing:

- Graph rendering behavior.
- Agent tool calling behavior.
- Document deletion behavior.
- Whiteboard behavior.
- Search behavior.

The first change should establish job state without altering the rest of the product surface.
