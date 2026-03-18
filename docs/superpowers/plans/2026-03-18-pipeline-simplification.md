# Pipeline Simplification Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ReAct research agent + Haiku SQL writer with a two-node pipeline (contextFetch + generateSql single Opus call), merge distinct values into schema-knowledge.json, and simplify routing.

**Architecture:** Two new nodes replace four deleted ones. `contextFetch` assembles context programmatically (one LLM call for table selection). `generateSql` makes a single Opus call with all context injected into the prompt. The `correct` node becomes a lightweight error analyzer that routes to `generateSql` for fixes.

**Tech Stack:** LangGraph StateGraph, ChatAnthropic (Opus via Azure), CommonJS modules, Node 18+

**Spec:** `docs/superpowers/specs/2026-03-18-pipeline-simplification-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `server/graph/nodes/contextFetch.js` | Programmatic context assembly — LLM table selection + parallel keyword searches + fiscal period + schema + joins + distinct values |
| `server/graph/nodes/generateSql.js` | Single Opus LLM call — builds prompt from contextBundle, extracts SQL, post-validates references |
| `server/utils/sqlReferenceValidator.js` | Reusable SQL reference post-validation (fuzzy table resolution, column verification) — extracted from submitResearch.js |
| `server/utils/correctionAnalyzer.js` | Error analysis utilities (suggestColumnsForInvalidName, suggestTablesForInvalidName, error-specific guidance) — extracted from correct.js |

### Modified Files
| File | Change |
|------|--------|
| `server/graph/state.js` | Add `contextBundle` + `correctionGuidance`, remove `researchBrief` + `researchToolCalls` + `agentToolCalls` |
| `server/graph/workflow.js` | Replace nodes, update routing functions, update edges |
| `server/graph/nodes/classify.js` | Remove exact match fast path, emit template/followup/research |
| `server/graph/nodes/correct.js` | Remove LLM call, become error analyzer, write `correctionGuidance` |
| `server/graph/nodes/parallelSubQueryPipeline.js` | Use contextFetch + generateSql instead of research + writer |
| `server/graph/nodes/subQueryMatch.js` | Route to contextFetch instead of sqlWriterAgent/researchAgent |
| `server/graph/nodes/accumulateResult.js` | Replace `researchBrief` refs with `contextBundle` |
| `server/vectordb/distinctValuesFetcher.js` | Read from schema-knowledge.json |
| `server/scripts/harvestDistinctValues.js` | Write into schema-knowledge.json |

### Deleted Files
| File | Reason |
|------|--------|
| `server/graph/nodes/researchAgent.js` | Replaced by contextFetch |
| `server/graph/nodes/sqlWriterAgent.js` | Replaced by generateSql |
| `server/tools/discoverContext.js` | Logic moved to contextFetch |
| `server/tools/submitResearch.js` | Validation moved to sqlReferenceValidator.js |
| `server/tools/submitSql.js` | No more tool-based submission |
| `server/tools/inspectTableColumns.js` | Dropped |
| `server/tools/checkNullRatio.js` | Dropped |
| `server/tools/searchSessionMemory.js` | Dropped |
| `server/tools/queryDistinctValues.js` | Already unused |
| `server/tools/researchTools.js` | No more research tool array |
| `server/tools/sqlTools.js` | No more SQL writer tools |
| `server/prompts/researchAgent.js` | Prompt logic in generateSql |
| `server/prompts/sqlAgent.js` | Prompt logic in generateSql |

---

## Task 1: Merge Distinct Values into Schema Knowledge

**Files:**
- Modify: `server/vectordb/distinctValuesFetcher.js`
- Modify: `server/scripts/harvestDistinctValues.js`
- Modify: `server/context/knowledge/schema-knowledge.json`
- Delete: `server/context/knowledge/distinct-values.json`

This task is independent — no other task depends on the file format, only the API (`getDistinctValues`, `getAvailableColumns`).

- [ ] **Step 1: Write merge script to inject distinct values into schema-knowledge.json**

Create a one-time script `server/scripts/mergeDistinctValues.js`:

```javascript
/**
 * One-time migration: merge distinct-values.json into schema-knowledge.json.
 * Adds distinct_values field to each column that has harvested values.
 * Run: node server/scripts/mergeDistinctValues.js
 */
const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.join(__dirname, '../context/knowledge/schema-knowledge.json');
const DV_PATH = path.join(__dirname, '../context/knowledge/distinct-values.json');

const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
const distinctValues = JSON.parse(fs.readFileSync(DV_PATH, 'utf-8'));

let injected = 0;
for (const [tableName, columns] of Object.entries(distinctValues)) {
  const schemaTable = schema[tableName];
  if (!schemaTable?.columns) continue;
  for (const [colName, values] of Object.entries(columns)) {
    const schemaCol = schemaTable.columns[colName];
    if (!schemaCol) continue;
    if (Array.isArray(values) && values.length > 0) {
      schemaCol.distinct_values = values;
      injected++;
    }
  }
}

fs.writeFileSync(SCHEMA_PATH, JSON.stringify(schema, null, 2), 'utf-8');
console.log(`Injected distinct_values into ${injected} columns in schema-knowledge.json`);
```

- [ ] **Step 2: Run the merge script**

Run: `cd server && node scripts/mergeDistinctValues.js`

Expected: "Injected distinct_values into N columns in schema-knowledge.json"

Verify: Open `server/context/knowledge/schema-knowledge.json`, spot-check a table — columns should now have `distinct_values` arrays where applicable.

- [ ] **Step 3: Update distinctValuesFetcher.js to read from schema-knowledge.json**

In `server/vectordb/distinctValuesFetcher.js`:

Change the `DISTINCT_VALUES_PATH` constant (line 25) and update `buildStoreFromRaw()` to extract `distinct_values` from schema structure:

```javascript
// Old:
const DISTINCT_VALUES_PATH = path.join(__dirname, '../context/knowledge/distinct-values.json');

// New:
const SCHEMA_KNOWLEDGE_PATH = path.join(__dirname, '../context/knowledge/schema-knowledge.json');

// Update loadDistinctValuesAsync():
async function loadDistinctValuesAsync() {
  if (_store) return _store;
  if (_loadPromise) return _loadPromise;
  _loadPromise = (async () => {
    try {
      const raw = JSON.parse(fs.readFileSync(SCHEMA_KNOWLEDGE_PATH, 'utf-8'));
      _store = buildStoreFromSchema(raw);
      return _store;
    } catch (err) {
      logger.warn('Failed to load distinct values from schema-knowledge.json', { error: err.message });
      _store = { tableIndex: new Map(), available: false };
      return _store;
    }
  })();
  return _loadPromise;
}

