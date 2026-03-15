/**
 * SubQueryMatch Node — Checks each decomposed sub-query against gold examples
 * before sending it to the research agent.
 *
 * 1. Programmatic token-overlap matching (same as classify, lower threshold).
 * 2. If no match: LLM-based partial match fallback with gold templates in context.
 * When a match is found (either way) the template SQL is forwarded to sqlWriterAgent,
 * skipping the research step entirely.
 */

const { z } = require('zod');
const { loadGoldIndex } = require('./classify');
const { getModel, getModelMeta } = require('../../config/llm');
const {
  SUB_QUERY_MATCH_THRESHOLD,
  SUB_QUERY_LLM_MATCH_MAX_TOKENS,
  SUB_QUERY_LLM_MATCH_TEMPERATURE,
} = require('../../config/constants');
const logger = require('../../utils/logger');
const {
  subQueryMatchPrompt,
  formatGoldTemplatesForSubQueryMatch,
  buildSubQueryMatchInputs,
} = require('../../prompts/subQueryMatch');

const SubQueryMatchSchema = z.object({
  matched_example_id: z.string().nullable(),
});

function findSubQueryMatch(question) {
  const { variantIndex, examplesMap } = loadGoldIndex();
  if (variantIndex.length === 0) return null;

  const STOP_WORDS = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'need', 'to', 'of', 'in',
    'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
    'and', 'but', 'or', 'not', 'so', 'both', 'each', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same',
    'than', 'too', 'very', 'just', 'that', 'this', 'these', 'those',
    'it', 'its', 'all', 'any', 'per', 'what', 'show', 'me', 'my',
    'get', 'give', 'how', 'much', 'many',
  ]);

  function tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  }

  const userTokens = new Set(tokenize(question));
  if (userTokens.size === 0) return null;

  let bestScore = 0;
  let bestId = null;

  for (const entry of variantIndex) {
    const intersection = [...userTokens].filter((t) => entry.tokens.has(t)).length;
    const denominator = Math.max(userTokens.size, entry.tokens.size);
    const score = denominator > 0 ? intersection / denominator : 0;

    if (score > bestScore) {
      bestScore = score;
      bestId = entry.id;
    }
  }

  if (bestScore >= SUB_QUERY_MATCH_THRESHOLD && bestId) {
    const example = examplesMap.get(bestId);
    return example
      ? { id: bestId, sql: example.sql, score: bestScore }
      : null;
  }

  return null;
}

/**
 * LLM fallback when programmatic match returns null. Returns { id, sql } or null.
 */
async function findSubQueryMatchLLMFallback(subQuestion) {
  const { examplesMap } = loadGoldIndex();
  const goldExamples = [...examplesMap.values()];
  if (goldExamples.length === 0) return null;
  try {
    const goldTemplatesText = formatGoldTemplatesForSubQueryMatch(goldExamples);
    const messages = await subQueryMatchPrompt.formatMessages(
      buildSubQueryMatchInputs(subQuestion, goldTemplatesText),
    );
    const model = getModel({
      temperature: SUB_QUERY_LLM_MATCH_TEMPERATURE,
      maxTokens: SUB_QUERY_LLM_MATCH_MAX_TOKENS,
      cache: true,
      nodeKey: 'subQueryMatch',
    }).withStructuredOutput(SubQueryMatchSchema);
    const llmResult = await model.invoke(messages);
    const matchedId = llmResult?.matched_example_id || null;
    if (matchedId) {
      const example = examplesMap.get(matchedId);
      if (example?.sql) return { id: matchedId, sql: example.sql, score: null };
    }
  } catch (err) {
    logger.warn('[SubQueryMatch] LLM fallback failed', { error: err?.message || String(err) });
  }
  return null;
}

async function subQueryMatchNode(state) {
  const start = Date.now();
  const plan = state.queryPlan || [];
  const qIdx = state.currentQueryIndex || 0;
  const planItem = plan[qIdx] || {};
  const subQuestion = planItem.subQuestion || state.question;
  const multiLabel = plan.length > 1 ? ` [${qIdx + 1}/${plan.length}]` : '';

  let match = null;
  let matchSource = 'programmatic';
  if (planItem.templateId) {
    const { examplesMap } = loadGoldIndex();
    const example = examplesMap.get(planItem.templateId);
    if (example?.sql) {
      match = { id: planItem.templateId, sql: example.sql, score: null };
      matchSource = 'templateId';
    }
  }
  if (!match) {
    match = findSubQueryMatch(subQuestion);
    matchSource = 'programmatic';
  }
  if (!match) {
    match = await findSubQueryMatchLLMFallback(subQuestion);
    matchSource = 'llm_fallback';
  }

  if (match) {
    const duration = Date.now() - start;
    const sourceLabel = matchSource === 'templateId'
      ? 'direct templateId'
      : matchSource === 'llm_fallback'
        ? 'LLM fallback'
        : `score: ${(match.score || 0).toFixed(2)}`;
    logger.info(
      `[SubQueryMatch]${multiLabel} Template hit for "${subQuestion.substring(0, 80)}" → ${match.id} (${sourceLabel}, ${duration}ms)`,
    );
    return {
      templateSql: match.sql,
      subQueryMatchFound: true,
      trace: [{
        node: 'subQueryMatch',
        timestamp: start,
        duration,
        queryIndex: qIdx,
        matchId: match.id,
        score: match.score ?? null,
        source: matchSource,
      }],
    };
  }

  const duration = Date.now() - start;
  logger.info(`[SubQueryMatch]${multiLabel} No template match for "${subQuestion.substring(0, 80)}" (${duration}ms)`);
  return {
    templateSql: '',
    subQueryMatchFound: false,
    trace: [{
      node: 'subQueryMatch',
      timestamp: start,
      duration,
      queryIndex: qIdx,
      matchId: null,
      score: 0,
    }],
  };
}

module.exports = { subQueryMatchNode, findSubQueryMatch, findSubQueryMatchLLMFallback };
