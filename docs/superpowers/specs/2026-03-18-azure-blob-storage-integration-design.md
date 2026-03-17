# Azure Blob Storage Integration — Design Spec

**Date:** 2026-03-18
**Status:** Approved
**Approach:** Direct `@azure/storage-blob` SDK (Approach 1)

## Goals

1. **Persist conversation history** — Replace in-memory `MemorySaver` with a custom `BlobCheckpointSaver` so LangGraph checkpoints survive server restarts and users can resume past sessions
2. **Centralize knowledge files** — Load schema, joins, KPIs, rules, distinct values, and examples from blob storage (with local file fallback), enabling updates without redeployment
3. **Persist feedback & audit logs** — Store user feedback and query audit trails as daily JSONL files in blob storage

## Non-Goals

- Client-side export storage (Excel/CSV/PNG exports remain browser-side)
- Cosmos DB or any additional Azure services
- Multi-container setup or per-data-type access policies
- Provider-agnostic storage abstraction layer
- `fiscalPeriodFetcher.js` — fetches from SQL Server, not local files; not a candidate for blob migration

## Container Layout

Single container `autoagents` with path-based separation:

```
autoagents/
  _health/ping.json                          # Bootstrap connectivity test
  knowledge/
    schema-knowledge.json
    distinct-values.json
    join-knowledge.json
    kpi-glossary.json
    business-context.md
    strategic-framework.md
    analysis-blueprints.json
    goldExamples.json
    dashboardGoldExamples.json
  checkpoints/
    {threadId}/
      cp_{checkpointId}.json                 # Individual checkpoint data
      writes_{taskId}.json                   # Intermediate pending writes
      metadata.json                          # Thread-level index of checkpoints
  sessions/
    {sessionId}.json                         # Session memory (query + correction history)
  feedback/
    {YYYY-MM-DD}.jsonl                       # Daily feedback log
  audit/
    {YYYY-MM-DD}.jsonl                       # Daily audit log (AppendBlob, same as feedback)
```

## Configuration

**New env vars** (added to `.env` and `.env.example`):

```
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=azr9476va7devstg;AccountKey=...;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER_NAME=autoagents
```

**New dependency:**

```
@azure/storage-blob  (latest stable)
```

---

## Component 1: Blob Service Layer

**File:** `server/services/blobService.js`

Thin wrapper around `@azure/storage-blob` SDK. Singleton `BlobServiceClient` initialized lazily from `AZURE_STORAGE_CONNECTION_STRING`.

### API

| Method | Signature | Description |
|--------|-----------|-------------|
| `uploadJson` | `(blobPath, data) → void` | `JSON.stringify` + upload as block blob |
| `downloadJson` | `(blobPath) → object\|null` | Download + `JSON.parse`. Returns `null` on 404 |
| `downloadText` | `(blobPath) → string\|null` | Download raw text. Returns `null` on 404. For `.md` files |
| `uploadText` | `(blobPath, text) → void` | Upload raw text as block blob |
| `appendToLog` | `(blobPath, entry) → void` | Uses AppendBlob — atomic append of a single JSON line (no read-modify-write) |
| `listBlobs` | `(prefix) → string[]` | List blob names under a prefix |
| `deleteBlob` | `(blobPath) → void` | Delete a single blob |
| `deleteBlobsByPrefix` | `(prefix) → void` | Delete all blobs under a prefix |
| `blobExists` | `(blobPath) → boolean` | Check blob existence |
| `getContainerClient` | `() → ContainerClient` | For advanced/streaming use |

### Error Handling

- Wraps SDK errors with clear log messages
- Returns `null` / empty array on 404 (not-found) — does not throw
- Throws on configuration errors (missing connection string)
- All methods check the `blobAvailable` flag from bootstrap; skip silently if blob is unavailable

### AppendBlob for JSONL Files

Feedback and audit logs use Azure **AppendBlob** (not BlockBlob) via `appendBlobClient.appendBlock()`. This supports concurrent atomic appends without a read-modify-write cycle, eliminating the race condition risk inherent in download-append-reupload.

---

## Component 2: Blob Bootstrap

**File:** `server/services/blobBootstrap.js`

Called at startup before knowledge loaders. Validates connectivity and creates the container.

### Sequence

1. Instantiate `BlobServiceClient` from connection string
2. `containerClient.createIfNotExists()` — idempotent container creation
3. Upload test blob `_health/ping.json` with `{ "ok": true, "timestamp": "..." }`
4. Download and verify contents match
5. Set module-level `blobAvailable` flag
6. Return `{ available: true }` or `{ available: false, error: '...' }`

