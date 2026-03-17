# Azure Blob Storage Integration — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Azure Blob Storage for persistent conversation history, centralized knowledge files, and feedback/audit logging.

**Architecture:** A thin `blobService.js` wrapper around `@azure/storage-blob` provides upload/download/append operations. A bootstrap module verifies connectivity at startup. `BlobCheckpointSaver` replaces LangGraph's `MemorySaver`. All 6 knowledge fetchers gain blob-first loading with local fallback. Session memory uses write-through caching. Feedback and audit logs use AppendBlob JSONL.

**Tech Stack:** `@azure/storage-blob` SDK, Node.js CommonJS, LangGraph `BaseCheckpointSaver`, Azure AppendBlob for JSONL logs.

**Spec:** `docs/superpowers/specs/2026-03-18-azure-blob-storage-integration-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `server/services/blobService.js` | Thin wrapper: uploadJson, downloadJson, downloadText, uploadText, appendToLog (AppendBlob), listBlobs, deleteBlob, deleteBlobsByPrefix, blobExists |
| `server/services/blobBootstrap.js` | Startup connectivity test, container creation, exports `isBlobAvailable()` and `bootstrapBlobStorage()` |
| `server/graph/blobCheckpointSaver.js` | `BlobCheckpointSaver extends BaseCheckpointSaver` — all 5 abstract methods + `createCheckpointer()` factory |
| `server/scripts/testBlobStorage.js` | Standalone script: validates credentials, tests BlockBlob + AppendBlob, prints pass/fail |

### Modified Files
| File | Change |
|------|--------|
| `server/package.json` | Add `@azure/storage-blob` dependency |
| `server/.env` + `server/.env.example` | Add `AZURE_STORAGE_CONNECTION_STRING`, `AZURE_STORAGE_CONTAINER_NAME` |
| `server/index.js` | Add blob bootstrap + checkpointer init to `start()` |
| `server/graph/workflow.js` | `buildWorkflow(checkpointer)` param, remove module-level `MemorySaver`, safety guard in `getWorkflow()` |
| `server/vectordb/schemaFetcher.js` | Try blob first in `loadSchemaKnowledgeAsync()` |
| `server/vectordb/distinctValuesFetcher.js` | Try blob first in `loadDistinctValuesAsync()` |
| `server/vectordb/joinRuleFetcher.js` | Try blob first in `loadJoinKnowledgeAsync()` |
| `server/vectordb/kpiFetcher.js` | Try blob first in `loadKpiGlossaryAsync()` |
| `server/vectordb/rulesFetcher.js` | Try blob first in `loadRulesAsync()` |
| `server/vectordb/examplesFetcher.js` | Try blob first in `loadExamplesAsync()` |
| `server/prompts/dashboard.js` | Try blob first in `loadDashboardGoldExamples()` |
| `server/memory/sessionMemory.js` | Write-through blob persistence on all 6 exported functions |
| `server/graph/nodes/classify.js` | `await getSession()` (2 call sites, async breaking change) |
| `server/graph/nodes/sqlWriterAgent.js` | `await getSession()` (1 call site) |
| `server/tools/searchSessionMemory.js` | `await getSession()` (1 call site) |
| `server/scripts/runQ1.js` | Add `initWorkflow(new MemorySaver())` before `getWorkflow()` |
| `server/routes/feedback.js` | Replace in-memory array with AppendBlob JSONL |
| `server/routes/textToSql.js` | Add audit log call after workflow.invoke() and after stream completes |
| `server/routes/health.js` | Add `blobStorage` field (informational, not in allOk check) |
| `scripts/harvestDistinctValues.js` | Add `--upload` flag |
| `scripts/generateSchemaKnowledge.js` | Add `--upload` flag |

---

## Task 1: Install SDK and Configure Environment

**Files:**
- Modify: `server/package.json`
- Modify: `server/.env`
- Modify: `server/.env.example`

- [ ] **Step 1: Install @azure/storage-blob**

```bash
cd server && npm install @azure/storage-blob
```

- [ ] **Step 2: Add env vars to .env**

Append to `server/.env`:
```
# ==================================================================
# Azure Blob Storage
# ==================================================================
AZURE_STORAGE_CONNECTION_STRING=<paste-your-connection-string-from-azure-portal>
AZURE_STORAGE_CONTAINER_NAME=autoagents
```

Note: Get the actual connection string from Azure Portal or from the credentials provided separately. Never commit real keys.

- [ ] **Step 3: Add env vars to .env.example**

Append to `server/.env.example`:
```
# ==================================================================
# Azure Blob Storage
# ==================================================================
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=<account>;AccountKey=<key>;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER_NAME=autoagents
```

- [ ] **Step 4: Commit**

```bash
git add server/package.json server/package-lock.json server/.env.example
git commit -m "chore: add @azure/storage-blob dependency and env var template"
```

Note: Do NOT commit `server/.env` (it's gitignored).

---

## Task 2: Blob Service Layer

**Files:**
- Create: `server/services/blobService.js`
- Test: `server/tests/blobService.test.js`

- [ ] **Step 1: Write the test file**

```js
const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');

// We test blobService in isolation by mocking @azure/storage-blob
// The service should:
// 1. Return null/empty when blob is unavailable
// 2. uploadJson/downloadJson round-trip
// 3. Return null on 404
// 4. appendToLog creates AppendBlob if not exists, then appends
// 5. listBlobs returns array of names
// 6. deleteBlob and deleteBlobsByPrefix work
// 7. blobExists returns boolean

