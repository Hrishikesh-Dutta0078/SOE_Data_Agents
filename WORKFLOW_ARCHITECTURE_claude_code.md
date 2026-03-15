# Auto Agents - Workflow Architecture

A fully autonomous agentic **Text-to-SQL** system. Users ask natural language questions, and a multi-agent LangGraph pipeline researches the schema, writes SQL, validates it, executes against SQL Server (MSSQL), and presents results with insights and optional interactive dashboards.

**Monorepo structure:**

| Package | Stack | Module System |
|---------|-------|---------------|
| `server/` | Express.js + LangGraph + LangChain | CommonJS (Node 18+) |
| `client/` | React 19 + Vite + Tailwind CSS v4 | ESM |

---

## 1. High-Level System Architecture

```mermaid
graph LR
    subgraph Client["Client (React 19 + Vite)"]
        SPA["Single Page App<br/>Tailwind CSS v4 + Recharts"]
    end

    subgraph Server["Server (Express.js + LangGraph)"]
        API["REST + SSE API"]
        WF["LangGraph StateGraph<br/>16-Node Pipeline"]
        KL["Knowledge Layer<br/>Pre-loaded JSON"]
    end

    subgraph LLM["Claude via Azure AI Foundry"]
        Opus["Claude Opus<br/>(Quality - Default)"]
        Haiku["Claude Haiku<br/>(Fast - Research & SQL)"]
    end

    DB[(SQL Server<br/>MSSQL)]
    Okta["Okta IdP<br/>OAuth 2.0 PKCE"]

    SPA -- "SSE Stream<br/>POST /api/text-to-sql/analyze-stream" --> API
    API --> WF
    WF --> Opus
    WF --> Haiku
    WF -- "Execute SQL" --> DB
    WF -- "Dry-run PARSEONLY" --> DB
    KL -- "Schema, Rules,<br/>Examples, Joins" --> WF
    SPA -- "Session Cookie" --> Okta
    API -- "Token Exchange" --> Okta
```

---

## 2. Server Middleware & Startup

```mermaid
graph TD
    REQ["Incoming Request"] --> H["helmet()<br/>Security Headers"]
    H --> CORS["cors()<br/>Allowed Origins"]
    CORS --> JSON["express.json()<br/>5 MB Limit"]
    JSON --> SESS["express-session<br/>Cookie-based"]
    SESS --> AUTH{"requireAuth<br/>Middleware"}
    AUTH -- "Public Path<br/>/login, /health, /auth/me" --> ROUTES
    AUTH -- "Authenticated" --> ROUTES["Route Handlers"]
    AUTH -- "401 Unauthorized" --> LOGIN["Redirect /login"]
    ROUTES --> STATIC["express.static<br/>server/public/"]
    STATIC --> SPA_FALL["SPA Fallback<br/>index.html"]

    subgraph Startup["Parallel Startup (Promise.allSettled)"]
        direction LR
        DBP["DB Pool<br/>Connect"]
        S1["Schema<br/>Fetcher"]
        S2["Distinct Values<br/>Fetcher"]
        S3["Examples<br/>Fetcher"]
        S4["Rules<br/>Fetcher"]
        S5["Join Rules<br/>Fetcher"]
        S6["KPI Glossary<br/>Fetcher"]
    end
```

