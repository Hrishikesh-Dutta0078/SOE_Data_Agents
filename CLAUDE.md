# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Auto Agents** is a fully autonomous agentic Text-to-SQL system. Users ask natural language questions, and a multi-agent LangGraph pipeline researches the schema, writes SQL, validates it, executes against SQL Server (MSSQL), and presents results with insights and optional dashboards.

## Architecture

**Monorepo with two packages:**
- `server/` — Express.js + LangGraph backend (CommonJS, Node 18+)
- `client/` — React 19 + Vite + Tailwind CSS v4 frontend (ESM)

### Server — LangGraph Workflow (`server/graph/workflow.js`)

The core pipeline is a LangGraph `StateGraph` with these nodes:

```
Classify → [Decompose] → ResearchAgent → SqlWriterAgent → InjectRLS → Validate → Execute → CheckResults → [AccumulateResult loop] → Present
```

Key routing logic:
- **Classify** determines intent (`SQL_QUERY`, `DASHBOARD`, `GENERAL_CHAT`, `CLARIFICATION`) and match type (`exact`, `partial`, `followup`, `none`)
- Exact template matches skip research+writing; partial matches skip research only
- Complex questions get decomposed into sub-queries that run through a parallel pipeline (`parallelSubQueryPipeline`)
- Dashboard intent routes to `dashboardAgent` which builds interactive tile specs
- Failed validations route to `correct` (up to `MAX_CORRECTION_ROUNDS=3` attempts)
- Empty results trigger `diagnoseEmptyResults` which can auto-rewrite and retry

State is defined in `server/graph/state.js` using LangGraph's `Annotation` API.

### LLM Configuration (`server/config/llm.js`, `server/config/constants.js`)

- Uses Claude models via Azure AI Foundry (not direct Anthropic API)
- Two model profiles: **Opus** (quality, default) and **Haiku** (fast, used for `researchAgent` and `sqlAgent`)
- Environment variables: `AZURE_ANTHROPIC_*` for Opus, `AZURE_ANTHROPIC_HAIKU_*` for Haiku
- Per-request token tracking with cost estimation

### Agent Tools (`server/tools/`)

Research agent tools: `discoverContext`, `queryDistinctValues`, `inspectTableColumns`, `checkNullRatio`, `searchSessionMemory`, `submitResearch`

SQL writer agent tools: `submitSql`, `dryRunSql`, `estimateQueryCost`, `verifyJoin`, `sampleTableData`, `checkTableSize`, `optimizeSlowQuery`, `getElapsedTime`, `getCostSummary`, `searchBusinessRules`, `searchExamples`, `getJoinRules`, `getColumnMetadata`, `getCurrentFiscalPeriod`, `searchSchema`

### Knowledge Layer (`server/vectordb/`, `server/context/knowledge/`)

Knowledge files (schema, business rules, join rules, KPI glossary, distinct values, examples) are loaded at startup and fetched via vector-DB-style fetchers in `server/vectordb/`.

### Validation Pipeline (`server/validation/`)

Three validators: `syntaxValidator` (dry-run), `schemaValidator` (column/table checks), `semanticValidator` (LLM-based logic review). Orchestrated by `validator.js`. RLS injection validated by `rlsValidator.js`.

### Database

SQL Server (MSSQL) via `mssql` package. Config in `server/config/database.js`. Env vars: `DB_SERVER`, `DB_PORT`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`, `DB_TRUST_SERVER_CERT`.

### Authentication

Okta OAuth 2.0 with PKCE flow. Server-side session management. Auth middleware in `server/auth/requireAuth.js`. Routes in `server/routes/auth.js`. See `okta_implementation.md` for detailed docs.

### Client

React SPA with chat interface. Key components:
- `ChatPanel` — main conversation UI with SSE streaming
- `DashboardGrid`/`DashboardOverlay` — interactive dashboard rendering
- `AgentTracePanel` — visualizes agent pipeline steps
- `ThinkingPanel` — real-time thinking/progress display

API layer in `client/src/utils/api.js` uses SSE streaming for `/api/text-to-sql/analyze-stream`.

## Common Commands

### Server
```bash
cd server
npm install
npm run dev          # Start with nodemon (hot reload)
npm start            # Production start
npm test             # Run tests (node --test)
npm run ssl:gen      # Generate self-signed SSL certs
npm run harvest:schema   # Regenerate schema knowledge
npm run harvest:values   # Regenerate distinct values
```

### Client
```bash
cd client
npm install
npm run dev          # Vite dev server on port 5174 (proxies /api to localhost:5000)
npm run build        # Production build (output goes to server/public/)
```

### Running Tests
```bash
cd server
node --test                              # All tests
node --test tests/runtimeRobustness.test.js  # Single test file
```

## API Endpoints

- `POST /api/text-to-sql/analyze` — batch query processing
- `POST /api/text-to-sql/analyze-stream` — SSE streaming with per-node progress events
- `POST /api/text-to-sql/dashboard-data` — paginated data and distinct slicer values
- `GET /api/text-to-sql/history/:threadId` — LangGraph checkpoint history
- `GET /api/health` — health check
- `GET /api/impersonate/search` — RLS impersonation user search

## Environment Variables

Server requires a `.env` file with:
- `AZURE_ANTHROPIC_ENDPOINT`, `AZURE_ANTHROPIC_API_KEY`, `AZURE_ANTHROPIC_MODEL_NAME` (Opus)
- `AZURE_ANTHROPIC_HAIKU_ENDPOINT`, `AZURE_ANTHROPIC_HAIKU_API_KEY`, `AZURE_ANTHROPIC_HAIKU_MODEL_NAME` (Haiku)
- `DB_SERVER`, `DB_PORT`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`
- `SESSION_SECRET`, `ALLOWED_ORIGINS`
- Okta: `OKTA_CLIENT_ID`, `OKTA_ISSUER_URL`, `OKTA_REDIRECT_URI`, `OKTA_CALLBACK_PATH`

## Key Conventions

- Server uses CommonJS (`require`/`module.exports`); client uses ESM (`import`/`export`)
- Workflow nodes export `__testables` for unit testing internal functions
- SSE streaming uses `event: <type>\ndata: <json>\n\n` format with event types: `thinking`, `tool_call`, `tool_result`, `node_complete`, `insight_token`, `query_plan`, `query_progress`, `dashboard_progress`, `done`, `error`
- The client Vite dev server proxies `/api`, `/login`, `/logout`, `/implicit/callback` to the Express server at `https://localhost:5000`
- Production builds are served as static files from `server/public/`
