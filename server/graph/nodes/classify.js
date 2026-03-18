/**
 * Classify Node — Intent classification with two-tier gold example matching.
 *
 * Step 0c: Blueprint slash-command detection (< 1ms, no LLM).
 * Step 1: Programmatic exact match against gold example variants (< 1ms).
 *         If matched, skips the LLM call entirely and sets matchType = 'exact'.
 * Step 2: LLM-based classification with partial template matching.
 *         If LLM identifies a related template, sets matchType = 'partial'.
 *         Also detects analysis blueprint matches semantically.
 */

const fs = require('fs');
const path = require('path');
const { z } = require('zod');
const { getModel, getModelMeta } = require('../../config/llm');
const { searchRules } = require('../../vectordb/rulesFetcher');
const { classifyPrompt, buildClassifyInputs } = require('../../prompts/classify');
const { getSession } = require('../../memory/sessionMemory');
const logger = require('../../utils/logger');
const { CLASSIFY_MAX_TOKENS, CLASSIFY_TEMPERATURE } = require('../../config/constants');

const EXACT_MATCH_THRESHOLD = 0.8;

const DASHBOARD_PATTERNS = [
  /^\/dashboard\b/i,
  /^\/create[-\s]?dashboard\b/i,
];

// --- Analysis Blueprints ---
let _blueprintsCache = null;

function loadBlueprints() {
  if (_blueprintsCache) return _blueprintsCache;
  try {
    const filePath = path.join(__dirname, '..', '..', 'context', 'knowledge', 'analysis-blueprints.json');
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    _blueprintsCache = raw.blueprints || [];
  } catch {
    _blueprintsCache = [];
  }
  return _blueprintsCache;
}

function findBlueprintBySlashCommand(question) {
  const trimmed = question.trim();
  const lower = trimmed.toLowerCase();
  const blueprints = loadBlueprints();
  for (const bp of blueprints) {
    if (lower.startsWith(bp.slashCommand)) {
      // Preserve original case of user params (e.g., "EMEA", "Q2")
      const trailing = trimmed.slice(bp.slashCommand.length).trim();
      return { blueprint: bp, params: trailing };
    }
  }
  return null;
}

function getBlueprintContext() {
  const blueprints = loadBlueprints();
  if (blueprints.length === 0) return '';
  const lines = blueprints.map((bp) =>
    `[blueprint_id: ${bp.id}] "${bp.name}" — ${bp.description}\n  Trigger phrases: ${bp.triggers.join('; ')}`
  );
  return `\nANALYSIS BLUEPRINTS (if the user's question matches one of these, set matched_blueprint_id):\n${lines.join('\n')}\n`;
}

function hasDashboardableData(conversationHistory) {
  if (!Array.isArray(conversationHistory) || conversationHistory.length === 0) return false;
  return conversationHistory.some(
    (msg) => msg.role === 'assistant' && (msg.sql || msg.resultSummary),
  );
}

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

let _goldIndex = null;

function loadGoldIndex() {
  if (_goldIndex) return _goldIndex;

  const examplesMap = new Map();
  const variantIndex = [];

  try {
    const filePath = path.join(__dirname, '..', '..', 'context', 'goldExamples.json');
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    for (const ex of raw) {
      examplesMap.set(ex.id, ex);

      const allPhrases = [ex.question, ...(ex.variants || [])];
      for (const phrase of allPhrases) {
        variantIndex.push({
          id: ex.id,
          phrase,
          tokens: new Set(tokenize(phrase)),
        });
      }
    }
  } catch {
    /* gold examples not available */
  }

  _goldIndex = { examplesMap, variantIndex };
  return _goldIndex;
}

function findExactMatch(question) {
  const { variantIndex, examplesMap } = loadGoldIndex();
  if (variantIndex.length === 0) return null;

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

  if (bestScore >= EXACT_MATCH_THRESHOLD && bestId) {
    const example = examplesMap.get(bestId);
    return example
      ? { id: bestId, sql: example.sql, score: bestScore, questionCategory: example.questionCategory, questionSubCategory: example.questionSubCategory }
      : null;
  }

  return null;
}

const ClarificationQuestion = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()),
});

const DetectedEntities = z.object({
  metrics: z.array(z.string()).default([]),
  dimensions: z.array(z.string()).default([]),
  filters: z.array(z.string()).default([]),
  operations: z.array(z.string()).default([]),
});