// New function replacing buildStoreFromRaw():
function buildStoreFromSchema(schema) {
  const tableIndex = new Map();
  for (const [tableName, tableData] of Object.entries(schema)) {
    if (!tableData?.columns) continue;
    const columns = new Map();
    for (const [colName, colData] of Object.entries(tableData.columns)) {
      if (Array.isArray(colData.distinct_values) && colData.distinct_values.length > 0) {
        columns.set(colName.toUpperCase(), colData.distinct_values);
      }
    }
    if (columns.size > 0) {
      tableIndex.set(tableName.toLowerCase(), { originalName: tableName, columns });
    }
  }
  return { tableIndex, available: tableIndex.size > 0 };
}
```

Keep all public API functions (`getDistinctValues`, `getAvailableColumns`, etc.) unchanged — they read from `_store` which has the same shape.

- [ ] **Step 4: Update harvestDistinctValues.js to write into schema-knowledge.json**

In `server/scripts/harvestDistinctValues.js`, change the output logic (around line 101):

```javascript
// Old:
const DV_OUTPUT = path.join(__dirname, '../context/knowledge/distinct-values.json');
fs.writeFileSync(DV_OUTPUT, JSON.stringify(allValues, null, 2));

// New: Read schema, inject distinct_values, write back (atomic)
const SCHEMA_PATH = path.join(__dirname, '../context/knowledge/schema-knowledge.json');
const TMP_PATH = SCHEMA_PATH + '.tmp';

const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf-8'));

// Clear old distinct_values first
for (const tableData of Object.values(schema)) {
  if (!tableData?.columns) continue;
  for (const colData of Object.values(tableData.columns)) {
    delete colData.distinct_values;
  }
}

// Inject new values
for (const [tableName, columns] of Object.entries(allValues)) {
  const schemaTable = schema[tableName];
  if (!schemaTable?.columns) continue;
  for (const [colName, values] of Object.entries(columns)) {
    const schemaCol = schemaTable.columns[colName];
    if (!schemaCol) continue;
    if (Array.isArray(values) && values.length > 0) {
      schemaCol.distinct_values = values;
    }
  }
}

// Atomic write: temp file then rename
fs.writeFileSync(TMP_PATH, JSON.stringify(schema, null, 2), 'utf-8');
fs.renameSync(TMP_PATH, SCHEMA_PATH);
console.log('Distinct values written into schema-knowledge.json');
```

- [ ] **Step 5: Verify the fetcher works with new format**

Run: `cd server && node -e "const f = require('./vectordb/distinctValuesFetcher'); f.loadDistinctValuesAsync().then(s => { console.log('Tables:', s.tableIndex.size); const first = [...s.tableIndex.entries()][0]; console.log('First table:', first[0], 'columns:', first[1].columns.size); })"`

Expected: Tables: N, First table: vw_..., columns: M (non-zero counts)

- [ ] **Step 6: Delete distinct-values.json and merge script**

```bash
cd server && rm context/knowledge/distinct-values.json && rm scripts/mergeDistinctValues.js
```

- [ ] **Step 7: Commit**

```bash
git add server/vectordb/distinctValuesFetcher.js server/scripts/harvestDistinctValues.js server/context/knowledge/schema-knowledge.json server/scripts/mergeDistinctValues.js
git rm server/context/knowledge/distinct-values.json
git commit -m "refactor: merge distinct values into schema-knowledge.json"
```

---

## Task 2: Extract Shared Utilities

**Files:**
- Create: `server/utils/sqlReferenceValidator.js`
- Create: `server/utils/correctionAnalyzer.js`

Extract reusable logic before creating the new nodes. This avoids duplication and makes Task 3-5 cleaner.

- [ ] **Step 1: Create sqlReferenceValidator.js**

Extract from `server/tools/submitResearch.js` (lines 14-69):

```javascript
/**
 * Post-validation of SQL references against schema.
 * Fuzzy-resolves table names, verifies column existence.
 */
const { fuzzyResolveTable, getColumnMetadataForTable } = require('../vectordb/schemaFetcher');
const logger = require('./logger');

function tableNameFromJoinSide(side) {
  if (!side) return null;
  const dot = side.indexOf('.');
  return dot > 0 ? side.substring(0, dot) : side;
}

/**
 * Validate and fix SQL table/column references.
 * - Fuzzy-resolves table names (vw_EBI_P2S → vw_TF_EBI_P2S)
 * - Verifies columns exist in schema
 * - Returns warnings for unresolved references
 * @param {string} sql - The generated SQL
 * @param {object} schemaContext - Schema data from contextBundle
 * @returns {{ sql: string, warnings: string[] }}
 */