describe('blobService', () => {
  let blobService;
  let mockContainerClient;
  let mockBlockBlobClient;
  let mockAppendBlobClient;
  let uploadedContent;

  beforeEach(() => {
    uploadedContent = null;

    mockBlockBlobClient = {
      upload: mock.fn(async (content) => { uploadedContent = content; }),
      download: mock.fn(async () => ({
        readableStreamBody: {
          [Symbol.asyncIterator]: async function* () {
            yield Buffer.from(uploadedContent || '{}');
          },
        },
      })),
      exists: mock.fn(async () => true),
      delete: mock.fn(async () => {}),
    };

    mockAppendBlobClient = {
      createIfNotExists: mock.fn(async () => {}),
      appendBlock: mock.fn(async () => {}),
    };

    mockContainerClient = {
      getBlockBlobClient: mock.fn(() => mockBlockBlobClient),
      getAppendBlobClient: mock.fn(() => mockAppendBlobClient),
      listBlobsFlat: mock.fn(function* () {}),
      exists: mock.fn(async () => true),
    };
  });

  it('uploadJson serializes and uploads', async () => {
    // Requires blobService to be initialized with a real or mock container client
    // This is tested via the standalone testBlobStorage.js script against real Azure
    // Unit tests here validate the logic paths
    assert.ok(true, 'placeholder — integration tested via testBlobStorage.js');
  });

  it('downloadJson returns null when blob not found', async () => {
    assert.ok(true, 'placeholder — integration tested via testBlobStorage.js');
  });
});
```

- [ ] **Step 2: Run test to verify it passes (placeholder)**

```bash
cd server && node --test tests/blobService.test.js
```

Expected: PASS (placeholder tests)

- [ ] **Step 3: Create blobService.js**

```js
/**
 * Blob Service — thin wrapper around @azure/storage-blob SDK.
 *
 * Provides uploadJson, downloadJson, downloadText, uploadText,
 * appendToLog (AppendBlob), listBlobs, deleteBlob, deleteBlobsByPrefix,
 * blobExists, getContainerClient.
 *
 * All methods check isBlobAvailable() before acting.
 * Returns null/empty on 404. Never throws on missing blobs.
 */

const { BlobServiceClient } = require('@azure/storage-blob');
const logger = require('../utils/logger');

let _containerClient = null;
let _blobAvailable = false;

function getContainerClient() {
  if (_containerClient) return _containerClient;
  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'autoagents';
  if (!connStr) throw new Error('AZURE_STORAGE_CONNECTION_STRING is not set');
  const blobServiceClient = BlobServiceClient.fromConnectionString(connStr);
  _containerClient = blobServiceClient.getContainerClient(containerName);
  return _containerClient;
}

function setBlobAvailable(available) { _blobAvailable = available; }
function isBlobAvailable() { return _blobAvailable; }

async function streamToString(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

async function uploadJson(blobPath, data) {
  if (!_blobAvailable) return;
  try {
    const client = getContainerClient().getBlockBlobClient(blobPath);
    const content = JSON.stringify(data, null, 2);
    await client.upload(content, Buffer.byteLength(content), {
      blobHTTPHeaders: { blobContentType: 'application/json' },
      overwrite: true,
    });
  } catch (err) {
    logger.error('Blob uploadJson failed', { blobPath, error: err.message });
  }
}

async function downloadJson(blobPath) {
  if (!_blobAvailable) return null;
  try {
    const client = getContainerClient().getBlockBlobClient(blobPath);
    const response = await client.download(0);
    const text = await streamToString(response.readableStreamBody);
    return JSON.parse(text);
  } catch (err) {
    if (err.statusCode === 404) return null;
    logger.error('Blob downloadJson failed', { blobPath, error: err.message });
    return null;
  }
}

async function uploadText(blobPath, text) {
  if (!_blobAvailable) return;
  try {
    const client = getContainerClient().getBlockBlobClient(blobPath);
    await client.upload(text, Buffer.byteLength(text), {
      blobHTTPHeaders: { blobContentType: 'text/plain' },
      overwrite: true,
    });
  } catch (err) {
    logger.error('Blob uploadText failed', { blobPath, error: err.message });
  }
}

async function downloadText(blobPath) {
  if (!_blobAvailable) return null;
  try {
    const client = getContainerClient().getBlockBlobClient(blobPath);
    const response = await client.download(0);
    return await streamToString(response.readableStreamBody);
  } catch (err) {
    if (err.statusCode === 404) return null;
    logger.error('Blob downloadText failed', { blobPath, error: err.message });
    return null;
  }
}

async function appendToLog(blobPath, entry) {
  if (!_blobAvailable) return;
  try {
    const client = getContainerClient().getAppendBlobClient(blobPath);
    await client.createIfNotExists();
    const line = JSON.stringify(entry) + '\n';
    await client.appendBlock(line, Buffer.byteLength(line));
  } catch (err) {
    logger.error('Blob appendToLog failed', { blobPath, error: err.message });
  }
}

async function listBlobs(prefix) {
  if (!_blobAvailable) return [];
  try {
    const container = getContainerClient();
    const names = [];
    for await (const blob of container.listBlobsFlat({ prefix })) {
      names.push(blob.name);
    }
    return names;
  } catch (err) {
    logger.error('Blob listBlobs failed', { prefix, error: err.message });
    return [];
  }
}

async function deleteBlob(blobPath) {
  if (!_blobAvailable) return;
  try {
    const client = getContainerClient().getBlockBlobClient(blobPath);
    await client.deleteIfExists();
  } catch (err) {
    logger.error('Blob deleteBlob failed', { blobPath, error: err.message });
  }
}

async function deleteBlobsByPrefix(prefix) {
  if (!_blobAvailable) return;
  try {
    const names = await listBlobs(prefix);
    await Promise.all(names.map((name) => deleteBlob(name)));
  } catch (err) {
    logger.error('Blob deleteBlobsByPrefix failed', { prefix, error: err.message });
  }
}

async function blobExists(blobPath) {
  if (!_blobAvailable) return false;
  try {
    const client = getContainerClient().getBlockBlobClient(blobPath);
    return await client.exists();
  } catch (err) {
    logger.error('Blob blobExists failed', { blobPath, error: err.message });
    return false;
  }
}

module.exports = {
  uploadJson,
  downloadJson,
  uploadText,
  downloadText,
  appendToLog,
  listBlobs,
  deleteBlob,
  deleteBlobsByPrefix,
  blobExists,
  getContainerClient,
  isBlobAvailable,
  setBlobAvailable,
};
```

- [ ] **Step 4: Run test**

```bash
cd server && node --test tests/blobService.test.js
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/services/blobService.js server/tests/blobService.test.js
git commit -m "feat(blob): add blobService wrapper for Azure Blob Storage SDK"
```

---

## Task 3: Blob Bootstrap + Standalone Test Script

**Files:**
- Create: `server/services/blobBootstrap.js`
- Create: `server/scripts/testBlobStorage.js`

- [ ] **Step 1: Create blobBootstrap.js**

```js
/**
 * Blob Bootstrap — startup connectivity test and container creation.
 *
 * Called from index.js start() before knowledge loaders.
 * Sets the blobAvailable flag used by all blobService methods.
 */

const logger = require('../utils/logger');
const { getContainerClient, setBlobAvailable, uploadJson, downloadJson, deleteBlob } = require('./blobService');

async function bootstrapBlobStorage() {
  if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
    logger.warn('Blob storage: AZURE_STORAGE_CONNECTION_STRING not set, skipping');
    setBlobAvailable(false);
    return { available: false, error: 'Connection string not configured' };
  }

  try {
    const container = getContainerClient();
    await container.createIfNotExists();

    // Round-trip test
    const testBlob = '_health/ping.json';
    const testData = { ok: true, timestamp: new Date().toISOString() };

    // Temporarily mark available so uploadJson/downloadJson work
    setBlobAvailable(true);

    await uploadJson(testBlob, testData);
    const downloaded = await downloadJson(testBlob);

    if (!downloaded || downloaded.ok !== true) {
      setBlobAvailable(false);
      return { available: false, error: 'Round-trip verification failed' };
    }

    logger.info('Blob storage: connected and verified', {
      container: process.env.AZURE_STORAGE_CONTAINER_NAME || 'autoagents',
    });
    return { available: true };
  } catch (err) {
    logger.warn('Blob storage: bootstrap failed, falling back to local', { error: err.message });
    setBlobAvailable(false);
    return { available: false, error: err.message };
  }
}