const ClassifySchema = z.object({
  intent: z.enum(['SQL_QUERY', 'CLARIFICATION', 'GENERAL_CHAT', 'DASHBOARD']),
  complexity: z.enum(['SIMPLE', 'MODERATE', 'COMPLEX']).default('MODERATE'),
  detected_entities: DetectedEntities.default({ metrics: [], dimensions: [], filters: [], operations: [] }),
  question_category: z.enum(['WHAT_HAPPENED', 'WHY', 'WHAT_TO_DO']).default('WHAT_HAPPENED'),
  question_sub_category: z.string().default(''),
  matched_example_id: z.string().nullable().default(null),
  matched_blueprint_id: z.string().nullable().default(null),
  is_followup: z.boolean().default(false),
  needs_decomposition: z.boolean().default(false),
  dashboard_has_data_request: z.boolean().default(false),
  clarification_questions: z.array(ClarificationQuestion).default([]),
  reply: z.string().default(''),
  reasoning: z.string().default(''),
});

function formatContext(rules, goldExamples) {
  const sections = [];

  if (goldExamples.length > 0) {
    const exLines = goldExamples.map((ex) => {
      const variants = ex.variants?.length > 0 ? `\n  Variants: ${ex.variants.join('; ')}` : '';
      return `[id: ${ex.id}] Q: "${ex.question}"${variants}\n  Tables: ${(ex.tables_used || []).join(', ')}\n  SQL: ${ex.sql}`;
    });
    sections.push(`GOLD SQL TEMPLATES (verified, production-tested queries):\n${exLines.join('\n\n')}`);
  }

  if (rules.length > 0) {
    sections.push(`BUSINESS RULES:\n${rules.map((r) => `- [${r.category}] ${r.text}`).join('\n')}`);
  }

  if (sections.length === 0) return '';
  return `=== RETRIEVED CONTEXT ===\n\n${sections.join('\n\n')}`;
}

