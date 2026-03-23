#!/usr/bin/env node
/**
 * Context Token Audit — measures exactly how many tokens each section of the
 * generateSql system prompt consumes, using the official Anthropic tokenizer.
 *
 * Usage:  node scripts/auditContextTokens.js
 *
 * Because the LLM table selector requires an API call, this script simulates
 * table selection by running the keyword-based pre-filter (searchTables) and
 * picking the top-N tables — the same candidates the LLM would see.
 * It then builds the full system prompt and measures each section.
 */

const path = require('path');
const { countTokens } = require('@anthropic-ai/tokenizer');

// ── Bootstrap: load knowledge stores synchronously ──────────────────────────
// These normally load async at server startup; force-load them here.
const { loadSchemaKnowledgeAsync } = require('../vectordb/schemaFetcher');
const { loadDistinctValuesAsync } = require('../vectordb/distinctValuesFetcher');
const { loadRulesAsync } = require('../vectordb/rulesFetcher');
const { loadSchemaSearcherAsync } = require('../vectordb/schemaSearcher');
const { loadJoinKnowledgeAsync } = require('../vectordb/joinRuleFetcher');
const { loadKpiGlossaryAsync } = require('../vectordb/kpiFetcher');
const { loadExamplesAsync } = require('../vectordb/examplesFetcher');
const { loadDefinitionsAsync } = require('../vectordb/definitionsFetcher');

// Fetchers
const { getSchemaByTableNames, getColumnMetadataForTable } = require('../vectordb/schemaFetcher');
const { getJoinRulesForTables, formatJoinRulesText } = require('../vectordb/joinRuleFetcher');
const { searchExamples } = require('../vectordb/examplesFetcher');
const { searchRules } = require('../vectordb/rulesFetcher');
const { searchKpis } = require('../vectordb/kpiFetcher');
const { getDistinctValues, getAvailableColumns } = require('../vectordb/distinctValuesFetcher');
const { searchTables } = require('../vectordb/schemaSearcher');
const { getMandatoryFiltersForTables } = require('../vectordb/definitionsFetcher');

// Prompt builder
const { buildSystemPrompt } = require('../graph/nodes/generateSql');

// ── Constants ───────────────────────────────────────────────────────────────
const CONTEXT_WINDOW = 200_000; // Claude Opus 4.6 context window
const MAX_OUTPUT_TOKENS = 4_096; // from GENERATE_SQL_MAX_TOKENS
const AVAILABLE_INPUT = CONTEXT_WINDOW - MAX_OUTPUT_TOKENS;