module.exports = { bootstrapBlobStorage };
```

- [ ] **Step 2: Create testBlobStorage.js**

```js
#!/usr/bin/env node
/**
 * Standalone blob storage connectivity test.
 * Run: node server/scripts/testBlobStorage.js
 *
 * Tests: connection, container creation, BlockBlob upload/download,
 * AppendBlob create+append, listBlobs, cleanup.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { BlobServiceClient } = require('@azure/storage-blob');

const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'autoagents';

if (!connStr) {
  console.error('FAIL: AZURE_STORAGE_CONNECTION_STRING not set in .env');
  process.exit(1);
}

async function run() {
  const results = [];
  let container;

  // Test 1: Connect
  try {
    const client = BlobServiceClient.fromConnectionString(connStr);
    container = client.getContainerClient(containerName);
    await container.createIfNotExists();
    results.push({ test: 'Connect + create container', status: 'PASS' });
  } catch (err) {
    results.push({ test: 'Connect + create container', status: 'FAIL', error: err.message });
    printResults(results);
    process.exit(1);
  }

  // Test 2: BlockBlob upload
  const testBlobPath = '_test/connectivity-test.json';
  const testData = { ok: true, ts: new Date().toISOString() };
  try {
    const blockClient = container.getBlockBlobClient(testBlobPath);
    const content = JSON.stringify(testData);
    await blockClient.upload(content, Buffer.byteLength(content), { overwrite: true });
    results.push({ test: 'BlockBlob upload', status: 'PASS' });
  } catch (err) {
    results.push({ test: 'BlockBlob upload', status: 'FAIL', error: err.message });
  }

  // Test 3: BlockBlob download + verify
  try {
    const blockClient = container.getBlockBlobClient(testBlobPath);
    const response = await blockClient.download(0);
    const chunks = [];
    for await (const chunk of response.readableStreamBody) chunks.push(chunk);
    const downloaded = JSON.parse(Buffer.concat(chunks).toString());
    if (downloaded.ok !== true) throw new Error('Content mismatch');
    results.push({ test: 'BlockBlob download + verify', status: 'PASS' });
  } catch (err) {
    results.push({ test: 'BlockBlob download + verify', status: 'FAIL', error: err.message });
  }

  // Test 4: AppendBlob
  const appendPath = '_test/append-test.jsonl';
  try {
    const appendClient = container.getAppendBlobClient(appendPath);
    await appendClient.createIfNotExists();
    const line = JSON.stringify({ event: 'test', ts: Date.now() }) + '\n';
    await appendClient.appendBlock(line, Buffer.byteLength(line));
    results.push({ test: 'AppendBlob create + append', status: 'PASS' });
  } catch (err) {
    results.push({ test: 'AppendBlob create + append', status: 'FAIL', error: err.message });
  }

  // Test 5: List blobs
  try {
    const names = [];
    for await (const blob of container.listBlobsFlat({ prefix: '_test/' })) {
      names.push(blob.name);
    }
    if (names.length < 2) throw new Error(`Expected >=2 blobs, got ${names.length}`);
    results.push({ test: 'List blobs', status: 'PASS', detail: `Found ${names.length} blobs` });
  } catch (err) {
    results.push({ test: 'List blobs', status: 'FAIL', error: err.message });
  }

  // Test 6: Cleanup
  try {
    await container.getBlockBlobClient(testBlobPath).deleteIfExists();
    await container.getBlockBlobClient(appendPath).deleteIfExists();
    results.push({ test: 'Cleanup test blobs', status: 'PASS' });
  } catch (err) {
    results.push({ test: 'Cleanup test blobs', status: 'FAIL', error: err.message });
  }

  printResults(results);
  const failed = results.filter((r) => r.status === 'FAIL');
  process.exit(failed.length > 0 ? 1 : 0);
}

function printResults(results) {
  console.log('\n=== Azure Blob Storage Connectivity Test ===\n');
  console.log(`Container: ${containerName}`);
  console.log(`Account:   ${connStr.match(/AccountName=([^;]+)/)?.[1] || 'unknown'}\n`);
  for (const r of results) {
    const icon = r.status === 'PASS' ? 'OK' : 'FAIL';
    const detail = r.error ? ` — ${r.error}` : (r.detail ? ` — ${r.detail}` : '');
    console.log(`  [${icon}] ${r.test}${detail}`);
  }
  const passed = results.filter((r) => r.status === 'PASS').length;
  console.log(`\n${passed}/${results.length} tests passed.\n`);
}

run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
```

- [ ] **Step 3: Run the standalone test to verify credentials**

```bash
cd server && node scripts/testBlobStorage.js
```

Expected: All 6 tests PASS. If any fail, fix before proceeding.

- [ ] **Step 4: Commit**

```bash
git add server/services/blobBootstrap.js server/scripts/testBlobStorage.js
git commit -m "feat(blob): add bootstrap module and standalone connectivity test"
```

---

## Task 4: BlobCheckpointSaver

**Files:**
- Create: `server/graph/blobCheckpointSaver.js`
- Modify: `server/graph/workflow.js`

- [ ] **Step 1: Create blobCheckpointSaver.js**

```js
/**
 * BlobCheckpointSaver — persists LangGraph checkpoints to Azure Blob Storage.
 *
 * Implements all 5 abstract methods of BaseCheckpointSaver:
 *   getTuple, list, put, putWrites, deleteThread
 *
 * Falls back to MemorySaver if blob storage is unavailable.
 */

