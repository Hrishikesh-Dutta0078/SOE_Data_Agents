/**
 * LLM-based semantic validation using structured output.
 */

const { z } = require('zod');
const { getModel, getModelMeta } = require('../config/llm');
const logger = require('../utils/logger');
const {
  SEMANTIC_VALIDATOR_MAX_TOKENS,
  SEMANTIC_VALIDATOR_TEMPERATURE,
} = require('../config/constants');

const SemanticCheck = z.object({
  name: z.string(),
  passed: z.boolean(),
  reason: z.string(),
});

const SemanticResultSchema = z.object({
  approved: z.boolean(),
  checks: z.array(SemanticCheck),
});

const SYSTEM_PROMPT = `You are a SQL semantic validator. Given a user question, detected entities (metrics, dimensions, filters), and generated SQL, you must validate:

1. **Answers the question**: Does the SQL logically answer the user's question?
2. **Entity coverage**: Are the CORE entities (metrics and explicit dimensions from the question) represented?
   - Metrics should appear in SELECT (or appropriate aggregates)
   - Only dimensions the user EXPLICITLY asked for must be in GROUP BY / SELECT
   - Filters from the question should appear in WHERE
   - Do NOT fail just because optional or supplementary dimensions (like territory, role_coverage_bu) are missing — these are fine to omit if the user did not explicitly request them.
3. **Data leakage**: Does the SQL return data beyond the intended scope?
   - IMPORTANT: Ignore any REGION_ID / FLM_ID subquery filters — these are Row-Level Security (RLS) filters that are automatically injected by the system and are NOT part of the user's query. Do NOT flag them as scope leakage or inconsistency.
   - Only flag true leakage: wrong time range, wrong entity scope, or returning data the user did not ask for.
4. **Sales stage mapping**: If the question asks for a specific stage by name (S3, S4, S5, etc.) and the SQL uses SALES_STAGE_ID: stage names do NOT equal IDs. Mapping: S7=2, S6=3, S5=4, S4=5, S3=6. E.g. SALES_STAGE_ID = 4 returns S5 deals, not S4. If the user asked for S4 and SQL has SALES_STAGE_ID = 4, that is wrong (should be 5 or s.SALES_STAGE = 'S4' with join to vw_ebi_sales_stage).

Provide your evaluation as:
- approved: true or false
- checks: array of { name, passed, reason } for "answers_question", "entity_coverage", "no_data_leakage", "stage_mapping_correct" (only when question mentions a specific stage name)

If approved is false, include at least one check with passed: false and a clear reason.`;

function buildUserPrompt({ sql, question, detectedEntities, multiQueryContext }) {
  const entitiesStr = detectedEntities
    ? JSON.stringify(detectedEntities, null, 2)
    : '{}';
  const multiQueryNote = multiQueryContext
    ? `\n\n**IMPORTANT — Multi-Query Context:** ${multiQueryContext}\nValidate ONLY against the sub-question above, NOT against any broader original question.\n`
    : '';
  return `**User question:** ${question}
${multiQueryNote}
**Detected entities:** ${entitiesStr}

**Generated SQL:**
\`\`\`sql
${sql}
\`\`\`

Validate the SQL against the question and entities.`;
}

function checksToIssues(checks) {
  const issues = [];
  for (const c of checks || []) {
    if (!c.passed && c.reason) {
      issues.push({
        type: `SEMANTIC_${(c.name || 'unknown').toUpperCase()}`,
        severity: 'error',
        description: c.reason,
        suggested_fix: undefined,
      });
    }
  }
  return issues;
}

async function runSemanticPass({ userPrompt, nodeKey, profile }) {
  const baseModel = getModel({
    temperature: SEMANTIC_VALIDATOR_TEMPERATURE,
    maxTokens: SEMANTIC_VALIDATOR_MAX_TOKENS,
    cache: true,
    nodeKey,
    profile,
  });
  const llm = baseModel.withStructuredOutput(SemanticResultSchema);
  const parsed = await llm.invoke([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ]);

  const issues = checksToIssues(parsed.checks);
  const valid = parsed.approved === true && issues.length === 0;
  const uncertain = !Array.isArray(parsed.checks) || parsed.checks.length < 3;

  return {
    valid,
    issues,
    uncertain,
    llm: getModelMeta(baseModel),
  };
}

async function validateSemantics({
  sql,
  question,
  detectedEntities,
  multiQueryContext,
  nodeModelOverrides,
}) {
  const issues = [];

  if (!sql || typeof sql !== 'string') {
    issues.push({
      type: 'INVALID_INPUT',
      severity: 'error',
      description: 'SQL must be a non-empty string',
    });
    return { valid: false, issues, meta: null };
  }

  if (!question || typeof question !== 'string') {
    issues.push({
      type: 'INVALID_INPUT',
      severity: 'error',
      description: 'Question is required for semantic validation',
    });
    return { valid: false, issues, meta: null };
  }

  const userPrompt = buildUserPrompt({ sql, question, detectedEntities, multiQueryContext });
  let fastPass = null;
  let opusPass = null;
  let fallbackReason = '';

  try {
    fastPass = await runSemanticPass({
      userPrompt,
      nodeKey: 'semanticValidatorFast',
      profile: nodeModelOverrides?.semanticValidatorFast,
    });
  } catch (err) {
    fallbackReason = 'fast_error';
    logger.warn('Semantic validator fast pass failed, escalating to Opus', { error: err.message });
  }

  const needsFallback = !fastPass || !fastPass.valid || fastPass.uncertain;
  if (needsFallback) {
    if (!fallbackReason) {
      fallbackReason = fastPass?.uncertain ? 'fast_uncertain' : 'fast_invalid';
    }
    try {
      opusPass = await runSemanticPass({
        userPrompt,
        nodeKey: 'semanticValidatorOpus',
        profile: nodeModelOverrides?.semanticValidatorOpus,
      });
    } catch (err) {
      logger.error('Semantic validation fallback failed', { error: err.message });

      if (fastPass?.valid) {
        return {
          valid: true,
          issues: [],
          meta: {
            fallbackUsed: true,
            fallbackReason,
            fallbackError: err.message,
            primaryModel: fastPass.llm,
            fallbackModel: null,
            decision: 'accept_fast_due_to_fallback_error',
          },
        };
      }

      issues.push({
        type: 'SEMANTIC_ERROR',
        severity: 'error',
        description: `Semantic validation failed: ${err.message}`,
      });
      return {
        valid: false,
        issues,
        meta: {
          fallbackUsed: true,
          fallbackReason,
          fallbackError: err.message,
          primaryModel: fastPass?.llm || null,
          fallbackModel: null,
          decision: 'fail_due_to_fallback_error',
        },
      };
    }
  }

  if (!needsFallback) {
    return {
      valid: fastPass.valid,
      issues: fastPass.issues,
      meta: {
        fallbackUsed: false,
        fallbackReason: null,
        primaryModel: fastPass.llm,
        fallbackModel: null,
        decision: fastPass.valid ? 'fast_pass' : 'fast_fail',
      },
    };
  }

  const finalResult = opusPass || fastPass;
  return {
    valid: finalResult.valid,
    issues: finalResult.issues,
    meta: {
      fallbackUsed: !!opusPass,
      fallbackReason,
      primaryModel: fastPass?.llm || null,
      fallbackModel: opusPass?.llm || null,
      decision: finalResult.valid ? 'fallback_pass' : 'fallback_fail',
    },
  };
}

module.exports = { validateSemantics };