**API Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/text-to-sql/analyze-stream` | SSE streaming query processing |
| `POST` | `/api/text-to-sql/analyze` | Batch query processing |
| `POST` | `/api/text-to-sql/dashboard-data` | Paginated data + slicer values |
| `GET` | `/api/text-to-sql/history/:threadId` | LangGraph checkpoint history |
| `GET` | `/api/health` | Health check (server, DB, LLM) |
| `GET` | `/api/impersonate/search` | RLS impersonation user search |
| `GET` | `/api/auth/me` | Current user session check |

---

## 3. Complete LangGraph Workflow

The core pipeline is a LangGraph `StateGraph` with **16 nodes** and conditional routing. This is the master diagram of the entire agent workflow.

```mermaid
graph TD
    START(("__start__")) --> classify

    subgraph Classification["Classification & Decomposition"]
        style Classification fill:#dbeafe,stroke:#3b82f6
        classify["classify<br/><i>Intent + Template Match</i>"]
        decompose["decompose<br/><i>Break into Sub-Queries</i>"]
        align["alignSubQueries<br/><i>Template Resolution</i>"]
    end

    subgraph Research["Research & SQL Generation"]
        style Research fill:#dcfce7,stroke:#22c55e
        subQueryMatch["subQueryMatch<br/><i>Per-Query Template Check</i>"]
        researchAgent["researchAgent<br/><i>ReAct - Schema Discovery</i>"]
        sqlWriterAgent["sqlWriterAgent<br/><i>ReAct - SQL Generation</i>"]
    end

    subgraph Validation["Validation & Correction"]
        style Validation fill:#ffedd5,stroke:#f97316
        injectRls["injectRls<br/><i>Row-Level Security</i>"]
        validate["validate<br/><i>4-Pass Validation</i>"]
        correct["correct<br/><i>LLM SQL Correction</i>"]
    end

    subgraph Execution["Execution & Results"]
        style Execution fill:#f3e8ff,stroke:#a855f7
        execute["execute<br/><i>Run Against MSSQL</i>"]
        checkResults["checkResults<br/><i>Quality Analysis</i>"]
        diagnose["diagnoseEmptyResults<br/><i>Auto-Rewrite</i>"]
    end

    subgraph MultiQuery["Multi-Query Loop"]
        style MultiQuery fill:#ccfbf1,stroke:#14b8a6
        parallel["parallelSubQueryPipeline<br/><i>Parallel Execution</i>"]
        accumulate["accumulateResult<br/><i>Snapshot + Next Query</i>"]
    end

    subgraph Presentation["Presentation"]
        style Presentation fill:#fce7f3,stroke:#ec4899
        present["present<br/><i>Insights + Chart</i>"]
        dashboard["dashboardAgent<br/><i>Dashboard Tiles</i>"]
    end

    %% From classify
    classify -- "needsDecomposition" --> decompose
    classify -- "no match" --> researchAgent
    classify -- "partial / followup" --> sqlWriterAgent
    classify -- "exact match" --> injectRls
    classify -- "dashboard_refine /<br/>DASHBOARD (no data)" --> dashboard
    classify -- "GENERAL_CHAT /<br/>CLARIFICATION" --> END_NODE(("__end__"))

    %% Decomposition path
    decompose --> align
    align -- "> 1 sub-queries" --> parallel
    align -- "single sub-query" --> subQueryMatch

    %% Sub-query matching
    subQueryMatch -- "template found" --> sqlWriterAgent
    subQueryMatch -- "no match" --> researchAgent

    %% Research to SQL
    researchAgent --> sqlWriterAgent

    %% SQL writer output
    sqlWriterAgent -- "has SQL" --> injectRls
    sqlWriterAgent -- "no SQL produced" --> END_NODE

    %% RLS routing
    injectRls -- "validation enabled" --> validate
    injectRls -- "exact/followup/<br/>validation disabled" --> execute

    %% Validation routing
    validate -- "valid" --> execute
    validate -- "invalid +<br/>retries left" --> correct
    validate -- "exhausted +<br/>semantic error" --> accumulate
    validate -- "exhausted +<br/>has prior data" --> present
    validate -- "exhausted +<br/>no data" --> END_NODE

    %% Correction loop
    correct --> injectRls

    %% Execution routing
    execute -- "success / exhausted" --> checkResults
    execute -- "failed +<br/>retries left" --> correct

    %% Check results routing
    checkResults -- "more sub-queries" --> accumulate
    checkResults -- "0 rows + suspicious" --> diagnose
    checkResults -- "DASHBOARD intent" --> dashboard
    checkResults -- "has data" --> present
    checkResults -- "no data anywhere" --> END_NODE

    %% Parallel pipeline
    parallel --> checkResults

    %% Accumulate loop
    accumulate --> subQueryMatch

    %% Diagnose routing
    diagnose -- "retry with rewrite" --> validate
    diagnose -- "has prior data" --> present
    diagnose -- "no data" --> END_NODE

    %% Terminal nodes
    present --> END_NODE
    dashboard --> END_NODE
```

---

## 4. Classification & Routing Logic

The `classify` node determines intent and match type, then routes to the appropriate path. This is the entry-point decision tree.

```mermaid
graph TD
    Q["User Question"] --> D0{"previousDashboardSpec?"}
    D0 -- "Yes" --> DR["dashboard_refine<br/>--> dashboardAgent"]
    D0 -- "No" --> D1{"Programmatic Exact Match<br/>Token Overlap >= 0.8?"}
    D1 -- "Yes" --> EM["matchType = exact<br/>--> injectRls<br/><i>Skip research + writer</i>"]
    D1 -- "No" --> D1b{"isFollowUp flag +<br/>prior SQL exists?"}
    D1b -- "Yes" --> FU["matchType = followup<br/>--> sqlWriterAgent<br/><i>Adapt prior SQL</i>"]
    D1b -- "No" --> D2["LLM Classification"]
    D2 --> D3{"matched_example_id<br/>found?"}
    D3 -- "Yes" --> PM["matchType = partial<br/>--> sqlWriterAgent<br/><i>Use gold template</i>"]
    D3 -- "No" --> D4{"intent?"}
    D4 -- "DASHBOARD +<br/>has data request" --> D5{"needsDecomposition?"}
    D5 -- "Yes" --> DEC["--&gt; decompose"]
    D5 -- "No" --> RES["--&gt; researchAgent"]
    D4 -- "DASHBOARD +<br/>no data request" --> DASH["--&gt; dashboardAgent<br/><i>Assemble from history</i>"]
    D4 -- "SQL_QUERY" --> D6{"needsDecomposition?"}
    D6 -- "Yes" --> DEC2["--&gt; decompose"]
    D6 -- "No" --> RES2["--&gt; researchAgent"]
    D4 -- "GENERAL_CHAT /<br/>CLARIFICATION" --> END["--&gt; __end__<br/><i>Return reply directly</i>"]