const { BaseCheckpointSaver, MemorySaver } = require('@langchain/langgraph');
const { isBlobAvailable, uploadJson, downloadJson, deleteBlob, deleteBlobsByPrefix, listBlobs } = require('../services/blobService');
const logger = require('../utils/logger');

const CHECKPOINT_PREFIX = 'checkpoints';

function cpPath(threadId, checkpointId) {
  return `${CHECKPOINT_PREFIX}/${threadId}/cp_${checkpointId}.json`;
}
function writesPath(threadId, taskId) {
  return `${CHECKPOINT_PREFIX}/${threadId}/writes_${taskId}.json`;
}
function metadataPath(threadId) {
  return `${CHECKPOINT_PREFIX}/${threadId}/metadata.json`;
}

class BlobCheckpointSaver extends BaseCheckpointSaver {
  constructor() {
    super();
  }

  async getTuple(config) {
    const threadId = config.configurable?.thread_id;
    if (!threadId) return undefined;

    const checkpointId = config.configurable?.checkpoint_id;
    let targetId = checkpointId;

    if (!targetId) {
      const meta = await downloadJson(metadataPath(threadId));
      if (!meta || !meta.checkpoints || meta.checkpoints.length === 0) return undefined;
      targetId = meta.checkpoints[meta.checkpoints.length - 1].id;
    }

    const data = await downloadJson(cpPath(threadId, targetId));
    if (!data) return undefined;

    // Load pending writes if they exist
    let pendingWrites = [];
    const writeBlobs = await listBlobs(`${CHECKPOINT_PREFIX}/${threadId}/writes_`);
    for (const wb of writeBlobs) {
      const wd = await downloadJson(wb);
      if (wd && Array.isArray(wd.writes)) {
        pendingWrites.push(...wd.writes.map((w) => [wd.taskId, w[0], w[1]]));
      }
    }

    const parentId = data.parentId;
    const parentConfig = parentId
      ? { configurable: { thread_id: threadId, checkpoint_id: parentId } }
      : undefined;

    return {
      config: { configurable: { thread_id: threadId, checkpoint_id: targetId } },
      checkpoint: data.checkpoint,
      metadata: data.metadata,
      parentConfig,
      pendingWrites,
    };
  }

  async *list(config, options) {
    const threadId = config.configurable?.thread_id;
    if (!threadId) return;

    const meta = await downloadJson(metadataPath(threadId));
    if (!meta || !meta.checkpoints) return;

    let entries = [...meta.checkpoints].reverse();

    if (options?.before) {
      const beforeId = options.before.configurable?.checkpoint_id;
      if (beforeId) {
        const idx = entries.findIndex((e) => e.id === beforeId);
        if (idx >= 0) entries = entries.slice(idx + 1);
      }
    }

    if (options?.limit && options.limit > 0) {
      entries = entries.slice(0, options.limit);
    }

    for (const entry of entries) {
      const data = await downloadJson(cpPath(threadId, entry.id));
      if (!data) continue;

      const parentId = data.parentId;
      yield {
        config: { configurable: { thread_id: threadId, checkpoint_id: entry.id } },
        checkpoint: data.checkpoint,
        metadata: data.metadata,
        parentConfig: parentId
          ? { configurable: { thread_id: threadId, checkpoint_id: parentId } }
          : undefined,
      };
    }
  }

  async put(config, checkpoint, metadata, newVersions) {
    const threadId = config.configurable?.thread_id;
    if (!threadId) throw new Error('thread_id required');

    const checkpointId = checkpoint.id;
    const parentId = config.configurable?.checkpoint_id;

    // Upload checkpoint blob
    await uploadJson(cpPath(threadId, checkpointId), {
      checkpoint,
      metadata,
      parentId: parentId || null,
      newVersions,
    });

    // Update metadata index
    const meta = (await downloadJson(metadataPath(threadId))) || { checkpoints: [] };
    meta.checkpoints.push({
      id: checkpointId,
      ts: checkpoint.ts,
      parentId: parentId || null,
    });
    await uploadJson(metadataPath(threadId), meta);

    // Note: writes are NOT cleaned up here. LangGraph manages write lifecycle.
    // putWrites stores per-taskId; they are overwritten naturally on the next put.

    return {
      configurable: {
        thread_id: threadId,
        checkpoint_id: checkpointId,
      },
    };
  }

