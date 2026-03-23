/**
 * Prompt templates for the Dashboard Agent node.
 */

const fs = require('fs');
const path = require('path');
const { ChatPromptTemplate } = require('@langchain/core/prompts');

let _goldDashboardExamples = null;
function loadDashboardGoldExamples() {
  if (_goldDashboardExamples) return _goldDashboardExamples;
  try {
    const filePath = path.join(__dirname, '..', 'context', 'dashboardGoldExamples.json');
    _goldDashboardExamples = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    _goldDashboardExamples = [];
  }
  return _goldDashboardExamples;
}

function escapeBraces(str) {
  return str.replace(/\{/g, '{{').replace(/\}/g, '}}');
}

function formatGoldExamplesBlock() {
  const examples = loadDashboardGoldExamples();
  if (examples.length === 0) return '';

  const blocks = examples.map((ex) => {
    const srcDesc = ex.dataSources.map((s, i) =>
      `  Source ${i}: "${s.question}" — columns: ${s.columns.join(', ')}`,
    ).join('\n');
    const specJson = escapeBraces(JSON.stringify(ex.spec, null, 2));
    return `--- Example: ${ex.scenario} ---\nData sources:\n${srcDesc}\nSpec:\n${specJson}`;
  });

  return `\n\nFEW-SHOT EXAMPLES (use these as reference for layout quality):\n${blocks.join('\n\n')}`;
}

const DASHBOARD_SYSTEM = `You are a dashboard layout planner for a sales pipeline / revenue analytics system. Given a set of SQL query results from a conversation, produce a structured dashboard specification.

Your output MUST be a valid JSON object matching this exact schema:
{{
  "title": "<dashboard title>",
  "description": "<1-2 sentence description>",
  "slicers": [
    {{ "id": "<unique id>", "dimension": "<column name>", "values": [], "defaultValue": null }}
  ],
  "tiles": [
    {{
      "id": "<unique id>",
      "type": "<kpi | chart | table | insight>",
      "title": "<tile title>",
      "sourceIndex": <index of the data source>,
      "config": {{ ... }},
      "layout": {{ "x": <0-11>, "y": <row>, "w": <1-12>, "h": <height> }},
      "filterDimensions": ["<dimension columns this tile should filter on>"]
    }}
  ]
}}

TILE TYPE RULES:
  kpi — Use for single-value aggregates (totals, averages, counts). Config: {{ "valueColumn": "<numeric column name to aggregate>", "aggregation": "sum|avg|count|min|max", "prefix": "$", "suffix": "", "value": "<fallback label if no column>", "delta": "+8.2%", "trend": "up|down|flat", "sparklineKey": "<column for sparkline>" }}
  IMPORTANT for kpi: Always set valueColumn to the numeric column name and aggregation to compute the value from actual data. The frontend will compute the real number. Set prefix to "$" for currency values. Only use "value" as a fallback label when no numeric column is available.
  chart — Use for multi-row data with categories/time-series. Config: {{ "chartType": "bar|stacked_bar|line|pie|area|scatter", "xAxis": {{ "key": "<col>", "label": "<label>" }}, "yAxis": [{{ "key": "<col>", "label": "<label>" }}], "series": [], "groupBy": null, "aggregation": null, "tooltipFields": ["<extra columns to show on hover>"] }}
  table — NEVER use table tiles. Tables are not allowed on the dashboard. Use charts or KPIs instead. If the data is only suited for a table, skip it.
  insight — Use to provide natural language analysis paired with a chart. Config: {{ "markdown": "<2-3 sentence analysis of what the adjacent chart reveals, highlighting key takeaways, anomalies, or action items>" }}

LAYOUT RULES (12-column grid, react-grid-layout):
  KPI cards: w:3, h:2 — place across the top row (y:0)
  Charts: w:6, h:4 — place in the middle rows
  Insight cards: w:6, h:4 — place directly next to the chart they analyze (same row, adjacent column)

SLICER RULES:
  Identify dimension columns (e.g., Region, Segment, FiscalQuarterName) that appear in 2+ data sources.
  Set values to an empty array [] — the frontend will extract real distinct values from the actual data.
  Mark each tile's filterDimensions with the dimension column names it contains.
  If a dimension appears in only one data source, do NOT create a slicer for it.

KPI EXTRACTION:
  Do NOT try to compute the value yourself — set valueColumn to the numeric column and aggregation (sum/avg/count/min/max). The frontend computes the real value from all data rows.
  Set prefix to "$" for dollar amounts, suffix to "%" for percentages, or leave both empty for plain numbers.
  If time-series data is available, compute a delta between the latest and earliest period.
  Use trend: "up" if delta > 0, "down" if delta < 0, "flat" if delta = 0.

CHART SELECTION:
  Categorical grouping (region, segment) → bar or pie
  Time-series data (quarters, months) → line or area
  Two numeric axes → scatter
  Stacked categories → stacked_bar
  MANDATORY: For chart tiles, if the source data is row-level (one row per territory/rep/deal), you MUST set groupBy to a categorical column and aggregation to "sum" or "avg" to roll it up. Raw row-level data should go in tables, NEVER in charts.

QUALITY RULES (STRICT — follow these exactly):
  Generate AT MOST 6 tiles total. Focus on the most important and distinct insights.
  Prioritize: 1-2 KPIs for headline metrics, 2-3 charts with paired insight tiles for key visual patterns. For each chart, add an adjacent insight tile with 2-3 sentences of natural language analysis.
  Do NOT create redundant tiles showing the same data in different formats.
  Do NOT create charts from raw row-level data — always aggregate via groupBy + aggregation first.
  Pie charts: ONLY use when the xAxis dimension has 2-8 distinct categories (e.g., Coverage_Quality with Green/Red/Yellow, or Segment with 3-5 values). NEVER use pie for dimensions with many values (BU list, territory list, rep names). If in doubt, use bar instead.
  Bar charts: max 20 categories on x-axis. If the dimension has more distinct values, skip it entirely.
  Skip columns that are mostly NULL (>50%) or have only 1 distinct value — they add no insight.
  Do NOT duplicate: if one chart already shows pipeline by quarter, do not add another chart showing the same.

IMPORTANT: Generate IDs like "tile-1", "tile-2", "slicer-1" etc. Always provide valid layout coordinates. sourceIndex refers to the 0-based index of the data source in the list provided.`
  + formatGoldExamplesBlock();

