/**
 * Prompt templates for the Present node.
 *
 * Category-aware insight generation: adapts the analytical lens based on
 * whether the question is WHAT_HAPPENED, WHY, or WHAT_TO_DO.
 */

const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { getThreshold } = require('../vectordb/definitionsFetcher');

function coverageThresholdText() {
  const t = getThreshold('coverage');
  if (!t.green) return 'Coverage: Green >= 2.5x, Yellow >= 2.0x, Red < 2.0x';
  return `Coverage: Green >= ${t.green}x, Yellow >= ${t.yellow}x, Red < ${t.yellow}x`;
}

const CATEGORY_INSIGHT_GUIDANCE = {
  WHAT_HAPPENED: `ANALYTICAL LENS — "What Happened" (Facts & State):
- Highlight anomalies and outliers in the data (which regions/segments/products deviate most).
- Compare against known benchmarks: ${coverageThresholdText()}.
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
- Compare against known benchmarks when applicable (${coverageThresholdText()}).
- End with 2-3 natural follow-up questions the user should consider.`;

const INSIGHT_SYSTEM = `You are a senior sales analytics advisor. Given query results, produce concise insights.

{categoryGuidance}

{thresholdContext}

RESPONSE FORMAT — Choose the format that best fits the data:

**Format A — Narrative + Table** (use when results contain multiple KPIs, dimensions, or comparisons):
- Write a 2-paragraph summary (60 words max total, ~30 words each).
  - Para 1 (Strengths): Open with "Your [Metric] is at..." or "You are at..." — highlight what is on track.
  - Para 2 (Gaps): Open with "your numbers show [Metric]..." — highlight shortfalls.
- Bold **metric names only** — plain text for everything else.
- After the summary, present a markdown table with columns relevant to the data. Always include a Status column.
- Status Key:
  - ✅ On Track — at or above target
  - ⚠️ At Risk — 10–20% below target
  - 🔴 Behind — more than 20% below target
- The summary MUST appear BEFORE any table.

**Format B — Bullet** (use for single-value lookups or simple answers where a narrative does not fit):
- 3–5 crisp bullets, each 1 sentence with specific numbers.
- Lead with the most important finding.
- Compare against benchmarks when applicable (${coverageThresholdText()}).

RULES (apply to both formats):
- Never skip the opening summary/narrative.
- Bold only metric names — never bold other text.
- Show dollar values in millions (e.g., $38M) or thousands (e.g., $3.2K). Never show raw numbers like $38,000,000.
- Never open with robotic phrases like "Here are your metrics:" — use a natural, analytical, manager-like tone.
- Narrative word limit is 60 words. Tables, call-to-action, and follow-up sections are exempt from the word limit.

## Suggested Follow-Up Questions
- 2-3 questions progressing What -> Why -> Fix`;

const INSIGHT_USER = `{partialResultsNote}
Question: {question}
Question Category: {questionCategory}
Question Sub-Category: {questionSubCategory}

Columns: {columns}
Total rows: {rowCount}

Column Statistics (computed over ALL {rowCount} rows):
{columnStats}

Sample data ({sampleCount} rows):
{sampleData}

Use the column statistics to understand the full data distribution. The sample rows are for reference only — base your numerical claims on the statistics above, not the sample.
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

/**
 * Compute per-column summary statistics from the full result set.
 * Numeric columns get min/max/mean/median/sum; categorical columns get
 * distinct count and top values by frequency.
 */
function computeColumnStats(rows, columns) {
  if (!rows?.length || !columns?.length) return 'No data available.';

  const MAX_DISTINCT_DISPLAY = 10;
  const lines = [];

  for (const col of columns) {
    const values = rows.map((r) => r[col]);
    const nonNull = values.filter((v) => v != null && v !== '');
    const nullCount = values.length - nonNull.length;

    // Detect numeric column: check first non-null values
    const numericVals = nonNull
      .map((v) => (typeof v === 'number' ? v : Number(v)))
      .filter((n) => !isNaN(n));

    if (numericVals.length > nonNull.length * 0.7 && numericVals.length > 0) {
      // Numeric column
      numericVals.sort((a, b) => a - b);
      const sum = numericVals.reduce((s, v) => s + v, 0);
      const mean = sum / numericVals.length;
      const mid = Math.floor(numericVals.length / 2);
      const median = numericVals.length % 2 === 0
        ? (numericVals[mid - 1] + numericVals[mid]) / 2
        : numericVals[mid];
      const p25 = numericVals[Math.floor(numericVals.length * 0.25)];
      const p75 = numericVals[Math.floor(numericVals.length * 0.75)];

      const fmt = (n) => {
        if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
        if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
        return Number.isInteger(n) ? String(n) : n.toFixed(2);
      };

      let line = `  ${col} (numeric): min=${fmt(numericVals[0])}, max=${fmt(numericVals[numericVals.length - 1])}, mean=${fmt(mean)}, median=${fmt(median)}, P25=${fmt(p25)}, P75=${fmt(p75)}, sum=${fmt(sum)}`;
      if (nullCount > 0) line += `, nulls=${nullCount}`;
      lines.push(line);
    } else {
      // Categorical column
      const freq = {};
      for (const v of nonNull) {
        const key = String(v);
        freq[key] = (freq[key] || 0) + 1;
      }
      const distinct = Object.keys(freq).length;
      const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
      const topEntries = sorted.slice(0, MAX_DISTINCT_DISPLAY);
      const topStr = topEntries.map(([val, cnt]) => `${val} (${cnt})`).join(', ');

      let line = `  ${col} (categorical): ${distinct} distinct`;
      if (distinct <= MAX_DISTINCT_DISPLAY) {
        line += ` [${topStr}]`;
      } else {
        line += `, top ${MAX_DISTINCT_DISPLAY}: [${topStr}]`;
      }
      if (nullCount > 0) line += `, nulls=${nullCount}`;
      lines.push(line);
    }
  }

  return lines.join('\n');
}

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
    columnStats: computeColumnStats(exec?.rows, exec?.columns),
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

function buildThresholdContext() {
  const lines = ['KPI Thresholds for Status Assessment:'];

  const cov = getThreshold('coverage');
  if (cov.green) {
    lines.push(`- Coverage: On Track >= ${cov.green}x, At Risk >= ${cov.yellow}x, Behind < ${cov.yellow}x`);
  }

  const creation = getThreshold('creation');
  if (creation.green) {
    lines.push(`- Creation Coverage: On Track >= ${creation.green}x, At Risk >= ${creation.yellow}x, Behind < ${creation.yellow}x`);
  }

  const ds = getThreshold('dsScore');
  if (ds.high) {
    lines.push(`- Deal Sensei Score: High >= ${ds.high}, Medium >= ${ds.medium}, Low < ${ds.medium}`);
  }

  const prop = getThreshold('propensity');
  if (prop.high) {
    lines.push(`- Propensity to Buy: High >= ${prop.high}`);
  }

  return lines.length > 1 ? lines.join('\n') : '';
}

module.exports = {
  insightPrompt,
  chartPrompt,
  buildInsightInputs,
  buildChartInputs,
  computeColumnStats,
  buildThresholdContext,
  CATEGORY_INSIGHT_GUIDANCE,
  DEFAULT_INSIGHT_GUIDANCE,
};
