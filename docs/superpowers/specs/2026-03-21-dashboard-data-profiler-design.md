# Dashboard Data Profiler — Design Spec

## Problem

The dashboard agent makes layout and chart decisions based on 8 sample rows of raw JSON. This causes:

1. **Wrong chart types** — no awareness of whether data is time-series, categorical, or high-cardinality
2. **Shallow insights** — generic summaries because the LLM can't detect anomalies from 8 rows
3. **Weak multi-source dashboards** — no cross-source dimension matching for slicers or combined tiles
4. **Client-side performance** — browser aggregates thousands of rows for KPIs, charts, and slicer filtering
5. **Janky slicer loading** — empty dropdowns while separate DISTINCT queries run on mount
6. **Wasteful refinements** — client re-sends sample rows the server already has

## Solution: Unified Data Profiling Layer

A `dataProfiler` service that runs after SQL execution, before the dashboard agent LLM call. It computes a structured profile of each data source that serves two consumers:

- **Dashboard agent (LLM)** — profile-guided chart selection, anomaly-driven insights, multi-source join detection
- **Client rendering** — pre-computed aggregates, pre-fetched slicer values, cached tile data

## Architecture

### Pipeline Position

The `profileData` node has **two incoming edges** in the workflow graph, since dashboards are reached via different routes:

```
Path A (conversation history):
  Classify (intent=DASHBOARD, no data request) → ProfileData → DashboardAgent

Path B (fresh queries):
  Classify → Decompose → AlignSubQueries → ParallelSubQueryPipeline → InjectRLS
  → Validate → Execute → CheckResults → ProfileData → DashboardAgent

Refinement:
  Classify (matchType=dashboard_refine) → DashboardAgent  (no profiling)
```

The workflow routing changes in `workflow.js`:
- `routeAfterClassify`: when `intent === 'DASHBOARD' && !dashboardHasDataRequest` → route to `profileData` instead of `dashboardAgent` directly
- `routeAfterCheckResults`: when routing to `dashboardAgent` → route to `profileData` instead
- `profileData` always routes to `dashboardAgent` after completion
- Refinement path (`dashboard_refine`) continues routing directly to `dashboardAgent`, unchanged

### Three-Path Behavior

**Path A (conversation history):** `classify` routes to `profileData` (instead of directly to `dashboardAgent`). The profiler extracts execution results from `conversationHistory` assistant messages — mirroring the logic in `buildDashboardInputs()` at `dashboard.js` lines 166-187.

**Path B (fresh queries):** `checkResults` routes to `profileData` (instead of directly to `dashboardAgent`). The profiler iterates `state.queries[]` for each sub-query's execution result, plus `state.execution` if not already represented in `queries[]` — mirroring the assembly logic at `dashboard.js` lines 188-214.

**Refinement:** No profiling. `classify` routes directly to `dashboardAgent` (unchanged). The agent reads cached profiles from `state.dataProfiles[]` or falls back to session cache via `profileCacheKey`. Client sends `profileCacheKey` instead of serialized data sources.

## Component 1: Data Profiler Service

**File:** `server/services/dataProfiler.js`

Exports `profileDataSource(sql, rows, columns)` → returns a `DataProfile` object.

### Column Analysis

For each column:

| Field | Description |
|-------|-------------|
| `name` | Column name |
| `inferredType` | `numeric`, `date`, `categorical`, `text`, `boolean` |
| `cardinality` | Count of distinct non-null values |
| `nullRatio` | Fraction of null/empty values (0.0–1.0) |
| `distribution` | For numeric: `{ min, max, mean, median, p25, p75 }`. For categorical: `topValues[]` with counts |
| `distinctValues` | For cardinality ≤ 100: full list. Otherwise: top 100 by frequency |

**Type inference rules (evaluated in order, first match wins):**
- Only two distinct non-null values that are boolean-like (`true/false`, `1/0`, `yes/no`) → `boolean`
- Parseable as ISO date / common date formats → `date`
- All non-null values are numeric → `numeric`
- Cardinality ≤ 50 and non-numeric → `categorical`
- Cardinality > 50 and non-numeric → `text`

