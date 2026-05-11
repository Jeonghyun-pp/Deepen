# Phase 1 - Document Processing Job Queue

Date: 2026-04-28

## Goal

Move PDF processing away from a best-effort `after()` background task into an explicit database-backed job model. This makes upload, processing state, failure visibility, and retry behavior observable before adding a managed queue or separate worker process.

## Implemented

- Added `document_jobs` for queued/running/succeeded/failed/canceled processing jobs.
- Added `document_processing_events` for step-level processing history.
- Added Drizzle schema, SQL migration, and RLS coverage for both tables.
- Changed `/api/documents/upload` to create a queued job immediately after the document row is created.
- Kept `after()` only as a queue nudge, so upload response no longer owns the whole processing lifecycle.
- Added a worker endpoint: `POST /api/jobs/process-documents`.
- Added a retry endpoint: `POST /api/document-jobs/[id]/retry`.
- Added latest job status to `GET /api/documents`.
- Added failed-job retry controls and visible job status in the document list UI.

## Worker Route

`POST /api/jobs/process-documents`

Body:

```json
{
  "limit": 1,
  "workerId": "manual-worker"
}
```

Production authorization:

- Set `JOB_WORKER_SECRET`.
- Send either `Authorization: Bearer <secret>` or `x-job-secret: <secret>`.
- If `JOB_WORKER_SECRET` is missing in production, the route rejects requests.

Recommended next deployment step:

- Call this route from a scheduled job every 1-5 minutes.
- Keep `limit` low until PDF processing latency and LLM cost are measured.

## Migration

Applied with:

```bash
npm run db:migrate
```

Result:

- Drizzle migrations applied.
- RLS policies applied.
- Existing schema notices were non-blocking.

## Verification

Passed:

```bash
npm run lint
npx tsc --noEmit
```

`npm run verify` result:

- Database `SELECT 1`: OK
- Supabase anon auth session API: OK
- Supabase service role `listUsers`: OK
- The command still exits with the existing Windows Node/tsx assertion:
  `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 76`

## Remaining Risks

- This is still a database-backed queue, not a managed queue. It is a meaningful reliability improvement, but not the final high-throughput architecture.
- A separate always-on worker is not deployed yet. The upload route nudges the queue, and the worker route is ready for cron/manual invocation.
- Step-level idempotency is not complete. Retrying after partial chunk/node creation can still duplicate downstream records unless `processDocument()` is made idempotent per step.
- There is no dead-letter queue table yet. Failed jobs remain in `document_jobs.status = 'failed'`.
- Stale running job recovery is not implemented yet. A worker crash after claiming a job can leave it `running` until an operator resets it.

## Next Phase 1 Hardening

- Add stale lock recovery for `running` jobs older than a configured timeout.
- Add `document_processing_events` writes inside parse/extract/map steps, not only job-level events.
- Make document processing idempotent by clearing or upserting chunks, mappings, nodes, and edges per document.
- Add an admin/operator screen for failed jobs and manual replay.
