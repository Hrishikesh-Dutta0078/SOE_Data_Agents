# OKTA Environment-Specific Configuration

## Goal

Enable OKTA authentication for both local development and Azure App Service production, using environment-specific `.env` files with new client IDs and callback URLs.

## Context

OKTA auth (PKCE + Authorization Code flow) is already fully implemented. This work updates configuration only — no auth logic changes.

> **Note:** The OKTA client IDs listed below are PKCE SPA client IDs, which are public by design (embedded in client-side redirects). They are safe to document.

### Environment Details

| | Local | Production (Azure) |
|---|---|---|
| Client ID | `0oa26ahgkblQVZBaR0h8` | `0oa26ajeynfF191D70h8` |
| Callback URL | `https://localhost:5005/implicit/callback` | `https://soedataagents-hsexf8a2edakgvew.westus2-01.azurewebsites.net/implicit/callback` |
| Issuer URL | `https://adobe.okta.com/oauth2/aus1gan31wnmCPyB60h8` | Same |
| Server Port | 5005 | Managed by Azure |
| HTTPS | Self-signed certs | Azure TLS termination |
| Auth | Enabled | Enabled |
| Allowed Users | `["hrishikeshd"]` (whitelist) | Same |

## Design

### File Structure

All `.env*` files live in `server/`. Paths below are relative to the repo root.

| File | Purpose | Git tracked? |
|---|---|---|
| `server/.env` | Base/shared config (DB, LLM, session, shared OKTA settings) | No |
| `server/.env.development` | Local dev overrides (OKTA local client ID, port, callback) | No |
| `server/.env.production` | Production overrides (OKTA prod client ID, callback) | No |
| `server/.env.example` | Template documenting all vars for both environments | Yes |

### Environment Loader (`server/config/env.js`)

New file. Uses the existing `dotenv` package (no new dependencies).

**Loading order:**
1. Load `server/.env` (base config) — `dotenv.config({ path: resolve(__dirname, '../.env') })`
2. Determine `NODE_ENV` from the base `.env` or pre-existing env var (defaults to `development`)
3. Load `server/.env.{NODE_ENV}` if it exists — `dotenv.config({ path: ..., override: true })`

The `override: true` flag ensures environment-specific values replace base values. If the environment-specific file doesn't exist (e.g., in Azure where env vars come from App Settings), the base values are used as-is.

**Critical:** This file **replaces** the existing `require('dotenv').config()` call on line 53 of `server/index.js`. That call must be removed. The new `require('./config/env')` must be placed at the very top of `server/index.js` (after the node_modules bootstrap block), before any other module that reads `process.env`.

### Startup Validation

The `env.js` loader includes a validation check: when `DISABLE_AUTH` is not `true`, it verifies that `OKTA_CLIENT_ID`, `OKTA_REDIRECT_URI`, and `OKTA_ISSUER_URL` are all non-empty. If any are missing, the server logs a clear error and exits, preventing silent auth failures at login time.

### Configuration Values

**`server/.env` (base):**
```
DB_SERVER=<value>
DB_PORT=<value>
DB_DATABASE=<value>
DB_USER=<value>
DB_PASSWORD=<value>
AZURE_ANTHROPIC_ENDPOINT=<value>
AZURE_ANTHROPIC_API_KEY=<value>
AZURE_ANTHROPIC_MODEL_NAME=<value>
AZURE_ANTHROPIC_HAIKU_ENDPOINT=<value>
AZURE_ANTHROPIC_HAIKU_API_KEY=<value>
AZURE_ANTHROPIC_HAIKU_MODEL_NAME=<value>
OKTA_ISSUER_URL=https://adobe.okta.com/oauth2/aus1gan31wnmCPyB60h8
OKTA_CALLBACK_PATH=/implicit/callback
DISABLE_AUTH=false
SESSION_SECRET=<strong-random-string>
```

**`server/.env.development` (local dev overrides):**
```
NODE_ENV=development
PORT=5005
USE_HTTPS=true
OKTA_CLIENT_ID=0oa26ahgkblQVZBaR0h8
OKTA_REDIRECT_URI=https://localhost:5005/implicit/callback
ALLOWED_ORIGINS=http://localhost:5174,https://localhost:5005
```

**`server/.env.production` (production overrides):**
```
NODE_ENV=production
OKTA_CLIENT_ID=0oa26ajeynfF191D70h8
OKTA_REDIRECT_URI=https://soedataagents-hsexf8a2edakgvew.westus2-01.azurewebsites.net/implicit/callback
ALLOWED_ORIGINS=https://soedataagents-hsexf8a2edakgvew.westus2-01.azurewebsites.net
USE_HTTPS=false
# SESSION_SECRET must be set in Azure App Settings (not in this file)
```

### Code Changes

| File | Change | Why |
|---|---|---|
| `server/config/env.js` | New file: env loader + OKTA var validation | Loads `server/.env` then `server/.env.{NODE_ENV}` with override; validates required OKTA vars |
| `server/index.js` | Replace `require('dotenv').config()` (line 53) with `require('./config/env')` at top of file | Must load env before any other imports; removes duplicate dotenv call |
| `server/index.js` | Add `app.set('trust proxy', 1)` when `NODE_ENV === 'production'` | Required for Azure reverse proxy — ensures `req.protocol` is `https`, session cookies work, and `req.ip` is the client IP |
| `server/config/constants.js` | Default PORT 5000 → 5005 | Match OKTA callback registration |
| `client/vite.config.js` | Proxy target 5000 → 5005 | Match new server port |
| `server/.env.example` | Document all vars with base + development + production sections | Onboarding reference showing the two-tier layout |
| `server/.gitignore` | Add `.env.development`, `.env.production` | Prevent secrets in git |
| `server/package.json` | `dev` script: use `cross-env NODE_ENV=development` | Windows-compatible env var setting; auto-loads `.env.development` |
| `server/package.json` | Add `cross-env` as devDependency | Required for Windows-compatible NODE_ENV setting in npm scripts |

### What Does NOT Change

- `server/auth/pkce.js` — PKCE generation untouched
- `server/auth/requireAuth.js` — Auth middleware untouched
- `server/routes/auth.js` — Auth routes untouched (already read from `process.env`)
- `server/config/allowedUsers.json` — Keep `["hrishikeshd"]`
- Client auth code (`App.jsx`, `api.js`) — Untouched

## Testing

1. **Local:** Start with `npm run dev`, verify redirect to OKTA login, complete flow, confirm session
2. **Production:** Deploy to Azure, set App Settings, verify OKTA flow with production client ID
3. **Env loading:** Verify `.env.development` overrides `.env` base values correctly
4. **Auth enabled:** Confirm `DISABLE_AUTH=false` enforces OKTA login (no dev bypass)
5. **Startup validation:** Remove `OKTA_CLIENT_ID` from env, verify server logs error and exits

## Risks

- **Self-signed cert warning:** Local HTTPS with self-signed certs triggers browser warnings. Users must accept to proceed. Existing behavior, unchanged.
- **Port sync:** The OKTA callback URL, `PORT` env var, and Vite proxy target must all use port 5005. If any get out of sync, OKTA will reject the redirect_uri mismatch. The startup validation helps catch missing values but not port mismatches.
- **Port conflict:** If port 5005 is in use locally, the server won't start. Standard behavior.
