/**
 * Auto Agents — Express server entry point.
 * Eager-loads knowledge and DB pool at startup so first request is fast.
 *
 * On Windows App Service (no startup command): if node_modules is missing, runs
 * npm install --production once so deploy-without-node_modules works.
 */

const path = require('path');
const fs = require('fs');
const https = require('https');
const childProcess = require('child_process');

const dotenvPath = path.join(__dirname, 'node_modules', 'dotenv');
if (!fs.existsSync(dotenvPath)) {
  const nodeMajor = parseInt(process.version.slice(1).split('.')[0], 10);
  if (nodeMajor < 12) {
    console.error(
      'Startup: node_modules missing and Node version is too old (v' + process.version + '). ' +
      'npm install requires Node 12+. Set your App Service to Node 18 LTS: ' +
      'Portal → Configuration → General settings → Stack → Node version, or set WEBSITE_NODE_DEFAULT_VERSION=18-lts. ' +
      'Alternatively, deploy with node_modules included.'
    );
    throw new Error('Node ' + process.version + ' too old for in-app npm install. Use Node 18+ or deploy with node_modules.');
  }
  console.log('Startup: node_modules missing, running npm install --production...');
  const nodeDir = path.dirname(process.execPath);
  const npmCliJs = path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js');
  console.log('Startup: Node', process.version, 'at', process.execPath, '| npm-cli.js exists:', fs.existsSync(npmCliJs));
  if (!fs.existsSync(npmCliJs)) {
    console.error(
      'Startup: This Node install does not include npm (slim runtime). In-app npm install cannot run. ' +
      'Deploy with node_modules included (run npm install --production locally, then zip and upload), ' +
      'or use a build pipeline (e.g. Azure DevOps, GitHub Actions) that runs npm install before deploy.'
    );
    throw new Error('npm not found at ' + npmCliJs + '. Deploy with node_modules or use a build pipeline that runs npm install.');
  }
  try {
    childProcess.execFileSync(process.execPath, [npmCliJs, 'install', '--production'], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    });
    console.log('Startup: npm install --production completed.');
  } catch (e) {
    console.error('Startup: npm install failed', e.message);
    if (e.stderr) console.error('npm stderr:', e.stderr);
    if (e.stdout) console.error('npm stdout:', e.stdout);
    throw e;
  }
}

require('./config/env');

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const { DEFAULT_PORT } = require('./config/constants');
const logger = require('./utils/logger');
const { getPool } = require('./config/database');
const { loadDistinctValuesAsync } = require('./vectordb/distinctValuesFetcher');
const { loadSchemaKnowledgeAsync } = require('./vectordb/schemaFetcher');
const { loadExamplesAsync } = require('./vectordb/examplesFetcher');
const { loadRulesAsync } = require('./vectordb/rulesFetcher');
const { loadJoinKnowledgeAsync } = require('./vectordb/joinRuleFetcher');
const { loadKpiGlossaryAsync } = require('./vectordb/kpiFetcher');
const { loadSchemaSearcherAsync } = require('./vectordb/schemaSearcher');
const { loadDefinitionsAsync } = require('./vectordb/definitionsFetcher');
const { requireAuthorization, devAuthBypassMiddleware } = require('./auth/requireAuth');
const { analysisLimiter, impersonateLimiter } = require('./middleware/rateLimiter');
const { voiceRateLimiter } = require('./middleware/voiceRateLimit');

const OKTA_CALLBACK_PATH = process.env.OKTA_CALLBACK_PATH || '/implicit/callback';
const PUBLIC_PATHS = ['/api/health', '/login', OKTA_CALLBACK_PATH, '/logout', '/api/auth/me', '/api/text-to-sql/blueprints'];

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "blob:"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      // Okta: markdown or widgets may reference *.okta.com; authorize URLs must not trip img-src.
      imgSrc: ["'self'", "data:", "blob:", 'https://*.okta.com'],
      connectSrc: [
        "'self'",
        'https://*.okta.com',
        'wss://*.stt.speech.microsoft.com',
        'wss://*.tts.speech.microsoft.com',
        'https://*.stt.speech.microsoft.com',
        'https://*.tts.speech.microsoft.com',
        'https://*.api.cognitive.microsoft.com',
      ],
      frameSrc: ["'self'", 'https://*.okta.com'],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      workerSrc: ["'self'", "blob:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
}));
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

// Trust Azure App Service reverse proxy (required for secure cookies + correct req.protocol)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

