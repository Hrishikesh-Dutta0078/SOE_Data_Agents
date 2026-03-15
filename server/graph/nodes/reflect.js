/**
 * Reflect Node — LLM-based SQL review using structured output
 * and centralized prompt templates.
 */

const { z } = require('zod');
const { getModel } = require('../../config/llm');
const { REFLECT_MAX_TOKENS, REFLECT_TEMPERATURE, REFLECT_CONFIDENCE_THRESHOLD } = require('../../config/constants');
const logger = require('../../utils/logger');

const EntityCoverage = z.object({
  missing_metrics: z.array(z.string()).default([]),
  missing_dimensions: z.array(z.string()).default([]),
  missing_filters: z.array(z.string()).default([]),
});

const ReflectSchema = z.object({
  confidence: z.number().min(0).max(1),
  entityCoverage: EntityCoverage.default({ missing_metrics: [], missing_dimensions: [], missing_filters: [] }),
  issues: z.array(z.string()).default([]),
  correctedSql: z.string().nullable().default(null),
});

async function reflectNode(state) {
  if (!state.sql) {
    return {
      reflectionConfidence: 0,
      reflectionIssues: ['No SQL produced'],
      trace: [{ node: 'reflect', timestamp: Date.now(), skipped: true, reason: 'no SQL' }],
    };
  }

  const messages = [
    {
      role: 'system',
      content: `You are a SQL review expert. Evaluate the SQL query against the user's question and detected entities.

Provide your evaluation with this structure:
- confidence: a number 0-1 indicating how well the SQL answers the question
- entityCoverage: any missing metrics, dimensions, or filters
- issues: list of problems found
- correctedSql: corrected SQL if confidence is low, or null if SQL is acceptable`,
    },
    {
      role: 'user',
      content: `Question: ${state.question}

Detected Entities: ${JSON.stringify(state.entities || {}, null, 2)}

Generated SQL:
${state.sql}

Evaluate whether this SQL correctly answers the question and covers all entities.`,
    },
  ];

  const model = getModel({
    maxTokens: REFLECT_MAX_TOKENS,
    temperature: REFLECT_TEMPERATURE,
    cache: true,
  }).withStructuredOutput(ReflectSchema);

  const reflectStart = Date.now();
  let parsed;
  try {
    parsed = await model.invoke(messages);
  } catch (err) {
    logger.warn('Reflect failed', { error: err.message });
    return {
      reflectionConfidence: 0.5,
      reflectionIssues: ['Reflection parse error'],
      trace: [{ node: 'reflect', timestamp: Date.now(), parseError: true }],
    };
  }

  const raw = Number(parsed.confidence);
  const confidence = Number.isFinite(raw) ? raw : 0;
  const issues = parsed.issues || [];
  const coverage = parsed.entityCoverage || {};

  const allMissing = [
    ...(coverage.missing_metrics || []),
    ...(coverage.missing_dimensions || []),
    ...(coverage.missing_filters || []),
  ];

  const reflectionCount = (state.attempts?.reflection || 0) + 1;

  const update = {
    reflectionConfidence: confidence,
    reflectionIssues: issues,
    reflectionFeedback: allMissing.length > 0
      ? `Missing entities: ${allMissing.join(', ')}. Issues: ${issues.join('; ')}`
      : issues.length > 0
        ? `Issues: ${issues.join('; ')}`
        : '',
    reflectionCorrectedSql: null,
    attempts: { ...state.attempts, reflection: reflectionCount },
    trace: [{
      node: 'reflect',
      timestamp: Date.now(),
      confidence,
      issues,
      entityCoverage: coverage,
    }],
  };

  if (parsed.correctedSql && confidence < REFLECT_CONFIDENCE_THRESHOLD) {
    update.reflectionCorrectedSql = parsed.correctedSql;
    update.reflectionFeedback += (update.reflectionFeedback ? '\n' : '')
      + 'Reflect suggested a corrected SQL (available in reflectionCorrectedSql state field).';
  }

  const reflectDuration = Date.now() - reflectStart;
  logger.info(`Reflect (${reflectDuration}ms)`, { confidence, issues: issues.length });
  return update;
}

module.exports = { reflectNode };
