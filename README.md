# Auto Agents — Autonomous Text-to-SQL System

A fully autonomous agentic Text-to-SQL system built on LangGraph. Users ask natural language questions about business data, and a multi-agent pipeline researches the schema, writes SQL, validates it, executes against SQL Server (MSSQL), and presents results with narrative insights, charts, and optional interactive dashboards.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Pipeline Workflow](#pipeline-workflow)
  - [Node Descriptions](#node-descriptions)
  - [Routing Logic](#routing-logic)
  - [Multi-Query Pipeline](#multi-query-pipeline)
  - [Correction Loop](#correction-loop)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [Context Layer](#context-layer)
  - [Knowledge Files](#knowledge-files)
  - [Context Fetchers](#context-fetchers)
- [Validation Pipeline](#validation-pipeline)
- [SSE Streaming Architecture](#sse-streaming-architecture)
- [Authentication and Security](#authentication-and-security)
- [LLM Model Routing](#llm-model-routing)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Scripts](#scripts)

---

## Architecture Overview

**Monorepo with two packages:**

| Package | Description | Runtime |
|---------|-------------|---------|
| `server/` | Express.js + LangGraph backend | CommonJS, Node 18+ |
| `client/` | React 19 + Vite + Tailwind CSS v4 frontend | ESM |

The server exposes a streaming SSE endpoint (`/api/text-to-sql/analyze-stream`) that the React client connects to. Each user question flows through a LangGraph `StateGraph` pipeline that classifies intent, assembles schema context, generates T-SQL, validates it, executes it against SQL Server, and returns results with AI-generated insights.

```
┌─────────┐     SSE Stream      ┌──────────────────────────────────────────────┐
│  React   │◄──────────────────►│  Express + LangGraph Pipeline               │
│  Client  │  /analyze-stream   │                                              │
│          │                    │  Classify → ContextFetch → GenerateSql →     │
│  - Chat  │                    │  InjectRLS → Validate → Execute →            │
│  - Table │                    │  CheckResults → Present                      │
│  - Chart │                    │                                              │
│  - Dash  │                    │  ┌─────────────┐  ┌─────────────────────┐    │
└─────────┘                    │  │ SQL Server  │  │ Azure AI Foundry    │    │
                               │  │ (MSSQL)     │  │ Claude Opus/Haiku   │    │
                               │  └─────────────┘  └─────────────────────┘    │
                               └──────────────────────────────────────────────┘
```

---

## Pipeline Workflow

The core pipeline is an **18-node LangGraph `StateGraph`** defined in `server/graph/workflow.js`. State is managed via the `Annotation` API in `server/graph/state.js` with 40+ channels and append/replace reducers.

### High-Level Flow

```
                                    ┌──────────────┐
                                    │   Classify    │
                                    │  intent +     │
                                    │  entities     │
                                    └──────┬───────┘
                           ┌───────────────┼───────────────┐
                           ▼               ▼               ▼
                     ┌──────────┐   ┌────────────┐   ┌──────────┐
                     │Decompose │   │ContextFetch│   │Dashboard │
                     │(complex) │   │ (simple)   │   │  Agent   │
                     └────┬─────┘   └─────┬──────┘   └──────────┘
                          ▼               ▼
                   ┌─────────────┐  ┌───────────┐
                   │   Parallel  │  │GenerateSql│◄──────────────┐
                   │  SubQuery   │  └─────┬─────┘               │
                   │  Pipeline   │        ▼                     │
                   └──────┬──────┘  ┌───────────┐         ┌─────────┐
                          │         │ InjectRLS │         │ Correct │
                          │         └─────┬─────┘         │(analyze │
                          │               ▼               │ + retry)│
                          │         ┌───────────┐         └────┬────┘
                          │         │ Validate  │──── fail ────┘
                          │         └─────┬─────┘
                          │               ▼
                          │         ┌───────────┐
                          │         │  Execute  │──── fail ──► Correct
                          │         └─────┬─────┘
                          │               ▼
                          │         ┌─────────────┐
                          ├────────►│CheckResults │
                          │         └──────┬──────┘
                          │                ▼
                          │  ┌───────────────────────┐
                          │  │ DiagnoseEmptyResults  │ (if 0 rows)
                          │  └───────────┬───────────┘
                          │              ▼
                          │  ┌───────────────────────┐
                          └─►│ AccumulateResult      │ (multi-query loop)
                             └───────────┬───────────┘
                                         ▼
                               ┌──────────────────┐
                               │     Present      │
                               │ insights + chart │
                               └──────────────────┘
```

### Node Descriptions

| Node | File | Purpose |
|------|------|---------|
| **Classify** | `classify.js` | Determines intent (`SQL_QUERY`, `DASHBOARD`, `GENERAL_CHAT`, `CLARIFICATION`), complexity, entities, and template match type (`template`, `followup`, `none`) |
| **Decompose** | `decompose.js` | Breaks complex questions into 2-4 sub-queries with individual purposes |
| **AlignSubQueries** | `alignSubQueriesToTemplates.js` | Attempts template matching for each sub-query |
| **SubQueryMatch** | `subQueryMatch.js` | Per-subquery template matching against gold examples |
| **ParallelSubQueryPipeline** | `parallelSubQueryPipeline.js` | Executes sub-queries concurrently through independent contextFetch → generateSql → validate → execute pipelines |
| **ContextFetch** | `contextFetch.js` | Programmatic context assembly — gathers schema, column metadata, join rules, business rules, examples, KPI definitions, distinct values, and mandatory filters into a `contextBundle` |
| **GenerateSql** | `generateSql.js` | Single Opus LLM call to generate T-SQL from the assembled context bundle. Handles template adaptation, follow-up modification, and correction retries |
| **InjectRLS** | `injectRls.js` | Injects row-level security WHERE clauses based on the authenticated user's region scope |
| **Validate** | `validate.js` | Orchestrates 4-pass validation: RLS → Syntax (dry-run) → Schema → Semantic (LLM) |
| **Correct** | `correct.js` | Lightweight error analyzer (no LLM call). Extracts error-specific guidance with token-targeted syntax analysis and escalation strategy, then routes back to GenerateSql |
| **Execute** | `execute.js` | Runs the SQL against SQL Server and returns rows, columns, and metadata |
| **CheckResults** | `checkResults.js` | Inspects results for suspicious patterns (all NULLs, single row, zero rows) and generates zero-row guidance |
| **DiagnoseEmptyResults** | `diagnoseEmptyResults.js` | Analyzes why a query returned 0 rows and can auto-rewrite with relaxed filters |
| **AccumulateResult** | `accumulateResult.js` | Collects sub-query results in the multi-query loop and advances the index |
| **Present** | `present.js` | Generates narrative insights, chart recommendation, and suggested follow-up questions via LLM |
| **DashboardAgent** | `dashboardAgent.js` | Builds interactive multi-tile dashboard specifications with slicers |

### Routing Logic

The workflow uses conditional edges for dynamic routing:

| Router | Decision Points |
|--------|----------------|
| **After Classify** | `SQL_QUERY` + complex → Decompose; `SQL_QUERY` + simple → ContextFetch; `DASHBOARD` → DashboardAgent or Decompose; `GENERAL_CHAT`/`CLARIFICATION` → End |
| **After Validate** | Valid → Execute; Failed + corrections < 2 → Correct; Failed + exhausted → Execute anyway or End |
| **After Execute** | Success → CheckResults; Failure + corrections < 2 → Correct; Failure + exhausted → End |
| **After CheckResults** | Has rows → Present/Dashboard; Zero rows → DiagnoseEmptyResults; Multi-query → AccumulateResult |
| **After Diagnose** | Rewrite available → Validate (retry); No rewrite → Present with guidance |

### Multi-Query Pipeline

Complex questions are decomposed into sub-queries that execute in parallel:

1. **Decompose** splits the question into 2-4 sub-queries with purposes
2. **AlignSubQueries** attempts template matching for each
3. **ParallelSubQueryPipeline** runs independent pipelines concurrently
4. Each sub-query flows through: ContextFetch → GenerateSql → Validate → Execute
5. **AccumulateResult** collects results
6. **Present** synthesizes all sub-query results into unified insights

### Correction Loop

When SQL fails validation or execution:

1. **Correct** node analyzes the error without an LLM call:
   - Extracts the specific error token from MSSQL messages (e.g., `'AND'`, `')'`)
   - Generates targeted guidance (e.g., "unclosed subquery before 'AND'")
   - Includes prior SQL snippets in trace to avoid repeating the same mistake
   - **Escalates** on each attempt: attempt 2 restructures, attempt 3 rewrites from scratch
2. Routes back to **GenerateSql** with the correction guidance
3. Maximum **2 correction rounds** (`MAX_CORRECTION_ROUNDS=2`) before giving up
4. For follow-up queries, correction retries suppress the "adapt this" prompt to prevent the LLM from re-deriving from the original SQL

---

## Project Structure

```
Auto_Agents_Claude/
├── client/                          # React 19 + Vite + Tailwind CSS v4
│   ├── src/
│   │   ├── App.jsx                  # Root application with sidebar + panels
│   │   ├── index.css                # Global styles + animation keyframes
│   │   ├── components/
│   │   │   ├── ChatPanel.jsx        # Main chat interface with SSE streaming
│   │   │   ├── ThinkingBubble.jsx   # Animated thinking/progress indicator
│   │   │   ├── NarrativeCard.jsx    # Insight narrative with mini-chart
│   │   │   ├── ResultsPanel.jsx     # Query results table with export
│   │   │   ├── AgentTracePanel.jsx  # LangGraph node execution trace
│   │   │   ├── DashboardGrid.jsx    # Interactive dashboard (react-grid-layout)
│   │   │   ├── DashboardOverlay.jsx # Dashboard modal overlay
│   │   │   ├── SlicerBar.jsx        # Dashboard filter/slicer controls
│   │   │   ├── SuggestedQuestions.jsx# Follow-up question pills
│   │   │   ├── BlueprintPicker.jsx  # Analysis blueprint selector
│   │   │   ├── VoiceInput.jsx       # Voice input (Azure Cognitive Services)
│   │   │   ├── DevPanel.jsx         # Developer debug panel (model config)
│   │   │   └── dashboard/
│   │   │       ├── DashboardTable.jsx
│   │   │       ├── DashboardChart.jsx
│   │   │       ├── InsightCard.jsx
│   │   │       └── KpiSparklineCard.jsx
│   │   └── utils/
│   │       ├── api.js               # API client with SSE streaming
│   │       └── voiceConfig.js       # Voice input configuration
│   ├── package.json
│   └── vite.config.js               # Proxies /api to Express server
│
├── server/                          # Express.js + LangGraph backend
│   ├── index.js                     # HTTPS server entry point
│   ├── package.json
│   │
│   ├── config/
│   │   ├── database.js              # SQL Server connection pool (Windows Auth)
│   │   ├── llm.js                   # Azure AI Foundry model routing + token tracking
│   │   ├── constants.js             # Model profiles, timeouts, cost rates
│   │   └── allowedUsers.json        # LDAP whitelist
│   │
│   ├── graph/
│   │   ├── workflow.js              # LangGraph StateGraph definition + routing
│   │   ├── state.js                 # State channels (Annotation API)
│   │   └── nodes/                   # 18 pipeline node implementations
│   │       ├── classify.js
│   │       ├── decompose.js
│   │       ├── contextFetch.js
│   │       ├── generateSql.js
│   │       ├── injectRls.js
│   │       ├── validate.js
│   │       ├── correct.js
│   │       ├── execute.js
│   │       ├── checkResults.js
│   │       ├── diagnoseEmptyResults.js
│   │       ├── accumulateResult.js
│   │       ├── present.js
│   │       ├── dashboardAgent.js
│   │       ├── parallelSubQueryPipeline.js
│   │       ├── alignSubQueriesToTemplates.js
│   │       └── subQueryMatch.js
│   │
│   ├── context/                     # Knowledge layer
│   │   ├── definitions.json         # Canonical constants + column definitions
│   │   ├── goldExamples.json        # Verified SQL templates
│   │   ├── dashboardGoldExamples.json
│   │   └── knowledge/
│   │       ├── schema-knowledge.json    # Full schema with distinct values
│   │       ├── business-rules.md        # Business logic rules
│   │       ├── join-knowledge.json      # Join paths + cardinality
│   │       ├── kpi-glossary.json        # KPI definitions + formulas
│   │       └── analysis-blueprints.json # Multi-query analysis patterns
│   │
│   ├── vectordb/                    # Context fetchers
│   │   ├── schemaFetcher.js
│   │   ├── definitionsFetcher.js
│   │   ├── distinctValuesFetcher.js
│   │   ├── examplesFetcher.js
│   │   ├── rulesFetcher.js
│   │   ├── joinRuleFetcher.js
│   │   ├── kpiFetcher.js
│   │   ├── fiscalPeriodFetcher.js
│   │   ├── llmSchemaSelector.js
│   │   └── schemaSearcher.js
│   │
│   ├── validation/
│   │   ├── validator.js             # 4-pass orchestration
│   │   ├── rlsValidator.js
│   │   ├── syntaxValidator.js
│   │   ├── schemaValidator.js
│   │   └── semanticValidator.js
│   │
│   ├── tools/                       # Agent tool implementations
│   │   ├── searchSchema.js
│   │   ├── getColumnMetadata.js
│   │   ├── sampleTableData.js
│   │   ├── getJoinRules.js
│   │   ├── searchBusinessRules.js
│   │   ├── searchExamples.js
│   │   ├── dryRunSql.js
│   │   ├── verifyJoin.js
│   │   ├── estimateQueryCost.js
│   │   ├── checkTableSize.js
│   │   ├── getCostSummary.js
│   │   ├── optimizeSlowQuery.js
│   │   └── getCurrentFiscalPeriod.js
│   │
│   ├── prompts/                     # LLM prompt templates
│   │   ├── classify.js
│   │   ├── decompose.js
│   │   ├── sqlAgent.js
│   │   ├── correct.js
│   │   ├── present.js
│   │   ├── reflect.js
│   │   ├── dashboard.js
│   │   └── subQueryMatch.js
│   │
│   ├── routes/
│   │   ├── textToSql.js             # Core query endpoints + SSE streaming
│   │   ├── auth.js                  # OAuth login/logout/callback
│   │   ├── health.js                # Health check
│   │   ├── impersonate.js           # RLS impersonation search
│   │   ├── feedback.js              # Feedback/telemetry
│   │   └── voice.js                 # Voice input endpoints
│   │
│   ├── auth/
│   │   ├── requireAuth.js           # Okta session + LDAP whitelist
│   │   ├── pkce.js                  # PKCE flow implementation
│   │   └── logUserLogin.js          # Login event logging
│   │
│   ├── middleware/
│   │   ├── rateLimiter.js           # Express rate limiting
│   │   └── voiceRateLimit.js        # Voice-specific rate limiting
│   │
│   ├── memory/
│   │   └── sessionMemory.js         # Session-based conversation memory
│   │
│   ├── utils/
│   │   ├── logger.js                # Structured logging
│   │   ├── errors.js                # Custom error classes
│   │   ├── rlsInjector.js           # RLS WHERE clause injection
│   │   ├── correctionAnalyzer.js    # Error analysis for SQL correction
│   │   ├── sqlReferenceValidator.js # SQL reference validation
│   │   ├── usageMetrics.js          # Token/cost tracking
│   │   ├── chunker.js               # Text chunking
│   │   └── conversationContext.js   # Conversation context formatting
│   │
│   └── tests/
│       ├── runtimeRobustness.test.js
│       ├── correctionFramework.test.js
│       ├── voice.test.js
│       └── security/                # 11 security test files
│           ├── authSession.test.js
│           ├── inputValidation.test.js
│           ├── sqlInjection.test.js
│           ├── promptInjection.test.js
│           ├── dmlPrevention.test.js
│           ├── rlsSecurity.test.js
│           ├── errorLeakage.test.js
│           ├── httpHeaders.test.js
│           ├── secretDetection.test.js
│           ├── bannedApis.test.js
│           └── dependencyAudit.test.js
│
├── scripts/
│   ├── harvestDistinctValues.js     # Regenerate distinct values from DB
│   ├── reduceDistinctValuesToFive.js
│   └── validate-examples.js        # Gold example filter verification
│
└── tests/
    └── definitionsFetcher.test.js
```

---

## Technology Stack

### Server

| Technology | Purpose |
|-----------|---------|
| **Node.js 18+** | Runtime |
| **Express.js** | HTTP server with HTTPS (self-signed certs) |
| **LangGraph** (`@langchain/langgraph`) | Stateful multi-agent orchestration |
| **LangChain** (`@langchain/anthropic`, `@langchain/core`) | LLM integration |
| **Claude (Opus / Sonnet / Haiku)** via Azure AI Foundry | SQL generation, validation, insights |
| **mssql** + **msnodesqlv8** | SQL Server driver (Windows Authentication) |
| **express-session** | Session management |
| **helmet** | HTTP security headers |
| **express-rate-limit** | Rate limiting |
| **Zod** | Schema validation |

### Client

| Technology | Purpose |
|-----------|---------|
| **React 19** | UI framework |
| **Vite 6** | Build tool and dev server |
| **Tailwind CSS v4** | Styling |
| **Recharts** | Chart visualization |
| **react-grid-layout** | Dashboard grid layout |
| **react-markdown** | Markdown rendering for insights |
| **xlsx** | Excel/CSV export |
| **html2canvas** | Screenshot export |
| **lucide-react** | Icons |
| **Azure Cognitive Services SDK** | Voice input |

---

## Getting Started

### Prerequisites

- **Node.js** 18 or later
- **SQL Server** with ODBC Driver 17
- **Okta** application configured for OAuth 2.0 + PKCE
- **Azure AI Foundry** endpoint with Claude models deployed

### Environment Variables

Create a `server/.env` file:

```env
# Azure AI Foundry — Opus (quality model)
AZURE_ANTHROPIC_ENDPOINT=https://your-endpoint.azure.com
AZURE_ANTHROPIC_API_KEY=your-api-key
AZURE_ANTHROPIC_MODEL_NAME=claude-opus-4-6-2

# Azure AI Foundry — Haiku (fast model)
AZURE_ANTHROPIC_HAIKU_ENDPOINT=https://your-haiku-endpoint.azure.com
AZURE_ANTHROPIC_HAIKU_API_KEY=your-haiku-api-key
AZURE_ANTHROPIC_HAIKU_MODEL_NAME=claude-haiku-4-5

# SQL Server
DB_SERVER=your-sql-server
DB_PORT=1433
DB_DATABASE=your-database
DB_USER=your-user
DB_PASSWORD=your-password
DB_TRUST_SERVER_CERT=true

# Session
SESSION_SECRET=your-session-secret
ALLOWED_ORIGINS=https://localhost:5174

# Okta OAuth
OKTA_CLIENT_ID=your-okta-client-id
OKTA_ISSUER_URL=https://your-org.okta.com/oauth2/default
OKTA_REDIRECT_URI=https://localhost:5000/implicit/callback
OKTA_CALLBACK_PATH=/implicit/callback
```

### Installation

```bash
# Server
cd server
npm install

# Client
cd client
npm install
```

### Running the Application

```bash
# Generate SSL certificates (first time only)
cd server
npm run ssl:gen

# Start the server (HTTPS on port 5000)
npm run dev

# In a separate terminal — start the client (port 5174)
cd client
npm run dev
```

The client dev server proxies `/api`, `/login`, `/logout`, and `/implicit/callback` to the Express server at `https://localhost:5000`.

**Production build:**
```bash
cd client
npm run build    # Output goes to server/public/
cd ../server
npm start        # Serves both API and static files
```

---

## Context Layer

The context layer is the knowledge backbone that feeds the SQL generation LLM. All knowledge files are loaded at startup and served through fetcher modules — no vector database required.

### Knowledge Files

| File | Description |
|------|-------------|
| `schema-knowledge.json` | Complete schema documentation — table names, column names, data types, descriptions, and distinct values for filterable columns |
| `business-rules.md` | Business logic rules as numbered imperatives (e.g., "Always filter by latest snapshot", "Use SALES_STAGE not STAGE_ID for display") |
| `join-knowledge.json` | Join paths between tables with primary keys, foreign keys, cardinality (`1:N`, `N:1`), and join type (`INNER`, `LEFT`) |
| `kpi-glossary.json` | KPI definitions with formulas and calculation methods |
| `definitions.json` | Canonical constants — mandatory filters, coverage thresholds, column definitions |
| `goldExamples.json` | Verified SQL templates with metadata for template matching |
| `analysis-blueprints.json` | Multi-query analysis patterns for complex analytical questions |

### Context Fetchers

The `contextFetch` node assembles a `contextBundle` by calling these fetchers:

1. **Schema pre-filter** — keyword-based candidate narrowing (~75% token reduction)
2. **LLM schema selector** — Claude selects the most relevant 5-8 tables from candidates
3. **Column metadata** — exact column names, types, and descriptions per selected table
4. **Join rules** — join paths between selected tables
5. **Business rules** — relevant rules based on question entities
6. **Gold examples** — matching SQL templates
7. **KPI definitions** — relevant KPI formulas
8. **Distinct values** — verified filter values for enum columns
9. **Mandatory filters** — required WHERE clauses from definitions.json
10. **Fiscal period** — current fiscal year/quarter from the database

---

## Validation Pipeline

Four-pass validation orchestrated by `server/validation/validator.js`:

| Pass | Validator | Method | Speed | Description |
|------|-----------|--------|-------|-------------|
| 1. **RLS** | `rlsValidator.js` | Programmatic | ~50ms | Verifies RLS WHERE clause injection correctness |
| 2. **Syntax** | `syntaxValidator.js` | Database dry-run | ~100-500ms | `SET PARSEONLY ON` against SQL Server |
| 3. **Schema** | `schemaValidator.js` | Deterministic | ~10-50ms | Validates table/column names against schema-knowledge.json |
| 4. **Semantic** | `semanticValidator.js` | LLM | ~1-3s | Claude reviews SQL logic vs. question intent |

Each pass only runs if all previous passes succeeded. Failed validation routes to the **Correct** node (up to 2 retries). RLS failures halt the pipeline immediately.

**Return format:**
```json
{
  "overall_valid": true,
  "passes": {
    "rls": { "passed": true, "issues": [] },
    "syntax": { "passed": true, "issues": [] },
    "schema": { "passed": true, "issues": [] },
    "semantic": { "passed": true, "issues": [], "meta": {} }
  }
}
```

---

## SSE Streaming Architecture

The client receives real-time progress via Server-Sent Events on `POST /api/text-to-sql/analyze-stream`.

| Event Type | Purpose |
|-----------|---------|
| `thinking` | Real-time reasoning and progress updates |
| `query_summary` | Classification result and match type |
| `query_plan` | Decomposition plan for complex questions |
| `query_progress` | Sub-query loop progress |
| `subquery_result` | Individual sub-query completion |
| `parallel_pipeline_start` | Parallel execution beginning |
| `parallel_subquery_progress` | Per-subquery stage progress (research/sql/execute) |
| `parallel_correction_start` | Correction batch beginning |
| `parallel_correction_complete` | Correction batch result |
| `parallel_pipeline_complete` | All sub-queries finished |
| `data_ready` | Early table data for instant rendering (before insights) |
| `dashboard_progress` | Dashboard building status |
| `insight_token` | Streaming insight text tokens |
| `node_complete` | Per-node completion with duration, model, and token usage |
| `done` | Final response payload with all results |
| `error` | Pipeline error |

**Wire format:**
```
event: thinking
data: {"type":"research","message":"Selecting relevant tables...","elapsed":1200}

event: data_ready
data: {"execution":{"success":true,"rowCount":42,"rows":[...]},"sql":"SELECT ...","elapsed":8500}

event: done
data: {"insights":"...","chart":{...},"suggestedFollowUps":[...],...}
```

---

## Authentication and Security

### Authentication
- **Okta OAuth 2.0** with PKCE flow for user authentication
- **Server-side sessions** via `express-session` (HTTP-only cookies)
- **LDAP whitelist** — only users in `server/config/allowedUsers.json` can access the application
- Auth middleware in `server/auth/requireAuth.js` validates session + LDAP on every API request

### Security Measures
- **Helmet** — HTTP security headers (HSTS, CSP, X-Frame-Options, etc.)
- **Express rate limiting** — per-IP request throttling with custom buckets
- **SQL injection prevention** — parameterized queries via `mssql` package
- **Input sanitization** — question length limits, entity validation
- **RLS enforcement** — per-user `REGION_ID` WHERE clause injection
- **DML prevention** — blocks INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE
- **Error leakage prevention** — internal errors don't expose stack traces to clients
- **Secret detection** — tests verify no credentials in source code

---

## LLM Model Routing

Models are routed through Azure AI Foundry (not direct Anthropic API):

| Model | Nodes | Purpose |
|-------|-------|---------|
| **Claude Opus** | Classify, GenerateSql, Present, Dashboard, Semantic Validator | Quality-critical decisions |
| **Claude Sonnet** | Correct (chart), LLM Schema Selector | Medium-cost analysis |
| **Claude Haiku** | Research tools, fast classification | High-volume, cost-sensitive |

Per-request token tracking with cost estimation:
- **Opus**: $0.015/1K input, $0.075/1K output
- **Haiku**: $0.0008/1K input, $0.004/1K output

The **DevPanel** component in the client allows per-node model overrides for testing.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/text-to-sql/analyze` | Batch query processing (non-streaming) |
| `POST` | `/api/text-to-sql/analyze-stream` | SSE streaming with per-node progress events |
| `POST` | `/api/text-to-sql/dashboard-data` | Paginated data and distinct slicer values for dashboards |
| `GET` | `/api/text-to-sql/history/:threadId` | LangGraph checkpoint history for a thread |
| `GET` | `/api/text-to-sql/blueprints` | Available analysis blueprints |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/impersonate/search` | RLS impersonation user search |
| `POST` | `/api/feedback` | Submit feedback/telemetry |
| `POST` | `/api/voice/synthesize` | Voice output synthesis |
| `GET` | `/login` | Initiate Okta OAuth flow |
| `GET` | `/logout` | Clear session and logout |
| `GET` | `/implicit/callback` | OAuth callback handler |

---

## Testing

Tests use Node.js built-in test runner (`node:test` + `node:assert/strict`).

```bash
cd server

# Run all tests
npm test

# Run a single test file
node --test tests/correctionFramework.test.js

# Run security tests only
npm run test:security
```

### Test Suites

| Suite | Files | Focus |
|-------|-------|-------|
| **Runtime robustness** | `runtimeRobustness.test.js` | Workflow routing, fiscal period, correction exhaustion |
| **Correction framework** | `correctionFramework.test.js` | Syntax error guidance, escalation strategy, follow-up correction |
| **Voice** | `voice.test.js` | Voice input processing |
| **Definitions fetcher** | `tests/definitionsFetcher.test.js` | Context layer definition loading |
| **Security** (11 files) | `tests/security/` | Auth sessions, SQL injection, prompt injection, DML prevention, RLS, HTTP headers, error leakage, secret detection, banned APIs, input validation, dependency audit |

---

## Scripts

### Server

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon (hot reload) |
| `npm start` | Production start |
| `npm test` | Run all tests |
| `npm run test:security` | Security test suite only |
| `npm run audit` | npm audit at high severity |
| `npm run ssl:gen` | Generate self-signed SSL certificates |
| `npm run harvest:schema` | Regenerate schema-knowledge.json from DB |
| `npm run harvest:values` | Regenerate distinct values from DB |
| `npm run validate:examples` | Validate gold example filters |
| `npm run deploy:prepare` | Prepare production deployment |

### Client

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server on port 5174 |
| `npm run build` | Production build (output → `server/public/`) |
| `npm run preview` | Local production preview |
