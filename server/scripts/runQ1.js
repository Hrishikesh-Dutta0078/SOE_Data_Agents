/**
 * Standalone script to run Q1 through the workflow and log the generated SQL.
 * Bypasses HTTP/auth by directly invoking the LangGraph workflow.
 *
 * Usage: node scripts/runQ1.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { getWorkflow } = require('../graph/workflow');

const QUESTION =
  "I would like to see Q2'26 pipeline walk by region. Please start the Q2'26 pipeline walk with position at beginning of Q1'26 and end position as of end of Q1. Please show $ in million.";

(async () => {
  console.log('=== Q1 ===');
  console.log('Question:', QUESTION);
  console.log();

  const workflow = getWorkflow();
  const sessionId = `cli-${Date.now()}`;
  const threadConfig = { configurable: { thread_id: sessionId } };

  const result = await workflow.invoke(
    {
      question: QUESTION,
      conversationHistory: [],
      previousEntities: null,
      resolvedQuestions: [],
      sessionId,
      rlsEnabled: false,
      impersonateContext: null,
      validationEnabled: true,
      isFollowUp: false,
      enabledTools: null,
      nodeModelOverrides: null,
    },
    { ...threadConfig, recursionLimit: 100 },
  );

  console.log('=== INTENT ===');
  console.log(result.intent || 'N/A');
  console.log();

  console.log('=== COMPLEXITY ===');
  console.log(result.complexity || 'N/A');
  console.log();

  // Single-query SQL
  if (result.sql) {
    console.log('=== GENERATED SQL ===');
    console.log(result.sql);
    console.log();
    if (result.reasoning) {
      console.log('=== SQL REASONING ===');
      console.log(result.reasoning);
      console.log();
    }
  }

  // Sub-queries (decomposed)
  if (result.queries && result.queries.length) {
    result.queries.forEach((q, i) => {
      console.log(`=== SUB-QUERY ${i + 1}: ${q.subQuestion || ''} ===`);
      if (q.purpose) console.log('Purpose:', q.purpose);
      console.log('SQL:', q.sql || 'N/A');
      console.log();
    });
  }

  // Execution summary
  if (result.execution) {
    console.log('=== EXECUTION ===');
    console.log('Row count:', result.execution.rowCount ?? 'N/A');
    console.log('Status:', result.execution.status ?? 'N/A');
    if (result.execution.error) console.log('Error:', result.execution.error);
    console.log();
  }

  // Insights (truncated)
  if (result.insights) {
    console.log('=== INSIGHTS (first 800 chars) ===');
    const txt = typeof result.insights === 'string'
      ? result.insights
      : JSON.stringify(result.insights);
    console.log(txt.slice(0, 800));
    console.log();
  }

  // Diagnostics
  if (result.diagnostics) {
    console.log('=== DIAGNOSTICS ===');
    console.log(JSON.stringify(result.diagnostics, null, 2).slice(0, 500));
    console.log();
  }

  console.log('=== DONE ===');
})().catch((err) => {
  console.error('Pipeline error:', err);
  process.exit(1);
});