```

**Match Types:**

| Match Type | Skip Research? | Skip Writer? | Description |
|------------|---------------|-------------|-------------|
| `exact` | Yes | Yes | Token overlap >= 0.8 with gold example |
| `partial` | Yes | No | LLM matched to a gold example ID |
| `followup` | Yes | No | Adapts prior SQL from conversation |
| `dashboard_refine` | Yes | Yes | Modifies existing dashboard spec |
| `none` | No | No | Full research + write pipeline |

---

## 5. Multi-Query Decomposition & Parallel Pipeline

Complex questions are broken into sub-queries (up to `MAX_SUB_QUERIES = 4`) and executed in parallel.

### Decomposition Flow

```mermaid
graph TD
    CL["classify<br/>needsDecomposition = true"] --> DEC["decompose<br/><i>LLM breaks question<br/>into sub-queries</i>"]
    DEC --> ALIGN["alignSubQueriesToTemplates<br/><i>Template match per sub-query</i>"]
    ALIGN --> BRANCH{"queryPlan.length?"}
    BRANCH -- "> 1 sub-queries" --> PAR["parallelSubQueryPipeline<br/><i>All sub-queries in parallel</i>"]
    BRANCH -- "= 1 sub-query" --> SQM["subQueryMatch<br/><i>Sequential path</i>"]
    PAR --> CR["checkResults<br/><i>Evaluate all results</i>"]
    SQM --> NEXT["researchAgent or sqlWriterAgent<br/><i>Depending on template match</i>"]
```

### Inside the Parallel Pipeline

Each sub-query runs through a mini-pipeline concurrently. Failed queries get one correction pass.

```mermaid
graph TD
    subgraph "Per Sub-Query (runs in parallel)"
        SQM2["subQueryMatch"] --> TMPL{"Template<br/>found?"}
        TMPL -- "Yes" --> SQL["sqlWriterAgent"]
        TMPL -- "No" --> RES["researchAgent"] --> SQL
        SQL --> RLS["injectRls"]
        RLS --> VAL["validate"]
        VAL -- "valid" --> EXEC["execute"]
        VAL -- "invalid" --> CORR["correct<br/><i>1 correction pass</i>"]
        CORR --> RLS2["injectRls"] --> VAL2["validate"] --> EXEC
        EXEC --> RESULT["Result snapshot"]
    end

    RESULT --> MERGE["Merge all sub-query results<br/>into state.queries array"]
    MERGE --> CHECK["checkResults"]
```

### Parallel Execution Timeline

```mermaid
sequenceDiagram
    participant O as Orchestrator
    participant Q1 as Sub-Query 1
    participant Q2 as Sub-Query 2
    participant Q3 as Sub-Query 3

    O->>Q1: Start (research + sql + validate + execute)
    O->>Q2: Start (research + sql + validate + execute)
    O->>Q3: Start (research + sql + validate + execute)

    Note over Q1: discover_context prefetch<br/>shared with Q2, Q3

    Q1-->>O: Result (success)
    Q3-->>O: Result (success)
    Q2-->>O: Result (FAILED)

    O->>Q2: Correction pass (correct + validate + execute)
    Q2-->>O: Result (success or partial)

    O->>O: Merge all results into state.queries
    O->>O: Route to checkResults
```

**Key constants:**
- `MAX_SUB_QUERIES = 4`
- `PARALLEL_CORRECTION_ROUNDS = 1`
- `SUB_QUERY_MATCH_THRESHOLD = 0.4`

---

## 6. Validation Pipeline

Four sequential validation passes with short-circuit on failure. The semantic (LLM) pass only runs if all prior passes succeed — saving LLM cost.

```mermaid
graph TD
    SQL_IN["SQL from writer / corrector"] --> P1["Pass 1: RLS Validation<br/><i>Programmatic - checks<br/>REGION_ID/FLM_ID filters</i>"]
    P1 -- "PASS" --> P2["Pass 2: Syntax Validation<br/><i>SET PARSEONLY ON<br/>Dry-run against MSSQL</i>"]
    P1 -- "FAIL" --> FAIL1["RLS_ERROR<br/>Return Invalid"]
    P2 -- "PASS" --> P3["Pass 2b: Schema Validation<br/><i>Column/table names vs<br/>schema-knowledge.json</i>"]
    P2 -- "FAIL" --> FAIL2["SYNTAX_ERROR<br/>Return Invalid"]
    P2 -. "Skip if agent<br/>already dry-ran<br/>(hash dedup)" .-> P3
    P3 -- "PASS" --> P4["Pass 3: Semantic Validation<br/><i>LLM logic review<br/>Question-SQL alignment</i>"]
    P3 -- "FAIL" --> FAIL3["SCHEMA_ERROR<br/>Return Invalid"]
    P4 -- "PASS" --> VALID["overall_valid = true<br/>Route to execute"]
    P4 -- "FAIL" --> FAIL4["SEMANTIC_ERROR<br/>Return Invalid"]

    style P1 fill:#e0f2fe,stroke:#0284c7
    style P2 fill:#fef3c7,stroke:#d97706
    style P3 fill:#f3e8ff,stroke:#9333ea
    style P4 fill:#fce7f3,stroke:#db2777
