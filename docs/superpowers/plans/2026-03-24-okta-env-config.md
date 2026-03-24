# OKTA Environment-Specific Configuration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable OKTA authentication for both localhost (port 5005) and Azure App Service using environment-specific `.env` files.

**Architecture:** A new `server/config/env.js` loader replaces the existing `dotenv.config()` call. It loads a base `.env` then overlays `.env.{NODE_ENV}` with `override: true`. Startup validation ensures required OKTA vars are present when auth is enabled. All other changes are config value updates (port, proxy target, gitignore).

**Tech Stack:** Node.js, Express, dotenv (existing), cross-env (new devDep)

**Spec:** `docs/superpowers/specs/2026-03-24-okta-env-config-design.md`

---

### Task 1: Create environment loader (`server/config/env.js`)

**Files:**
- Create: `server/config/env.js`

- [ ] **Step 1: Create the env loader file**

This file replaces the existing `require('dotenv').config()` in `server/index.js`. It loads `.env` (base), then `.env.{NODE_ENV}` (overrides), then validates required OKTA vars.

```js
// server/config/env.js
'use strict';

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const serverDir = path.resolve(__dirname, '..');

// 1. Load base .env
dotenv.config({ path: path.join(serverDir, '.env') });

// 2. Load environment-specific .env.{NODE_ENV} (overrides base values)
const nodeEnv = process.env.NODE_ENV || 'development';
const envOverridePath = path.join(serverDir, `.env.${nodeEnv}`);
if (fs.existsSync(envOverridePath)) {
  dotenv.config({ path: envOverridePath, override: true });
}

// 3. Validate required OKTA vars when auth is enabled
if (process.env.DISABLE_AUTH !== 'true') {
  const required = ['OKTA_CLIENT_ID', 'OKTA_REDIRECT_URI', 'OKTA_ISSUER_URL'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(
      `[env] FATAL: Auth is enabled (DISABLE_AUTH != true) but these required ` +
      `OKTA variables are missing: ${missing.join(', ')}. ` +
      `Set them in .env or .env.${nodeEnv}, or set DISABLE_AUTH=true for local dev without auth.`
    );
    process.exit(1);
  }
}
```

- [ ] **Step 2: Verify the file was created**

Run: `cd C:/Users/hrishikeshd/Desktop/Auto_Agents_Claude/server && node -e "require('./config/env')" 2>&1`
Expected: No crash. The current `server/.env` still has `OKTA_CLIENT_ID` and `DISABLE_AUTH=true`, so validation passes. (If it exits with a missing-var error, temporarily set `DISABLE_AUTH=true` in `.env` for this check — it will be set to `false` in Task 6.)

- [ ] **Step 3: Commit**

```bash
git add server/config/env.js
git commit -m "feat(auth): add environment-aware dotenv loader with OKTA validation"
```

---

### Task 2: Wire env loader into `server/index.js` and add trust proxy

**Files:**
- Modify: `server/index.js:53` (replace `require('dotenv').config()`)
- Modify: `server/index.js:112` (add `trust proxy` before session middleware)

- [ ] **Step 1: Replace the dotenv call**

In `server/index.js`, replace line 53:
```js
// OLD (line 53):
require('dotenv').config();

// NEW (line 53):
require('./config/env');
```

This must stay at line 53 — after the node_modules bootstrap block (lines 14-51) but before all other requires that read `process.env` (lines 55+).

- [ ] **Step 2: Add trust proxy for production**

In `server/index.js`, add this line immediately after `app.use(express.json(...))` (after line 101) and before the session middleware (line 112):

```js
// Trust Azure App Service reverse proxy (required for secure cookies + correct req.protocol)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
```

- [ ] **Step 3: Verify server starts**

Run: `cd server && node -e "require('./config/env'); console.log('OK')"`
Expected: `OK` (no crash)

- [ ] **Step 4: Commit**

```bash
git add server/index.js
git commit -m "feat(auth): wire env loader, add trust proxy for Azure"
```

---

### Task 3: Update default port in `server/config/constants.js`

**Files:**
- Modify: `server/config/constants.js:30`

- [ ] **Step 1: Change DEFAULT_PORT from 5000 to 5005**

In `server/config/constants.js`, line 30:
```js
// OLD:
  DEFAULT_PORT: 5000,

// NEW:
  DEFAULT_PORT: 5005,
```

- [ ] **Step 2: Commit**

```bash
git add server/config/constants.js
git commit -m "chore: change default server port from 5000 to 5005"
```

---

### Task 4: Update Vite proxy target

**Files:**
- Modify: `client/vite.config.js:18,22,23,24`

- [ ] **Step 1: Change all proxy targets from port 5000 to 5005**

In `client/vite.config.js`, replace all four occurrences of `https://localhost:5000` with `https://localhost:5005`:

```js
// OLD (lines 18, 22, 23, 24):
        target: 'https://localhost:5000',

// NEW:
        target: 'https://localhost:5005',
```

There are exactly 4 occurrences — one for `/api`, `/login`, `/logout`, and `/implicit/callback`.

- [ ] **Step 2: Commit**

