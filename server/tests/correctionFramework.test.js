const test = require('node:test');
const assert = require('node:assert/strict');

// ---------------------------------------------------------------------------
// Fix 1: Syntax error guidance extracts specific error token
// ---------------------------------------------------------------------------

test('syntax error guidance extracts the specific keyword from error message', () => {
  const { buildCorrectionGuidance } = require('../utils/correctionAnalyzer');

  const guidance = buildCorrectionGuidance({
    sql: `SELECT a.NAME FROM tbl a WHERE a.X = (SELECT MAX(b.ID) FROM tbl2 b WHERE b.Y = 1 AND a.Z > 0`,
    errorType: 'EXECUTION_ERROR',
    validationReport: null,
    contextBundle: null,
    trace: [],
    executionError: "[Microsoft][ODBC Driver 17 for SQL Server][SQL Server]Incorrect syntax near the keyword 'AND'.",
  });

  // Must mention the specific token 'AND'
  assert.ok(guidance.includes("'AND'"), `Guidance should mention the specific keyword 'AND', got: ${guidance}`);
  // Must suggest checking for unclosed subqueries (the most common cause for 'AND' syntax errors)
  assert.ok(
    /unclosed|incomplete|missing.*paren|closing.*paren/i.test(guidance),
    `Guidance should suggest unclosed subqueries/parens for 'AND' errors, got: ${guidance}`,
  );
});

test('syntax error guidance handles closing paren token', () => {
  const { buildCorrectionGuidance } = require('../utils/correctionAnalyzer');

  const guidance = buildCorrectionGuidance({
    sql: 'SELECT a.X FROM tbl a WHERE a.Y IN (1, 2,)',
    errorType: 'EXECUTION_ERROR',
    validationReport: null,
    contextBundle: null,
    trace: [],
    executionError: "Incorrect syntax near ')'.",
  });

  assert.ok(guidance.includes("')'"), `Guidance should mention the specific token ')', got: ${guidance}`);
});

test('syntax error guidance handles ORDER keyword', () => {
  const { buildCorrectionGuidance } = require('../utils/correctionAnalyzer');

  const guidance = buildCorrectionGuidance({
    sql: 'SELECT a.X FROM tbl a WHERE a.Y = 1 ORDER BY',
    errorType: 'EXECUTION_ERROR',
    validationReport: null,
    contextBundle: null,
    trace: [],
    executionError: "Incorrect syntax near the keyword 'ORDER'.",
  });

  assert.ok(guidance.includes("'ORDER'"), `Guidance should mention 'ORDER', got: ${guidance}`);
  assert.ok(
    /unclosed|incomplete|missing.*paren|closing.*paren/i.test(guidance),
    `Guidance should suggest unclosed subqueries for keyword errors, got: ${guidance}`,
  );
});

// ---------------------------------------------------------------------------
// Fix 2: Escalation strategy based on attempt count
// ---------------------------------------------------------------------------

test('correction guidance escalates on second attempt', () => {
  const { buildCorrectionGuidance } = require('../utils/correctionAnalyzer');

  const trace = [
    { node: 'execute', error: "Incorrect syntax near 'AND'.", timestamp: 1 },
    { node: 'correct', attempt: 1, errorType: 'EXECUTION_ERROR', timestamp: 2 },
    { node: 'execute', error: "Incorrect syntax near 'AND'.", timestamp: 3 },
  ];

  const guidance = buildCorrectionGuidance({
    sql: 'SELECT x FROM tbl WHERE a = (SELECT MAX(b) FROM tbl2 AND c > 0',
    errorType: 'EXECUTION_ERROR',
    validationReport: null,
    contextBundle: null,
    trace,
    executionError: "Incorrect syntax near the keyword 'AND'.",
  });

  // Must include escalation language — previous fix failed, try different approach
  assert.ok(
    /different approach|restructure|rewrite|simplif/i.test(guidance),
    `Guidance on attempt 2+ should escalate to a different approach, got: ${guidance}`,
  );
});

test('correction guidance escalates more aggressively on third attempt', () => {
  const { buildCorrectionGuidance } = require('../utils/correctionAnalyzer');

  const trace = [
    { node: 'execute', error: "Incorrect syntax near 'AND'.", timestamp: 1 },
    { node: 'correct', attempt: 1, errorType: 'EXECUTION_ERROR', timestamp: 2 },
    { node: 'execute', error: "Incorrect syntax near 'AND'.", timestamp: 3 },
    { node: 'correct', attempt: 2, errorType: 'EXECUTION_ERROR', timestamp: 4 },
    { node: 'execute', error: "Incorrect syntax near 'AND'.", timestamp: 5 },
  ];

  const guidance = buildCorrectionGuidance({
    sql: 'SELECT x FROM tbl WHERE a = (SELECT MAX(b) FROM tbl2 AND c > 0',
    errorType: 'EXECUTION_ERROR',
    validationReport: null,
    contextBundle: null,
    trace,
    executionError: "Incorrect syntax near the keyword 'AND'.",
  });

  // Must include strong escalation — rewrite from scratch, CTE, simpler approach
  assert.ok(
    /rewrite|CTE|simpler|from scratch/i.test(guidance),
    `Guidance on attempt 3+ should suggest rewriting from scratch, got: ${guidance}`,
  );
});