```

**Validation sources:**

| Pass | Type | Source | Speed |
|------|------|--------|-------|
| RLS | Programmatic | `rlsValidator.js` | < 1ms |
| Syntax | DB Dry-run | `syntaxValidator.js` (PARSEONLY) | ~50ms |
| Schema | Deterministic | `schemaValidator.js` vs JSON | < 5ms |
| Semantic | LLM | `semanticValidator.js` (Opus) | ~3-5s |

---

## 7. Correction Loop

When validation fails and correction attempts remain, the SQL is rewritten by the LLM and re-validated.

```mermaid
graph TD
    VAL{"validate"} -- "INVALID +<br/>attempts < 3" --> CORRECT["correct<br/><i>LLM rewrites SQL using:<br/>- Error details<br/>- Schema suggestions<br/>- Research brief<br/>- Prior attempts</i>"]
    CORRECT --> RLS["injectRls<br/><i>Re-inject RLS filters</i>"]
    RLS --> VAL

    VAL -- "VALID" --> EXEC["execute"]
    EXEC -- "Runtime error +<br/>attempts < 3" --> CORRECT

    VAL -- "INVALID +<br/>attempts >= 3 +<br/>non-semantic" --> EXEC_ANYWAY["execute<br/><i>Run anyway (risky)</i>"]
    VAL -- "INVALID +<br/>attempts >= 3 +<br/>semantic error" --> SKIP["Skip query or __end__"]

    EXEC -- "Success" --> CHECK["checkResults"]
    EXEC_ANYWAY --> CHECK
```

**Correction strategies by error type:**

| Error Type | Strategy |
|------------|----------|
| `SYNTAX_ERROR` | Fix SQL syntax using error message |
| `SCHEMA_ERROR` | Suggest valid columns/tables via `suggestColumnsForInvalidName()` |
| `SEMANTIC_ERROR` | Rewrite logic (time scope, join scope, entity scope, metric scope) |
| `RLS_ERROR` | Re-inject required security filters |
| `EXECUTION_ERROR` | Fix runtime issues using DB error output |

**Key constant:** `MAX_CORRECTION_ROUNDS = 3`

---

## 8. Agent Tool Architecture

Two ReAct agents power the core pipeline, each with specialized tool sets.

```mermaid
graph LR
    subgraph RA["Research Agent"]
        direction TB
        RA_LABEL["Phase 1: Haiku (Discovery)<br/>Phase 2: Opus (Synthesis)"]
        T1["discover_context<br/><i>Schema + rules + examples<br/>+ joins + KPIs</i>"]
        T2["query_distinct_values<br/><i>Filter column values</i>"]
        T3["inspect_table_columns<br/><i>Column metadata</i>"]
        T4["check_null_ratio<br/><i>NULL pattern analysis</i>"]
        T5["search_session_memory<br/><i>Prior query history</i>"]
        T6["submit_research<br/><i>Finalize research brief</i>"]
    end

    subgraph SA["SQL Writer Agent"]
        direction TB
        SA_LABEL["Runs on Haiku"]
        T7["submit_sql<br/><i>Final SQL + reasoning</i>"]
        T8["dry_run_sql<br/><i>Syntax pre-check</i>"]
        T9["verify_join<br/><i>Join path validation</i>"]
        T10["search_schema<br/><i>Full schema text search</i>"]
        T11["search_business_rules<br/><i>Domain constraints</i>"]
        T12["search_examples<br/><i>Gold SQL patterns</i>"]
        T13["get_join_rules<br/><i>Join definitions</i>"]
        T14["get_column_metadata<br/><i>Column descriptions</i>"]
        T15["get_current_fiscal_period<br/><i>Fiscal year/quarter</i>"]
        T16["sample_table_data<br/><i>TOP 100 sample rows</i>"]
        T17["check_table_size<br/><i>Row count estimate</i>"]
        T18["estimate_query_cost<br/><i>STATISTICS IO</i>"]
    end

    RA -- "researchBrief" --> SA

    style RA fill:#dcfce7,stroke:#22c55e
    style SA fill:#dbeafe,stroke:#3b82f6
