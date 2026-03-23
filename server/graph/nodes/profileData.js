'use strict';

const { profileDataSource } = require('../../services/dataProfiler');
const dashboardCache = require('../../services/dashboardCache');
const logger = require('../../utils/logger');
const { getPool } = require('../../config/database');

// Import dashboard event emitter — shared with dashboardAgent for SSE progress events.
const { dashboardEvents } = require('./dashboardAgent');

const SAMPLE_LIMIT = 500;

function computeDimensionOverlap(profiles) {
  const dimMap = {};
  profiles.forEach((profile, i) => {
    for (const col of profile.columns) {
      if (col.inferredType !== 'categorical' || col.cardinality < 2 || col.cardinality > 100) continue;
      if (!dimMap[col.name]) dimMap[col.name] = { sources: new Set(), values: new Set() };
      dimMap[col.name].sources.add(i);
      if (col.distinctValues) col.distinctValues.forEach((v) => dimMap[col.name].values.add(v));
    }
  });

  const overlap = {};
  for (const [name, info] of Object.entries(dimMap)) {
    if (info.sources.size < 2) continue;
    overlap[name] = {
      sources: [...info.sources],
      matchType: 'exact',
      sharedValues: [...info.values].sort(),
    };
  }
  return overlap;
}

async function fetchSampleRows(sql) {
  try {
    const pool = await getPool();
    const request = pool.request();
    request.timeout = 30000;
    const trimmedSql = sql.replace(/;\s*$/, '');
    // CTEs (WITH ... AS) cannot be wrapped in a derived table in SQL Server.
    // Execute them directly and truncate in JS.
    const isCTE = /^\s*WITH\s/i.test(trimmedSql);
    const sampleSql = isCTE
      ? trimmedSql
      : `SELECT TOP ${SAMPLE_LIMIT} * FROM (${trimmedSql}) _profiler_sample`;
    const result = await request.query(sampleSql);
    const rows = (result.recordset ?? []).slice(0, SAMPLE_LIMIT);
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { rows, columns };
  } catch (err) {
    logger.warn('ProfileData: failed to fetch sample rows', { error: err.message, sql: sql.substring(0, 80) });
    return null;
  }
}

async function collectDataSources(state) {
  const sources = [];

  if (state.dashboardHasDataRequest) {
    const queries = state.queries || [];
    for (const q of queries) {
      if (!q.execution?.success) continue;
      sources.push({ sql: q.sql, rows: q.execution.rows || [], columns: q.execution.columns || [] });
    }
    if (state.execution?.success && state.execution?.rows?.length > 0) {
      const alreadyCovered = (state.queries || []).some((q) => q.execution?.rows === state.execution.rows);
      if (!alreadyCovered) {
        sources.push({ sql: state.sql, rows: state.execution.rows, columns: state.execution.columns || [] });
      }
    }
  } else {
    // Path A: conversation history — rows are typically not included.
    // Fetch sample rows from DB for each SQL we find.
    // IMPORTANT: maintain 1:1 order with history entries so sourceIndex stays aligned
    // with what the client builds from the same conversation history.
    const history = state.conversationHistory || [];
    const entries = [];
    for (const msg of history) {
      if (msg.role !== 'assistant') continue;
      if (!msg.sql && !msg.resultSummary) continue;
      entries.push(msg);
    }

    const needsFetch = entries.filter((m) => !(m.execution?.rows?.length > 0) && m.sql);
    if (needsFetch.length > 0) {
      logger.info(`ProfileData: fetching sample rows for ${needsFetch.length} Path A SQL(s)`);
    }

    // Resolve each entry: use existing rows or fetch from DB (in parallel)
    const resolved = await Promise.all(entries.map((msg) => {
      const exec = msg.execution;
      if (exec?.rows?.length > 0) {
        return Promise.resolve({ rows: exec.rows, columns: exec.columns || Object.keys(exec.rows[0]) });
      }
      if (msg.sql) return fetchSampleRows(msg.sql);
      return Promise.resolve(null);
    }));

    for (let i = 0; i < entries.length; i++) {
      const result = resolved[i];
      sources.push({
        sql: entries[i].sql || '',
        rows: result?.rows || [],
        columns: result?.columns || [],
      });
    }
  }

  return sources;
}

async function profileDataNode(state) {
  const start = Date.now();

  if (state.dataProfiles) {
    return { dataProfiles: state.dataProfiles, profileCacheKey: state.profileCacheKey };
  }

  const sources = await collectDataSources(state);

  if (sources.length === 0) {
    logger.info('ProfileData: no data sources to profile');
    return { dataProfiles: [], profileCacheKey: null, trace: [{ node: 'profileData', timestamp: start, duration: Date.now() - start, skipped: true }] };
  }

  dashboardEvents.emit('dashboard_progress', {
    sessionId: state.sessionId,
    status: 'profiling',
    sourceCount: sources.length,
  });

  const profiles = sources.map((src) => profileDataSource(src.sql, src.rows, src.columns));
  const dimensionOverlap = computeDimensionOverlap(profiles);

  const sessionId = state.sessionId || 'default';
  const cacheKeys = [];
  for (const profile of profiles) {
    dashboardCache.set(sessionId, profile.sqlHash, { profile, tileData: null });
    cacheKeys.push(`${sessionId}:${profile.sqlHash}`);
  }

  const duration = Date.now() - start;
  logger.info(`[ProfileData] Profiled ${profiles.length} source(s), ${Object.keys(dimensionOverlap).length} shared dimensions (${duration}ms)`);

  return {
    dataProfiles: profiles.map((p, i) => ({ ...p, dimensionOverlap: i === 0 ? dimensionOverlap : undefined })),
    profileCacheKey: cacheKeys[0] || null,
    trace: [{ node: 'profileData', timestamp: start, duration, sourceCount: profiles.length }],
  };
}

module.exports = { profileDataNode, __testables: { computeDimensionOverlap, collectDataSources } };