// ---------------------------------------------------------------------------
// Fix 3: correctNode includes prior SQL snippet in trace
// ---------------------------------------------------------------------------

test('correctNode trace includes priorSqlSnippet', async () => {
  const { correctNode } = require('../graph/nodes/correct');

  const failingSql = 'SELECT DISTINCT a.NAME FROM tbl a WHERE a.STAGE = 1 AND a.ID = (SELECT MAX(b.ID) FROM tbl2 b';
  const state = {
    sql: failingSql,
    errorType: 'EXECUTION_ERROR',
    execution: { error: "Incorrect syntax near the keyword 'AND'." },
    attempts: { agent: 0, correction: 0, reflection: 0, resultCheck: 0 },
    trace: [
      { node: 'execute', error: "Incorrect syntax near the keyword 'AND'.", timestamp: 1 },
    ],
    contextBundle: { tableNames: ['tbl'] },
  };

  const result = await correctNode(state);

  // Trace must include a snippet of the failing SQL
  const correctTrace = result.trace.find((t) => t.node === 'correct');
  assert.ok(correctTrace, 'Trace should include a correct node entry');
  assert.ok(correctTrace.priorSqlSnippet, 'Trace should include priorSqlSnippet');
  assert.ok(
    correctTrace.priorSqlSnippet.startsWith('SELECT DISTINCT'),
    `priorSqlSnippet should contain the start of the failing SQL, got: ${correctTrace.priorSqlSnippet}`,
  );
});

// ---------------------------------------------------------------------------
// Fix 4: Follow-up + correction suppresses "adapt this" section
// ---------------------------------------------------------------------------

test('buildSystemPrompt suppresses follow-up "adapt this" section during correction retries', () => {
  const { buildSystemPrompt } = require('../graph/nodes/generateSql');

  const prompt = buildSystemPrompt({
    contextBundle: { schema: [], columnMetadata: {}, tableNames: [] },
    matchType: 'followup',
    templateSql: 'SELECT TOP 5 opp.NAME FROM vw_TF_EBI_P2S p JOIN vw_TD_EBI_OPP opp ON p.OPP_ID = opp.OPP_ID',
    conversationHistory: [{ role: 'user', content: 'Show top 5 deals' }],
    entities: null,
    correctionGuidance: 'CRITICAL — SQL SYNTAX ERROR near \'AND\'.',
    state: {
      question: 'Show distinct accounts',
      sql: 'SELECT DISTINCT a.NAME FROM tbl WHERE broken AND',
      errorType: 'EXECUTION_ERROR',
      execution: { error: "Incorrect syntax near 'AND'." },
    },
    sessionId: null,
  });

  // The "PRIOR SQL (adapt this)" section should NOT appear when correction is active
  assert.ok(
    !prompt.includes('PRIOR SQL (adapt this)'),
    `Prompt should NOT include "PRIOR SQL (adapt this)" during correction retries — it conflicts with correction instructions`,
  );

  // The correction section MUST be present
  assert.ok(
    prompt.includes('CORRECTION'),
    'Prompt should include the CORRECTION section',
  );
  assert.ok(
    prompt.includes('YOUR PREVIOUS SQL'),
    'Prompt should include the failed SQL in the correction section',
  );
});

test('buildSystemPrompt still includes follow-up context on first attempt (no correction)', () => {
  const { buildSystemPrompt } = require('../graph/nodes/generateSql');

  const prompt = buildSystemPrompt({
    contextBundle: { schema: [], columnMetadata: {}, tableNames: [] },
    matchType: 'followup',
    templateSql: 'SELECT TOP 5 opp.NAME FROM vw_TF_EBI_P2S p JOIN vw_TD_EBI_OPP opp ON p.OPP_ID = opp.OPP_ID',
    conversationHistory: [{ role: 'user', content: 'Show top 5 deals' }],
    entities: null,
    correctionGuidance: null,
    state: { question: 'Show distinct accounts' },
    sessionId: null,
  });

  // On first attempt (no correction), follow-up section should be present
  assert.ok(
    prompt.includes('PRIOR SQL (adapt this)'),
    'Prompt should include "PRIOR SQL (adapt this)" on first attempt without correction',
  );
});