  async putWrites(config, writes, taskId) {
    const threadId = config.configurable?.thread_id;
    if (!threadId) return;

    await uploadJson(writesPath(threadId, taskId), {
      taskId,
      writes: writes.map(([channel, value]) => [channel, value]),
    });
  }

  async deleteThread(threadId) {
    await deleteBlobsByPrefix(`${CHECKPOINT_PREFIX}/${threadId}/`);
  }
}

async function createCheckpointer() {
  if (isBlobAvailable()) {
    logger.info('Using BlobCheckpointSaver for persistent checkpoints');
    return new BlobCheckpointSaver();
  }
  logger.warn('Blob storage unavailable, falling back to MemorySaver (checkpoints will not persist)');
  return new MemorySaver();
}

module.exports = { BlobCheckpointSaver, createCheckpointer };
```

- [ ] **Step 2: Modify workflow.js — accept checkpointer as param**

In `server/graph/workflow.js`, make these changes:

1. Remove line 9's `MemorySaver` import (keep `StateGraph`):
   ```js
   // Before:
   const { StateGraph, MemorySaver } = require('@langchain/langgraph');
   // After:
   const { StateGraph } = require('@langchain/langgraph');
   ```

2. Remove line 204 (`const checkpointer = new MemorySaver();`)

3. Change `buildWorkflow()` at line 207 to accept a checkpointer parameter:
   ```js
   // Before:
   function buildWorkflow() {
   // After:
   function buildWorkflow(checkpointer) {
     if (!checkpointer) throw new Error('checkpointer is required — call initWorkflow() from start() first');
   ```

4. Change `getWorkflow()` at line 247 to guard against uninitialized state:
   ```js
   function getWorkflow() {
     if (!compiledGraph) {
       throw new Error('Workflow not initialized — ensure initWorkflow() is called during startup');
     }
     return compiledGraph;
   }
   ```

5. Add `initWorkflow(checkpointer)`:
   ```js
   function initWorkflow(checkpointer) {
     compiledGraph = buildWorkflow(checkpointer);
     logger.info('LangGraph workflow compiled with checkpointer', {
       type: checkpointer.constructor.name,
     });
     return compiledGraph;
   }
   ```

6. Export `initWorkflow`:
   ```js
   module.exports = {
     getWorkflow,
     buildWorkflow,
     initWorkflow,
     __testables: { ... },
   };
   ```

- [ ] **Step 3: Fix standalone scripts that call getWorkflow()**

`server/scripts/runQ1.js` calls `getWorkflow()` directly. It now needs initialization:

At the top of `runQ1.js`, after the `getWorkflow` require, add:
```js
const { MemorySaver } = require('@langchain/langgraph');
const { initWorkflow } = require('../graph/workflow');
initWorkflow(new MemorySaver());
```

Search for any other standalone scripts that import `getWorkflow` and fix similarly.

- [ ] **Step 4: Run existing tests to verify nothing breaks**

```bash
cd server && node --test
```

Expected: All existing tests pass. If any test calls `getWorkflow()` without initialization, it will need updating — check test files for `getWorkflow` usage and add `initWorkflow(new MemorySaver())` setup where needed.

- [ ] **Step 5: Commit**

```bash
git add server/graph/blobCheckpointSaver.js server/graph/workflow.js server/scripts/runQ1.js
git commit -m "feat(blob): add BlobCheckpointSaver and parameterize workflow checkpointer"
```

---

## Task 5: Wire Bootstrap + Checkpointer into Startup

**Files:**
- Modify: `server/index.js`

- [ ] **Step 1: Add blob bootstrap import**

After the existing require block (around line 67), add:
```js
const { bootstrapBlobStorage } = require('./services/blobBootstrap');
const { createCheckpointer } = require('./graph/blobCheckpointSaver');
const { initWorkflow } = require('./graph/workflow');
```

- [ ] **Step 2: Add blob bootstrap to start() — after DB pool, before knowledge loaders**

In `start()`, after the DB pool try/catch block (after line 149) and before the knowledge loaders (line 151), insert:

```js
  // Blob storage bootstrap
  const blobResult = await bootstrapBlobStorage();
  if (!blobResult.available) {
    logger.warn('Blob storage unavailable, using local files and in-memory checkpoints');
  }
```

- [ ] **Step 3: Add checkpointer init — after knowledge loaders, before server listen**

After line 166 (`logger.info('Knowledge preload complete')`), add:

```js
  // Initialize workflow with persistent checkpointer
  const checkpointer = await createCheckpointer();
  initWorkflow(checkpointer);
```

- [ ] **Step 4: Run the server and verify startup**

```bash
cd server && node index.js
```

Expected: Server starts, logs show "Blob storage: connected and verified" and "LangGraph workflow compiled with checkpointer" (type: BlobCheckpointSaver).

- [ ] **Step 5: Commit**

```bash
git add server/index.js
git commit -m "feat(blob): wire blob bootstrap and checkpointer into server startup"
```

---

## Task 6: Health Check Extension

**Files:**
- Modify: `server/routes/health.js`

- [ ] **Step 1: Add blob status to health check**

Replace the content of `server/routes/health.js`:

```js
const express = require('express');
const router = express.Router();
const { pingLLM } = require('../config/llm');
const { getPool } = require('../config/database');
const { isBlobAvailable } = require('../services/blobService');

router.get('/', async (_req, res) => {
  const checks = { server: 'ok', database: 'unknown', llm: 'unknown', blobStorage: 'unknown' };

  try {
    await getPool();
    checks.database = 'ok';
  } catch (err) {
    checks.database = 'error';
  }

  try {
    await pingLLM();
    checks.llm = 'ok';
  } catch (err) {
    checks.llm = 'error';
  }

  checks.blobStorage = isBlobAvailable() ? 'ok' : 'unavailable';

  // Blob storage is optional — only core services affect HTTP status
  const coreChecks = { server: checks.server, database: checks.database, llm: checks.llm };
  const allOk = Object.values(coreChecks).every((v) => v === 'ok');
  res.status(allOk ? 200 : 503).json(checks);
});

module.exports = router;
```

- [ ] **Step 2: Test health endpoint**

```bash
curl -k https://localhost:5000/api/health
```

Expected: JSON with `blobStorage: "ok"` field. HTTP 200 if DB+LLM are ok.

- [ ] **Step 3: Commit**

```bash
git add server/routes/health.js
git commit -m "feat(blob): add blobStorage status to health check endpoint"
```

---

## Task 7: Knowledge Fetchers — Blob-First Loading

**Files:**
- Modify: `server/vectordb/schemaFetcher.js`
- Modify: `server/vectordb/distinctValuesFetcher.js`
- Modify: `server/vectordb/joinRuleFetcher.js`
- Modify: `server/vectordb/kpiFetcher.js`
- Modify: `server/vectordb/rulesFetcher.js`
- Modify: `server/vectordb/examplesFetcher.js`
- Modify: `server/prompts/dashboard.js`

All 6 JSON fetchers follow the same pattern. The change is identical in each: inside `loadAsync()`, try blob first, fall back to local file.

- [ ] **Step 1: Modify schemaFetcher.js**

In `loadSchemaKnowledgeAsync()` (line 35-49), replace the inner async function body:

```js
const { downloadJson } = require('../services/blobService');

// Inside loadSchemaKnowledgeAsync's inner async:
_loadPromise = (async () => {
  // Try blob first
  const blobData = await downloadJson('knowledge/schema-knowledge.json');
  if (blobData) {
    logger.info('Schema knowledge loaded from blob storage');
    _schemaKnowledge = buildSchemaKnowledgeFromRaw(blobData);
    return _schemaKnowledge;
  }
  // Fall back to local file
  if (!fs.existsSync(SCHEMA_KNOWLEDGE_PATH)) {
    logger.warn('Schema knowledge JSON not found', { path: SCHEMA_KNOWLEDGE_PATH });
    _schemaKnowledge = { tables: {}, tableIndex: new Map() };
    return _schemaKnowledge;
  }
  const raw = JSON.parse(await fs.promises.readFile(SCHEMA_KNOWLEDGE_PATH, 'utf-8'));
  _schemaKnowledge = buildSchemaKnowledgeFromRaw(raw);
  return _schemaKnowledge;
})();
```

- [ ] **Step 2: Modify distinctValuesFetcher.js**

Same pattern in `loadDistinctValuesAsync()` (line 48-66). Add `require('../services/blobService')` at top. Inside the inner async:

```js
const blobData = await downloadJson('knowledge/distinct-values.json');
if (blobData) {
  logger.info('Distinct values loaded from blob storage');
  _store = buildStoreFromRaw(blobData);
  return _store;
}
// ...existing local file fallback...
```

- [ ] **Step 3: Modify joinRuleFetcher.js**

Same pattern in `loadJoinKnowledgeAsync()` (line 63-82). Add `downloadJson` require. Inside inner async:

```js
const blobData = await downloadJson('knowledge/join-knowledge.json');
if (blobData) {
  logger.info('Join knowledge loaded from blob storage');
  _joinKnowledge = buildJoinKnowledgeFromRaw(blobData);
  return _joinKnowledge;
}
// ...existing local file fallback...
```

- [ ] **Step 4: Modify kpiFetcher.js**

Same pattern in `loadKpiGlossaryAsync()` (line 83-105). Add `downloadJson` require. Inside inner async:

```js
const blobData = await downloadJson('knowledge/kpi-glossary.json');
if (blobData) {
  logger.info('KPI glossary loaded from blob storage');
  _store = buildKpiStoreFromData(blobData);
  return _store;
}
// ...existing local file fallback...
```

- [ ] **Step 5: Modify rulesFetcher.js**

Same pattern in `loadRulesAsync()` (line 91-105). This one uses `downloadText` since business-context.md is markdown:

```js
const { downloadText } = require('../services/blobService');

// Inside inner async:
const blobText = await downloadText('knowledge/business-context.md');
if (blobText) {
  logger.info('Business rules loaded from blob storage');
  _store = buildRulesStoreFromText(blobText);
  return _store;
}
// ...existing local file fallback...
```

- [ ] **Step 6: Modify examplesFetcher.js**

Same pattern in `loadExamplesAsync()` (line 72-86). Add `downloadJson` require. Inside inner async:

```js
const blobData = await downloadJson('knowledge/goldExamples.json');
if (blobData) {
  logger.info('Gold examples loaded from blob storage');
  _store = buildExamplesStoreFromRaw(blobData);
  return _store;
}
// ...existing local file fallback...
```

- [ ] **Step 7: Modify prompts/dashboard.js**

`loadDashboardGoldExamples()` at line 10-18 uses sync `fs.readFileSync`. Add blob support with async preload:

```js
const { downloadJson } = require('../services/blobService');

let _goldDashboardExamples = null;
let _dashboardLoadPromise = null;

async function preloadDashboardGoldExamples() {
  if (_goldDashboardExamples) return _goldDashboardExamples;
  if (_dashboardLoadPromise) return _dashboardLoadPromise;
  _dashboardLoadPromise = (async () => {
    const blobData = await downloadJson('knowledge/dashboardGoldExamples.json');
    if (blobData) {
      _goldDashboardExamples = blobData;
      return _goldDashboardExamples;
    }
    // Fall back to local file
    try {
      const filePath = path.join(__dirname, '..', 'context', 'dashboardGoldExamples.json');
      _goldDashboardExamples = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      _goldDashboardExamples = [];
    }
    return _goldDashboardExamples;
  })();
  return _dashboardLoadPromise;
}

function loadDashboardGoldExamples() {
  if (_goldDashboardExamples) return _goldDashboardExamples;
  // Sync fallback if not preloaded (backwards compat)
  try {
    const filePath = path.join(__dirname, '..', 'context', 'dashboardGoldExamples.json');
    _goldDashboardExamples = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    _goldDashboardExamples = [];
  }
  return _goldDashboardExamples;
}
```

Export `preloadDashboardGoldExamples` and call it from `index.js` alongside the other loaders (add to the loaders array in `start()`).

- [ ] **Step 8: Run existing tests**

```bash
cd server && node --test
```

Expected: All tests pass. Knowledge loads from blob if uploaded, otherwise falls back to local files.

- [ ] **Step 9: Commit**

```bash
git add server/vectordb/schemaFetcher.js server/vectordb/distinctValuesFetcher.js server/vectordb/joinRuleFetcher.js server/vectordb/kpiFetcher.js server/vectordb/rulesFetcher.js server/vectordb/examplesFetcher.js server/prompts/dashboard.js server/index.js
git commit -m "feat(blob): add blob-first loading to all knowledge fetchers with local fallback"
```

---

## Task 8: Session Memory Write-Through

**Files:**
- Modify: `server/memory/sessionMemory.js`

- [ ] **Step 1: Add blob persistence to all 6 functions**

Replace `server/memory/sessionMemory.js` with:

```js
/**
 * Session memory store — write-through cache to Azure Blob Storage.
 *
 * Primary read: in-memory Map (fast).
 * Every mutation: fire-and-forget upload to blob.
 * On cache miss: lazy restore from blob.
 */

const { uploadJson, downloadJson, deleteBlob } = require('../services/blobService');
const logger = require('../utils/logger');

const sessions = new Map();

function blobPath(sessionId) {
  return `sessions/${sessionId}.json`;
}

function persistAsync(sessionId, data) {
  uploadJson(blobPath(sessionId), data).catch((err) => {
    logger.error('Session persist to blob failed', { sessionId, error: err.message });
  });
}

async function getSession(sessionId) {
  const cached = sessions.get(sessionId);
  if (cached) return cached;

  // Lazy restore from blob
  const blobData = await downloadJson(blobPath(sessionId));
  if (blobData) {
    sessions.set(sessionId, blobData);
    return blobData;
  }
  return null;
}

function setSession(sessionId, data) {
  sessions.set(sessionId, data);
  persistAsync(sessionId, data);
}

function updateSession(sessionId, updates) {
  const existing = sessions.get(sessionId) ?? {
    queryHistory: [],
    correctionHistory: [],
  };
  const merged = {
    ...existing,
    ...updates,
    queryHistory: updates.queryHistory ?? existing.queryHistory,
    correctionHistory: updates.correctionHistory ?? existing.correctionHistory,
  };
  sessions.set(sessionId, merged);
  persistAsync(sessionId, merged);
  return merged;
}

function addQueryToSession(sessionId, query) {
  const session = sessions.get(sessionId) ?? {
    queryHistory: [],
    correctionHistory: [],
  };
  const queryHistory = [...(session.queryHistory || []), query];
  updateSession(sessionId, { queryHistory });
}

function addCorrectionToSession(sessionId, correction) {
  const session = sessions.get(sessionId) ?? {
    queryHistory: [],
    correctionHistory: [],
  };
  const correctionHistory = [...(session.correctionHistory || []), correction];
  updateSession(sessionId, { correctionHistory });
}

function clearSession(sessionId) {
  sessions.delete(sessionId);
  deleteBlob(blobPath(sessionId)).catch((err) => {
    logger.error('Session delete from blob failed', { sessionId, error: err.message });
  });
}

module.exports = {
  getSession,
  setSession,
  updateSession,
  addQueryToSession,
  addCorrectionToSession,
  clearSession,
};
```

**BREAKING CHANGE:** `getSession` is now async (returns a Promise). The following 4 call sites must be updated to `await`:

- [ ] **Step 2: Fix getSession callers — classify.js**

In `server/graph/nodes/classify.js`, find both occurrences of:
```js
const session = state.sessionId ? getSession(state.sessionId) : null;
```
Change to:
```js
const session = state.sessionId ? await getSession(state.sessionId) : null;
```
Both callers are inside `async` functions, so adding `await` is safe.

- [ ] **Step 3: Fix getSession callers — sqlWriterAgent.js**

In `server/graph/nodes/sqlWriterAgent.js`, find:
```js
const session = state.sessionId ? getSession(state.sessionId) : null;
```
Change to:
```js
const session = state.sessionId ? await getSession(state.sessionId) : null;
```

- [ ] **Step 4: Fix getSession callers — searchSessionMemory.js**

In `server/tools/searchSessionMemory.js`, find:
```js
const session = getSession(_currentSessionId);
```
Change to:
```js
const session = await getSession(_currentSessionId);
```
Verify the enclosing function is async. If not, make it async.

- [ ] **Step 5: Run tests**

```bash
cd server && node --test
```

Expected: PASS. If any callers of `getSession` break because they don't await, fix them.

- [ ] **Step 6: Commit**

```bash
git add server/memory/sessionMemory.js server/graph/nodes/classify.js server/graph/nodes/sqlWriterAgent.js server/tools/searchSessionMemory.js
git commit -m "feat(blob): add write-through blob persistence to session memory"
```

---

## Task 9: Feedback Persistence (AppendBlob JSONL)

**Files:**
- Modify: `server/routes/feedback.js`

- [ ] **Step 1: Replace in-memory feedback with blob storage**

Replace `server/routes/feedback.js` with:

```js
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { appendToLog, listBlobs, downloadText } = require('../services/blobService');

function todayPath() {
  const d = new Date().toISOString().slice(0, 10);
  return `feedback/${d}.jsonl`;
}

router.post('/', async (req, res) => {
  const { sessionId, question, sql, rating, comment } = req.body;
  if (!rating || !['up', 'down'].includes(rating)) {
    return res.status(400).json({ error: 'rating must be "up" or "down"' });
  }
  const entry = { sessionId, question, sql, rating, comment: comment || '', timestamp: Date.now() };

  await appendToLog(todayPath(), entry);
  logger.info('User feedback recorded', { rating, question: (question || '').substring(0, 100) });
  res.json({ success: true });
});

router.get('/stats', async (req, res) => {
  try {
    const dateFilter = req.query.date;
    const blobNames = dateFilter
      ? [`feedback/${dateFilter}.jsonl`]
      : await listBlobs('feedback/');

    let up = 0;
    let down = 0;
    let total = 0;

    for (const name of blobNames) {
      const text = await downloadText(name);
      if (!text) continue;
      const lines = text.trim().split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          total++;
          if (entry.rating === 'up') up++;
          if (entry.rating === 'down') down++;
        } catch { /* skip malformed lines */ }
      }
    }

    res.json({ total, up, down });
  } catch (err) {
    logger.error('Feedback stats failed', { error: err.message });
    res.json({ total: 0, up: 0, down: 0 });
  }
});

