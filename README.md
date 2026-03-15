# SOE Data Agents

A fully autonomous **Text-to-SQL** system powered by a multi-agent LangGraph pipeline. Users ask natural language questions, and the system researches the database schema, writes SQL, validates it, executes against SQL Server, and presents results with insights and optional interactive dashboards — all without human intervention.

## How It Works

```
User Question
    │
    ▼
Classify (intent + template match)
    │
    ├── Exact match ──────────────────────────► Inject RLS ──► Execute
    ├── Partial/Followup ──► SQL Writer Agent ──► Inject RLS ──► Validate ──► Execute
    ├── No match ──► Research Agent ──► SQL Writer Agent ──► Inject RLS ──► Validate ──► Execute
    ├── Complex ──► Decompose ──► Parallel Sub-Query Pipeline ──► Merge Results
    └── Dashboard ──► Dashboard Agent ──► Interactive Tile Specs
                                                    │
                                                    ▼
                                            Check Results ──► Present (Insights + Charts)
```

The pipeline is a **16-node LangGraph StateGraph** with conditional routing, self-correction loops (up to 3 attempts), empty-result diagnosis with auto-rewrite, and multi-query decomposition for complex questions.

## Architecture

| Package | Stack | Purpose |
|---------|-------|---------|
| `server/` | Express.js + LangGraph + LangChain | API, agent pipeline, validation, execution |
| `client/` | React 19 + Vite + Tailwind CSS v4 | Chat UI, dashboards, agent trace visualization |

### Agents

**Research Agent** — Discovers relevant schema, business rules, join paths, KPI definitions, and column values. Runs in two phases: fast discovery (Haiku) then structured synthesis (Opus).

**SQL Writer Agent** — Generates SQL using the research brief, gold examples, and domain knowledge. Has access to dry-run, join verification, schema search, and query cost estimation tools.

**Dashboard Agent** — Builds interactive dashboard specs with KPI cards, charts, tables, and insight tiles. Supports slicer-based filtering and drag-and-drop layouts.

### Validation Pipeline

Four sequential passes with short-circuit on failure:

| Pass | Type | What It Checks |
|------|------|----------------|
| RLS | Programmatic | Row-level security filters present |
| Syntax | DB Dry-run | `SET PARSEONLY ON` against MSSQL |
| Schema | Deterministic | Column/table names vs schema knowledge |
| Semantic | LLM | Question-to-SQL logic alignment |

Failed validations trigger an LLM correction loop (up to 3 rounds).

### Knowledge Layer

Pre-loaded JSON files provide deterministic, fast lookups at runtime — no vector DB required:
- **Schema knowledge** — table/column definitions and descriptions
- **Join knowledge** — validated join paths between tables
- **Business rules** — domain constraints and context
- **KPI glossary** — metric definitions and formulas
- **Gold examples** — curated question-SQL pairs for template matching
- **Distinct values** — pre-harvested column values for filter resolution

## Tech Stack

**Backend:** Node.js 18+, Express.js, LangGraph, LangChain, mssql, Zod, Helmet, express-session

**Frontend:** React 19, Vite 6, Tailwind CSS v4, Recharts, react-grid-layout, react-markdown

**LLMs:** Claude (Anthropic) via Azure AI Foundry
- **Claude Opus** — classification, correction, semantic validation, presentation, dashboards
- **Claude Haiku** — schema research (phase 1), SQL generation

**Database:** SQL Server (MSSQL)

**Auth:** Okta OAuth 2.0 with PKCE flow, HTTP-only session cookies

**Streaming:** Server-Sent Events (SSE) for real-time pipeline progress, tool calls, and token-by-token insight streaming

## Getting Started

### Prerequisites
- Node.js 18+
- SQL Server instance
- Azure AI Foundry endpoints for Claude models
- Okta application (for authentication)

### Server
```bash
cd server
npm install
cp .env.example .env   # Fill in your credentials
npm run dev             # Dev server with hot reload (port 5000)
```

### Client
```bash
cd client
npm install
npm run dev             # Vite dev server (port 5174, proxies /api to server)
```

### Production
```bash
cd client && npm run build    # Output goes to server/public/
cd ../server && npm start     # Serves API + static frontend
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `AZURE_ANTHROPIC_ENDPOINT` | Claude Opus endpoint |
| `AZURE_ANTHROPIC_API_KEY` | Claude Opus API key |
| `AZURE_ANTHROPIC_MODEL_NAME` | Claude Opus model name |
| `AZURE_ANTHROPIC_HAIKU_ENDPOINT` | Claude Haiku endpoint |
| `AZURE_ANTHROPIC_HAIKU_API_KEY` | Claude Haiku API key |
| `AZURE_ANTHROPIC_HAIKU_MODEL_NAME` | Claude Haiku model name |
| `DB_SERVER`, `DB_PORT`, `DB_DATABASE` | SQL Server connection |
| `DB_USER`, `DB_PASSWORD` | SQL Server credentials |
| `SESSION_SECRET` | Express session secret |
| `ALLOWED_ORIGINS` | CORS allowed origins |
| `OKTA_CLIENT_ID`, `OKTA_ISSUER_URL` | Okta OAuth config |
| `OKTA_REDIRECT_URI`, `OKTA_CALLBACK_PATH` | Okta callback config |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/text-to-sql/analyze-stream` | SSE streaming query processing |
| `POST` | `/api/text-to-sql/analyze` | Batch query processing |
| `POST` | `/api/text-to-sql/dashboard-data` | Paginated data + slicer values |
| `GET` | `/api/text-to-sql/history/:threadId` | Conversation history |
| `GET` | `/api/health` | Health check |

## Project Structure

```
├── server/
│   ├── index.js                 # Express entry point
│   ├── config/                  # LLM, database, constants
│   ├── auth/                    # Okta OAuth + PKCE
│   ├── routes/                  # API route handlers
│   ├── graph/
│   │   ├── workflow.js          # LangGraph StateGraph (16 nodes)
│   │   ├── state.js             # 40+ state channels
│   │   └── nodes/               # Pipeline node implementations
│   ├── tools/                   # 20+ agent tools
│   ├── validation/              # 4-pass validation pipeline
│   ├── vectordb/                # Knowledge fetchers
│   ├── context/knowledge/       # Pre-loaded JSON knowledge
│   └── tests/
├── client/
│   ├── src/
│   │   ├── App.jsx              # Root layout
│   │   ├── components/          # Chat, dashboard, trace panels
│   │   └── utils/api.js         # SSE streaming client
│   └── vite.config.js
└── scripts/                     # Schema/value harvesting utilities
```