### Shape Detection

Computed across columns to identify data patterns:

| Signal | Detection Logic | Output |
|--------|----------------|--------|
| `isTimeSeries` | Has a `date` column with ≥ 5 distinct values + at least one `numeric` column | `{ dateColumn, measureColumns[] }` |
| `categoricalGroups` | `categorical` columns with cardinality 2–50 paired with `numeric` measures | `[{ dimension, measures[], cardinality }]` |
| `kpiCandidates` | `numeric` columns suitable for headline aggregation | `[{ column, suggestedAgg, prefix, suffix }]` |
| `highCardinalityWarnings` | Columns with cardinality > 50 that might be misused as x-axis | `[{ column, cardinality }]` |

### Chart Recommendations

Based on shape detection, the profiler outputs:

| Data Shape | Recommended Chart | Config Hint |
|-----------|-------------------|-------------|
| Time-series + 1 measure | `line` | `xAxis: dateCol, yAxis: [measure]` |
| Time-series + categorical grouping | `line` or `area` | `xAxis: dateCol, yAxis: [measure], groupBy: catCol` |
| Categorical (2–8 distinct) + 1 numeric (no time-series) | `pie` | `xAxis: catCol, yAxis: [measure]` |
| Categorical (9–20 distinct) + numeric, OR (2-8 distinct) + multiple numerics | `bar` | `xAxis: catCol, yAxis: [measures]` |
| Two categorical + numeric | `stacked_bar` | `xAxis: cat1, yAxis: [measure], groupBy: cat2` |
| Two numeric, no category | `scatter` | `xAxis: num1, yAxis: [num2]` |
| Single aggregatable numeric | `kpi` | `valueColumn, aggregation` |

The LLM receives these as structured hints. It can override recommendations but has evidence-based defaults.

### Anomaly Signals

Computed to feed richer insight tile generation:

| Signal | Method | Output Example |
|--------|--------|----------------|
| `outliers` | IQR method (values beyond 1.5× IQR) | `"Column 'Amount' has 3 outliers above $12M"` |
| `trend` | Linear regression on time-series | `"Amount is decreasing over time (r=-0.72)"` |
| `concentration` | Top N share of total | `"Top 3 of 45 accounts = 68% of Amount"` |
| `periodChange` | Group by time period, compute deltas | `"Q1→Q2: EMEA -23%, AMERICAS +8%"` |
| `missingPatterns` | Null ratio by group | `"APAC has 40% missing QuotaAmount"` |

Anomaly signals are formatted as natural language strings in the profile, ready for LLM prompt injection.

### Multi-Source Dimension Overlap

When multiple data sources exist, the profiler computes a `dimensionOverlapMap`:

```javascript
{
  "Region": {
    sources: [0, 1],
    matchType: "exact",        // column name match
    valueOverlap: 1.0,         // 100% of values shared
    sharedValues: ["AMERICAS", "APAC", "EMEA"]
  }
}
```

This tells the dashboard agent which dimensions can serve as cross-source slicers and which sources can be compared in insight tiles.

### Pre-Computed Outputs

Computed during profiling for direct client consumption:

| Output | Description |
|--------|-------------|
| `kpiAggregates` | `{ column: { sum, avg, count, min, max } }` for each KPI candidate |
| `slicerValues` | `{ dimension: string[] }` for all categorical columns with cardinality ≤ 100 |
| `groupedAggregates` | Pre-computed grouped data for top chart candidates (e.g., sum of Amount by Region) |
| `sparklineData` | Time-series points for KPI sparklines (monthly/quarterly bucketed) |

### Large Dataset Handling

For result sets > 1,000 rows:
- Shape detection and anomaly signals use a statistical sample (1,000 rows)
- Exact aggregates (KPIs, grouped data) computed on full dataset in-process
- For > 10,000 rows: aggregates pushed to SQL via the `/dashboard-data` endpoint

## Component 2: ProfileData LangGraph Node

**File:** `server/graph/nodes/profileData.js`

