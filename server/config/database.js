/**
 * SQL Server connection pool.
 * - Production (DB_USER + DB_PASSWORD set): SQL Server authentication via standard mssql (tedious).
 * - Development on Windows (no DB_USER): Windows Integrated Auth via msnodesqlv8 + ODBC.
 *
 * msnodesqlv8 is a native addon: do not load it on Linux unless using SQL auth only (lazy load).
 * Azure App Service Linux needs DB_USER + DB_PASSWORD; zipping Windows node_modules still works
 * for mssql/tedious because we never require msnodesqlv8 when SQL auth is configured.
 */

const logger = require('../utils/logger');
const {
  DB_REQUEST_TIMEOUT,
  DB_CONNECTION_TIMEOUT,
  DB_POOL_MIN,
  DB_POOL_MAX,
  DB_POOL_IDLE_TIMEOUT,
} = require('./constants');

function isSqlAuth() {
  return !!(process.env.DB_USER && process.env.DB_PASSWORD);
}

let sqlDriver = null;
function getSqlDriver() {
  if (sqlDriver) return sqlDriver;
  if (isSqlAuth()) {
    sqlDriver = require('mssql');
    return sqlDriver;
  }
  if (process.platform !== 'win32') {
    throw new Error(
      'SQL Server: set DB_USER and DB_PASSWORD (SQL authentication). ' +
        'Windows Integrated Authentication is only supported on Windows. ' +
        'On Azure App Service Linux, add those app settings and use a SQL login — do not zip node_modules built on Windows without setting them, or the app may try to load the wrong native driver.'
    );
  }
  sqlDriver = require('mssql/msnodesqlv8');
  return sqlDriver;
}

let pool = null;

const server = process.env.DB_SERVER;
const port = parseInt(process.env.DB_PORT, 10) || 1433;
const database = process.env.DB_DATABASE;

const poolSettings = {
  min: DB_POOL_MIN,
  max: DB_POOL_MAX,
  idleTimeoutMillis: DB_POOL_IDLE_TIMEOUT,
};

let config;

if (isSqlAuth()) {
  config = {
    server,
    port,
    database,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    pool: poolSettings,
    requestTimeout: DB_REQUEST_TIMEOUT,
    connectionTimeout: DB_CONNECTION_TIMEOUT,
    options: {
      encrypt: true,
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERT === 'true',
    },
  };
} else {
  config = {
    connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=${server},${port};Database=${database};Trusted_Connection=Yes;`,
    pool: poolSettings,
    requestTimeout: DB_REQUEST_TIMEOUT,
    connectionTimeout: DB_CONNECTION_TIMEOUT,
  };
}

function getEnv() {
  return {
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    database: process.env.DB_DATABASE,
    trustServerCert: process.env.DB_TRUST_SERVER_CERT === 'true',
  };
}

async function getPool() {
  if (pool) return pool;

  try {
    const sql = getSqlDriver();
    pool = await new sql.ConnectionPool(config).connect();
    pool.on('error', (err) => {
      logger.error('SQL Server pool error', { error: err.message });
      pool = null;
    });
    logger.info('DB connected', { server, auth: isSqlAuth() ? 'sql' : 'windows' });
    return pool;
  } catch (err) {
    logger.error('SQL Server connection failed', { error: err.message });
    pool = null;
    throw err;
  }
}

async function closePool() {
  if (pool) {
    await pool.close();
    pool = null;
    logger.info('SQL Server pool closed');
  }
}

module.exports = {
  getPool,
  closePool,
  get TYPES() {
    return getSqlDriver();
  },
  getDbConfig() {
    const e = getEnv();
    return {
      config: {
        server: e.server,
        port: e.port,
        database: e.database,
        options: {
          trustServerCertificate: e.trustServerCert,
          ...(isSqlAuth()
            ? { encrypt: true }
            : { trustedConnection: true }),
        },
        ...(isSqlAuth() && {
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
        }),
      },
    };
  },
  buildConnectionString() {
    const e = getEnv();
    if (isSqlAuth()) {
      return [
        `Server=${e.server},${e.port}`,
        `Database=${e.database}`,
        `User Id=${process.env.DB_USER}`,
        `Password=${process.env.DB_PASSWORD}`,
        `TrustServerCertificate=${e.trustServerCert}`,
        `Encrypt=true`,
      ].join(';');
    }
    return [
      `Server=${e.server},${e.port}`,
      `Database=${e.database}`,
      `Trusted_Connection=Yes`, 
      `TrustServerCertificate=${e.trustServerCert}`,
    ].join(';');
  },
};