### Degradation

If blob storage is unavailable, the app continues with local files and in-memory storage (current behavior). A warning is logged. The `blobAvailable` flag is checked by all blob operations.

---

## Component 3: BlobCheckpointSaver

**File:** `server/graph/blobCheckpointSaver.js`

Custom implementation of LangGraph's `BaseCheckpointSaver` interface (from `@langchain/langgraph-checkpoint`), replacing `MemorySaver`.

### Blob Structure

```
checkpoints/{threadId}/cp_{checkpointId}.json   — serialized checkpoint
checkpoints/{threadId}/writes_{taskId}.json      — pending writes for a checkpoint
checkpoints/{threadId}/metadata.json             — index: [{id, ts, node, step, parentId}]
```

### Interface Methods (all 5 abstract methods from BaseCheckpointSaver)

| Method | Signature | Behavior |
|--------|-----------|----------|
| `getTuple(config)` | `(RunnableConfig) → Promise<CheckpointTuple \| undefined>` | If checkpoint ID given: download `cp_{id}.json`. Otherwise: read `metadata.json`, find latest, download that checkpoint. Also loads associated `pendingWrites` |
| `list(config, options)` | `(RunnableConfig, CheckpointListOptions?) → AsyncGenerator<CheckpointTuple>` | Read `metadata.json`, `yield` checkpoint tuples in reverse chronological order. Supports `limit`, `before`, and `filter` options. Must be `async function*` |
| `put(config, checkpoint, metadata, newVersions)` | `(RunnableConfig, Checkpoint, CheckpointMetadata, ChannelVersions) → Promise<RunnableConfig>` | Upload `cp_{id}.json`, update `metadata.json` index, return new `RunnableConfig` with the checkpoint_id |
| `putWrites(config, writes, taskId)` | `(RunnableConfig, PendingWrite[], string) → Promise<void>` | Store intermediate writes as `writes_{taskId}.json` linked to the checkpoint |
| `deleteThread(threadId)` | `(string) → Promise<void>` | Delete all blobs under `checkpoints/{threadId}/` prefix |

### Performance

- ~8-15 `put()` calls per query (one per workflow node), each <50KB — acceptable at ~20-50ms per upload
- `getTuple()` on resume: single blob download
- `metadata.json` index avoids slow `listBlobs()` API calls for the history endpoint

### Factory

```js
async function createCheckpointer() → BlobCheckpointSaver | MemorySaver
```

Returns `BlobCheckpointSaver` if blob is available, `MemorySaver` fallback otherwise.

### Integration — Sync-to-Async Migration

Currently, the checkpointer is created at module-level scope (synchronous) in `workflow.js:204`:
```js
const checkpointer = new MemorySaver();
```

And `buildWorkflow()` / `getWorkflow()` are synchronous, called by route handlers.

**Migration approach:** Move checkpointer initialization into the `start()` function in `index.js` (which is already async). Pass the checkpointer into `buildWorkflow()`:

```js
// server/index.js — inside start(), after blob bootstrap:
const { createCheckpointer } = require('./graph/blobCheckpointSaver');
const checkpointer = await createCheckpointer();

// server/graph/workflow.js — change buildWorkflow to accept checkpointer:
// Before:
function buildWorkflow() {
  // ...
  return graph.compile({ checkpointer }); // uses module-level checkpointer
}
// After:
function buildWorkflow(checkpointer) {
  // ...
  return graph.compile({ checkpointer });
}
```

`getWorkflow()` remains synchronous — it returns the already-compiled graph. The async work happens once at startup, not per-request. Route handler call sites (`textToSql.js`) are unchanged.

**Safety:** `getWorkflow()` should throw a clear error if called before `start()` has initialized the checkpointer and compiled the graph, rather than silently compiling without a checkpointer.

---

## Component 4: Knowledge File Loading from Blob

**Modified files:** 6 fetchers in `server/vectordb/` + `server/prompts/dashboard.js`

### Strategy: Try Blob First, Fall Back to Local

Each fetcher's `loadAsync()` function changes to:

```
1. Try blobService.downloadJson('knowledge/{filename}')  (or downloadText for .md)
2. If found → parse + cache in memory
3. If blob unavailable or missing → fall back to fs.readFile() (current behavior)
```

### Affected Fetchers