Thin wrapper that:
1. Collects execution results from state (`queries[]`, `execution`, or `conversationHistory`)
2. Calls `profileDataSource()` for each data source
3. Computes `dimensionOverlapMap` across sources
4. Stores profiles in `state.dataProfiles[]`
5. Populates session cache via `dashboardCache.set(sqlHash, profile)`
6. Emits `dashboard_progress: { status: 'profiling', sourceCount }` SSE event

On refinement (when `state.dataProfiles` already exists): returns immediately, no re-computation.

## Component 3: Session Cache

**File:** `server/services/dashboardCache.js`

In-memory `Map` keyed by SQL hash (SHA-256 of normalized SQL string).

```javascript
// Interface
set(sqlHash, { profile, tileData, timestamp })
get(sqlHash) → { profile, tileData } | null
getByKey(cacheKey) → { profile, tileData } | null  // for refinement lookups
invalidate(sqlHash)
clearSession(sessionId)
```

- **Max entries per session:** 20 (LRU eviction)
- **Cache key format:** `${sessionId}:${sqlHash}` — returned to client as `profileCacheKey`
- **Eviction:** LRU within session. No session lifecycle hooks exist in the current codebase, so cleanup relies on two mechanisms: (1) LRU eviction keeps the Map bounded, and (2) a periodic sweep (every 5 minutes) removes entries older than 30 minutes. This is sufficient because dashboard sessions are short-lived and the 20-entry LRU cap prevents unbounded growth. A session disconnect hook can be added later if session management is formalized.
- **Concurrency:** Single-process assumption. The in-memory Map is safe for Node.js single-threaded execution. If the server is ever clustered, this cache would need to move to Redis or similar. Noted as a known limitation.

## Component 4: Tile Data Builder

**File:** `server/services/tileDataBuilder.js`

After the dashboard agent produces a spec, the tile data builder generates render-ready data per tile using the cached profile:

```javascript
buildTileData(spec, profiles, cache) → tileData[]
```

Per tile type:
- **KPI:** `{ value, formatted, delta, sparklinePoints[] }`
- **Chart:** `{ rows[] }` — pre-grouped, pre-aggregated, guarded (max categories applied)
- **Insight:** `{ markdown }` — already in spec, passed through

Tile data is included in the SSE `done` event alongside the spec, so the client receives everything in one payload.

## Component 5: Enhanced Dashboard Agent

**Modified file:** `server/graph/nodes/dashboardAgent.js`

### Prompt Changes

**Modified file:** `server/prompts/dashboard.js`

Replace raw sample rows with structured profile in the user prompt:

```
Source 0: "Pipeline by Region"
  Columns:
    Region (categorical, 5 distinct: AMERICAS, APAC, EMEA, LATAM, ANZ)
    Stage (categorical, 6 distinct: Prospecting, Qualification, Proposal, Negotiation, Closed Won, Closed Lost)
    Amount (numeric, range: $1,200 – $45,000,000, mean: $2.1M, median: $850K)
    CloseDate (date, range: 2024-Q1 to 2025-Q2, 18 distinct months)

  Shape: time-series with categorical grouping
  Recommended charts:
    1. line (CloseDate × Amount, groupBy: Region) — trend over time
    2. bar (Region × sum(Amount)) — regional comparison
    3. stacked_bar (Stage × Amount, groupBy: Region) — pipeline composition

  KPI candidates:
    - Amount (sum) → "$X.XM" — Total Pipeline
    - Amount (count) → "X" — Deal Count

  Anomalies:
    - EMEA pipeline dropped 23% QoQ (only declining region)
    - Top 3 accounts represent 68% of total Amount
    - 12 outlier deals above $12M (IQR method)

  Slicer-eligible dimensions: Region (5), Stage (6)
```

The LLM receives rich, structured context instead of 8 raw JSON rows. It uses chart recommendations as strong defaults and anomaly signals to generate specific, data-driven insight tiles.

### Multi-Source Awareness

When `dimensionOverlapMap` has matches, the prompt includes:

```
Cross-source dimensions:
  "Region" — shared across Source 0, Source 1 (100% value overlap)
  → Use as cross-source slicer
  → Insight tiles can compare metrics across these sources by Region
```