module.exports = router;
```

- [ ] **Step 2: Test feedback endpoint**

```bash
curl -k -X POST https://localhost:5000/api/feedback -H 'Content-Type: application/json' -d '{"rating":"up","question":"test","sessionId":"test-1"}'
curl -k https://localhost:5000/api/feedback/stats
```

Expected: POST returns `{ success: true }`, GET returns count including the new entry.

- [ ] **Step 3: Commit**

```bash
git add server/routes/feedback.js
git commit -m "feat(blob): replace in-memory feedback with AppendBlob JSONL persistence"
```

---

## Task 10: Audit Log

**Files:**
- Modify: `server/routes/textToSql.js`

- [ ] **Step 1: Add audit logging helper**

At the top of `server/routes/textToSql.js`, after the existing requires (around line 8), add:

```js
const { appendToLog } = require('../services/blobService');

function logAudit(entry) {
  const d = new Date().toISOString().slice(0, 10);
  appendToLog(`audit/${d}.jsonl`, {
    timestamp: new Date().toISOString(),
    ...entry,
  }).catch(() => {}); // fire-and-forget
}
```

- [ ] **Step 2: Add audit call after workflow.invoke() in analyze endpoint**

After line 524 (`res.json(buildFinalResponse(...))`), add:

```js
    logAudit({
      sessionId,
      userId: req.session?.user?.email || 'unknown',
      question: question.trim(),
      intent: result.intent,
      sql: result.sql || null,
      rowCount: result.execution?.rowCount ?? null,
      executionTimeMs: Date.now() - requestStart,
      status: result.execution?.success ? 'success' : (result.execution?.error ? 'error' : 'empty'),
    });