```bash
git add client/vite.config.js
git commit -m "chore: update Vite proxy target to port 5005"
```

---

### Task 5: Create environment-specific `.env` files

**Files:**
- Create: `server/.env.development`
- Create: `server/.env.production`

- [ ] **Step 1: Create `server/.env.development`**

```
NODE_ENV=development
PORT=5005
USE_HTTPS=true
OKTA_CLIENT_ID=0oa26ahgkblQVZBaR0h8
OKTA_REDIRECT_URI=https://localhost:5005/implicit/callback
ALLOWED_ORIGINS=http://localhost:5174,https://localhost:5005
```

- [ ] **Step 2: Create `server/.env.production`**

```
NODE_ENV=production
OKTA_CLIENT_ID=0oa26ajeynfF191D70h8
OKTA_REDIRECT_URI=https://soedataagents-hsexf8a2edakgvew.westus2-01.azurewebsites.net/implicit/callback
ALLOWED_ORIGINS=https://soedataagents-hsexf8a2edakgvew.westus2-01.azurewebsites.net
USE_HTTPS=false
# SESSION_SECRET must be set in Azure App Settings (not in this file)
```

- [ ] **Step 3: Do NOT commit these files** — they will be gitignored in Task 7.

---

### Task 6: Update base `server/.env`

**Files:**
- Modify: `server/.env`

- [ ] **Step 1: Update OKTA and server settings in the base `.env`**

The base `.env` should contain shared settings. Environment-specific OKTA values now live in `.env.development` and `.env.production`. Update these lines:

```
# In the "Server" section, remove PORT (now in .env.development):
# PORT=5000  ← REMOVE this line

# In the "Okta" section, update to shared-only values:
OKTA_ISSUER_URL=https://adobe.okta.com/oauth2/aus1gan31wnmCPyB60h8
OKTA_CALLBACK_PATH=/implicit/callback
DISABLE_AUTH=false
# REMOVE these lines (now in .env.development / .env.production):
# OKTA_CLIENT_ID=0oa1zjo1oe1wtHNTt0h8
# OKTA_REDIRECT_URI=https://localhost:5000/implicit/callback

# In the "Server" section, remove ALLOWED_ORIGINS (now in env-specific files):
# ALLOWED_ORIGINS=...  ← REMOVE this line

# Remove USE_HTTPS (now in env-specific files):
# USE_HTTPS=true  ← REMOVE this line
```

Keep all other values (DB, Azure AI, Azure Speech, SESSION_SECRET) unchanged.

- [ ] **Step 2: Do NOT commit** — `.env` is gitignored.

---

### Task 7: Update `.gitignore`

**Files:**
- Modify: `.gitignore:1` (near the existing `server/.env` entry)

- [ ] **Step 1: Add the new env files to gitignore**

In `.gitignore`, after the existing `server/.env` line (line 1), add:

```
server/.env
server/.env.development
server/.env.production
```

(The first line already exists — just add the two new lines below it.)

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore environment-specific .env files"
```

---

### Task 8: Update `server/.env.example` with two-tier documentation

**Files:**
- Modify: `server/.env.example`

- [ ] **Step 1: Rewrite `.env.example` to document the two-tier layout**

Replace the full contents of `server/.env.example` with:

```
# ==================================================================
# Environment Configuration — Two-Tier Layout
# ==================================================================
#
# Base config goes in .env (shared across environments).
# Environment overrides go in .env.development or .env.production.
#
# Loading order (server/config/env.js):
#   1. .env (base)
#   2. .env.{NODE_ENV} (overrides, if file exists)
#
# On Azure App Service, env vars come from Application Settings.
# The .env.production file is only needed for local testing with
# NODE_ENV=production.
# ==================================================================

# ==================================================================
# BASE CONFIG (.env) — shared across all environments
# ==================================================================

# --- Claude via Azure AI Foundry ---
AZURE_ANTHROPIC_API_KEY=<your-azure-ai-key>
AZURE_ANTHROPIC_ENDPOINT=https://<your-foundry-resource>.services.ai.azure.com/anthropic/
AZURE_ANTHROPIC_MODEL_NAME=claude-opus-4-6-2

AZURE_ANTHROPIC_HAIKU_API_KEY=<your-azure-ai-key>
AZURE_ANTHROPIC_HAIKU_ENDPOINT=https://<your-foundry-resource>.services.ai.azure.com/anthropic/
AZURE_ANTHROPIC_HAIKU_MODEL_NAME=claude-haiku-4-5

AZURE_ANTHROPIC_SONNET_API_KEY=<your-azure-ai-key>
AZURE_ANTHROPIC_SONNET_ENDPOINT=https://<your-foundry-resource>.services.ai.azure.com/anthropic/
AZURE_ANTHROPIC_SONNET_MODEL_NAME=claude-sonnet-4-6

# --- SQL Server (Windows Integrated Auth via msnodesqlv8) ---
DB_SERVER=<sql-server-host>
DB_PORT=1433
DB_DATABASE=<database-name>
DB_TRUST_SERVER_CERT=true