```

### Research Agent Two-Phase Architecture (Fast Mode)

```mermaid
graph LR
    subgraph Phase1["Phase 1 - Haiku (Fast)"]
        D["discover_context"] --> QDV["query_distinct_values"]
        QDV --> ITC["inspect_table_columns"]
        ITC --> FD["finish_discovery"]
    end

    subgraph Phase2["Phase 2 - Opus (Quality)"]
        SYN["Structured Brief Synthesis<br/>from Phase 1 conversation"]
    end

    Phase1 -- "discovery results" --> Phase2
    Phase2 -- "researchBrief" --> OUT["sqlWriterAgent"]
```

---

## 9. Knowledge Layer

All knowledge is pre-loaded as JSON at server startup for deterministic, fast lookups (no runtime DB queries for knowledge).

```mermaid
graph TD
    subgraph Files["Knowledge Files (server/context/knowledge/)"]
        F1["schema-knowledge.json<br/><i>Table/column definitions</i>"]
        F2["distinct-values.json<br/><i>Pre-harvested column values</i>"]
        F3["join-knowledge.json<br/><i>Validated join paths</i>"]
        F4["kpi-glossary.json<br/><i>KPI definitions + formulas</i>"]
        F5["business-context.md<br/><i>Domain rules + constraints</i>"]
        F6["goldExamples.json<br/><i>Gold SQL templates</i>"]
    end

    subgraph Fetchers["Fetchers (server/vectordb/)"]
        SF["schemaFetcher<br/><i>getSchemaByTableNames()<br/>fuzzyResolveTable()</i>"]
        DVF["distinctValuesFetcher<br/><i>getDistinctValues()</i>"]
        JRF["joinRuleFetcher<br/><i>getJoinRules()</i>"]
        KF["kpiFetcher<br/><i>getKpiDefinition()</i>"]
        RF["rulesFetcher<br/><i>searchRules()</i>"]
        EF["examplesFetcher<br/><i>searchExamples()</i>"]
        FPF["fiscalPeriodFetcher<br/><i>getCurrentFiscalPeriod()</i>"]
    end

    F1 --> SF
    F2 --> DVF
    F3 --> JRF
    F4 --> KF
    F5 --> RF
    F6 --> EF

    subgraph Consumers["Consumers"]
        RA["Research Agent<br/>(via discover_context)"]
        SWA["SQL Writer Agent<br/>(via search tools)"]
        CL["Classify Node<br/>(exact/partial matching)"]
        VAL["Validators<br/>(schema checks)"]
    end

    SF --> RA
    SF --> SWA
    SF --> VAL
    DVF --> RA
    JRF --> RA
    JRF --> SWA
    KF --> RA
    RF --> SWA
    EF --> CL
    EF --> SWA
    FPF --> RA
```

**Startup loading:** All fetchers are initialized in parallel via `Promise.allSettled` in `server/index.js`. Server starts even if some loaders fail (graceful degradation).

---

## 10. SSE Streaming Architecture

The primary client-server communication channel uses Server-Sent Events for real-time progress updates.

```mermaid
sequenceDiagram
    participant C as Client (React SPA)
    participant E as Express /analyze-stream
    participant W as LangGraph Workflow
    participant R as ResearchAgent
    participant S as SqlWriterAgent
    participant P as Present Node

    C->>E: POST /api/text-to-sql/analyze-stream<br/>{question, sessionId, ...}
    E->>E: Set SSE headers<br/>Content-Type: text/event-stream
    E->>W: workflow.stream(input, {streamMode: 'updates'})

    loop For each node execution
        W-->>E: Node update (state delta)
        E-->>C: event: thinking<br/>data: {message, category}
        E-->>C: event: node_complete<br/>data: {node, duration, summary, usage}
    end

    R-->>E: Tool events via EventEmitter
    E-->>C: event: tool_call<br/>data: {name, args}
    E-->>C: event: tool_result<br/>data: {name, summary}

    S-->>E: Tool events via EventEmitter
    E-->>C: event: tool_call / tool_result

    Note over W: If multi-query decomposition
    E-->>C: event: query_plan<br/>data: {subQueries[]}
    E-->>C: event: query_progress<br/>data: {queryIndex, total}

    P-->>E: Insight token stream
    E-->>C: event: insight_token<br/>data: {token} (repeated)

    Note over W: If DASHBOARD intent
    E-->>C: event: dashboard_progress<br/>data: {spec, dataSources}

    W-->>E: Workflow complete
    E-->>C: event: done<br/>data: {state, usage, metrics}
    E->>C: Connection closed
