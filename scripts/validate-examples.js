#!/usr/bin/env node
/**
 * Validates that gold example SQL contains the correct mandatory filters.
 * Uses _filterReference from goldExamples.json to check.
 * Run: npm run validate:examples
 */
const fs = require('fs');
const path = require('path');

const EXAMPLES_PATH = path.join(__dirname, '..', 'server', 'context', 'goldExamples.json');
const parsed = JSON.parse(fs.readFileSync(EXAMPLES_PATH, 'utf-8'));
const ref = parsed._filterReference;
const examples = parsed.examples || [];

if (!ref) { console.error('No _filterReference found'); process.exit(1); }

const quotaChecks = ['PAY_MEASURE_ID = 0', "ROLE_TYPE_DISPLAY = 'AE'", "ROLE_COVERAGE_BU_GROUP = 'DMX'", "MOPG1 <> 'ADVERTISING'", "DMX_SOLUTION_GROUP <> 'PPBU'"];
const pipeChecks = [...quotaChecks, 'SALES_STAGE'];

let issues = 0;
for (const ex of examples) {
  const sql = (ex.sql || '').toUpperCase();
  const tables = (ex.tables_used || []).map(t => t.toLowerCase());

  const hasQuota = tables.some(t => t.includes('quota'));
  const hasPipe = tables.some(t => t.includes('p2s'));

  const checks = hasQuota ? quotaChecks : (hasPipe ? pipeChecks : []);
  for (const check of checks) {
    if (!sql.includes(check.toUpperCase())) {
      console.warn('[WARN] ' + ex.id + ': missing filter fragment "' + check + '"');
      issues++;
    }
  }
}

if (issues === 0) {
  console.log('All ' + examples.length + ' examples pass mandatory filter validation.');
} else {
  console.warn('\n' + issues + ' issue(s) found across ' + examples.length + ' examples.');
}