const DASHBOARD_USER = `{dataContext}

=== ORIGINAL QUESTION ===
{question}

Analyze the data sources above and create an interactive dashboard specification. Include KPI cards for key metrics, charts for visual patterns, and tables for detail data. Identify shared dimensions for slicers.`;

const DASHBOARD_REFINE_USER = `{dataContext}

=== PREVIOUS DASHBOARD SPEC ===
{previousSpec}

=== USER REFINEMENT REQUEST ===
{refinement}

Modify the dashboard spec above according to the user's request.
RULES:
- Keep unchanged tiles intact (same id, config, layout).
- Only add, remove, or modify tiles that the user explicitly asked about.
- Preserve sourceIndex references — data sources have NOT changed.
- Output a complete spec (not a diff).
- All original tile type, layout, slicer, chart, and quality rules still apply.`;

const dashboardPrompt = ChatPromptTemplate.fromMessages([
  ['system', DASHBOARD_SYSTEM],
  ['human', DASHBOARD_USER],
]);

const dashboardRefinePrompt = ChatPromptTemplate.fromMessages([
  ['system', DASHBOARD_SYSTEM],
  ['human', DASHBOARD_REFINE_USER],
]);

function summarizeDataSource(source, index) {
  const parts = [`--- Data Source ${index} ---`];
  if (source.question) parts.push(`Question: ${source.question}`);
  if (source.sql) parts.push(`SQL: ${source.sql}`);

  const exec = source.execution;
  if (exec) {
    parts.push(`Row count: ${exec.rowCount ?? exec.rows?.length ?? 0}`);
    if (exec.columns?.length) parts.push(`Columns: ${exec.columns.join(', ')}`);
    if (exec.rows?.length > 0) {
      const sample = exec.rows.slice(0, 8);
      parts.push(`Sample rows:\n${JSON.stringify(sample, null, 2)}`);
    }
  }

  if (source.insights) parts.push(`Insights: ${source.insights.substring(0, 300)}`);
  if (source.chart) parts.push(`Chart config: ${JSON.stringify(source.chart)}`);

  return parts.join('\n');
}

function buildDataContext(dataSources) {
  if (!dataSources.length) return 'No data sources available.';
  return `=== DATA SOURCES (${dataSources.length} total) ===\n\n`
    + dataSources.map((s, i) => summarizeDataSource(s, i)).join('\n\n');
}

