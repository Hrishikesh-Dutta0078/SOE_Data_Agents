/**
 * LangGraph state channel definitions for the Text-to-SQL workflow.
 *
 * Uses LangGraph's Annotation API to define typed state channels
 * with reducers that control how updates are merged.
 */

const { Annotation } = require('@langchain/langgraph');

const WorkflowState = Annotation.Root({
  // --- Input ---
  question: Annotation({ reducer: (_, b) => b, default: () => '' }),
  conversationHistory: Annotation({ reducer: (_, b) => b, default: () => [] }),
  resolvedQuestions: Annotation({ reducer: (_, b) => b, default: () => [] }),
  previousEntities: Annotation({ reducer: (_, b) => b, default: () => null }),
  sessionId: Annotation({ reducer: (_, b) => b, default: () => '' }),
  presentMode: Annotation({ reducer: (_, b) => b, default: () => 'full' }),
  rlsEnabled: Annotation({ reducer: (_, b) => b, default: () => true }),
  impersonateContext: Annotation({ reducer: (_, b) => b, default: () => null }),
  validationEnabled: Annotation({ reducer: (_, b) => b, default: () => true }),
  isFollowUp: Annotation({ reducer: (_, b) => b, default: () => false }),

  // --- Classify output ---
  intent: Annotation({ reducer: (_, b) => b, default: () => '' }),
  complexity: Annotation({ reducer: (_, b) => b, default: () => '' }),
  entities: Annotation({ reducer: (_, b) => b, default: () => null }),
  questionCategory: Annotation({ reducer: (_, b) => b, default: () => '' }),
  questionSubCategory: Annotation({ reducer: (_, b) => b, default: () => '' }),
  templateSql: Annotation({ reducer: (_, b) => b, default: () => '' }),
  matchType: Annotation({ reducer: (_, b) => b, default: () => '' }),
  needsDecomposition: Annotation({ reducer: (_, b) => b, default: () => false }),
  clarificationQuestions: Annotation({ reducer: (_, b) => b, default: () => [] }),
  generalChatReply: Annotation({ reducer: (_, b) => b, default: () => '' }),
  orchestrationReasoning: Annotation({ reducer: (_, b) => b, default: () => '' }),

  // --- Blueprint ---
  blueprintId: Annotation({ reducer: (_, b) => b, default: () => '' }),
  blueprintMeta: Annotation({ reducer: (_, b) => b, default: () => null }),

  // --- Multi-query decomposition ---
  queryPlan: Annotation({ reducer: (_, b) => b, default: () => [] }),
  queries: Annotation({
    reducer: (a, b) => {
      if (b === null) return [];
      return [...(a || []), ...(b || [])];
    },
    default: () => [],
  }),
  currentQueryIndex: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  subQueryMatchFound: Annotation({ reducer: (_, b) => b, default: () => false }),

  // --- Context Fetch output ---
  contextBundle: Annotation({ reducer: (a, b) => b ?? a, default: () => null }),

  // --- Generate SQL output ---
  sql: Annotation({ reducer: (_, b) => b, default: () => '' }),
  reasoning: Annotation({ reducer: (_, b) => b, default: () => '' }),

  // --- Correction guidance (set by correct node, consumed by generateSql) ---
  correctionGuidance: Annotation({ reducer: (a, b) => b ?? a, default: () => null }),

  // --- Reflect output ---
  reflectionConfidence: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  reflectionIssues: Annotation({ reducer: (_, b) => b, default: () => [] }),
  reflectionFeedback: Annotation({ reducer: (_, b) => b, default: () => '' }),
  reflectionCorrectedSql: Annotation({ reducer: (_, b) => b, default: () => null }),

  // --- Validation ---
  validationReport: Annotation({ reducer: (_, b) => b, default: () => null }),
  errorType: Annotation({ reducer: (_, b) => b, default: () => '' }),
  validationMeta: Annotation({ reducer: (_, b) => b, default: () => null }),

  // --- Execution ---
  execution: Annotation({ reducer: (_, b) => b, default: () => null }),
  resultsSuspicious: Annotation({ reducer: (_, b) => b, default: () => false }),
  diagnostics: Annotation({ reducer: (_, b) => b, default: () => null }),
  zeroRowGuidance: Annotation({ reducer: (_, b) => b, default: () => null }),

  // --- Presentation ---
  insights: Annotation({ reducer: (_, b) => b, default: () => '' }),
  chart: Annotation({ reducer: (_, b) => b, default: () => null }),
  suggestedFollowUps: Annotation({ reducer: (_, b) => b, default: () => [] }),

  // --- Dashboard ---
  dashboardSpec: Annotation({ reducer: (_, b) => b, default: () => null }),
  dashboardHasDataRequest: Annotation({ reducer: (_, b) => b, default: () => false }),
  previousDashboardSpec: Annotation({ reducer: (_, b) => b, default: () => null }),
  dashboardRefinement: Annotation({ reducer: (_, b) => b, default: () => '' }),
  dashboardDataSources: Annotation({ reducer: (_, b) => b, default: () => [] }),

  // --- Tool toggles (testing): { research: string[], sqlWriter: string[] } — if set, only these tools are enabled
  enabledTools: Annotation({ reducer: (_, b) => b, default: () => null }),

  // --- Per-node model override: { [nodeKey]: 'haiku'|'sonnet'|'opus' } or null for defaults
  nodeModelOverrides: Annotation({ reducer: (_, b) => b, default: () => null }),

  // --- Agentic control ---
  attempts: Annotation({
    reducer: (_, b) => b,
    default: () => ({ agent: 0, correction: 0, reflection: 0, resultCheck: 0 }),
  }),
  trace: Annotation({
    reducer: (a, b) => [...(a || []), ...(b || [])],
    default: () => [],
  }),
  warnings: Annotation({
    reducer: (a, b) => [...(a || []), ...(b || [])],
    default: () => [],
  }),
});

module.exports = { WorkflowState };
