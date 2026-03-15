/**
 * Prompt templates for the Present node.
 *
 * Category-aware insight generation: adapts the analytical lens based on
 * whether the question is WHAT_HAPPENED, WHY, or WHAT_TO_DO.
 */

const { ChatPromptTemplate } = require('@langchain/core/prompts');

const CATEGORY_INSIGHT_GUIDANCE = {
  WHAT_HAPPENED: `ANALYTICAL LENS — "What Happened" (Facts & State):
- Highlight anomalies and outliers in the data (which regions/segments/products deviate most).
- Compare against known benchmarks: Coverage Green >= 2.5x, Yellow >= 2.0x, Red < 2.0x.
- Flag whether values are "good or bad" relative to typical patterns at this point in the quarter.
- Quantify deltas: show absolute and percentage differences vs benchmarks or prior periods.
- Call out concentration risk if a small number of deals/reps/accounts dominate the results.
- End with 2-3 specific follow-up questions that ask "WHY" — e.g., "What is driving the shortfall in [worst area]?" or "Is the gap caused by creation miss or progression/slippage?"`,

  WHY: `ANALYTICAL LENS — "Why It Happened" (Diagnosis & Signals):
- Identify root causes from the data — break down drivers by creation miss vs progression/slippage vs attrition.
- Distinguish leading signals (stage momentum, DS Score trends, missing plan elements, repeated push counts) from lagging signals (coverage gap, low SS5 coverage, rolling 4Q decline).
- Quantify the contribution of each driver to the overall gap or issue.
- Flag correlations: do stalled deals correlate with missing BANT, mutual plan, or access to power?
- Highlight Deal Sensei Score patterns: DS Score >= 65 = higher booking likelihood; < 40 = high risk.
- End with 2-3 specific follow-up questions that ask "What to do" — e.g., "For each stall reason, what's the standard intervention?" or "Which deals to prioritize for progression?"`,

  WHAT_TO_DO: `ANALYTICAL LENS — "What To Do About It" (Actions & Next Steps):
- Prioritize actionable items — rank by impact (ARR, strategic value, likelihood of success).
- Map stall reasons to standard interventions: no mutual plan -> workshop; no access to power -> exec sponsor mapping; budget unclear -> business case/ROI; procurement delay -> early engagement plan.
- For progression candidates: specify the missing prerequisite (mutual plan, power access, BANT) and the next best action.
- For creation plays: identify accounts by whitespace/install base signal, recent engagement, partner potential.
- For Deal Sensei-based focus: flag high-ARR deals with high DS Score but low momentum for leadership inspection; flag mid-ARR deals with high momentum as pull-in candidates.
- End with 2-3 validation questions — e.g., "Track resolution rate over next 4 weeks" or "What is the creation trend after implementing these plays?"`,
};

const DEFAULT_INSIGHT_GUIDANCE = `ANALYTICAL LENS — General:
- Highlight key findings, trends, and anomalies. Be specific with numbers.
- Compare against known benchmarks when applicable (Coverage: Green >= 2.5x, Yellow >= 2.0x, Red < 2.0x).
- End with 2-3 natural follow-up questions the user should consider.`;

const INSIGHT_SYSTEM = `You are a senior sales analytics advisor for a pipeline / revenue analytics system. Given query results, produce 3-7 concise bullet-point insights that are strategically actionable.

Each bullet should be specific with numbers. Go beyond surface-level observations — connect findings to business implications.

{categoryGuidance}

FORMAT:
Return your response in two sections:

**Key Insights:**
- [Bullet-point insights, 3-7 items]

**Suggested Follow-Up Questions:**
- [2-3 natural next questions the user should ask, progressing from What -> Why -> Fix]`;

const INSIGHT_USER = `{partialResultsNote}
Question: {question}
Question Category: {questionCategory}
Question Sub-Category: {questionSubCategory}

Columns: {columns}
Total rows: {rowCount}
Sample data ({sampleCount} rows):
{sampleData}

Provide strategic insights and follow-up questions.`;

const insightPrompt = ChatPromptTemplate.fromMessages([
  ['system', INSIGHT_SYSTEM],
  ['human', INSIGHT_USER],
]);

const CHART_SYSTEM = `You are a data visualization expert. Recommend a chart configuration for the query results.

Provide:
- chartType: one of "bar", "stacked_bar", "line", "pie", "area", "scatter"
- xAxis: column name for x-axis
- yAxis: column name or array of column names for y-axis
- title: chart title
- reasoning: why this chart type`;

const CHART_USER = `Question: {question}

Columns: {columns}
Total rows: {rowCount}
Sample data ({sampleCount} rows):
{sampleData}

Recommend the best chart.`;

const chartPrompt = ChatPromptTemplate.fromMessages([
  ['system', CHART_SYSTEM],
  ['human', CHART_USER],
]);

function buildInsightInputs(state, sample) {
  const exec = state.execution;
  const category = state.questionCategory || '';
  const guidance = CATEGORY_INSIGHT_GUIDANCE[category] || DEFAULT_INSIGHT_GUIDANCE;

  return {
    partialResultsNote: '',
    question: state.question,
    questionCategory: category || 'GENERAL',
    questionSubCategory: state.questionSubCategory || 'general',
    categoryGuidance: guidance,
    columns: (exec?.columns || []).join(', '),
    rowCount: String(exec?.rowCount ?? 0),
    sampleCount: String(sample?.length ?? 0),
    sampleData: JSON.stringify(sample || [], null, 2),
  };
}

function buildChartInputs(state, sample) {
  const exec = state.execution;
  return {
    question: state.question,
    columns: (exec?.columns || []).join(', '),
    rowCount: String(exec?.rowCount ?? 0),
    sampleCount: String(sample?.length ?? 0),
    sampleData: JSON.stringify(sample || [], null, 2),
  };
}

module.exports = {
  insightPrompt,
  chartPrompt,
  buildInsightInputs,
  buildChartInputs,
  CATEGORY_INSIGHT_GUIDANCE,
  DEFAULT_INSIGHT_GUIDANCE,
};