async function classifyNode(state) {
  const start = Date.now();
  logger.stage('1', 'Classify', 'intent + entities');

  const stateReset = {
    queryPlan: [],
    currentQueryIndex: 0,
    subQueryMatchFound: false,
    queries: null,
    attempts: { agent: 0, correction: 0, reflection: 0, resultCheck: 0 },
  };

  // Step 0a: Dashboard refinement fast path (< 5ms, no LLM)
  if (state.previousDashboardSpec) {
    const duration = Date.now() - start;
    logger.info(`Classify: dashboard refinement request, skipping to dashboardAgent (${duration}ms)`);
    return {
      ...stateReset,
      intent: 'DASHBOARD',
      complexity: 'SIMPLE',
      entities: { metrics: [], dimensions: [], filters: [], operations: [] },
      questionCategory: 'WHAT_HAPPENED',
      questionSubCategory: '',
      templateSql: '',
      matchType: 'dashboard_refine',
      needsDecomposition: false,
      dashboardHasDataRequest: false,
      clarificationQuestions: [],
      generalChatReply: '',
      orchestrationReasoning: 'Dashboard refinement — reusing existing data, routing to dashboardAgent.',
      trace: [{ node: 'classify', timestamp: start, duration, intent: 'DASHBOARD', matchType: 'dashboard_refine' }],
    };
  }

  // Step 0c: Blueprint slash-command detection
  const blueprintSlash = findBlueprintBySlashCommand(state.question);
  if (blueprintSlash) {
    const { blueprint, params } = blueprintSlash;

    let entities = { metrics: [], dimensions: [], filters: [], operations: [] };

    // When user params exist (e.g., "for EMEA Q2"), run a lightweight LLM call
    // to extract structured entities so the research agent can use them.
    if (params) {
      try {
        const entityModel = getModel({
          temperature: 0,
          maxTokens: 300,
          cache: true,
          nodeKey: 'classify',
          profile: state.nodeModelOverrides?.classify,
        }).withStructuredOutput(DetectedEntities);

        const subQueryContext = blueprint.subQueries
          ? blueprint.subQueries.map((sq) => `- ${sq.subQuestion || sq.purpose}`).join('\n')
          : '';

        const entitySystemPrompt = `Extract structured entities from the user's filter parameters for a multi-query sales analytics blueprint.

Blueprint: "${blueprint.name}" — ${blueprint.description}
${subQueryContext ? `Sub-queries this blueprint will execute:\n${subQueryContext}\n` : ''}
Recognizable filter values in this database (for reference only — do NOT include column names in your output):
- Global regions: AMERICAS, EMEA, APAC, WW
- Fiscal quarters: format "YYYY-QN" (e.g., 2026-Q1, 2026-Q2) — bare "Q2" means the current year's Q2
- Segments: Enterprise, Growth, SMB
- Sales stages: S1-Prospect, S2-Qualify, S3-Develop, S4-Prove

Identify:
- metrics: KPIs mentioned (pipeline, revenue, deal count, etc.)
- dimensions: grouping axes the user wants (region, segment, quarter, etc.)
- filters: the raw values the user wants to filter by (e.g., "EMEA", "Q2", "Enterprise"). Output ONLY the value itself — never prepend a column name like "REGION_ID = EMEA". The downstream agents will resolve the correct column.
- operations: comparisons or rankings (compare, rank, top N, etc.)

Return only what is explicitly stated in the user parameters.`;

        const extractionResult = await entityModel.invoke([
          { role: 'system', content: entitySystemPrompt },
          { role: 'user', content: `User parameters: ${params}` },
        ]);

        if (extractionResult) {
          entities = {
            metrics: extractionResult.metrics || [],
            dimensions: extractionResult.dimensions || [],
            filters: extractionResult.filters || [],
            operations: extractionResult.operations || [],
          };
          logger.info('Classify: extracted entities from blueprint params', { params, entities });
        }
      } catch (err) {
        logger.warn('Classify: entity extraction from blueprint params failed, continuing with empty entities', { error: err.message });
      }
    }

    const duration = Date.now() - start;
    logger.info(`Classify: blueprint slash-command "${blueprint.slashCommand}" matched → ${blueprint.id} (${duration}ms)${params ? ` params: "${params}"` : ''}`);
    return {
      ...stateReset,
      intent: 'SQL_QUERY',
      complexity: 'COMPLEX',
      entities,
      questionCategory: blueprint.category || 'WHAT_TO_DO',
      questionSubCategory: blueprint.subCategory || '',
      templateSql: '',
      matchType: 'blueprint',
      needsDecomposition: true,
      blueprintId: blueprint.id,
      blueprintMeta: { ...blueprint, userParams: params },
      clarificationQuestions: [],
      generalChatReply: '',
      orchestrationReasoning: `Blueprint slash-command "${blueprint.slashCommand}" → ${blueprint.name}${params ? ` (params: ${params})` : ''}.`,
      trace: [{ node: 'classify', timestamp: start, duration, intent: 'SQL_QUERY', matchType: 'blueprint', blueprintId: blueprint.id, entities }],
    };
  }

  // Step 0b: Dashboard slash-command detection (< 1ms)
  const isDashboardCommand = DASHBOARD_PATTERNS.some((p) => p.test(state.question.trim()));
  if (isDashboardCommand) {
    const trimmed = state.question.trim();
    const hasTrailingText = trimmed.replace(/^\/\S+\s*/, '').trim().length > 0;

    if (!hasTrailingText) {
      if (!hasDashboardableData(state.conversationHistory)) {
        const duration = Date.now() - start;
        logger.info(`Classify: /dashboard with no conversation data (${duration}ms)`);
        return {
          ...stateReset,
          intent: 'GENERAL_CHAT',
          complexity: 'SIMPLE',
          entities: { metrics: [], dimensions: [], filters: [], operations: [] },
          questionCategory: 'WHAT_HAPPENED',
          questionSubCategory: '',
          templateSql: '',
          matchType: '',
          needsDecomposition: false,
          dashboardHasDataRequest: false,
          clarificationQuestions: [],
          generalChatReply: "There's nothing to build a dashboard from yet. "
            + 'Try asking a few data questions first — like pipeline by region, '
            + 'deal progression, or coverage trends — and then ask me to create a dashboard.\n\n'
            + 'Or you can ask me directly: "Build me a dashboard showing pipeline progression '
            + 'and deals to focus" and I\'ll run the queries for you.',
          orchestrationReasoning: 'Dashboard requested but no conversation data available.',
          trace: [{ node: 'classify', timestamp: start, duration, intent: 'GENERAL_CHAT', matchType: 'none', dashboardNoData: true }],
        };
      }

      const duration = Date.now() - start;
      logger.info(`Classify: /dashboard from conversation data (${duration}ms)`);
      return {
        ...stateReset,
        intent: 'DASHBOARD',
        complexity: 'SIMPLE',
        entities: { metrics: [], dimensions: [], filters: [], operations: [] },
        questionCategory: 'WHAT_HAPPENED',
        questionSubCategory: '',
        templateSql: '',
        matchType: '',
        needsDecomposition: false,
        dashboardHasDataRequest: false,
        clarificationQuestions: [],
        generalChatReply: '',
        orchestrationReasoning: 'Slash command /dashboard — assembling from conversation data.',
        trace: [{ node: 'classify', timestamp: start, duration, intent: 'DASHBOARD', matchType: 'none', dashboardHasDataRequest: false }],
      };
    }
  }

  // Step 1: Programmatic exact match (< 1ms)
  const exactMatch = findExactMatch(state.question);
  if (exactMatch) {
    const duration = Date.now() - start;
    const category = exactMatch.questionCategory || 'WHAT_HAPPENED';
    const subCategory = exactMatch.questionSubCategory || '';
    logger.info(`Classify (${duration}ms)`, { intent: 'SQL_QUERY', matchType: 'template', matchId: exactMatch.id, score: exactMatch.score.toFixed(2) });
    return {
      ...stateReset,
      intent: 'SQL_QUERY',
      complexity: 'COMPLEX',
      entities: { metrics: [], dimensions: [], filters: [], operations: [] },
      questionCategory: category,
      questionSubCategory: subCategory,
      templateSql: exactMatch.sql,
      matchType: 'template',
      sql: exactMatch.sql,
      clarificationQuestions: [],
      generalChatReply: '',
      orchestrationReasoning: `Template match to gold example ${exactMatch.id} (score: ${exactMatch.score.toFixed(2)})`,
      trace: [{ node: 'classify', timestamp: start, duration, intent: 'SQL_QUERY', matchType: 'template', matchId: exactMatch.id, questionCategory: category }],
    };
  }

  // Step 1b: Explicit follow-up from UI — skip LLM call entirely
  if (state.isFollowUp) {
    const history = state.conversationHistory || [];
    let priorSql = null;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === 'assistant' && history[i].sql) {
        priorSql = history[i].sql;
        break;
      }
    }

    if (priorSql) {
      const session = state.sessionId ? getSession(state.sessionId) : null;
      const lastQuery = session?.queryHistory?.slice(-1)[0];
      const priorResearchBrief = lastQuery?.researchBrief || null;
      const priorEntities = lastQuery?.entities || null;
      const category = lastQuery?.questionCategory || 'WHAT_HAPPENED';

      const duration = Date.now() - start;
      logger.info(`Classify: explicit follow-up from UI, using prior SQL as template (${duration}ms)`);

      const output = {
        ...stateReset,
        intent: 'SQL_QUERY',
        complexity: 'MODERATE',
        entities: priorEntities || { metrics: [], dimensions: [], filters: [], operations: [] },
        questionCategory: category,
        questionSubCategory: lastQuery?.questionSubCategory || '',
        templateSql: priorSql,
        matchType: 'followup',
        needsDecomposition: false,
        clarificationQuestions: [],
        dashboardHasDataRequest: false,
        generalChatReply: '',
        orchestrationReasoning: 'Explicit follow-up from UI — reusing prior SQL as template.',
        trace: [{ node: 'classify', timestamp: start, duration, intent: 'SQL_QUERY', matchType: 'followup', isExplicitFollowUp: true, questionCategory: category }],
      };

      return output;
    }

    logger.info('Classify: explicit follow-up requested but no prior SQL found, falling through to normal classification');
  }

  // Step 2: LLM classification with partial template matching
  const rules = searchRules(state.question, 8);
  const { examplesMap } = loadGoldIndex();
  const goldExamples = [...examplesMap.values()];
  const blueprintContext = getBlueprintContext();
  const retrievedContext = formatContext(rules, goldExamples) + blueprintContext;

  const messages = await classifyPrompt.formatMessages(
    buildClassifyInputs(state, retrievedContext),
  );

  const baseModel = getModel({
    temperature: CLASSIFY_TEMPERATURE,
    maxTokens: CLASSIFY_MAX_TOKENS,
    cache: true,
    nodeKey: 'classify',
    profile: state.nodeModelOverrides?.classify,
  });
  const llmMeta = getModelMeta(baseModel);
  const model = baseModel.withStructuredOutput(ClassifySchema);

  let result;
  try {
    result = await model.invoke(messages);
  } catch (err) {
    logger.warn('Classify structured output failed, using fallback', { error: err.message });
    result = {
      intent: 'GENERAL_CHAT',
      complexity: 'SIMPLE',
      detected_entities: { metrics: [], dimensions: [], filters: [], operations: [] },
      matched_example_id: null,
      clarification_questions: [],
      reply: "I'm not sure I understood that. Could you rephrase your question?",
      reasoning: 'Failed to parse classifier response.',
    };
  }

  let templateSql = '';
  let matchType = '';
  let priorResearchBrief = null;
  let priorEntities = null;

  if (result.matched_example_id && result.intent === 'SQL_QUERY') {
    const matched = examplesMap.get(result.matched_example_id);
    if (matched?.sql) {
      templateSql = matched.sql;
      matchType = 'template';
      logger.info('  Classify: template match', { id: result.matched_example_id });
    } else {
      logger.warn('  Classify: matched_example_id not found in gold examples', { id: result.matched_example_id });
    }
  }

  if (!matchType && state.isFollowUp && result.intent === 'SQL_QUERY') {
    const history = state.conversationHistory || [];
    let priorSql = null;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === 'assistant' && history[i].sql) {
        priorSql = history[i].sql;
        break;
      }
    }

    const session = state.sessionId ? getSession(state.sessionId) : null;
    const lastQuery = session?.queryHistory?.slice(-1)[0];
    const priorCategory = lastQuery?.questionCategory || null;
    const currentCategory = result.question_category || 'WHAT_HAPPENED';
    const categoryChanged = priorCategory && priorCategory !== currentCategory;
    const isComplex = result.complexity === 'COMPLEX';

    if (categoryChanged || isComplex) {
      logger.info('  Classify: follow-up flagged but overridden — category changed or complex question, using full research path', {
        priorCategory,
        currentCategory,
        complexity: result.complexity,
      });
    } else if (priorSql) {
      templateSql = priorSql;
      matchType = 'followup';

      if (lastQuery) {
        priorResearchBrief = lastQuery.researchBrief || null;
        priorEntities = lastQuery.entities || null;
      }

      logger.info('  Classify: follow-up detected, using prior SQL as template', {
        hasBrief: !!priorResearchBrief,
        hasPriorEntities: !!priorEntities,
      });
    } else {
      logger.info('  Classify: follow-up detected but no prior SQL found in history, using normal path');
    }
  }

  const duration = Date.now() - start;
  const questionCategory = result.question_category || 'WHAT_HAPPENED';
  const questionSubCategory = result.question_sub_category || '';

  // Check for LLM-detected blueprint match
  let blueprintId = '';
  let blueprintMeta = null;
  if (result.matched_blueprint_id) {
    const blueprints = loadBlueprints();
    const bp = blueprints.find((b) => b.id === result.matched_blueprint_id);
    if (bp) {
      blueprintId = bp.id;
      blueprintMeta = { ...bp, userParams: '' };
      matchType = 'blueprint';
      logger.info('  Classify: LLM detected blueprint match', { id: bp.id, name: bp.name });
    }
  }

  const isDashboard = result.intent === 'DASHBOARD';
  const needsDecomposition = !!(
    (result.needs_decomposition || blueprintId)
    && (result.intent === 'SQL_QUERY' || isDashboard)
    && !matchType.match(/^(template|followup)$/)
  );

  const decompLabel = needsDecomposition ? ' | MULTI-QUERY' : '';
  logger.info(`[Classify] ${result.intent} | ${result.complexity} | ${questionCategory}${matchType ? ` | match:${matchType}` : ''}${decompLabel} (${duration}ms)`);

  const output = {
    ...stateReset,
    intent: blueprintId ? 'SQL_QUERY' : result.intent,
    complexity: blueprintId ? 'COMPLEX' : result.complexity,
    entities: result.detected_entities,
    questionCategory: blueprintMeta?.category || questionCategory,
    questionSubCategory: blueprintMeta?.subCategory || questionSubCategory,
    templateSql,
    matchType,
    needsDecomposition,
    blueprintId,
    blueprintMeta,
    clarificationQuestions: blueprintId ? [] : result.clarification_questions,
    dashboardHasDataRequest: !!(isDashboard && result.dashboard_has_data_request),
    generalChatReply: (!blueprintId && result.intent === 'GENERAL_CHAT') ? (result.reply || 'How can I help you today?') : '',
    orchestrationReasoning: blueprintId
      ? `LLM detected analysis blueprint "${blueprintMeta?.name}" — ${result.reasoning}`
      : result.reasoning,
    trace: [{
      node: 'classify',
      timestamp: start,
      duration,
      intent: blueprintId ? 'SQL_QUERY' : result.intent,
      complexity: blueprintId ? 'COMPLEX' : result.complexity,
      matchType: matchType || 'none',
      needsDecomposition,
      blueprintId: blueprintId || undefined,
      questionCategory: blueprintMeta?.category || questionCategory,
      questionSubCategory: blueprintMeta?.subCategory || questionSubCategory,
      llm: llmMeta,
    }],
  };

  return output;
}

module.exports = { classifyNode, findExactMatch, loadGoldIndex, loadBlueprints };
