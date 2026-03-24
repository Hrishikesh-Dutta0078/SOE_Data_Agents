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
