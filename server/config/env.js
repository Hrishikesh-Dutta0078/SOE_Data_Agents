// server/config/env.js
'use strict';

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const serverDir = path.resolve(__dirname, '..');

function isAzureAppService() {
  return Boolean(
    process.env.WEBSITE_SITE_NAME ||
      process.env.WEBSITE_INSTANCE_ID ||
      process.env.APPSETTING_WEBSITE_SITE_NAME
  );
}

// Azure injects PORT before Node starts; dotenv (especially .env.* with override:true)
// must not replace it — otherwise the app listens on the wrong port (e.g. 5175) and the
// platform returns 503. Capture the platform value first.
const azurePreservedPort = isAzureAppService() ? process.env.PORT : undefined;

// npm start does not set NODE_ENV; without production, dev certs in the zip enable HTTPS
// while Azure terminates TLS and expects plain HTTP on PORT.
if (isAzureAppService() && !process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

// 1. Load base .env
dotenv.config({ path: path.join(serverDir, '.env') });

// 2. Load environment-specific .env.{NODE_ENV} (overrides base values)
const nodeEnv = process.env.NODE_ENV || 'development';
const envOverridePath = path.join(serverDir, `.env.${nodeEnv}`);
if (fs.existsSync(envOverridePath)) {
  dotenv.config({ path: envOverridePath, override: true });
}

// On Azure, .env.production is often the intended source for OKTA_* / ALLOWED_ORIGINS, but
// NODE_ENV may be unset, set to "development" in App Settings, or overridden by a deployed
// base .env — any of those loads .env.development (or skips prod) and Okta gets localhost.
// If the file exists on the instance, merge it last so production OAuth URLs win.
if (isAzureAppService()) {
  const azureProdPath = path.join(serverDir, '.env.production');
  if (fs.existsSync(azureProdPath)) {
    dotenv.config({ path: azureProdPath, override: true });
  }
}

if (azurePreservedPort) {
  process.env.PORT = azurePreservedPort;
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