| Fetcher / Loader | Blob Path | Local Fallback |
|------------------|-----------|----------------|
| `schemaFetcher.js` | `knowledge/schema-knowledge.json` | `context/knowledge/schema-knowledge.json` |
| `distinctValuesFetcher.js` | `knowledge/distinct-values.json` | `context/knowledge/distinct-values.json` |
| `joinRuleFetcher.js` | `knowledge/join-knowledge.json` | `context/knowledge/join-knowledge.json` |
| `kpiFetcher.js` | `knowledge/kpi-glossary.json` | `context/knowledge/kpi-glossary.json` |
| `rulesFetcher.js` | `knowledge/business-context.md` | `context/knowledge/business-context.md` |
| `examplesFetcher.js` | `knowledge/goldExamples.json` | `context/goldExamples.json` |
| `prompts/dashboard.js` | `knowledge/dashboardGoldExamples.json` | `context/dashboardGoldExamples.json` |

**Note:** `dashboardGoldExamples.json` is loaded by `server/prompts/dashboard.js` (via `loadDashboardGoldExamples()` using sync `fs.readFileSync`), NOT by `examplesFetcher.js`. This function is updated to try blob first (converted to async with a sync wrapper for backward compat).

**Out of scope:** `analysis-blueprints.json` and `strategic-framework.md` are included in the blob container layout (uploaded via admin endpoint or manually) but their loading code is not modified in this phase — they are loaded by `classify.js` and not through the fetcher pattern. They can be migrated in a follow-up.

### Caching

Fetchers still cache in memory after loading. Blob is the source of truth but not re-fetched on every request. Reload happens on startup or explicit `reload()` call.

### Harvest Scripts

**Paths:** `scripts/harvestDistinctValues.js` and `scripts/generateSchemaKnowledge.js` (at repo root, not `server/scripts/`).

These gain a `--upload` flag. When set, after writing the local file they also upload to blob storage.

### Admin Upload Endpoint

```
POST /api/admin/knowledge/upload?file={filename}
Body: raw file content
Auth: existing requireAuthorization middleware + rate limiting
```

Uploads to `knowledge/{filename}` in blob. Calls the relevant fetcher's `reload()` to refresh the in-memory cache without restart. Rate limited to prevent abuse.

---

## Component 5: Session Memory Persistence

**Modified file:** `server/memory/sessionMemory.js`

### Strategy: Write-Through Cache

The in-memory `Map` remains the primary read path. Every mutation also writes to blob.

**Blob path:** `sessions/{sessionId}.json`

### Changed Functions

| Function | Change |
|----------|--------|
| `setSession()` | After Map set, fire-and-forget `uploadJson('sessions/{id}.json', data)` |
| `addQueryToSession()` | After Map update, fire-and-forget `uploadJson('sessions/{id}.json', data)` |
| `addCorrectionToSession()` | Same — fire-and-forget upload |
| `updateSession()` | Same — fire-and-forget upload |
| `getSession()` | Read Map first. On miss, try `downloadJson()`, populate Map on success, return null on miss |
| `clearSession()` | Delete from Map and `deleteBlob()` |

### Lazy Restore

Sessions are NOT bulk-loaded at startup. They restore on-demand when a returning user's `getSession()` misses the Map. Keeps startup fast.

### Fire-and-Forget

Blob upload failures on write do not break the request. Errors are logged but not thrown.

---

## Component 6: Feedback Persistence

**Modified file:** `server/routes/feedback.js`

### Storage: Daily AppendBlob JSONL Files

**Blob path:** `feedback/{YYYY-MM-DD}.jsonl`

Uses Azure AppendBlob for atomic concurrent appends (no read-modify-write race).

### Write Path (`POST /api/feedback`)

1. Build entry object (same shape as today)
2. Call `blobService.appendToLog('feedback/2026-03-18.jsonl', entry)`
3. `appendToLog` uses `appendBlobClient.appendBlock()` for atomic append

### Read Path (`GET /api/feedback/stats`)

1. List blobs under `feedback/` prefix
2. Download and parse each JSONL file
3. Aggregate up/down counts
4. Optional: `?date=2026-03-18` query param to filter to a single day

---

## Component 7: Audit Log (New)

**Integration point:** Route handler in `server/routes/textToSql.js`, after `graph.invoke()` completes.

**Blob path:** `audit/{YYYY-MM-DD}.jsonl`

Uses Azure AppendBlob (same as feedback) for safe concurrent writes under load.

### Entry Shape