function formatProfileContext(profiles) {
  if (!profiles || profiles.length === 0) return null;

  const blocks = profiles.map((profile, i) => {
    const parts = [`--- Source ${i} ---`];
    parts.push('Columns:');
    for (const col of profile.columns) {
      let desc = `  ${col.name} (${col.inferredType}, ${col.cardinality} distinct`;
      if (col.inferredType === 'categorical' && col.distinctValues && col.distinctValues.length <= 10) {
        desc += `: ${col.distinctValues.join(', ')}`;
      }
      if (col.inferredType === 'numeric' && col.distribution) {
        desc += `, range: ${col.distribution.min}–${col.distribution.max}, mean: ${col.distribution.mean.toFixed(1)}`;
      }
      if (col.nullRatio > 0.05) desc += `, ${(col.nullRatio * 100).toFixed(0)}% null`;
      desc += ')';
      parts.push(desc);
    }

    if (profile.shapes) {
      if (profile.shapes.isTimeSeries) {
        const ts = profile.shapes.isTimeSeries;
        parts.push(`\nShape: time-series (${ts.dateColumn} × ${ts.measureColumns.join(', ')})`);
      }
      if (profile.shapes.categoricalGroups.length > 0) {
        const groups = profile.shapes.categoricalGroups.map((g) => `${g.dimension}(${g.cardinality})`).join(', ');
        parts.push(`Categorical groups: ${groups}`);
      }
    }

    if (profile.chartRecommendations?.length > 0) {
      parts.push('\nRecommended charts:');
      for (const rec of profile.chartRecommendations.slice(0, 3)) {
        parts.push(`  ${rec.chartType} (${rec.xAxis} × ${rec.yAxis.join(', ')}${rec.groupBy ? `, groupBy: ${rec.groupBy}` : ''}) — ${rec.reason}`);
      }
    }

    if (profile.shapes?.kpiCandidates?.length > 0) {
      parts.push('\nKPI candidates:');
      for (const kpi of profile.shapes.kpiCandidates) {
        parts.push(`  ${kpi.column} (${kpi.suggestedAgg}) ${kpi.prefix ? `prefix: "${kpi.prefix}"` : ''}${kpi.suffix ? ` suffix: "${kpi.suffix}"` : ''}`);
      }
    }

    const allAnomalies = [
      ...(profile.anomalies?.outliers || []),
      ...(profile.anomalies?.trend || []),
      ...(profile.anomalies?.concentration || []),
      ...(profile.anomalies?.periodChange || []),
    ];
    if (allAnomalies.length > 0) {
      parts.push('\nAnomalies:');
      for (const a of allAnomalies.slice(0, 5)) parts.push(`  - ${a}`);
    }

    const slicerDims = profile.preComputed?.slicerValues
      ? Object.entries(profile.preComputed.slicerValues).map(([k, v]) => `${k}(${v.length})`).join(', ')
      : '';
    if (slicerDims) parts.push(`\nSlicer-eligible dimensions: ${slicerDims}`);

    return parts.join('\n');
  });

  const overlap = profiles[0]?.dimensionOverlap;
  if (overlap && Object.keys(overlap).length > 0) {
    blocks.push('\n=== CROSS-SOURCE DIMENSIONS ===');
    for (const [dim, info] of Object.entries(overlap)) {
      blocks.push(`"${dim}" — shared across sources ${info.sources.join(', ')}`);
    }
  }

  return `=== DATA SOURCE PROFILES (${profiles.length} total) ===\n\n${blocks.join('\n\n')}`;
}

function buildDashboardInputs(state) {
  const isRefinement = !!(state.previousDashboardSpec && state.dashboardRefinement);

  if (isRefinement) {
    const externalSources = state.dashboardDataSources || [];

    let dataContext;
    if (externalSources.length > 0) {
      const dataSources = externalSources.map((s) => ({
        question: s.question || null,
        sql: s.sql || null,
        execution: s.execution || null,
        insights: s.insights || null,
        chart: s.chart || null,
      }));
      dataContext = buildDataContext(dataSources);
    } else if (state.dataProfiles?.length > 0) {
      dataContext = formatProfileContext(state.dataProfiles);
    } else {
      dataContext = 'No data sources available.';
    }

    return {
      dataContext,
      previousSpec: JSON.stringify(state.previousDashboardSpec, null, 2),
      refinement: state.dashboardRefinement,
      isRefinement: true,
    };
  }

  const dataSources = [];

  if (state.dashboardHasDataRequest) {
    const queries = state.queries || [];
    if (queries.length > 0) {
      for (const q of queries) {
        dataSources.push({
          question: q.subQuestion,
          sql: q.sql,
          execution: q.execution,
          insights: null,
          chart: null,
        });
      }
    }

    if (state.execution?.success && state.execution?.rows?.length > 0) {
      const alreadyCovered = queries.some(
        (q) => q.execution?.rows === state.execution.rows,
      );
      if (!alreadyCovered) {
        dataSources.push({
          question: state.question,
          sql: state.sql,
          execution: state.execution,
          insights: state.insights,
          chart: state.chart,
        });
      }
    }
  } else {
    const history = state.conversationHistory || [];
    for (const msg of history) {
      if (msg.role !== 'assistant') continue;
      if (!msg.sql && !msg.resultSummary) continue;
      dataSources.push({
        question: null,
        sql: msg.sql || msg.content,
        execution: msg.execution || null,
        insights: msg.insights || null,
        chart: msg.chart || null,
      });
    }
  }

  // If profiles are available, use them instead of raw data context
  if (state.dataProfiles && state.dataProfiles.length > 0) {
    return { dataContext: formatProfileContext(state.dataProfiles), question: state.question, isRefinement: false };
  }

  return { dataContext: buildDataContext(dataSources), question: state.question, isRefinement: false };
}

module.exports = { dashboardPrompt, dashboardRefinePrompt, buildDashboardInputs, summarizeDataSource, formatProfileContext };