function validateSqlReferences(sql, schemaContext) {
  const warnings = [];
  if (!sql || !schemaContext) return { sql: sql || '', warnings };

  // Extract table names from SQL
  const tablePattern = /\b(?:FROM|JOIN)\s+(\[?[\w.]+\]?)/gi;
  let match;
  const replacements = [];

  while ((match = tablePattern.exec(sql)) !== null) {
    const rawName = match[1].replace(/^\[|]$/g, '').trim();
    const resolved = fuzzyResolveTable(rawName);
    if (resolved && resolved.resolvedName !== rawName) {
      replacements.push({ from: rawName, to: resolved.resolvedName });
      warnings.push(`Table "${rawName}" resolved to "${resolved.resolvedName}"`);
    } else if (!resolved) {
      warnings.push(`Table "${rawName}" not found in schema`);
    }
  }

  let fixedSql = sql;
  for (const { from, to } of replacements) {
    fixedSql = fixedSql.replace(new RegExp(`\\b${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), to);
  }

  if (warnings.length > 0) {
    logger.info('[validateSqlReferences]', { warnings });
  }

  return { sql: fixedSql, warnings };
}

module.exports = { validateSqlReferences, tableNameFromJoinSide };
```

- [ ] **Step 2: Create correctionAnalyzer.js**

Extract from `server/graph/nodes/correct.js` (lines 15-126, 288-362):

```javascript
/**
 * Error analysis utilities for SQL correction.
 * Generates error-specific guidance without making LLM calls.
 */
const { fuzzyResolveTable, getAllTableNames, getColumnMetadataForTable } = require('../vectordb/schemaFetcher');

function extractTableNames(sql) {
  const cteNames = extractCteNames(sql);
  const pattern = /\b(?:FROM|JOIN)\s+(\[?[\w.]+\]?)/gi;
  const names = new Set();
  let m;
  while ((m = pattern.exec(sql)) !== null) {
    const raw = m[1].replace(/^\[|]$/g, '').trim();
    const normalized = raw.toLowerCase();
    if (raw && !/^[\d]/.test(raw)
      && !['SELECT', 'WHERE', 'ON', 'SET'].includes(raw.toUpperCase())
      && !cteNames.has(normalized)) {
      names.add(raw);
    }
  }
  return [...names];
}

function extractCteNames(sql) {
  const names = new Set();
  const ctePattern = /(?:\bWITH\b|,)\s*([A-Za-z_][\w]*)\s+AS\s*\(/gi;
  let m;
  while ((m = ctePattern.exec(sql)) !== null) {
    names.add(m[1].toLowerCase());
  }
  return names;
}

function suggestColumnsForInvalidName(badCol, tableNames, maxSuggestions = 2) {
  if (!badCol || !tableNames?.length) return [];
  const badLower = badCol.toLowerCase();
  const candidates = [];
  for (const tableName of tableNames) {
    const resolved = fuzzyResolveTable(tableName);
    if (!resolved?.entry?.columns) continue;
    for (const col of Object.keys(resolved.entry.columns)) {
      const colLower = col.toLowerCase();
      if (colLower === badLower) continue;
      if (colLower.includes(badLower)) {
        candidates.push({ column: col, table: resolved.resolvedName, score: colLower.length });
      } else if (badLower.includes(colLower) && colLower.length > 1) {
        candidates.push({ column: col, table: resolved.resolvedName, score: colLower.length });
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const seen = new Set();
  return candidates
    .filter((c) => { const key = `${c.table}.${c.column}`; if (seen.has(key)) return false; seen.add(key); return true; })
    .slice(0, maxSuggestions)
    .map((c) => `${c.column} (from ${c.table})`);
}

function stripTablePrefix(name) {
  return name.toLowerCase()
    .replace(/^vw_tf_/i, '').replace(/^vw_td_/i, '')
    .replace(/^tf_/i, '').replace(/^td_/i, '').replace(/^vw_/i, '');
}

function suggestTablesForInvalidName(badTable, maxSuggestions = 3) {
  if (!badTable) return [];
  const allNames = getAllTableNames();
  const badStripped = stripTablePrefix(badTable);
  const badTokens = badStripped.split('_').filter((t) => t.length > 2);
  const candidates = [];
  for (const realTable of allNames) {
    const realStripped = stripTablePrefix(realTable);
    if (realStripped === badStripped) { candidates.push({ table: realTable, score: 100 }); continue; }
    if (realStripped.includes(badStripped) || badStripped.includes(realStripped)) {
      const shorter = Math.min(realStripped.length, badStripped.length);
      if (shorter >= 4) { candidates.push({ table: realTable, score: 50 + shorter }); continue; }
    }
    const realTokens = realStripped.split('_').filter((t) => t.length > 2);
    const overlap = badTokens.filter((t) => realTokens.some((rt) => rt.includes(t) || t.includes(rt)));
    if (overlap.length > 0) candidates.push({ table: realTable, score: overlap.length * 10 + overlap.join('').length });
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, maxSuggestions).map((c) => c.table);
}

/**
 * Analyze validation errors and build correction guidance string.
 * No LLM call — pure error analysis with schema lookups.
 * @param {object} params
 * @param {string} params.sql - The failed SQL
 * @param {string} params.errorType - SYNTAX_ERROR | SCHEMA_ERROR | EXECUTION_ERROR | SEMANTIC_ERROR
 * @param {object} params.validationReport - Validation report with passes/issues
 * @param {object} params.contextBundle - Context bundle from contextFetch
 * @param {Array} params.trace - Prior trace entries for attempt tracking
 * @returns {string} Formatted correction guidance
 */
function buildCorrectionGuidance({ sql, errorType, validationReport, contextBundle, trace }) {
  const issues = formatIssues(validationReport?.passes);
  const issueText = issues.join(' ');
  const tableNames = extractTableNames(sql || '');
  let guidance = '';

  // Column suggestion
  const invalidColMatch = issueText.match(/Invalid column name '(\w+)'/i);
  if (invalidColMatch) {
    const badCol = invalidColMatch[1];
    guidance += `\nCRITICAL: The column "${badCol}" does NOT exist. Replace it with an actual column from the COLUMN METADATA section.`;
    const searchTables = [...tableNames, ...(contextBundle?.tableNames || [])];
    const suggestions = suggestColumnsForInvalidName(badCol, searchTables, 3);
    if (suggestions.length > 0) guidance += `\nSuggested replacement(s): ${suggestions.join('; ')}.`;
  }

  // Syntax error
  if (/Incorrect syntax near|syntax\s*error|unbalanced\s*paren|near\s*'\)'/i.test(issueText)) {
    guidance += `\nCRITICAL — SQL SYNTAX ERROR. Check: balanced parentheses, commas in SELECT/GROUP BY/ORDER BY, no trailing commas before closing parens.`;
  }

  // Type conversion
  const typeMatch = issueText.match(/Conversion failed when converting (?:the )?(\w+) value '([^']+)' to data type (\w+)/i);
  if (typeMatch) {
    const [, sourceType, sampleValue, targetType] = typeMatch;
    guidance += `\nCRITICAL — TYPE CONVERSION ERROR: Column has mixed types (e.g., '${sampleValue}'). Replace ALL CAST(col AS ${targetType}) with TRY_CAST. Replace ALL CONVERT(${targetType}, col) with TRY_CONVERT. For WHERE, add TRY_CAST(col AS ${targetType}) IS NOT NULL.`;
  }

  // Invalid object (table)
  const invalidObjMatch = issueText.match(/Invalid object name '([^']+)'/i);
  if (invalidObjMatch) {
    const badTable = invalidObjMatch[1];
    const suggested = suggestTablesForInvalidName(badTable, 3);
    guidance += `\nCRITICAL: Table "${badTable}" does NOT exist.`;
    if (suggested.length > 0) {
      guidance += ` Suggested replacement(s): ${suggested.join(', ')}.`;
      // Attach column metadata for suggested tables
      for (const t of suggested) {
        const meta = getColumnMetadataForTable(t);
        if (meta) guidance += `\n-- ${t}:\n${meta}`;
      }
    }
  }

  // Prior attempts
  const priorCorrections = (trace || []).filter((t) => t.node === 'correct' || (t.node === 'execute' && t.error));
  if (priorCorrections.length > 0) {
    guidance += '\n\nPRIOR CORRECTION ATTEMPTS (do NOT repeat):';
    for (const t of priorCorrections) {
      if (t.node === 'execute' && t.error) guidance += `\n- Execution failed: ${t.error}`;
      else if (t.node === 'correct') guidance += `\n- Correction attempt ${t.attempt || '?'}: fixed ${t.errorType || 'unknown'}`;
    }
  }

  return guidance;
}

function formatIssues(passes) {
  if (!passes) return [];
  return Object.values(passes)
    .flatMap((p) => p.issues)
    .filter(Boolean)
    .map((issue) => {
      if (typeof issue === 'string') return issue;
      const desc = issue.description || JSON.stringify(issue);
      return issue.suggested_fix ? `${desc} (Hint: ${issue.suggested_fix})` : desc;
    });
}

module.exports = {
  buildCorrectionGuidance,
  extractTableNames,
  suggestColumnsForInvalidName,
  suggestTablesForInvalidName,
  formatIssues,
};
```

- [ ] **Step 3: Commit**

```bash
git add server/utils/sqlReferenceValidator.js server/utils/correctionAnalyzer.js
git commit -m "refactor: extract sqlReferenceValidator and correctionAnalyzer utilities"
```

---

## Task 3: Update State Channels

**Files:**
- Modify: `server/graph/state.js`

- [ ] **Step 1: Add new channels, remove old ones**

In `server/graph/state.js`:

Add after existing annotations:
```javascript
contextBundle: Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
correctionGuidance: Annotation({ reducer: (a, b) => b ?? a, default: () => null }),
```

Remove these lines:
```javascript
// DELETE: researchBrief (line 53)
// DELETE: researchToolCalls (line 54)
// DELETE: agentToolCalls (line 59)
```

- [ ] **Step 2: Commit**

```bash
git add server/graph/state.js
git commit -m "refactor: add contextBundle + correctionGuidance channels, remove researchBrief"
```

---

## Task 4: Create contextFetch Node

**Files:**
- Create: `server/graph/nodes/contextFetch.js`

- [ ] **Step 1: Create contextFetch.js**

```javascript
/**
 * Context Fetch Node — programmatic context assembly.
 *
 * Runs parallel fetches: LLM table selection, keyword searches
 * (examples, rules, KPIs), fiscal period, join rules, column metadata.
 * Returns raw contextBundle for generateSql.
 */
const { selectTablesAndColumnsByLLM } = require('../../vectordb/llmSchemaSelector');
const { getSchemaByTableNames, getColumnMetadataForTable } = require('../../vectordb/schemaFetcher');
const { searchExamples } = require('../../vectordb/examplesFetcher');
const { searchRules } = require('../../vectordb/rulesFetcher');
const { searchKpis } = require('../../vectordb/kpiFetcher');
const { getJoinRulesForTables } = require('../../vectordb/joinRuleFetcher');
const { fetchFiscalPeriod } = require('../../vectordb/fiscalPeriodFetcher');
const logger = require('../../utils/logger');

const MAX_COLUMN_METADATA_TABLES = 12;

function buildEnrichedQuery(query, entities) {
  if (!entities) return query;
  const terms = [
    ...(entities.metrics || []),
    ...(entities.dimensions || []),
    ...(entities.filters || []),
    ...(entities.operations || []),
  ];
  if (terms.length === 0) return query;
  return `${query} ${terms.join(' ')} ${terms.join(' ')}`;
}

function getCurrentQuestion(state) {
  const plan = state.queryPlan || [];
  const idx = state.currentQueryIndex || 0;
  if (plan.length > 1 && plan[idx]?.subQuestion) {
    return plan[idx].subQuestion;
  }
  return state.question;
}

async function contextFetchNode(state) {
  const start = Date.now();
  const question = getCurrentQuestion(state);
  const entities = state.entities;
  const enrichedQuery = buildEnrichedQuery(question, entities);

  // Parallel: LLM table selection + keyword searches + fiscal period
  const [tableSelection, examples, rules, kpis, fiscalPeriod] = await Promise.all([
    selectTablesAndColumnsByLLM(question, entities || null),
    searchExamples(enrichedQuery, 5),
    searchRules(enrichedQuery, 8),
    searchKpis(enrichedQuery, 5),
    fetchFiscalPeriod(),
  ]);

  const { tableNames } = tableSelection;

  // Sequential: depends on selected tables
  const joinRules = getJoinRulesForTables(tableNames);
  const schema = getSchemaByTableNames(tableNames);
  const columnMetadata = {};
  for (const t of tableNames.slice(0, MAX_COLUMN_METADATA_TABLES)) {
    const meta = getColumnMetadataForTable(t);
    if (meta) columnMetadata[t] = meta;
  }

  const duration = Date.now() - start;
  logger.info(`[contextFetch] Done (${duration}ms) — ${tableNames.length} tables selected`, {
    tableNames,
    exampleCount: examples.length,
    ruleCount: rules.length,
    kpiCount: kpis.length,
  });

  return {
    contextBundle: {
      tableNames,
      schema,
      columnMetadata,
      joinRules,
      examples,
      rules,
      kpis,
      fiscalPeriod,
    },
    trace: [{
      node: 'contextFetch',
      timestamp: Date.now(),
      duration,
      tableCount: tableNames.length,
    }],
  };
}

module.exports = { contextFetchNode, getCurrentQuestion, buildEnrichedQuery };
```

- [ ] **Step 2: Commit**

```bash
git add server/graph/nodes/contextFetch.js
git commit -m "feat: add contextFetch node — programmatic context assembly"
```

---

## Task 5: Create generateSql Node

**Files:**
- Create: `server/graph/nodes/generateSql.js`

This is the largest new file. It builds the system prompt from contextBundle + route-specific context, makes a single Opus call, and post-validates.

- [ ] **Step 1: Create generateSql.js**

```javascript
/**
 * Generate SQL Node — single Opus LLM call, no tools.
 *
 * Receives contextBundle from contextFetch + route-specific context
 * (template SQL, conversation history, correction guidance).
 * Outputs SQL + reasoning.
 */
const { getModel, getModelMeta } = require('../../config/llm');
const { validateSqlReferences } = require('../../utils/sqlReferenceValidator');
const { formatConversationContext } = require('../../utils/conversationContext');
const { ERROR_STRATEGIES } = require('../../prompts/correct');
const logger = require('../../utils/logger');

const GENERATE_SQL_TIMEOUT_MS = 60_000;
const GENERATE_SQL_TIMEOUT_COMPLEX_MS = 120_000;
const GENERATE_SQL_MAX_TOKENS = 4096;

function getCurrentQuestion(state) {
  const plan = state.queryPlan || [];
  const idx = state.currentQueryIndex || 0;
  if (plan.length > 1 && plan[idx]?.subQuestion) return plan[idx].subQuestion;
  return state.question;
}

// ── Prompt Building ──────────────────────────────────────────────

function formatSchema(schema) {
  if (!schema?.length) return '';
  return schema.map((t) => {
    let entry = `**${t.table_name}**`;
    if (t.description) entry += ` — ${t.description}`;
    if (t.important_columns) entry += `\n  Key columns: ${t.important_columns}`;
    return entry;
  }).join('\n');
}

function formatColumnMetadata(columnMetadata) {
  if (!columnMetadata || Object.keys(columnMetadata).length === 0) return '';
  return Object.entries(columnMetadata)
    .map(([table, meta]) => `-- ${table}:\n${meta}`)
    .join('\n\n');
}

function formatJoinRules(joinRules) {
  if (!joinRules?.length) return '';
  return joinRules.map((j) => {
    if (j.text) return `- ${j.text}`;
    return `- ${j.left_table}.${j.left_column} ${j.join_type || 'JOIN'} ${j.right_table}.${j.right_column}`;
  }).join('\n');
}

function formatRules(rules) {
  if (!rules?.length) return '';
  return rules.map((r) => `- [${r.category || 'general'}] ${r.text || r}`).join('\n');
}

function formatExamples(examples) {
  if (!examples?.length) return '';
  return examples.map((e) => {
    let entry = `Q: "${e.question}"`;
    if (e.sql) entry += `\nSQL: ${e.sql}`;
    return entry;
  }).join('\n\n');
}

function formatKpis(kpis) {
  if (!kpis?.length) return '';
  return kpis.map((k) => `- **${k.name || k.kpi}**: ${k.definition || k.formula || k.text || ''}`).join('\n');
}

function formatEntities(entities) {
  if (!entities) return '';
  const parts = [];
  if (entities.metrics?.length) parts.push(`Metrics (MUST be in SELECT): ${entities.metrics.join(', ')}`);
  if (entities.dimensions?.length) parts.push(`Dimensions (MUST be in GROUP BY): ${entities.dimensions.join(', ')}`);
  if (entities.filters?.length) parts.push(`Filters (MUST be in WHERE/HAVING): ${entities.filters.join(', ')}`);
  if (entities.operations?.length) parts.push(`Operations (MUST be reflected): ${entities.operations.join(', ')}`);
  return parts.join('\n');
}

function formatMultiQueryContext(state) {
  const plan = state.queryPlan || [];
  const idx = state.currentQueryIndex || 0;
  if (plan.length <= 1) return '';

  let text = `\n=== MULTI-QUERY CONTEXT (Sub-query ${idx + 1}/${plan.length}) ===\n`;
  text += `You are writing SQL for: "${plan[idx]?.subQuestion || state.question}"\n`;
  if (plan[idx]?.purpose) text += `Purpose: ${plan[idx].purpose}\n`;

  const priorQueries = state.queries || [];
  if (priorQueries.length > 0) {
    for (const q of priorQueries) {
      text += `\nPrior Sub-Query: "${q.subQuestion || q.id}"`;
      if (q.sql) text += `\n  SQL: ${q.sql.substring(0, 300)}...`;
      if (q.execution?.rowCount != null) text += `\n  Result: ${q.execution.rowCount} rows`;
    }
    text += '\nMaintain consistency with prior queries where applicable.\n';
  }
  return text;
}

function buildSystemPrompt(params) {
  const { contextBundle, matchType, templateSql, conversationHistory,
    entities, correctionGuidance, priorSql, validationReport } = params;

  const sections = [];

  sections.push('You are a precise T-SQL writer for Microsoft SQL Server.');

  // Schema
  if (contextBundle?.schema?.length) {
    sections.push(`=== SCHEMA ===\n${formatSchema(contextBundle.schema)}`);
  }

  // Column metadata
  if (contextBundle?.columnMetadata) {
    const colMeta = formatColumnMetadata(contextBundle.columnMetadata);
    if (colMeta) {
      sections.push(`=== COLUMN METADATA (use ONLY these column names — anything else causes "Invalid column name") ===\n${colMeta}`);
    }
  }

  // Join rules
  if (contextBundle?.joinRules?.length) {
    sections.push(`=== JOIN PATHS ===\n${formatJoinRules(contextBundle.joinRules)}`);
  }

  // Business rules
  if (contextBundle?.rules?.length) {
    sections.push(`=== BUSINESS RULES ===\n${formatRules(contextBundle.rules)}`);
  }

  // Examples
  if (contextBundle?.examples?.length) {
    sections.push(`=== EXAMPLE SQL PATTERNS ===\n${formatExamples(contextBundle.examples)}`);
  }

  // KPIs
  if (contextBundle?.kpis?.length) {
    sections.push(`=== KPI DEFINITIONS ===\n${formatKpis(contextBundle.kpis)}`);
  }

  // Fiscal period
  if (contextBundle?.fiscalPeriod) {
    const fp = contextBundle.fiscalPeriod;
    sections.push(`=== CURRENT FISCAL PERIOD ===\nFiscal Year: ${fp.fiscalYear || fp}\nFiscal Quarter: ${fp.fiscalQuarter || ''}\nFiscal Month: ${fp.fiscalMonth || ''}`);
  }

  // Entities
  if (entities) {
    const entityText = formatEntities(entities);
    if (entityText) sections.push(`=== DETECTED ENTITIES ===\nYou MUST incorporate ALL of these:\n${entityText}`);
  }

  // Route-specific context
  if (matchType === 'template' && templateSql) {
    sections.push(`=== REFERENCE TEMPLATE SQL ===\n${templateSql}\n\nAdapt this SQL to match the user's specific request. Use its tables, joins, and column names as a starting point.`);
  } else if (matchType === 'followup' && conversationHistory?.length) {
    const historyText = formatConversationContext(conversationHistory, 5);
    if (historyText) {
      sections.push(`=== CONVERSATION HISTORY ===\n${historyText}\n\nUse prior queries as context. Build a fresh query for the current request.`);
    }
  }

  // Correction section (populated by correct node on retries)
  if (correctionGuidance && priorSql) {
    const errorType = validationReport?.errorType || 'UNKNOWN';
    const strategy = ERROR_STRATEGIES[errorType] || ERROR_STRATEGIES.SYNTAX_ERROR || '';
    const issues = validationReport?.passes
      ? Object.values(validationReport.passes).flatMap((p) => p.issues || []).filter(Boolean)
      : [];
    const issueText = issues.map((i) => `- ${typeof i === 'string' ? i : i.description || JSON.stringify(i)}`).join('\n');

    sections.push(`=== PREVIOUS SQL (failed — fix this) ===\n${priorSql}`);
    sections.push(`=== VALIDATION ERRORS ===\nError type: ${errorType}\nStrategy: ${strategy}\n${issueText || '- Unknown error'}`);
    sections.push(`=== ERROR-SPECIFIC GUIDANCE ===\n${correctionGuidance}`);
  }

  // Mandatory rules
  sections.push(`=== MANDATORY SQL RULES ===
- Use table aliases for every column reference (e.g., p.OPPTY not OPPTY)
- Use NULLIF() for all division operations
- No SQL comments (-- or /* */)
- Do NOT use SUSER_SNAME(), FLM_LDAP, or session-based user filters — RLS is auto-injected
- DIMENSION LABELS: JOIN vw_EBI_CALDATE for human-readable FISCAL_YR_AND_QTR_DESC (format "YYYY-QN") instead of numeric IDs
- Default: TOP 100 unless user specifies different limit
- Do NOT remove or modify any REGION_ID / FLM_ID subquery filters — those are security filters

Return your response as:
SQL:
\`\`\`sql
<your query here>
\`\`\`

REASONING:
<your chain-of-thought explanation>`);

  return sections.join('\n\n');
}

// ── Response Parsing ─────────────────────────────────────────────

function parseResponse(response) {
  const content = response?.content || '';

  // Extract SQL from ```sql fence
  const sqlMatch = content.match(/```sql\s*\n?([\s\S]*?)```/i);
  const sql = sqlMatch ? sqlMatch[1].trim() : '';

  // Extract reasoning
  const reasoningMatch = content.match(/REASONING:\s*\n?([\s\S]*?)$/i);
  const reasoning = reasoningMatch ? reasoningMatch[1].trim() : '';

  // Fallback: if no fence, try to extract bare SQL
  if (!sql) {
    const bareMatch = content.match(/\b(WITH|SELECT)\b[\s\S]+/i);
    if (bareMatch) return { sql: bareMatch[0].trim(), reasoning };
  }

  return { sql, reasoning };
}

// ── Main Node ────────────────────────────────────────────────────

async function generateSqlNode(state) {
  const start = Date.now();
  const question = getCurrentQuestion(state);
  const isComplex = state.complexity === 'COMPLEX';
  const timeout = isComplex ? GENERATE_SQL_TIMEOUT_COMPLEX_MS : GENERATE_SQL_TIMEOUT_MS;

  const multiQueryContext = formatMultiQueryContext(state);
  const systemPrompt = buildSystemPrompt({
    contextBundle: state.contextBundle,
    matchType: state.matchType,
    templateSql: state.templateSql,
    conversationHistory: state.conversationHistory,
    entities: state.entities,
    correctionGuidance: state.correctionGuidance,
    priorSql: state.sql,
    validationReport: state.validationReport,
  }) + multiQueryContext;

  const model = getModel({
    temperature: 0,
    maxTokens: GENERATE_SQL_MAX_TOKENS,
    nodeKey: 'generateSql',
    timeout,
  });
  const modelMeta = getModelMeta(model);

  const plan = state.queryPlan || [];
  const idx = state.currentQueryIndex || 0;
  const isMultiQuery = plan.length > 1;
  const multiLabel = isMultiQuery ? ` [Query ${idx + 1}/${plan.length}]` : '';

  logger.info(`[generateSql]${multiLabel} Starting — matchType=${state.matchType || 'research'}, correction=${!!state.correctionGuidance}`, {
    questionLength: question.length,
    contextTables: state.contextBundle?.tableNames?.length || 0,
    model: modelMeta?.modelName || 'unknown',
  });

  const llmStart = Date.now();
  const response = await model.invoke([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: question },
  ]);
  const llmMs = Date.now() - llmStart;

  const { sql, reasoning } = parseResponse(response);

  // Post-validate SQL references
  const { sql: validatedSql, warnings } = validateSqlReferences(sql, state.contextBundle?.schema);

  const duration = Date.now() - start;
  logger.info(`[generateSql]${multiLabel} Done (${duration}ms, llm=${llmMs}ms) — SQL ${validatedSql ? 'produced' : 'empty'}`, {
    sqlLength: (validatedSql || '').length,
    warnings: warnings.length,
  });

  return {
    sql: validatedSql || '',
    reasoning,
    correctionGuidance: null,  // Clear after use
    trace: [{
      node: 'generateSql',
      timestamp: Date.now(),
      duration,
      llmMs,
      llm: modelMeta,
      matchType: state.matchType || 'research',
      isCorrection: !!state.correctionGuidance,
    }],
  };
}

module.exports = { generateSqlNode, buildSystemPrompt, parseResponse };
```

- [ ] **Step 2: Verify generateSql uses Opus by default**

Check `server/config/llm.js` — `generateSql` is NOT in `FAST_NODE_KEYS` or `SONNET_NODE_KEYS`, so `resolveProfileName({ nodeKey: 'generateSql' })` returns `'opus'`. Correct.

- [ ] **Step 3: Commit**

```bash
git add server/graph/nodes/generateSql.js
git commit -m "feat: add generateSql node — single Opus call for SQL generation"
```

---

## Task 6: Update correct.js — Remove LLM, Become Error Analyzer

**Files:**
- Modify: `server/graph/nodes/correct.js`

- [ ] **Step 1: Rewrite correct.js as lightweight error analyzer**

Replace the entire file content. The node no longer makes an LLM call — it analyzes the error and writes `correctionGuidance` for `generateSql` to consume.

```javascript
/**
 * Correct Node — lightweight error analyzer (no LLM call).
 *
 * Analyzes validation/execution errors, builds error-specific guidance,
 * and routes to generateSql for the actual fix.
 */
const { buildCorrectionGuidance, extractTableNames } = require('../../utils/correctionAnalyzer');
const { getColumnMetadataForTable } = require('../../vectordb/schemaFetcher');
const { ERROR_STRATEGIES } = require('../../prompts/correct');
const logger = require('../../utils/logger');

async function correctNode(state) {
  const start = Date.now();

  const errorType = state.errorType || 'SYNTAX_ERROR';
  const strategy = ERROR_STRATEGIES[errorType] || ERROR_STRATEGIES.SYNTAX_ERROR;
  const previousCorrectionAttempts = state.attempts?.correction || 0;

  const plan = state.queryPlan || [];
  const qIdx = state.currentQueryIndex || 0;
  const multiLabel = plan.length > 1 ? ` [Query ${qIdx + 1}/${plan.length}]` : '';

  logger.info(`[Correct]${multiLabel} Analyzing ${errorType}, attempt ${previousCorrectionAttempts + 1}`, {
    errorType,
    attempt: previousCorrectionAttempts + 1,
    sqlLength: (state.sql || '').length,
  });

  // Build error-specific guidance (no LLM call)
  const correctionGuidance = buildCorrectionGuidance({
    sql: state.sql,
    errorType,
    validationReport: state.validationReport,
    contextBundle: state.contextBundle,
    trace: state.trace,
  });

  // Build supplemental column metadata for tables in the failed SQL
  // that might not be in contextBundle
  const tableNames = extractTableNames(state.sql || '');
  const existingTables = new Set((state.contextBundle?.tableNames || []).map((t) => t.toLowerCase()));
  const extraMeta = {};
  for (const t of tableNames) {
    if (!existingTables.has(t.toLowerCase())) {
      const meta = getColumnMetadataForTable(t);
      if (meta) extraMeta[t] = meta;
    }
  }

  // Merge extra column metadata into contextBundle if any
  let contextBundle = state.contextBundle;
  if (Object.keys(extraMeta).length > 0 && contextBundle) {
    contextBundle = {
      ...contextBundle,
      columnMetadata: { ...contextBundle.columnMetadata, ...extraMeta },
    };
  }

  const attempts = { ...(state.attempts || { agent: 0, correction: 0, reflection: 0, resultCheck: 0 }) };
  attempts.correction += 1;

  const duration = Date.now() - start;
  logger.info(`[Correct]${multiLabel} Analysis done (${duration}ms), routing to generateSql`, {
    errorType,
    attempt: attempts.correction,
    guidanceLength: correctionGuidance.length,
  });

  return {
    correctionGuidance,
    contextBundle,  // Potentially enriched with extra column metadata
    attempts,
    trace: [{
      node: 'correct',
      timestamp: Date.now(),
      duration,
      errorType,
      attempt: attempts.correction,
    }],
  };
}

module.exports = { correctNode };
```

- [ ] **Step 2: Commit**

```bash
git add server/graph/nodes/correct.js
git commit -m "refactor: correct node becomes error analyzer (no LLM), routes to generateSql"
```

---

## Task 7: Update classify.js — Remove Exact Match, Simplify Routing

**Files:**
- Modify: `server/graph/nodes/classify.js`

- [ ] **Step 1: Change exact match to template match**

In `server/graph/nodes/classify.js`, find the exact match handling (around lines 374-396). Change it from returning `matchType: 'exact'` to `matchType: 'template'`:

```javascript
// Old (around line 388):
matchType: 'exact',

// New:
matchType: 'template',
```

This applies to the programmatic `findExactMatch()` result. The function stays — it still finds matching gold examples — but the result is now treated as a template for Opus to adapt rather than a direct SQL return.

- [ ] **Step 2: Change partial match to template match**

Find where `matchType: 'partial'` is set (around line 491). Change to:

```javascript
// Old:
matchType: 'partial',

// New:
matchType: 'template',
```

- [ ] **Step 3: Remove researchBrief from classify output**

Find where `researchBrief` is set in the follow-up path (around line 601). Remove it — the follow-up route no longer sets a researchBrief.

```javascript
// DELETE this line (around line 601):
researchBrief: priorResearchBrief || null,
```

- [ ] **Step 4: Commit**

```bash
git add server/graph/nodes/classify.js
git commit -m "refactor: classify emits 'template' matchType instead of 'exact'/'partial'"
```

---

## Task 8: Update workflow.js — Wire New Nodes

**Files:**
- Modify: `server/graph/workflow.js`

This is the critical wiring step. Replace old nodes with new ones and update all routing.

- [ ] **Step 1: Update imports**

```javascript
// Remove:
const { researchAgentNode } = require('./nodes/researchAgent');
const { sqlWriterAgentNode } = require('./nodes/sqlWriterAgent');

// Add:
const { contextFetchNode } = require('./nodes/contextFetch');
const { generateSqlNode } = require('./nodes/generateSql');
```

- [ ] **Step 2: Rewrite routeAfterClassify**

```javascript
function routeAfterClassify(state) {
  if (state.matchType === 'dashboard_refine') {
    logger.info('Fast path: dashboard refinement, routing to dashboardAgent');
    return 'dashboardAgent';
  }
  if (state.intent === 'DASHBOARD') {
    if (state.dashboardHasDataRequest) {
      if (state.needsDecomposition) {
        logger.info('Dashboard path B: multi-query, routing to decompose');
        return 'decompose';
      }
      logger.info('Dashboard path B: single query, routing to contextFetch');
      return 'contextFetch';
    }
    logger.info('Dashboard path A: assembling from conversation history');
    return 'dashboardAgent';
  }
  if (state.intent === 'SQL_QUERY') {
    if (state.needsDecomposition) {
      logger.info(state.blueprintId
        ? `Blueprint path: "${state.blueprintId}" → decompose`
        : 'Multi-query path: routing to decompose');
      return 'decompose';
    }
    logger.info(`SQL path: matchType=${state.matchType || 'research'}, routing to contextFetch`);
    return 'contextFetch';
  }
  return '__end__';
}
```

- [ ] **Step 3: Simplify routeAfterInjectRls**

```javascript
function routeAfterInjectRls(state) {
  if (state.validationEnabled === false) {
    logger.info('Validation disabled, skipping to execute');
    return 'execute';
  }
  return 'validate';
}
```

Remove the exact/followup skip logic (lines 89-96).

- [ ] **Step 4: Update routeAfterSubQueryMatch**

```javascript
function routeAfterSubQueryMatch(state) {
  // All sub-queries go through contextFetch (with or without template)
  return 'contextFetch';
}
```

- [ ] **Step 5: Remove routeAfterSqlWriter (no longer needed)**

Delete the `routeAfterSqlWriter` function entirely.

- [ ] **Step 6: Update node registration and edges**

```javascript
function buildWorkflow() {
  const graph = new StateGraph(WorkflowState)
    .addNode('classify', classifyNode)
    .addNode('decompose', decomposeNode)
    .addNode('contextFetch', contextFetchNode)        // NEW — replaces researchAgent
    .addNode('generateSql', generateSqlNode)          // NEW — replaces sqlWriterAgent
    .addNode('injectRls', injectRlsNode)
    .addNode('validate', validateNode)
    .addNode('correct', correctNode)
    .addNode('execute', executeNode)
    .addNode('checkResults', checkResultsNode)
    .addNode('diagnoseEmptyResults', diagnoseEmptyResultsNode)
    .addNode('accumulateResult', accumulateResultNode)
    .addNode('subQueryMatch', subQueryMatchNode)
    .addNode('alignSubQueries', alignSubQueriesToTemplatesNode)
    .addNode('parallelSubQueryPipeline', parallelSubQueryPipelineNode)
    .addNode('present', presentNode)
    .addNode('dashboardAgent', dashboardAgentNode)

    .addEdge('__start__', 'classify')
    .addConditionalEdges('classify', routeAfterClassify, ['decompose', 'contextFetch', 'dashboardAgent', '__end__'])
    .addEdge('decompose', 'alignSubQueries')
    .addConditionalEdges('alignSubQueries', routeAfterAlign, ['parallelSubQueryPipeline', 'subQueryMatch'])
    .addEdge('subQueryMatch', 'contextFetch')                          // Always contextFetch
    .addEdge('contextFetch', 'generateSql')                            // Always generateSql
    .addEdge('generateSql', 'injectRls')                               // Always injectRls
    .addConditionalEdges('injectRls', routeAfterInjectRls, ['validate', 'execute'])
    .addConditionalEdges('validate', routeAfterValidate, ['execute', 'correct', 'accumulateResult', 'present', '__end__'])
    .addEdge('correct', 'generateSql')                                 // NEW: correct → generateSql (not injectRls)
    .addConditionalEdges('execute', routeAfterExecute, ['checkResults', 'correct'])
    .addConditionalEdges('checkResults', routeAfterCheckResults, ['present', 'dashboardAgent', 'accumulateResult', 'diagnoseEmptyResults', '__end__'])
    .addEdge('parallelSubQueryPipeline', 'checkResults')
    .addEdge('accumulateResult', 'subQueryMatch')
    .addConditionalEdges('diagnoseEmptyResults', routeAfterDiagnose, ['validate', 'present', '__end__'])
    .addEdge('present', '__end__')
    .addEdge('dashboardAgent', '__end__');

  return graph.compile({ checkpointer });
}
```

- [ ] **Step 7: Update __testables export**

Remove `routeAfterSqlWriter`, update list:

```javascript
__testables: {
  routeAfterClassify,
  routeAfterInjectRls,
  routeAfterValidate,
  routeAfterExecute,
  routeAfterCheckResults,
  routeAfterDiagnose,
  routeAfterSubQueryMatch,
  routeAfterDecompose,
  routeAfterAlign,
},
```

- [ ] **Step 8: Commit**

```bash
git add server/graph/workflow.js
git commit -m "refactor: wire contextFetch + generateSql into workflow, update all routing"
```

---

## Task 9: Update Multi-Query Nodes

**Files:**
- Modify: `server/graph/nodes/parallelSubQueryPipeline.js`
- Modify: `server/graph/nodes/accumulateResult.js`

- [ ] **Step 1: Update parallelSubQueryPipeline.js**

Replace imports:
```javascript
// Remove:
const { researchAgentNode } = require('./researchAgent');
const { sqlWriterAgentNode } = require('./sqlWriterAgent');

// Add:
const { contextFetchNode } = require('./contextFetch');
const { generateSqlNode } = require('./generateSql');
```

In `runOneSubQuery()`, replace the research + writer calls with contextFetch + generateSql:

```javascript
// Old pattern (around lines 104-115):
// const researchResult = await researchAgentNode(subState);
// Object.assign(subState, researchResult);
// const writerResult = await sqlWriterAgentNode(subState);
// Object.assign(subState, writerResult);

// New pattern:
const contextResult = await contextFetchNode(subState);
Object.assign(subState, contextResult);
const sqlResult = await generateSqlNode(subState);
Object.assign(subState, sqlResult);
```

Also update the template match shortcut (around lines 89-102) — when a template is found, still go through contextFetch + generateSql (not just writer):

```javascript
// Old: skips research, calls writer directly
// New: sets matchType='template', goes through both nodes
subState.matchType = 'template';
subState.templateSql = matchedSql;
const contextResult = await contextFetchNode(subState);
Object.assign(subState, contextResult);
const sqlResult = await generateSqlNode(subState);
Object.assign(subState, sqlResult);
```

Remove the path where gold SQL is used directly without any LLM call (lines 76-88) — all paths now go through contextFetch + generateSql.

In `runOneSubQueryCorrection()`, update correction to use the new correct + generateSql pattern:

```javascript
// Old: calls correctNode() which makes LLM call + returns SQL
// New: calls correctNode() (error analyzer) then generateSqlNode()
const correctionResult = await correctNode(corrState);
Object.assign(corrState, correctionResult);
const regenResult = await generateSqlNode(corrState);
Object.assign(corrState, regenResult);
```

Replace `researchBrief` references with `contextBundle` in result objects.

- [ ] **Step 2: Update accumulateResult.js**

Find any references to `researchBrief` and replace with `contextBundle`:

```javascript
// Old:
researchBrief: null,  // reset for next sub-query

// New:
contextBundle: null,   // reset for next sub-query
correctionGuidance: null,
```

- [ ] **Step 3: Commit**

```bash
git add server/graph/nodes/parallelSubQueryPipeline.js server/graph/nodes/accumulateResult.js
git commit -m "refactor: update multi-query pipeline to use contextFetch + generateSql"
```

---

## Task 10: Delete Old Files

**Files:**
- Delete: 14 files (see list below)

- [ ] **Step 1: Delete all replaced/unused files**

```bash
git rm server/graph/nodes/researchAgent.js \
       server/graph/nodes/sqlWriterAgent.js \
       server/tools/discoverContext.js \
       server/tools/submitResearch.js \
       server/tools/submitSql.js \
       server/tools/inspectTableColumns.js \
       server/tools/checkNullRatio.js \
       server/tools/searchSessionMemory.js \
       server/tools/queryDistinctValues.js \
       server/tools/researchTools.js \
       server/tools/sqlTools.js \
       server/prompts/researchAgent.js \
       server/prompts/sqlAgent.js
```

- [ ] **Step 2: Check for any remaining imports of deleted files**

Run: `grep -r "require.*researchAgent\|require.*sqlWriterAgent\|require.*discoverContext\|require.*submitResearch\|require.*submitSql\|require.*inspectTableColumns\|require.*checkNullRatio\|require.*searchSessionMemory\|require.*queryDistinctValues\|require.*researchTools\|require.*sqlTools" server/ --include="*.js" -l`

Expected: No results. If any files still import deleted modules, fix those imports.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: delete replaced research agent, SQL writer, and tool files"
```

---

## Task 11: Smoke Test

- [ ] **Step 1: Verify server starts**

Run: `cd server && node -e "const { getWorkflow } = require('./graph/workflow'); const wf = getWorkflow(); console.log('Workflow compiled, nodes:', Object.keys(wf.nodes || {}).length)"`

Expected: "Workflow compiled, nodes: 15" (or similar non-zero count). No require errors.

- [ ] **Step 2: Run existing tests**

Run: `cd server && npm test`

Check for failures. Fix any test files that reference deleted modules or old state channels (`researchBrief`, `researchToolCalls`, `agentToolCalls`).

- [ ] **Step 3: Verify knowledge loading**

Run: `cd server && node -e "const dv = require('./vectordb/distinctValuesFetcher'); dv.loadDistinctValuesAsync().then(s => console.log('Distinct values loaded:', s.available, 'tables:', s.tableIndex.size))"`

Expected: "Distinct values loaded: true tables: N" (N > 0)

- [ ] **Step 4: Commit any test fixes**

```bash
git add -A && git commit -m "fix: update tests for pipeline simplification"
```

---

## Task Summary

| Task | Description | Depends On |
|------|-------------|-----------|
| 1 | Merge distinct values into schema-knowledge.json | None |
| 2 | Extract shared utilities (sqlReferenceValidator, correctionAnalyzer) | None |
| 3 | Update state channels | None |
| 4 | Create contextFetch node | Task 1 (uses merged schema) |
| 5 | Create generateSql node | Task 2, 3 |
| 6 | Update correct.js (error analyzer) | Task 2, 3 |
| 7 | Update classify.js (template matchType) | Task 3 |
| 8 | Update workflow.js (wire everything) | Task 4, 5, 6, 7 |
| 9 | Update multi-query nodes | Task 4, 5, 6 |
| 10 | Delete old files | Task 8, 9 |
| 11 | Smoke test | Task 10 |

Tasks 1, 2, 3 are independent and can be parallelized.
Tasks 4, 5, 6, 7 depend on 1-3 but are independent of each other.
Task 8 depends on 4-7 (wires them together).
Task 9 depends on 4-6 (uses new nodes internally).
Tasks 10-11 are sequential cleanup.