### Validation Enhancement

`validateAndFixSpec` gains access to profiles for column validation instead of relying on fuzzy string matching against raw column names. Profile column metadata is authoritative.

## Component 6: Client Changes

### DashboardOverlay.jsx

- Accept `tileData[]` from SSE `done` event alongside `spec`
- Accept `slicerValues` pre-populated (no mount-time fetch)
- On refinement: send `profileCacheKey` instead of serialized data sources
- Fallback: if `tileData` is absent, use existing fetch-on-mount behavior

### DashboardGrid.jsx / DashboardChart.jsx

- If `tileData[tileId]` exists: render pre-aggregated rows directly (no `prepareData`, no `applyChartGuards`)
- Fallback: existing client-side aggregation from raw `execution.rows`

### KpiSparklineCard.jsx

- Accept a new `precomputed` prop: `{ value, formatted, sparklinePoints }`
- If `precomputed` is provided: render value directly and use `sparklinePoints` for the area chart (bypasses `computeKpiValue()` and `config.sparklineData`)
- Fallback: existing `computeKpiValue()` from raw rows when `precomputed` is absent
- `DashboardGrid` passes `precomputed` from `tileData[tileId]` when available

### ChatPanel.jsx

- On refinement: include `profileCacheKey` in the stream request instead of `dashboardDataSources[]`
- Payload drops from ~15-30KB to ~3-5KB

## State Changes

**Modified file:** `server/graph/state.js`

New `Annotation` fields:

```javascript
dataProfiles: Annotation({ reducer: (_, b) => b, default: () => null })
  // Array of DataProfile objects, one per data source

tileData: Annotation({ reducer: (_, b) => b, default: () => null })
  // Array of per-tile render-ready data

profileCacheKey: Annotation({ reducer: (_, b) => b, default: () => null })
  // Cache key for refinement lookups
```

Note: defaults use factory functions `() => null` per the existing `state.js` convention (not bare `null`).

## API Changes

### SSE `done` Event

Add `tileData[]`, `slicerValues`, and `profileCacheKey` to the done event payload. These fields are added to the `buildFinalResponse()` function in `textToSql.js`, sourced from state:

```javascript
{
  type: 'done',
  dashboardSpec: { ... },
  tileData: [ { tileId, value?, formatted?, rows?, sparklinePoints? } ],
  slicerValues: { Region: [...], Stage: [...] },
  profileCacheKey: "session123:abc456"
}
```

**Payload size note:** `tileData` contains pre-aggregated rows (typically 5-50 rows per chart tile, not raw data), so the addition is modest — roughly 2-10KB for a 6-tile dashboard. This is smaller than the raw `execution.rows` that would otherwise be sent. The existing `{ stripRows: true }` optimization on the main response remains in place; `tileData` replaces those stripped rows with compact aggregated equivalents.

### `/api/text-to-sql/dashboard-data` — New Mode: `tile`

```
POST /api/text-to-sql/dashboard-data
{ mode: "tile", profileCacheKey: "session123:abc456", tileId: "tile_1" }
→ { rows: [...], columns: [...] }
```

Returns pre-aggregated tile data from cache. Falls back to SQL re-execution if cache is evicted.

**Implementation note:** The existing endpoint validates `sql` as required and restricts `mode` to `['page', 'distinct']`. For the `tile` mode:
- Make `sql` conditionally required: required for `page` and `distinct` modes, not required for `tile` mode
- Extend the mode allowlist to `['page', 'distinct', 'tile']`
- `tile` mode requires `profileCacheKey` and `tileId` instead of `sql`

### Refinement Request Change

```
POST /api/text-to-sql/analyze-stream
{
  question: "Add a pie chart for stages",
  previousDashboardSpec: { ... },
  profileCacheKey: "session123:abc456",   // NEW — replaces dashboardDataSources
  dashboardRefinement: true
}
```

## Error Handling