```json
{
  "timestamp": "2026-03-18T14:30:00Z",
  "sessionId": "abc123",
  "userId": "user@company.com",
  "question": "Show me Q1 revenue by region",
  "intent": "SQL_QUERY",
  "sql": "SELECT ...",
  "rowCount": 42,
  "executionTimeMs": 1200,
  "status": "success"
}
```

### Access

No read endpoint initially. Audit logs consumed via Azure Portal / Storage Explorer. Admin endpoint can be added later.

---

## Component 8: Health Check Extension

**Modified file:** `server/routes/health.js`

Add blob storage status to existing health response format. Current format uses `server`, `database`, `llm` fields with `"ok"` / `"error"` values:

```json
{
  "server": "ok",
  "database": "ok",
  "llm": "ok",
  "blobStorage": "ok"
}
```

Reads the `blobAvailable` flag from bootstrap. Uses `"ok"` / `"unavailable"` to match existing conventions.

**HTTP status code:** Blob storage is optional — `blobStorage: "unavailable"` should NOT cause a 503. The `allOk` check in `health.js` should only consider core services (`server`, `database`, `llm`) for HTTP status. Blob status is informational only.

---

## Component 9: Standalone Test Script

**File:** `server/scripts/testBlobStorage.js`

Runnable via `node server/scripts/testBlobStorage.js`. Performs:

1. Parse connection string from `.env`
2. Create container if not exists
3. Upload test blob (BlockBlob)
4. Download and verify
5. Test AppendBlob (create + append a line)
6. List blobs
7. Clean up test blobs
8. Print pass/fail results

Used to validate credentials before full integration.

---

## Startup Order

```
1. DB pool                              (existing — index.js start())
2. Blob bootstrap (test + create)       (NEW — index.js start())
3. Knowledge loaders (blob → local)     (modified — index.js start())
4. Checkpointer init (async)            (NEW — index.js start(), passed to buildWorkflow())
5. Express server listen                (existing — index.js start())
```

All async initialization happens inside the existing `start()` function, which is already async.

---

## File Change Summary

| File | Action | Purpose |
|------|--------|---------|
| `server/services/blobService.js` | New | Core blob storage wrapper (BlockBlob + AppendBlob) |
| `server/services/blobBootstrap.js` | New | Startup connectivity test + container creation |
| `server/graph/blobCheckpointSaver.js` | New | LangGraph BaseCheckpointSaver (all 5 abstract methods) |
| `server/scripts/testBlobStorage.js` | New | Standalone connectivity test script |
| `server/graph/workflow.js` | Modified | Accept checkpointer as param to `buildWorkflow()` |
| `server/memory/sessionMemory.js` | Modified | Add write-through blob persistence (all 6 exported functions) |
| `server/routes/feedback.js` | Modified | Replace in-memory array with AppendBlob JSONL |
| `server/routes/textToSql.js` | Modified | Add audit log call after query execution |
| `server/vectordb/schemaFetcher.js` | Modified | Try blob first, local fallback |
| `server/vectordb/distinctValuesFetcher.js` | Modified | Try blob first, local fallback |
| `server/vectordb/joinRuleFetcher.js` | Modified | Try blob first, local fallback |
| `server/vectordb/kpiFetcher.js` | Modified | Try blob first, local fallback |
| `server/vectordb/rulesFetcher.js` | Modified | Try blob first, local fallback |
| `server/vectordb/examplesFetcher.js` | Modified | Try blob first, local fallback |
| `server/prompts/dashboard.js` | Modified | Try blob first for dashboardGoldExamples.json |
| `scripts/harvestDistinctValues.js` | Modified | Add --upload flag (repo root, not server/) |
| `scripts/generateSchemaKnowledge.js` | Modified | Add --upload flag (repo root, not server/) |
| `server/index.js` | Modified | Add blob bootstrap + checkpointer init to start() |
| `server/routes/health.js` | Modified | Add blobStorage field to health check |
| `server/package.json` | Modified | Add @azure/storage-blob dependency |
| `.env` / `.env.example` | Modified | Add storage env vars |

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Blob storage unavailable | Graceful fallback to local files + MemorySaver; logged warning |
| Concurrent writes to JSONL logs | Use AppendBlob with atomic `appendBlock()` — no read-modify-write race |
| Checkpoint upload latency slowing queries | Uploads are small (<50KB) and the SDK is async; observable latency impact is minimal |
| Connection string leaked in logs | Never log credentials; use env vars only |
| Data accumulation over time | Future work: add TTL / retention policy for checkpoints, sessions, and audit logs. Not in scope for initial integration |
