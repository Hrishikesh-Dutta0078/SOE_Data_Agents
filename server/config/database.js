/**
 * SQL Server connection pool.
 * - Production (DB_USER + DB_PASSWORD set): SQL Server authentication via standard mssql driver.
 * - Development (no DB_USER): Windows Authentication via msnodesqlv8 driver.
 */

const logger = require('../utils/logger');
const {
  DB_REQUEST_TIMEOUT,
  DB_CONNECTION_TIMEOUT,
  DB_POOL_MIN,
  DB_POOL_MAX,
  DB_POOL_IDLE_TIMEOUT,
} = require('./constants');

const useSqlAuth = !!(process.env.DB_USER && process.env.DB_PASSWORD);
const sql = useSqlAuth ? require('mssql') : require('mssql/msnodesqlv8');

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

if (useSqlAuth) {
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
    pool = await new sql.ConnectionPool(config).connect();
    pool.on('error', (err) => {
      logger.error('SQL Server pool error', { error: err.message });
      pool = null;
    });
    logger.info('DB connected', { server, auth: useSqlAuth ? 'sql' : 'windows' });
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

/** TYPES for parameterized queries (e.g. request.input('x', TYPES.NVarChar, val)) — from mssql */
const TYPES = sql;

module.exports = {
  getPool,
  closePool,
  TYPES,
  getDbConfig() {
    const e = getEnv();
    return {
      config: {
        server: e.server,
        port: e.port,
        database: e.database,
        options: {
          trustServerCertificate: e.trustServerCert,
          ...(useSqlAuth
            ? { encrypt: true }
            : { trustedConnection: true }),
        },
        ...(useSqlAuth && {
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
        }),
      },
    };
  },
  buildConnectionString() {
    const e = getEnv();
    if (useSqlAuth) {
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
