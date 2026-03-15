/**
 * SQL Server connection pool using SQL Authentication (tedious driver).
 */

const sql = require('mssql');
const logger = require('../utils/logger');
const {
  DB_REQUEST_TIMEOUT,
  DB_CONNECTION_TIMEOUT,
  DB_POOL_MIN,
  DB_POOL_MAX,
  DB_POOL_IDLE_TIMEOUT,
} = require('./constants');

let pool = null;

const config = {
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    trustServerCertificate: !!process.env.DB_TRUST_SERVER_CERT,
  },
  pool: {
    min: DB_POOL_MIN,
    max: DB_POOL_MAX,
    idleTimeoutMillis: DB_POOL_IDLE_TIMEOUT,
  },
  requestTimeout: DB_REQUEST_TIMEOUT,
  connectionTimeout: DB_CONNECTION_TIMEOUT,
};

function getEnv() {
  return {
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
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
    logger.info('DB connected', { server: config.server });
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
        user: e.user,
        options: {
          trustServerCertificate: e.trustServerCert,
        },
      },
    };
  },
  buildConnectionString() {
    const e = getEnv();
    return [
      `Server=${e.server},${e.port}`,
      `Database=${e.database}`,
      `User=${e.user || '(not set)'}`,
      `TrustServerCertificate=${e.trustServerCert}`,
    ].join(';');
  },
};