const sslCertPath = path.join(__dirname, process.env.SSL_CERT_PATH || 'cert.pem');
const sslKeyPath = path.join(__dirname, process.env.SSL_KEY_PATH || 'key.pem');
const sslCertsPresent = fs.existsSync(sslCertPath) && fs.existsSync(sslKeyPath);
const isAzureAppService = Boolean(
  process.env.WEBSITE_SITE_NAME ||
    process.env.WEBSITE_INSTANCE_ID ||
    process.env.APPSETTING_WEBSITE_SITE_NAME
);
// PaaS (e.g. Azure Linux) terminates TLS; the process must listen for plain HTTP on PORT.
// Do not auto-enable HTTPS in production just because dev certs were deployed with the zip.
// On Azure, never bind HTTPS in-node unless explicitly forced (NODE_ENV can be wrong if unset).
const useHttps =
  !isAzureAppService &&
  (process.env.USE_HTTPS === 'true' ||
    (process.env.NODE_ENV !== 'production' && sslCertsPresent));
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable must be set in production');
}
if (process.env.NODE_ENV === 'production' && process.env.DISABLE_AUTH === 'true') {
  throw new Error('DISABLE_AUTH cannot be set when NODE_ENV=production');
}
app.use(session({
  secret: process.env.SESSION_SECRET || 'auto-agents-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  name: 'autoagents.sid',
  cookie: {
    secure: useHttps || process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    httpOnly: true,
  },
}));

app.use(devAuthBypassMiddleware);

app.use((req, res, next) => {
  const pathMatch = PUBLIC_PATHS.some((p) => req.path === p || req.path === p.replace(/^\//, ''));
  if (pathMatch) return next();
  requireAuthorization(req, res, next);
});

app.use(require('./routes/auth'));
app.use('/api/health', require('./routes/health'));
app.use('/api/impersonate', impersonateLimiter, require('./routes/impersonate'));
app.use('/api/text-to-sql', analysisLimiter, require('./routes/textToSql'));
app.use('/api/voice', voiceRateLimiter, require('./routes/voice'));
app.use('/api/feedback', require('./routes/feedback'));

const publicDir = path.join(__dirname, 'public');
// index: false so GET / reaches the SPA handler below — avoids serving index.html without cache headers.
// Okta redirects to / after login; a cached shell would load stale hashed JS/CSS from an older deploy.
app.use(
  express.static(publicDir, {
    index: false,
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        return;
      }
      if (process.env.NODE_ENV === 'production') {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);
app.get('*', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.sendFile(path.join(publicDir, 'index.html'));
});

function resolveListenPort() {
  const n = parseInt(process.env.PORT, 10);
  if (Number.isFinite(n) && n > 0) return n;
  if (process.env.NODE_ENV === 'production') {
    return 8080;
  }
  return DEFAULT_PORT;
}

const PORT = resolveListenPort();
if (process.env.NODE_ENV === 'production' && !process.env.PORT) {
  logger.warn(
    'PORT env not set; listening on 8080 (typical Azure App Service). ' +
      'Set PORT in Application Settings if your host requires a different value.'
  );
}
/** Bind address: default 0.0.0.0 for LAN access; set BIND_HOST=127.0.0.1 for localhost-only. */
const BIND_HOST = process.env.BIND_HOST || '0.0.0.0';

async function start() {
  try {
    await getPool();
    logger.info('DB pool ready');
  } catch (err) {
    const meta = { error: err };
    if (err && err.name === 'ConnectionError' && String(err.message) === '[object Object]') {
      meta.hint = 'Driver returned an object; check ODBC driver, SQL Server, and connection string (DB_SERVER, DB_DATABASE, trustedConnection).';
    }
    logger.warn('DB pool not ready at startup', meta);
  }

  const loaders = [
    ['distinctValues', loadDistinctValuesAsync],
    ['schema', loadSchemaKnowledgeAsync],
    ['examples', loadExamplesAsync],
    ['rules', loadRulesAsync],
    ['joinKnowledge', loadJoinKnowledgeAsync],
    ['kpiGlossary', loadKpiGlossaryAsync],
    ['schemaSearcher', loadSchemaSearcherAsync],
    ['definitions', loadDefinitionsAsync],
  ];
  const results = await Promise.allSettled(loaders.map(([name, fn]) => fn()));
  for (let i = 0; i < results.length; i++) {
    const [name] = loaders[i];
    if (results[i].status === 'rejected') {
      logger.warn(`Knowledge load failed: ${name}`, { error: results[i].reason });
    }
  }
  logger.info('Knowledge preload complete');

  if (process.env.DISABLE_AUTH === 'true') {
    logger.warn('DISABLE_AUTH is set: Okta authentication is bypassed (non-production only)');
  }

  if (useHttps) {
    const server = https.createServer(
      {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath),
      },
      app
    );
    server.listen(PORT, BIND_HOST, () => {
      logger.info(`Auto Agents server running on ${BIND_HOST}:${PORT} (HTTPS)`);
    });
  } else {
    app.listen(PORT, BIND_HOST, () => {
      logger.info(`Auto Agents server running on ${BIND_HOST}:${PORT}`);
    });
  }
}

start().catch((err) => {
  logger.error('Server startup failed', { error: err });
  process.exitCode = 1;
});
