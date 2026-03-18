/**
 * LangGraph Workflow — simplified pipeline with checkpointing.
 *
 * Graph: Classify -> ContextFetch -> GenerateSql ->
 *        InjectRLS -> Validate -> Execute -> CheckResults -> [AccumulateResult loop] -> Present
 * with correction loop via Correct -> GenerateSql.
 */

const { StateGraph, MemorySaver } = require('@langchain/langgraph');
const { WorkflowState } = require('./state');
const { classifyNode } = require('./nodes/classify');
const { decomposeNode } = require('./nodes/decompose');
const { contextFetchNode } = require('./nodes/contextFetch');
const { generateSqlNode } = require('./nodes/generateSql');
const { injectRlsNode } = require('./nodes/injectRls');
const { validateNode } = require('./nodes/validate');
const { correctNode } = require('./nodes/correct');
const { executeNode } = require('./nodes/execute');
const { checkResultsNode } = require('./nodes/checkResults');
const { diagnoseEmptyResultsNode } = require('./nodes/diagnoseEmptyResults');
const { accumulateResultNode } = require('./nodes/accumulateResult');
const { subQueryMatchNode } = require('./nodes/subQueryMatch');
const { alignSubQueriesToTemplatesNode } = require('./nodes/alignSubQueriesToTemplates');
const { parallelSubQueryPipelineNode } = require('./nodes/parallelSubQueryPipeline');
const { presentNode } = require('./nodes/present');
const { dashboardAgentNode } = require('./nodes/dashboardAgent');
const {
  MAX_CORRECTION_ROUNDS,
  MAX_RESULT_RETRIES,
} = require('../config/constants');
const logger = require('../utils/logger');

function routeAfterClassify(state) {
  if (state.matchType === 'dashboard_refine') {
    logger.info('Fast path: dashboard refinement, routing to dashboardAgent');
    return 'dashboardAgent';
  }
  if (state.intent === 'DASHBOARD') {
    if (state.dashboardHasDataRequest) {
      if (state.needsDecomposition) {
        logger.info('Dashboard path B: multi-query, routing to decompose');
        return 'decompose';
      }
      logger.info('Dashboard path B: single query, routing to contextFetch');
      return 'contextFetch';
    }
    logger.info('Dashboard path A: assembling from conversation history');
    return 'dashboardAgent';
  }
  if (state.intent === 'SQL_QUERY') {
    if (state.needsDecomposition) {
      logger.info(state.blueprintId
        ? `Blueprint path: "${state.blueprintId}" → decompose`
        : 'Multi-query path: routing to decompose');
      return 'decompose';
    }
    logger.info(`SQL path: matchType=${state.matchType || 'research'}, routing to contextFetch`);
    return 'contextFetch';
  }
  return '__end__';
}

function routeAfterInjectRls(state) {
  if (state.validationEnabled === false) {
    logger.info('Validation disabled, skipping to execute');
    return 'execute';
  }
  return 'validate';
}

function routeAfterValidate(state) {
  if (state.validationReport?.overall_valid) {
    return 'execute';
  }
  if ((state.attempts?.correction || 0) >= MAX_CORRECTION_ROUNDS) {
    if (state.errorType === 'SEMANTIC_ERROR') {
      const plan = state.queryPlan || [];
      const idx = state.currentQueryIndex || 0;
      if (plan.length > 1 && idx < plan.length - 1) {
        logger.warn(`Semantic validation failed for sub-query ${idx + 1}/${plan.length}, skipping to next sub-query`);
        return 'accumulateResult';
      }
      if ((state.queries || []).length > 0) {
        logger.warn('Semantic validation failed for last sub-query but earlier sub-queries have data, routing to present');
        return 'present';
      }
      logger.warn('Correction attempts exhausted for semantic errors, stopping without execution');
      return '__end__';
    }
    logger.warn('Correction attempts exhausted, executing anyway');
    return 'execute';
  }
  return 'correct';
}

function routeAfterExecute(state) {
  if (!state.execution?.success) {
    if ((state.attempts?.correction || 0) >= MAX_CORRECTION_ROUNDS) {
      logger.warn('Execution failed and correction attempts exhausted, ending');
      return 'checkResults';
    }
    logger.info('Execution failed, routing to correct', { error: (state.execution?.error || '').substring(0, 120) });
    return 'correct';
  }
  return 'checkResults';
}