const SAMPLE_QUERIES = [
  {
    label: 'Simple — pipeline by region',
    question: 'Show pipeline by region',
    entities: { metrics: ['pipeline'], dimensions: ['region'], filters: [], operations: [] },
  },
  {
    label: 'Medium — lost deals by stage and reason',
    question: 'Show lost deals by stage and their reasons',
    entities: { metrics: ['deal count', 'pipeline amount'], dimensions: ['sales stage', 'reason'], filters: ['lost'], operations: [] },
  },
  {
    label: 'Complex — coverage vs quota by rep with trend',
    question: 'Show pipe coverage vs quota by rep for Q2 with quarter-over-quarter trend',
    entities: { metrics: ['coverage', 'quota', 'pipeline'], dimensions: ['rep', 'quarter'], filters: ['Q2'], operations: ['trend', 'comparison'] },
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const DISTINCT_VALUES_LIMIT = 15;
const DISTINCT_VALUES_MAX_COLS = 30;

function collectDistinctValues(tableNames) {
  const dvByTable = {};
  for (const tableName of tableNames) {
    const allCols = getAvailableColumns(tableName);
    const lines = [];
    for (const col of allCols.slice(0, DISTINCT_VALUES_MAX_COLS)) {
      const result = getDistinctValues(tableName, col, DISTINCT_VALUES_LIMIT);
      if (result.available && result.values && result.values.length > 0) {
        lines.push(`${tableName}.${col}: ${result.values.join(', ')}`);
      }
    }
    if (lines.length > 0) dvByTable[tableName] = lines;
  }
  return dvByTable;
}

function buildContextBundle(tableNames, enrichedQuery) {
  const schema = getSchemaByTableNames(tableNames);

  const columnMetadata = {};
  for (const t of tableNames.slice(0, 12)) {
    const meta = getColumnMetadataForTable(t);
    if (meta) columnMetadata[t] = meta;
  }

  const joinRules = getJoinRulesForTables(tableNames);
  const joinText = formatJoinRulesText(joinRules);
  const examples = searchExamples(enrichedQuery, 5);
  const rules = searchRules(enrichedQuery, 8);
  const kpis = searchKpis(enrichedQuery, 5);
  const distinctValues = collectDistinctValues(tableNames);
  const mandatoryFilters = getMandatoryFiltersForTables(tableNames);

  return {
    tableNames,
    columnsByTable: {},
    schema,
    columnMetadata,
    joinRules,
    joinText,
    examples,
    rules,
    kpis,
    fiscalPeriod: { FISCAL_YR_AND_QTR_DESC: '2026-Q2' },
    distinctValues,
    mandatoryFilters,
  };
}

function bar(pct, width = 40) {
  const filled = Math.round((pct / 100) * width);
  return '[' + '#'.repeat(filled) + '.'.repeat(width - filled) + ']';
}

function fmt(n) {
  return n.toLocaleString('en-US');
}

// ── Section-level measurement ───────────────────────────────────────────────
// We rebuild each section individually to measure it, mirroring generateSql.js

function measureSections(contextBundle, entities) {
  const b = contextBundle;
  const sections = [];

  // 1. Role declaration (hardcoded in buildSystemPrompt)
  const role = 'You are a precise T-SQL writer for Microsoft SQL Server.\n\nYour context team has gathered all schema and business context. Write the SQL query using ONLY the information provided below.\n\n';
  sections.push({ name: 'Role declaration', text: role });

  // 1b. Mandatory filters
  if (b.mandatoryFilters?.length > 0) {
    const lines = b.mandatoryFilters.map(f => {
      let line = `- ${f.sql}`;
      const tables = (f.appliesTo || []).join(', ');
      if (tables) line += `  [${tables}]`;
      if (f.note) line += `  -- ${f.note}`;
      return line;
    });
    sections.push({ name: 'Mandatory filters', text: `=== MANDATORY FILTERS ===\nApply ALL filters below that match tables in your query:\n\n${lines.join('\n')}` });
  }

  // 2. Schema / ALLOWED TABLES
  if (b.schema?.length > 0) {
    let text = '**ALLOWED TABLES (use ONLY these table names):**\n';
    for (const t of b.schema) {
      text += `- ${t.table_name}`;
      if (t.description) text += ` — ${t.description}`;
      text += '\n';
    }
    sections.push({ name: 'Allowed tables', text });
  }

  // 3. Column metadata
  if (b.columnMetadata && Object.keys(b.columnMetadata).length > 0) {
    let text = '**EXACT COLUMN REFERENCE:**\n';
    for (const [tableName, meta] of Object.entries(b.columnMetadata)) {
      if (meta) text += `\n-- ${tableName}:\n${meta}\n`;
    }
    sections.push({ name: 'Column metadata', text });
  }

  // 4. Join paths
  if (b.joinText) {
    sections.push({ name: 'Join paths', text: `**JOIN PATHS:**\n${b.joinText}\n` });
  }

  // 5. Business rules
  if (b.rules?.length > 0) {
    let text = '**BUSINESS RULES:**\n';
    for (const r of b.rules) {
      const rt = typeof r === 'string' ? r : r.text || r.rule || JSON.stringify(r);
      text += `- ${rt}\n`;
    }
    sections.push({ name: 'Business rules', text });
  }

  // 6. Example SQL patterns
  if (b.examples?.length > 0) {
    let text = '**EXAMPLE PATTERNS:**\n';
    for (const p of b.examples) {
      const pt = typeof p === 'string' ? p : p.text || p.pattern || JSON.stringify(p);
      text += `- ${pt}\n`;
    }
    sections.push({ name: 'Example patterns', text });
  }

  // 7. KPI definitions
  if (b.kpis?.length > 0) {
    let text = '**KPI DEFINITIONS:**\n';
    for (const k of b.kpis) {
      const kt = typeof k === 'string' ? k : k.text || k.definition || JSON.stringify(k);
      text += `- ${kt}\n`;
    }
    sections.push({ name: 'KPI definitions', text });
  }

  // 8. Distinct values
  if (b.distinctValues && Object.keys(b.distinctValues).length > 0) {
    let text = '**VERIFIED FILTER VALUES (use these exact values in WHERE clauses):**\n';
    for (const [, lines] of Object.entries(b.distinctValues)) {
      for (const line of lines) text += `- ${line}\n`;
    }
    sections.push({ name: 'Verified filter values', text });
  }

  // 9. Fiscal period
  if (b.fiscalPeriod) {
    sections.push({ name: 'Fiscal period', text: `**CURRENT FISCAL PERIOD:** ${b.fiscalPeriod.FISCAL_YR_AND_QTR_DESC}\n\n` });
  }

  // 10. Entities
  if (entities) {
    let text = '=== DETECTED ENTITIES ===\nYou MUST incorporate ALL of these:\n';
    if (entities.metrics?.length) text += `  Metrics: ${entities.metrics.join(', ')}\n`;
    if (entities.dimensions?.length) text += `  Dimensions: ${entities.dimensions.join(', ')}\n`;
    if (entities.filters?.length) text += `  Filters: ${entities.filters.join(', ')}\n`;
    if (entities.operations?.length) text += `  Operations: ${entities.operations.join(', ')}\n`;
    sections.push({ name: 'Detected entities', text });
  }

  // 11. Mandatory SQL rules (hardcoded block)
  const sqlRules = `MANDATORY SQL RULES:
- Do NOT use table or column names that appear only in EXAMPLE PATTERNS.
- Use ONLY the tables listed in ALLOWED TABLES and ONLY the columns listed in EXACT COLUMN REFERENCE.
- Use table aliases for every column reference.
- Use NULLIF() for all division operations.
- Default to TOP 5000 unless the user specifies a different limit.
- Do NOT include SQL comments.
- Do NOT use SUSER_SNAME(), FLM_LDAP, or any session-based user filtering.
- Do NOT remove REGION_ID / FLM_ID security filters if they already exist.
- DIMENSION LABELS: JOIN vw_EBI_CALDATE for FISCAL_YR_AND_QTR_DESC.
- CURRENT FISCAL PERIOD: Use provided fiscal year for unqualified references.

RESPONSE FORMAT:
Return your SQL inside a sql code fence, then explain your approach after a "REASONING:" marker.
`;
  sections.push({ name: 'Mandatory SQL rules + format', text: sqlRules });

  return sections;
}

// ── Raw file measurement ────────────────────────────────────────────────────

const fs = require('fs');

function measureRawFiles() {
  const baseDir = path.join(__dirname, '..', 'context');
  const files = [
    { name: 'schema-knowledge.json', path: path.join(baseDir, 'knowledge', 'schema-knowledge.json') },
    { name: 'business-rules.md', path: path.join(baseDir, 'knowledge', 'business-rules.md') },
    { name: 'join-knowledge.json', path: path.join(baseDir, 'knowledge', 'join-knowledge.json') },
    { name: 'kpi-glossary.json', path: path.join(baseDir, 'knowledge', 'kpi-glossary.json') },
    { name: 'analysis-blueprints.json', path: path.join(baseDir, 'knowledge', 'analysis-blueprints.json') },
    { name: 'goldExamples.json', path: path.join(baseDir, 'goldExamples.json') },
    { name: 'dashboardGoldExamples.json', path: path.join(baseDir, 'dashboardGoldExamples.json') },
    { name: 'definitions.json', path: path.join(baseDir, 'definitions.json') },
  ];

  const results = [];
  for (const f of files) {
    if (fs.existsSync(f.path)) {
      const content = fs.readFileSync(f.path, 'utf-8');
      results.push({ name: f.name, chars: content.length, tokens: countTokens(content) });
    }
  }
  return results;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // Load all stores
  await Promise.all([
    loadSchemaKnowledgeAsync(),
    loadDistinctValuesAsync(),
    loadRulesAsync(),
    loadSchemaSearcherAsync(),
    loadJoinKnowledgeAsync(),
    loadKpiGlossaryAsync(),
    loadExamplesAsync(),
    loadDefinitionsAsync(),
  ]);

  console.log('='.repeat(90));
  console.log('  CONTEXT TOKEN AUDIT — Anthropic Tokenizer (exact counts)');
  console.log('  Model: Claude Opus 4.6  |  Context window: ' + fmt(CONTEXT_WINDOW) + ' tokens');
  console.log('  Available for input: ' + fmt(AVAILABLE_INPUT) + ' tokens (window - ' + fmt(MAX_OUTPUT_TOKENS) + ' max output)');
  console.log('='.repeat(90));

  // ── Part 1: Raw knowledge file sizes ──
  console.log('\n--- PART 1: Raw Knowledge File Sizes (full file, not what gets sent to LLM) ---\n');
  const rawFiles = measureRawFiles();
  let totalRawTokens = 0;
  const maxNameLen = Math.max(...rawFiles.map(f => f.name.length));
  for (const f of rawFiles) {
    totalRawTokens += f.tokens;
    const pct = ((f.tokens / AVAILABLE_INPUT) * 100).toFixed(1);
    console.log(`  ${f.name.padEnd(maxNameLen + 2)} ${fmt(f.tokens).padStart(8)} tokens  (${fmt(f.chars).padStart(8)} chars)   ${pct.padStart(5)}% of input window`);
  }
  console.log(`  ${'TOTAL (raw on disk)'.padEnd(maxNameLen + 2)} ${fmt(totalRawTokens).padStart(8)} tokens                    ${((totalRawTokens / AVAILABLE_INPUT) * 100).toFixed(1).padStart(5)}% of input window`);
  console.log(`\n  NOTE: Raw files are NOT sent in full. The pipeline selects relevant subsets.`);

  // ── Part 2: Per-query prompt analysis ──
  console.log('\n' + '='.repeat(90));
  console.log('--- PART 2: Actual System Prompt Token Usage (per query scenario) ---');
  console.log('='.repeat(90));

  for (const sample of SAMPLE_QUERIES) {
    console.log(`\n${'─'.repeat(90)}`);
    console.log(`  Query: "${sample.question}"`);
    console.log(`  Label: ${sample.label}`);
    console.log(`${'─'.repeat(90)}`);

    // Simulate table selection via keyword search (same pre-filter the LLM sees)
    const enrichedParts = [sample.question];
    for (const key of ['metrics', 'dimensions', 'filters', 'operations']) {
      for (const t of sample.entities[key] || []) { enrichedParts.push(t, t); }
    }
    const enrichedQuery = enrichedParts.join(' ');
    const candidateTables = searchTables(sample.question, sample.entities, 8);

    console.log(`\n  Tables selected (keyword pre-filter top 8): ${candidateTables.length}`);
    for (const t of candidateTables) console.log(`    - ${t}`);

    // Build context bundle
    const bundle = buildContextBundle(candidateTables, enrichedQuery);

    // Build the ACTUAL system prompt via generateSql's buildSystemPrompt
    const fullPrompt = buildSystemPrompt({
      contextBundle: bundle,
      matchType: 'none',
      templateSql: null,
      conversationHistory: [],
      entities: sample.entities,
      correctionGuidance: null,
      state: { question: sample.question },
      sessionId: null,
    });

    const fullPromptTokens = countTokens(fullPrompt);
    const humanMsg = `Generate T-SQL for the following request.\n\nRequest: ${sample.question}`;
    const humanMsgTokens = countTokens(humanMsg);
    const totalInput = fullPromptTokens + humanMsgTokens;
    const pctWindow = ((totalInput / AVAILABLE_INPUT) * 100).toFixed(2);

    // Measure individual sections
    const sections = measureSections(bundle, sample.entities);
    let measuredTotal = 0;

    console.log(`\n  ${'Section'.padEnd(32)} ${'Tokens'.padStart(8)}  ${'Chars'.padStart(8)}  ${'% of prompt'.padStart(12)}  ${'% of window'.padStart(12)}`);
    console.log(`  ${'─'.repeat(32)} ${'─'.repeat(8)}  ${'─'.repeat(8)}  ${'─'.repeat(12)}  ${'─'.repeat(12)}`);

    for (const s of sections) {
      const tokens = countTokens(s.text);
      measuredTotal += tokens;
      const pctPrompt = ((tokens / fullPromptTokens) * 100).toFixed(1);
      const pctWin = ((tokens / AVAILABLE_INPUT) * 100).toFixed(2);
      console.log(`  ${s.name.padEnd(32)} ${fmt(tokens).padStart(8)}  ${fmt(s.text.length).padStart(8)}  ${(pctPrompt + '%').padStart(12)}  ${(pctWin + '%').padStart(12)}`);
    }

    // Business context subtotal (rules + examples + KPIs + mandatory filters)
    const businessContextSections = ['Business rules', 'Example patterns', 'KPI definitions', 'Mandatory filters'];
    const businessTokens = sections
      .filter(s => businessContextSections.includes(s.name))
      .reduce((sum, s) => sum + countTokens(s.text), 0);

    // Schema context subtotal (allowed tables + column metadata + join paths + distinct values)
    const schemaContextSections = ['Allowed tables', 'Column metadata', 'Join paths', 'Verified filter values'];
    const schemaTokens = sections
      .filter(s => schemaContextSections.includes(s.name))
      .reduce((sum, s) => sum + countTokens(s.text), 0);

    // Static/boilerplate subtotal
    const staticSections = ['Role declaration', 'Mandatory SQL rules + format', 'Fiscal period', 'Detected entities'];
    const staticTokens = sections
      .filter(s => staticSections.includes(s.name))
      .reduce((sum, s) => sum + countTokens(s.text), 0);

    console.log(`  ${'─'.repeat(32)} ${'─'.repeat(8)}  ${'─'.repeat(8)}  ${'─'.repeat(12)}  ${'─'.repeat(12)}`);
    console.log(`  ${'System prompt TOTAL'.padEnd(32)} ${fmt(fullPromptTokens).padStart(8)}  ${fmt(fullPrompt.length).padStart(8)}  ${'100.0%'.padStart(12)}  ${(pctWindow + '%').padStart(12)}`);
    console.log(`  ${'+ Human message'.padEnd(32)} ${fmt(humanMsgTokens).padStart(8)}`);
    console.log(`  ${'= Total input'.padEnd(32)} ${fmt(totalInput).padStart(8)}  ${' '.repeat(8)}  ${' '.repeat(12)}  ${(((totalInput / AVAILABLE_INPUT) * 100).toFixed(2) + '%').padStart(12)}`);

    console.log(`\n  Category breakdown:`);
    console.log(`    Schema context (tables, cols, joins, distinct vals):  ${fmt(schemaTokens).padStart(7)} tokens  (${((schemaTokens / fullPromptTokens) * 100).toFixed(1)}% of prompt)`);
    console.log(`    Business context (rules, examples, KPIs, filters):   ${fmt(businessTokens).padStart(7)} tokens  (${((businessTokens / fullPromptTokens) * 100).toFixed(1)}% of prompt)`);
    console.log(`    Static/boilerplate (role, SQL rules, entities):      ${fmt(staticTokens).padStart(7)} tokens  (${((staticTokens / fullPromptTokens) * 100).toFixed(1)}% of prompt)`);

    console.log(`\n  Context window usage:  ${bar(parseFloat(pctWindow))} ${pctWindow}%`);
    console.log(`  Remaining headroom:    ${fmt(AVAILABLE_INPUT - totalInput)} tokens`);
  }

  // ── Part 3: Worst-case analysis ──
  console.log('\n' + '='.repeat(90));
  console.log('--- PART 3: Worst Case — All Tables Selected (theoretical maximum) ---');
  console.log('='.repeat(90));

  const { getAllTableNames } = require('../vectordb/schemaFetcher');
  const allTables = getAllTableNames();
  console.log(`\n  Total tables in schema: ${allTables.length}`);

  const allBundle = buildContextBundle(allTables, 'everything');
  const allPrompt = buildSystemPrompt({
    contextBundle: allBundle,
    matchType: 'none',
    templateSql: null,
    conversationHistory: [],
    entities: { metrics: ['all'], dimensions: ['all'], filters: [], operations: [] },
    correctionGuidance: null,
    state: { question: 'everything' },
    sessionId: null,
  });
  const allTokens = countTokens(allPrompt);
  const allPct = ((allTokens / AVAILABLE_INPUT) * 100).toFixed(2);

  console.log(`  System prompt with ALL tables:  ${fmt(allTokens)} tokens  (${fmt(allPrompt.length)} chars)`);
  console.log(`  Context window usage:           ${bar(parseFloat(allPct))} ${allPct}%`);
  console.log(`  Remaining headroom:             ${fmt(AVAILABLE_INPUT - allTokens)} tokens`);

  // Measure all sections for the worst case
  const allSections = measureSections(allBundle, { metrics: ['all'], dimensions: ['all'], filters: [], operations: [] });
  console.log(`\n  Worst-case section breakdown:`);
  for (const s of allSections) {
    const tokens = countTokens(s.text);
    console.log(`    ${s.name.padEnd(32)} ${fmt(tokens).padStart(8)} tokens  (${((tokens / allTokens) * 100).toFixed(1)}%)`);
  }

  console.log('\n' + '='.repeat(90));
}

main().catch(err => { console.error('Audit failed:', err); process.exit(1); });
