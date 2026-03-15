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

require('dotenv').config();

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
const { requireAuthorization } = require('./auth/requireAuth');
const { analysisLimiter, impersonateLimiter } = require('./middleware/rateLimiter');

const OKTA_CALLBACK_PATH = process.env.OKTA_CALLBACK_PATH || '/implicit/callback';
const PUBLIC_PATHS = ['/api/health', '/login', OKTA_CALLBACK_PATH, '/logout', '/api/auth/me'];

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
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

const useHttps = process.env.USE_HTTPS === 'true' || (
  fs.existsSync(path.join(__dirname, 'cert.pem')) && fs.existsSync(path.join(__dirname, 'key.pem'))
);
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable must be set in production');
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

app.use((req, res, next) => {
  const pathMatch = PUBLIC_PATHS.some((p) => req.path === p || req.path === p.replace(/^\//, ''));
  if (pathMatch) return next();
  requireAuthorization(req, res, next);
});

app.use(require('./routes/auth'));
app.use('/api/health', require('./routes/health'));
app.use('/api/impersonate', impersonateLimiter, require('./routes/impersonate'));
app.use('/api/text-to-sql', analysisLimiter, require('./routes/textToSql'));

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || DEFAULT_PORT;

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
  ];
  const results = await Promise.allSettled(loaders.map(([name, fn]) => fn()));
  for (let i = 0; i < results.length; i++) {
    const [name] = loaders[i];
    if (results[i].status === 'rejected') {
      logger.warn(`Knowledge load failed: ${name}`, { error: results[i].reason });
    }
  }
  logger.info('Knowledge preload complete');

  if (useHttps) {
    const certPath = path.join(__dirname, process.env.SSL_CERT_PATH || 'cert.pem');
    const keyPath = path.join(__dirname, process.env.SSL_KEY_PATH || 'key.pem');
    const server = https.createServer(
      {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      },
      app
    );
    server.listen(PORT, () => {
      logger.info(`Auto Agents server running on port ${PORT} (HTTPS)`);
    });
  } else {
    app.listen(PORT, () => {
      logger.info(`Auto Agents server running on port ${PORT}`);
    });
  }
}

start().catch((err) => {
  logger.error('Server startup failed', { error: err });
  process.exitCode = 1;
});