```

**SSE Event Types:**

| Event | Source | Description |
|-------|--------|-------------|
| `thinking` | All nodes | Human-readable progress message |
| `tool_call` | researchAgent, sqlWriterAgent | Agent invokes a tool |
| `tool_result` | researchAgent, sqlWriterAgent | Tool returns result |
| `node_complete` | All nodes | Node finished (duration, model, usage) |
| `query_plan` | decompose | Sub-query plan after decomposition |
| `query_progress` | accumulateResult | Multi-query loop progress |
| `dashboard_progress` | dashboardAgent | Dashboard spec generation status |
| `insight_token` | present | Streaming insight text token-by-token |
| `done` | Workflow end | Final payload with all results + metrics |
| `error` | Any failure | Error message |

**Event wiring:** Each agent node has its own `EventEmitter` instance (`researchToolEvents`, `writerToolEvents`, `presentEvents`, `decomposeEvents`, `accumulateEvents`, `parallelPipelineEvents`, `dashboardEvents`). The SSE route handler subscribes to all emitters and writes events to the HTTP response.

---

## 11. Authentication Flow

Okta OAuth 2.0 with PKCE flow. No client-side JWT — relies on HTTP-only session cookies.

```mermaid
sequenceDiagram
    participant B as Browser
    participant E as Express Server
    participant O as Okta IdP

    B->>E: GET / (any protected route)
    E->>E: requireAuth: no session.okta_user
    E-->>B: 401 Unauthorized

    B->>E: GET /login
    E->>E: Generate PKCE pair<br/>(code_verifier + code_challenge)<br/>+ random state
    E->>E: Store in session
    E-->>B: 302 Redirect

    B->>O: GET /v1/authorize<br/>?code_challenge=...&state=...
    O-->>B: Login page
    B->>O: Enter credentials
    O-->>B: 302 Redirect to /implicit/callback<br/>?code=AUTH_CODE&state=...

    B->>E: GET /implicit/callback?code=...&state=...
    E->>E: Validate state matches session
    E->>O: POST /v1/token<br/>{code, code_verifier}
    O-->>E: {access_token, id_token}
    E->>O: GET /v1/userinfo<br/>Authorization: Bearer access_token
    O-->>E: {name, email, role, ...}
    E->>E: Store okta_user in session<br/>Log user login
    E-->>B: 302 Redirect to /

    Note over B,E: Subsequent API calls
    B->>E: POST /api/text-to-sql/analyze-stream<br/>credentials: include (session cookie)
    E->>E: requireAuth: session.okta_user exists<br/>+ check LDAP vs allowedUsers.json
    E-->>B: 200 OK + SSE stream
```

**Public paths (no auth required):** `/api/health`, `/login`, `/logout`, `/implicit/callback`, `/api/auth/me`

---

## 12. Client Component Hierarchy

```mermaid
graph TD
    APP["App<br/><i>Root layout: sidebar + main</i>"]

    subgraph Sidebar["Sidebar"]
        IMP["Impersonate Search<br/><i>Debounced API search</i>"]
        FAST["Fast Model Toggle<br/><i>Opus vs Haiku</i>"]
        TOOLS["Tool Toggles<br/><i>Research + SQL tools</i>"]
    end

    subgraph Main["Main Content"]
        CP["ChatPanel<br/><i>Conversation orchestrator<br/>SSE consumer + message history</i>"]
        TP["ThinkingPanel<br/><i>Real-time agent cognitive steps<br/>Parallel discovery progress</i>"]
        ATP["AgentTracePanel<br/><i>Pipeline step timeline<br/>Node metadata + durations</i>"]
        RP["ResultsPanel<br/><i>Query results table<br/>Charts via Recharts</i>"]
        PT["ProgressTimeline<br/><i>Step-by-step execution<br/>with active tools</i>"]
    end

    subgraph Dashboard["Dashboard Overlay (Modal)"]
        DO["DashboardOverlay<br/><i>Full-screen modal<br/>Manages slicer state + refinement</i>"]
        SB["SlicerBar<br/><i>Filter dropdowns</i>"]
        DG["DashboardGrid<br/><i>react-grid-layout<br/>Draggable + resizable</i>"]
        KPI["KpiSparklineCard<br/><i>KPI + delta + trend</i>"]
        DC["DashboardChart<br/><i>Bar, line, pie,<br/>area, scatter</i>"]
        DT["DashboardTable<br/><i>Data view</i>"]
        IC["InsightCard<br/><i>Markdown analysis</i>"]
    end

    APP --> Sidebar
    APP --> CP
    CP --> TP
    CP --> ATP
    CP --> RP
    CP --> PT
    CP --> DO
    DO --> SB
    DO --> DG
    DG --> KPI
    DG --> DC
    DG --> DT
    DG --> IC