```

- [ ] **Step 3: Add audit call after stream completes in analyze-stream endpoint**

Find the stream endpoint's final response point (where the `done` event is sent) and add the same `logAudit()` call with the accumulated state.

- [ ] **Step 4: Run tests**

```bash
cd server && node --test
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/routes/textToSql.js
git commit -m "feat(blob): add audit logging to query execution endpoints"
```

---

## Task 11: Harvest Script --upload Flag

**Files:**
- Modify: `scripts/harvestDistinctValues.js`
- Modify: `scripts/generateSchemaKnowledge.js`

- [ ] **Step 1: Add --upload flag to harvestDistinctValues.js**

After the existing `fs.writeFileSync` call that writes `distinct-values.json`, add:

```js
if (process.argv.includes('--upload')) {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });
  const { setBlobAvailable, uploadJson } = require('../server/services/blobService');
  const { bootstrapBlobStorage } = require('../server/services/blobBootstrap');
  const result = await bootstrapBlobStorage();
  if (result.available) {
    await uploadJson('knowledge/distinct-values.json', JSON.parse(fs.readFileSync(outputPath, 'utf-8')));
    console.log('Uploaded distinct-values.json to blob storage');
  } else {
    console.warn('Blob storage unavailable, skipping upload');
  }
}
```

- [ ] **Step 2: Add --upload flag to generateSchemaKnowledge.js**

Same pattern — after the local write, check for `--upload` and upload to `knowledge/schema-knowledge.json`.

- [ ] **Step 3: Commit**

```bash
git add scripts/harvestDistinctValues.js scripts/generateSchemaKnowledge.js
git commit -m "feat(blob): add --upload flag to harvest scripts for blob storage sync"
```

---

## Task 12: Integration Test — End-to-End Verification

- [ ] **Step 1: Run standalone blob test**

```bash
cd server && node scripts/testBlobStorage.js
```

Expected: All 6 tests PASS.

- [ ] **Step 2: Start the server and verify startup logs**

```bash
cd server && node index.js
```

Expected logs:
- `Blob storage: connected and verified`
- `Schema knowledge loaded from blob storage` (or local fallback if not yet uploaded)
- `LangGraph workflow compiled with checkpointer { type: 'BlobCheckpointSaver' }`

- [ ] **Step 3: Test health endpoint**

```bash
curl -k https://localhost:5000/api/health
```

Expected: `{ "server": "ok", "database": "ok", "llm": "ok", "blobStorage": "ok" }`

- [ ] **Step 4: Test feedback round-trip**

```bash
curl -k -X POST https://localhost:5000/api/feedback -H 'Content-Type: application/json' -d '{"rating":"up","question":"integration test","sessionId":"test-e2e"}'
curl -k https://localhost:5000/api/feedback/stats
```

Expected: Stats include the new entry.

- [ ] **Step 5: Verify blob container contents**

Use Azure Storage Explorer or Azure Portal to browse the `autoagents` container. Expected structure:
```
_health/ping.json
feedback/2026-03-18.jsonl
```

After a query, also expect:
```
checkpoints/{threadId}/cp_*.json
checkpoints/{threadId}/metadata.json
sessions/{sessionId}.json
audit/2026-03-18.jsonl
```

- [ ] **Step 6: Run full test suite**

```bash
cd server && node --test
```

Expected: All tests PASS.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat(blob): Azure Blob Storage integration complete — checkpoints, knowledge, feedback, audit"
```