function routeAfterCheckResults(state) {
  const plan = state.queryPlan || [];
  const idx = state.currentQueryIndex || 0;
  const hasMoreQueries = plan.length > 1 && idx < plan.length - 1;

  if (hasMoreQueries) {
    logger.info(`Multi-query loop: completed ${idx + 1}/${plan.length}, accumulating and continuing`);
    return 'accumulateResult';
  }

  if (state.resultsSuspicious && state.execution?.rowCount === 0) {
    return 'diagnoseEmptyResults';
  }

  if (state.execution?.success && state.execution?.rowCount > 0) {
    if (state.intent === 'DASHBOARD') {
      logger.info('Dashboard intent: routing to dashboardAgent instead of present');
      return 'dashboardAgent';
    }
    return 'present';
  }
  if ((state.queries || []).length > 0) {
    logger.info('Sub-queries completed (or partial), routing to present/dashboard');
    if (state.intent === 'DASHBOARD') {
      return 'dashboardAgent';
    }
    return 'present';
  }
  return '__end__';
}

function routeAfterDiagnose(state) {
  if (
    state.diagnostics?.action === 'retry_with_rewrite'
    && (state.attempts?.resultCheck || 0) < MAX_RESULT_RETRIES
  ) {
    return 'validate';
  }
  if ((state.queries || []).length > 0) {
    logger.info('Diagnosis gave up on last sub-query but earlier sub-queries have data, routing to present');
    return 'present';
  }
  return '__end__';
}

function routeAfterSubQueryMatch(state) {
  // All sub-queries go through contextFetch regardless of template match
  return 'contextFetch';
}

function routeAfterDecompose(state) {
  logger.info('Decompose complete, routing to template alignment', { subQueryCount: (state.queryPlan || []).length });
  return 'alignSubQueries';
}

function routeAfterAlign(state) {
  const plan = state.queryPlan || [];
  if (plan.length > 1) {
    logger.info('Multi-query: routing to parallel sub-query pipeline', { subQueryCount: plan.length });
    return 'parallelSubQueryPipeline';
  }
  return 'subQueryMatch';
}

const checkpointer = new MemorySaver();
let compiledGraph = null;

function buildWorkflow() {
  const graph = new StateGraph(WorkflowState)
    .addNode('classify', classifyNode)
    .addNode('decompose', decomposeNode)
    .addNode('contextFetch', contextFetchNode)
    .addNode('generateSql', generateSqlNode)
    .addNode('injectRls', injectRlsNode)
    .addNode('validate', validateNode)
    .addNode('correct', correctNode)
    .addNode('execute', executeNode)
    .addNode('checkResults', checkResultsNode)
    .addNode('diagnoseEmptyResults', diagnoseEmptyResultsNode)
    .addNode('accumulateResult', accumulateResultNode)
    .addNode('subQueryMatch', subQueryMatchNode)
    .addNode('alignSubQueries', alignSubQueriesToTemplatesNode)
    .addNode('parallelSubQueryPipeline', parallelSubQueryPipelineNode)
    .addNode('present', presentNode)
    .addNode('dashboardAgent', dashboardAgentNode)

    .addEdge('__start__', 'classify')
    .addConditionalEdges('classify', routeAfterClassify, ['decompose', 'contextFetch', 'dashboardAgent', '__end__'])
    .addEdge('decompose', 'alignSubQueries')
    .addConditionalEdges('alignSubQueries', routeAfterAlign, ['parallelSubQueryPipeline', 'subQueryMatch'])
    .addEdge('subQueryMatch', 'contextFetch')
    .addEdge('contextFetch', 'generateSql')
    .addEdge('generateSql', 'injectRls')
    .addConditionalEdges('injectRls', routeAfterInjectRls, ['validate', 'execute'])
    .addConditionalEdges('validate', routeAfterValidate, ['execute', 'correct', 'accumulateResult', 'present', '__end__'])
    .addEdge('correct', 'generateSql')
    .addConditionalEdges('execute', routeAfterExecute, ['checkResults', 'correct'])
    .addConditionalEdges('checkResults', routeAfterCheckResults, ['present', 'dashboardAgent', 'accumulateResult', 'diagnoseEmptyResults', '__end__'])
    .addEdge('parallelSubQueryPipeline', 'checkResults')
    .addEdge('accumulateResult', 'subQueryMatch')
    .addConditionalEdges('diagnoseEmptyResults', routeAfterDiagnose, ['validate', 'present', '__end__'])
    .addEdge('present', '__end__')
    .addEdge('dashboardAgent', '__end__');

  return graph.compile({ checkpointer });
}

function getWorkflow() {
  if (!compiledGraph) {
    compiledGraph = buildWorkflow();
    logger.info('LangGraph workflow compiled with MemorySaver checkpointer (multi-agent, multi-query)');
  }
  return compiledGraph;
}

module.exports = {
  getWorkflow,
  buildWorkflow,
  __testables: {
    routeAfterClassify,
    routeAfterInjectRls,
    routeAfterValidate,
    routeAfterExecute,
    routeAfterCheckResults,
    routeAfterDiagnose,
    routeAfterSubQueryMatch,
    routeAfterDecompose,
    routeAfterAlign,
  },
};