```

**State management:** React hooks + localStorage persistence (no Redux/Zustand). Session ID and message history persisted across page reloads.

**Key dependencies:** React 19, Recharts 3.7, react-grid-layout 2.2, Tailwind CSS 4.2, react-markdown 10.1

---

## 13. LLM Model Routing

Different pipeline nodes use different Claude models based on quality vs speed requirements.

```mermaid
graph LR
    subgraph Opus["Claude Opus (Quality - Default)"]
        style Opus fill:#fce7f3,stroke:#db2777
        C["classify"]
        DEC["decompose"]
        RP2["researchAgent<br/><i>Phase 2 synthesis only</i>"]
        COR["correct"]
        SEM["semanticValidator"]
        PRES["present (insights)"]
        CHART["present (chart)"]
        DASH["dashboardAgent"]
    end

    subgraph Haiku["Claude Haiku (Fast)"]
        style Haiku fill:#dbeafe,stroke:#3b82f6
        RA["researchAgent<br/><i>Phase 1 discovery</i>"]
        SW["sqlWriterAgent"]
        SEMFB["semanticValidator<br/><i>fallback only</i>"]
    end

    subgraph Azure["Azure AI Foundry"]
        AE1["Opus Endpoint"]
        AE2["Haiku Endpoint"]
    end

    Opus --> AE1
    Haiku --> AE2
```

**Cost rates (per 1M tokens):**

| Token Type | Cost |
|------------|------|
| Input | $15.00 |
| Cached Input | $1.875 |
| Output | $75.00 |

**Per-request tracking:** Every LLM call records `promptTokens`, `outputTokens`, `cachedInputTokens` by node and model profile. Final response includes `usageByNodeAndModel` breakdown.

---

## 14. Workflow State Schema

The `WorkflowState` (defined in `server/graph/state.js`) uses LangGraph's `Annotation` API with 40+ channels grouped by function.

```mermaid
graph TD
    subgraph Input["Input Channels"]
        style Input fill:#e0f2fe,stroke:#0284c7
        I1["question"]
        I2["conversationHistory"]
        I3["sessionId"]
        I4["rlsEnabled"]
        I5["impersonateContext"]
        I6["validationEnabled"]
        I7["isFollowUp"]
        I8["presentMode"]
    end

    subgraph Classify["Classify Output"]
        style Classify fill:#dbeafe,stroke:#3b82f6
        C1["intent<br/><i>SQL_QUERY | DASHBOARD |<br/>GENERAL_CHAT | CLARIFICATION</i>"]
        C2["complexity<br/><i>SIMPLE | MODERATE | COMPLEX</i>"]
        C3["entities<br/><i>metrics, dimensions, filters</i>"]
        C4["matchType<br/><i>exact | partial | followup | none</i>"]
        C5["templateSql"]
        C6["needsDecomposition"]
    end

    subgraph MQ["Multi-Query State"]
        style MQ fill:#ccfbf1,stroke:#14b8a6
        M1["queryPlan[]<br/><i>id, subQuestion, purpose</i>"]
        M2["queries[]<br/><i>Accumulated results<br/>(append reducer)</i>"]
        M3["currentQueryIndex"]
    end

    subgraph RES["Research Output"]
        style RES fill:#dcfce7,stroke:#22c55e
        R1["researchBrief<br/><i>tables, joins, rules,<br/>examples, filterValues</i>"]
        R2["researchToolCalls[]"]
    end

    subgraph SQL["SQL Writer Output"]
        style SQL fill:#fef3c7,stroke:#d97706
        S1["sql"]
        S2["reasoning"]
        S3["agentToolCalls[]"]
    end

    subgraph VAL["Validation State"]
        style VAL fill:#ffedd5,stroke:#f97316
        V1["validationReport<br/><i>overall_valid, passes{}</i>"]
        V2["errorType<br/><i>RLS | SYNTAX | SCHEMA |<br/>SEMANTIC | EXECUTION</i>"]
    end

    subgraph EXEC["Execution State"]
        style EXEC fill:#f3e8ff,stroke:#a855f7
        E1["execution<br/><i>success, rowCount,<br/>columns[], rows[]</i>"]
        E2["resultsSuspicious"]
        E3["diagnostics"]
    end

    subgraph PRES["Presentation Output"]
        style PRES fill:#fce7f3,stroke:#ec4899
        P1["insights"]
        P2["chart<br/><i>chartType, axes, series</i>"]
        P3["suggestedFollowUps[]"]
        P4["dashboardSpec<br/><i>title, slicers[], tiles[]</i>"]
    end

    subgraph CTRL["Agentic Control"]
        style CTRL fill:#f1f5f9,stroke:#64748b
        CT1["attempts<br/><i>agent, correction,<br/>reflection, resultCheck</i>"]
        CT2["trace[]<br/><i>(append reducer)</i>"]
        CT3["warnings[]<br/><i>(append reducer)</i>"]
    end
