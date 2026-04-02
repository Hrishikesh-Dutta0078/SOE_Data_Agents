const test = require('node:test');
const assert = require('node:assert/strict');

const { __testables } = require('../graph/nodes/classify');

test('reuses prior SQL when classifier marks a repeated question as follow-up', () => {
  const result = __testables.shouldReusePriorSqlAsFollowUp({
    uiRequestedFollowUp: false,
    llmDetectedFollowUp: true,
    priorCategory: 'WHAT_HAPPENED',
    currentCategory: 'WHAT_HAPPENED',
    complexity: 'MODERATE',
    hasPriorSql: true,
  });

  assert.equal(result, true);
});

test('does not reuse prior SQL when follow-up changes category', () => {
  const result = __testables.shouldReusePriorSqlAsFollowUp({
    uiRequestedFollowUp: false,
    llmDetectedFollowUp: true,
    priorCategory: 'WHAT_HAPPENED',
    currentCategory: 'WHY',
    complexity: 'MODERATE',
    hasPriorSql: true,
  });

  assert.equal(result, false);
});

test('does not reuse prior SQL for complex classifier-detected follow-up', () => {
  const result = __testables.shouldReusePriorSqlAsFollowUp({
    uiRequestedFollowUp: false,
    llmDetectedFollowUp: true,
    priorCategory: 'WHAT_HAPPENED',
    currentCategory: 'WHAT_HAPPENED',
    complexity: 'COMPLEX',
    hasPriorSql: true,
  });

  assert.equal(result, false);
});

test('does not reuse prior SQL when no prior SQL is available', () => {
  const result = __testables.shouldReusePriorSqlAsFollowUp({
    uiRequestedFollowUp: false,
    llmDetectedFollowUp: true,
    priorCategory: 'WHAT_HAPPENED',
    currentCategory: 'WHAT_HAPPENED',
    complexity: 'MODERATE',
    hasPriorSql: false,
  });

  assert.equal(result, false);
});