| Failure | Fallback | User Impact |
|---------|----------|-------------|
| Profiler throws | Dashboard agent uses raw sample rows (current behavior) | Slightly worse chart choices, no anomaly insights |
| Cache miss on refinement | Re-profile from `state.queries[]` execution rows | ~200-500ms delay, transparent |
| Tile data not in cache | Client aggregates from raw `execution.rows` | Existing behavior, slightly slower for large datasets |
| Large dataset (>10K rows) | Profiler samples 1K rows for shape; SQL-pushed aggregates | Accurate aggregates, approximate shape detection |
| Profile produces no chart recommendations | LLM falls back to its own judgment with sample rows appended | Same quality as current behavior |

Every new component degrades gracefully to current behavior. The dashboard never breaks due to profiler issues.

## New Files Summary

| File | Purpose |
|------|---------|
| `server/services/dataProfiler.js` | Core profiling engine — column analysis, shape detection, anomalies, pre-computed outputs |
| `server/graph/nodes/profileData.js` | LangGraph node — orchestrates profiling, stores in state, populates cache |
| `server/services/dashboardCache.js` | Session-scoped in-memory cache keyed by SQL hash |
| `server/services/tileDataBuilder.js` | Converts spec + profiles into per-tile render-ready data |

## Modified Files Summary

| File | Change |
|------|--------|
| `server/graph/workflow.js` | Add `profileData` node with two incoming edges: `classify → profileData` (Path A) and `checkResults → profileData` (Path B). `profileData` always routes to `dashboardAgent`. Refinement path unchanged. |
| `server/graph/state.js` | Add `dataProfiles`, `tileData`, `profileCacheKey` annotations |
| `server/graph/nodes/dashboardAgent.js` | Read profiles from state, pass to prompt builder, use profiles for validation. Add `__testables` export for `validateAndFixSpec` and profile-to-prompt formatting to enable unit testing. |
| `server/prompts/dashboard.js` | Replace raw sample formatting with profile-based structured context |
| `server/routes/textToSql.js` | Add `tile` mode to `/dashboard-data` (update validation: make `sql` conditional, extend mode allowlist). Modify `buildFinalResponse()` to include `tileData`, `slicerValues`, `profileCacheKey` in SSE done event for dashboard responses. |
| `client/src/components/DashboardOverlay.jsx` | Consume pre-computed slicers, skip mount-time fetch, send `profileCacheKey` on refinement |
| `client/src/components/DashboardGrid.jsx` | Render from `tileData` when available, fallback to client aggregation |
| `client/src/components/dashboard/DashboardChart.jsx` | Use pre-aggregated rows, skip `prepareData`/`applyChartGuards` when server data present |
| `client/src/components/dashboard/KpiSparklineCard.jsx` | Use server-computed value/sparkline, keep `computeKpiValue` as fallback |
| `client/src/components/ChatPanel.jsx` | Send `profileCacheKey` on refinement instead of `dashboardDataSources[]` |

## Testing Strategy

- Unit tests for `dataProfiler.js`: type inference, shape detection, anomaly signals, edge cases (empty rows, all nulls, single row, all identical values in a column, single column dataset)
- Unit tests for `dashboardCache.js`: set/get/LRU eviction/periodic sweep cleanup
- Unit tests for `tileDataBuilder.js`: KPI computation, chart grouping, guard application
- Unit tests for `dashboardAgent.js` `__testables`: `validateAndFixSpec` with profile-based validation, profile-to-prompt formatting
- Integration test: full pipeline with profiler → dashboard agent → verify spec uses profile hints
- Fallback tests: profiler failure → verify dashboard agent still produces valid spec using raw samples
- Performance test: profile 10K rows in < 500ms

### Statistical Edge Cases

The profiler must handle these without throwing:
- **All identical values:** IQR = 0, linear regression undefined slope. Return `trend: 'flat'`, skip outlier detection.
- **Single row:** No meaningful distribution. Return column types and values only, skip shape/anomaly detection.
- **All nulls in a column:** `nullRatio: 1.0`, skip all analysis for that column.
- **Empty result set (0 rows):** Return empty profile with column names only (from metadata). No aggregates, no shapes.

### Module Convention

All new server files use CommonJS (`require`/`module.exports`) per the existing codebase convention. New files export both the public API and a `__testables` object for unit testing internal functions.