```

**Reducer behavior:**
- Most channels: **last-write-wins** — `(prev, next) => next`
- `queries`: **append** — `(prev, next) => [...prev, ...next]`
- `trace`: **append** — accumulates all node execution events
- `warnings`: **append** — accumulates all warnings

---

## Directory Structure

```
Auto_Agents_Claude/
├── server/
│   ├── index.js                          # Express entry point, middleware, startup
│   ├── config/
│   │   ├── llm.js                        # Model routing, token tracking
│   │   ├── database.js                   # SQL Server connection pool
│   │   └── constants.js                  # Tuning parameters (timeouts, retries)
│   ├── auth/
│   │   ├── requireAuth.js                # Okta session + LDAP middleware
│   │   ├── pkce.js                       # PKCE pair generation
│   │   └── logUserLogin.js               # Login event logging
│   ├── routes/
│   │   ├── textToSql.js                  # /api/text-to-sql/* (SSE + batch)
│   │   ├── auth.js                       # /login, /logout, /callback
│   │   ├── health.js                     # /api/health
│   │   └── impersonate.js                # /api/impersonate/search
│   ├── graph/
│   │   ├── workflow.js                   # StateGraph definition + routing
│   │   ├── state.js                      # WorkflowState channels
│   │   └── nodes/
│   │       ├── classify.js               # Intent classification
│   │       ├── decompose.js              # Multi-query decomposition
│   │       ├── alignSubQueriesToTemplates.js
│   │       ├── parallelSubQueryPipeline.js
│   │       ├── subQueryMatch.js
│   │       ├── researchAgent.js          # ReAct research agent
│   │       ├── sqlWriterAgent.js         # ReAct SQL generation agent
│   │       ├── injectRls.js              # RLS filter injection
│   │       ├── validate.js               # 4-pass validation orchestration
│   │       ├── correct.js                # LLM SQL correction
│   │       ├── execute.js                # SQL execution
│   │       ├── checkResults.js           # Result quality checks
│   │       ├── diagnoseEmptyResults.js   # Empty result diagnosis
│   │       ├── accumulateResult.js       # Multi-query accumulation
│   │       ├── present.js                # Insights + chart generation
│   │       └── dashboardAgent.js         # Dashboard tile spec
│   ├── tools/                            # Agent tool implementations (20+)
│   ├── validation/
│   │   ├── validator.js                  # Validation orchestrator
│   │   ├── rlsValidator.js               # RLS filter check
│   │   ├── syntaxValidator.js            # PARSEONLY dry-run
│   │   ├── schemaValidator.js            # Column/table check
│   │   └── semanticValidator.js          # LLM logic review
│   ├── vectordb/                         # Knowledge fetchers
│   ├── context/knowledge/                # JSON knowledge files
│   ├── services/queryExecutor.js         # SQL execution + safety
│   ├── utils/                            # Logger, metrics, RLS injector
│   └── tests/                            # Node --test suite
├── client/
│   ├── src/
│   │   ├── main.jsx                      # React entry point
│   │   ├── App.jsx                       # Root layout (sidebar + chat)
│   │   ├── components/
│   │   │   ├── ChatPanel.jsx             # Conversation orchestrator
│   │   │   ├── ThinkingPanel.jsx         # Agent thinking display
│   │   │   ├── AgentTracePanel.jsx       # Pipeline timeline
│   │   │   ├── ResultsPanel.jsx          # Query results + charts
│   │   │   ├── ProgressTimeline.jsx      # Execution steps
│   │   │   ├── DashboardOverlay.jsx      # Dashboard modal
│   │   │   ├── DashboardGrid.jsx         # Responsive tile grid
│   │   │   ├── SlicerBar.jsx             # Filter dropdowns
│   │   │   └── dashboard/
│   │   │       ├── KpiSparklineCard.jsx
│   │   │       ├── DashboardChart.jsx
│   │   │       ├── DashboardTable.jsx
│   │   │       └── InsightCard.jsx
│   │   └── utils/api.js                  # HTTP client + SSE streaming
│   ├── vite.config.js                    # Dev proxy to Express
│   └── index.html
└── CLAUDE.md                             # Project instructions
```

---

## Key Configuration Constants

| Constant | Value | Location |
|----------|-------|----------|
| `MAX_CORRECTION_ROUNDS` | 3 | `constants.js` |
| `PARALLEL_CORRECTION_ROUNDS` | 1 | `constants.js` |
| `MAX_RESULT_RETRIES` | 2 | `constants.js` |
| `MAX_SUB_QUERIES` | 4 | `constants.js` |
| `SUB_QUERY_MATCH_THRESHOLD` | 0.4 | `constants.js` |
| `QUERY_RESULT_ROW_LIMIT` | 1000 | `constants.js` |
| `SQL_AGENT_TIMEOUT_MS` | 180,000 (3 min) | `constants.js` |
| `SQL_AGENT_TIMEOUT_COMPLEX_MS` | 300,000 (5 min) | `constants.js` |
| `SQL_AGENT_MAX_ITERATIONS` | 15 | `constants.js` |
| `DB_REQUEST_TIMEOUT` | 60,000 (1 min) | `constants.js` |
| `DB_POOL_MAX` | 10 | `constants.js` |
| `DEFAULT_PORT` | 5000 | `constants.js` |