# --- Okta (shared settings) ---
OKTA_ISSUER_URL=https://adobe.okta.com/oauth2/aus1gan31wnmCPyB60h8
OKTA_CALLBACK_PATH=/implicit/callback
DISABLE_AUTH=false

# --- Session ---
SESSION_SECRET=<strong-random-string>

# --- Azure Speech Services ---
AZURE_SPEECH_KEY=<your-azure-speech-key>
AZURE_SPEECH_REGION=eastus

# ==================================================================
# DEVELOPMENT OVERRIDES (.env.development) — local dev
# ==================================================================

# NODE_ENV=development
# PORT=5005
# USE_HTTPS=true
# OKTA_CLIENT_ID=0oa26ahgkblQVZBaR0h8
# OKTA_REDIRECT_URI=https://localhost:5005/implicit/callback
# ALLOWED_ORIGINS=http://localhost:5174,https://localhost:5005

# ==================================================================
# PRODUCTION OVERRIDES (.env.production) — Azure App Service
# ==================================================================
# (Or set these as Azure App Service → Configuration → Application Settings)

# NODE_ENV=production
# OKTA_CLIENT_ID=0oa26ajeynfF191D70h8
# OKTA_REDIRECT_URI=https://soedataagents-hsexf8a2edakgvew.westus2-01.azurewebsites.net/implicit/callback
# ALLOWED_ORIGINS=https://soedataagents-hsexf8a2edakgvew.westus2-01.azurewebsites.net
# USE_HTTPS=false
# SESSION_SECRET must be set in Azure App Settings
```

- [ ] **Step 2: Commit**

```bash
git add server/.env.example
git commit -m "docs: update .env.example with two-tier env layout"
```

---

### Task 9: Install `cross-env` and update npm scripts

**Files:**
- Modify: `server/package.json:9` (dev script)
- Modify: `server/package.json:37-40` (devDependencies)

- [ ] **Step 1: Install cross-env**

Run from `server/` directory:
```bash
npm install --save-dev cross-env
```

- [ ] **Step 2: Update the dev script**

In `server/package.json`, line 9:
```json
// OLD:
    "dev": "nodemon index.js",

// NEW:
    "dev": "cross-env NODE_ENV=development nodemon index.js",
```

- [ ] **Step 3: Verify dev script works**

Run: `cd server && npm run dev`
Expected: Server starts on port 5005 with HTTPS. If OKTA vars are in `.env.development`, no validation error. Press Ctrl+C to stop.

- [ ] **Step 4: Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "chore: add cross-env, set NODE_ENV=development in dev script"
```

---

### Task 10: Smoke test — verify end-to-end

**Files:** None (verification only)

- [ ] **Step 1: Verify env loading order**

Run from `server/`:
```bash
node -e "
  require('./config/env');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('PORT:', process.env.PORT);
  console.log('OKTA_CLIENT_ID:', process.env.OKTA_CLIENT_ID);
  console.log('OKTA_REDIRECT_URI:', process.env.OKTA_REDIRECT_URI);
  console.log('DISABLE_AUTH:', process.env.DISABLE_AUTH);
"
```
Expected output:
```
NODE_ENV: development
PORT: 5005
OKTA_CLIENT_ID: 0oa26ahgkblQVZBaR0h8
OKTA_REDIRECT_URI: https://localhost:5005/implicit/callback
DISABLE_AUTH: false
```

- [ ] **Step 2: Verify validation catches missing vars**

Temporarily rename `.env.development` so dotenv won't load the OKTA values from it, then run the loader with auth enabled:

```bash
cd C:/Users/hrishikeshd/Desktop/Auto_Agents_Claude/server && mv .env.development .env.development.bak && node -e "require('./config/env')" 2>&1; mv .env.development.bak .env.development
```

Expected: Error message listing missing OKTA variables and process exits with code 1. The `.env.development` file is restored automatically by the trailing `mv` command.

- [ ] **Step 3: Start the server**

Run: `cd server && npm run dev`
Expected:
- Server starts on `0.0.0.0:5005 (HTTPS)`
- No validation errors
- Visiting `https://localhost:5005` redirects to OKTA login (after accepting self-signed cert warning)

- [ ] **Step 4: Start Vite dev server**

Run in a separate terminal: `cd client && npm run dev`
Expected:
- Vite starts on port 5174
- Visiting `http://localhost:5174` proxies auth requests to `https://localhost:5005`
- Login flow works through OKTA

- [ ] **Step 5: (Optional) Test OKTA login end-to-end**

1. Go to `https://localhost:5005` (or `http://localhost:5174`)
2. Should redirect to OKTA login page at `adobe.okta.com`
3. Authenticate with your Adobe credentials
4. Should redirect back to the app with a valid session
5. `GET /api/auth/me` should return your user info

---

### Notes

**Standalone scripts:** `server/scripts/runQ1.js` and `scripts/harvestDistinctValues.js` also call `require('dotenv').config()` directly. These scripts only need DB and LLM credentials (not OKTA vars), so they work fine with just the base `server/.env`. No changes needed, but if two-tier env loading is ever desired in these scripts, they can import `server/config/env.js` instead.
