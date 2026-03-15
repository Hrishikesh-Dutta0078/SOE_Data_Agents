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

module.exports = { getPool, closePool };
