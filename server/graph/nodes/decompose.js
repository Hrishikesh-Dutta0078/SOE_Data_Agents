/**
 * Decompose Node — Breaks complex questions into multiple sub-queries.
 *
 * Only runs when the classifier flags needs_decomposition = true.
 * Produces a queryPlan array that drives the multi-query loop.
 */

const { z } = require('zod');
const { getModel, getModelMeta } = require('../../config/llm');
const { decomposePrompt, buildDecomposeInputs } = require('../../prompts/decompose');
const { loadGoldIndex } = require('./classify');
const { DECOMPOSE_MAX_TOKENS, DECOMPOSE_TEMPERATURE, MAX_SUB_QUERIES } = require('../../config/constants');
const logger = require('../../utils/logger');

const MAX_VARIANTS_PER_TEMPLATE = 5;

function buildPreferredPhrasings(state) {
  const { examplesMap } = loadGoldIndex();
  const examples = [...examplesMap.values()];
  if (examples.length === 0) return '';

  const category = state.questionCategory || '';
  const subCategory = state.questionSubCategory || '';

  const sameCategoryExamples = (category || subCategory)
    ? examples.filter(
        (ex) =>
          (!category || (ex.questionCategory || '') === category) &&
          (!subCategory || (ex.questionSubCategory || '') === subCategory),
      )
    : [];
  const otherExamples = sameCategoryExamples.length > 0
    ? examples.filter((ex) => !sameCategoryExamples.includes(ex))
    : [];

  const formatExample = (ex) => {
    const variants = (ex.variants || []).slice(0, MAX_VARIANTS_PER_TEMPLATE).join('; ');
    return `[id: ${ex.id}] "${ex.question}"${variants ? ` | Variants: ${variants}` : ''}`;
  };

  const parts = [];
  if (sameCategoryExamples.length > 0) {
    parts.push(sameCategoryExamples.map(formatExample).join('\n'));
  }
  if (otherExamples.length > 0) {
    parts.push(otherExamples.map(formatExample).join('\n'));
  }
  if (parts.length === 0) {
    parts.push(examples.map(formatExample).join('\n'));
  }

  return parts.join('\n');
}

const EventEmitter = require('events');
const _decomposeEvents = new EventEmitter();

const SubQuerySchema = z.object({
  id: z.string(),
  subQuestion: z.string(),
  purpose: z.string(),
  templateId: z.string().nullable().optional(),
});

const DecomposeSchema = z.object({
  queries: z.array(SubQuerySchema),
});

function expandBlueprintPlan(state) {
  const meta = state.blueprintMeta;
  if (!meta?.subQueries) return null;

  const userParams = meta.userParams || '';
  const { examplesMap } = loadGoldIndex();

  return meta.subQueries.map((sq, i) => {
    let subQuestion = sq.subQuestion || '';

    if (sq.templateId) {
      // Use canonical question from gold template; alignSubQueriesToTemplates
      // will append userParams after canonical rewriting.
      const example = examplesMap.get(sq.templateId);
      if (example) subQuestion = example.question;
    } else if (userParams) {
      // Non-template sub-queries: append params here since alignSubQueries
      // won't rewrite these.
      subQuestion = `${subQuestion} ${userParams}`;
    }

    return {
      id: sq.id || `q${i + 1}`,
      subQuestion,
      purpose: sq.purpose || '',
      templateId: sq.templateId || undefined,
    };
  });
}

async function decomposeNode(state) {
  const start = Date.now();
  logger.stage('1b', 'Decompose', 'breaking question into sub-queries');

  // Blueprint fast path — deterministic plan, no LLM call
  if (state.blueprintId && state.blueprintMeta) {
    const queryPlan = expandBlueprintPlan(state);
    if (queryPlan && queryPlan.length > 0) {
      const duration = Date.now() - start;
      logger.info(`Decompose [blueprint: ${state.blueprintId}] (${duration}ms)`, {
        subQueries: queryPlan.length,
        ids: queryPlan.map((q) => q.id),
      });
      for (const q of queryPlan) {
        logger.info(`  [${q.id}] ${q.subQuestion} — ${q.purpose}${q.templateId ? ` (template: ${q.templateId})` : ''}`);
      }

      _decomposeEvents.emit('query_plan', {
        queryPlan,
        sessionId: state.sessionId || '',
      });

      return {
        queryPlan,
        currentQueryIndex: 0,
        trace: [{
          node: 'decompose',
          timestamp: start,
          duration,
          subQueryCount: queryPlan.length,
          plan: queryPlan.map((q) => ({ id: q.id, subQuestion: q.subQuestion })),
          blueprint: state.blueprintId,
        }],
      };
    }
  }

  // Standard LLM decomposition
  const preferredPhrasings = buildPreferredPhrasings(state);
  const messages = await decomposePrompt.formatMessages(buildDecomposeInputs(state, preferredPhrasings));

  const baseModel = getModel({
    temperature: DECOMPOSE_TEMPERATURE,
    maxTokens: DECOMPOSE_MAX_TOKENS,
    cache: true,
    nodeKey: 'decompose',
    profile: state.nodeModelOverrides?.decompose,
  });
  const llmMeta = getModelMeta(baseModel);
  const model = baseModel.withStructuredOutput(DecomposeSchema);

  let result;
  try {
    result = await model.invoke(messages);
  } catch (err) {
    logger.warn('Decompose structured output failed, falling back to single query', { error: err.message });
    result = {
      queries: [{ id: 'q1', subQuestion: state.question, purpose: 'Original question (decomposition failed)' }],
    };
  }

  let queryPlan = (result.queries || []).slice(0, MAX_SUB_QUERIES);
  if (queryPlan.length === 0) {
    queryPlan = [{ id: 'q1', subQuestion: state.question, purpose: 'Original question' }];
  }

  const duration = Date.now() - start;
  logger.info(`Decompose (${duration}ms)`, {
    subQueries: queryPlan.length,
    ids: queryPlan.map((q) => q.id),
  });

  for (const q of queryPlan) {
    logger.info(`  [${q.id}] ${q.subQuestion} — ${q.purpose}`);
  }

  _decomposeEvents.emit('query_plan', {
    queryPlan,
    sessionId: state.sessionId || '',
  });

  return {
    queryPlan,
    currentQueryIndex: 0,
    trace: [{
      node: 'decompose',
      timestamp: start,
      duration,
      subQueryCount: queryPlan.length,
      plan: queryPlan.map((q) => ({ id: q.id, subQuestion: q.subQuestion })),
      llm: llmMeta,
    }],
  };
}

module.exports = { decomposeNode, decomposeEvents: _decomposeEvents };
