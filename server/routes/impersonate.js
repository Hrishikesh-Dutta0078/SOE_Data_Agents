/**
 * Impersonate search API — search users by name for dynamic RLS impersonation.
 * GET /api/impersonate/search?q=<query>&limit=10
 */

const express = require('express');
const router = express.Router();
const { getPool, TYPES } = require('../config/database');
const logger = require('../utils/logger');

router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);

  if (!q || q.length < 2) {
    return res.json([]);
  }

  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('query', TYPES.NVarChar, `%${q}%`);
    request.input('limit', TYPES.Int, limit);

    const searchSql = `
      SELECT TOP (@limit) name, role, impersonateType, impersonateId FROM (
        SELECT DISTINCT r.REP_NAME AS name, r.EMP_ROLE_TYPE AS role, 'rep' AS impersonateType, CAST(r.REP_ID AS NVARCHAR(50)) AS impersonateId
        FROM vw_td_ebi_region_rpt r
        WHERE r.REP_NAME IS NOT NULL AND r.REP_NAME LIKE @query
        UNION
        SELECT DISTINCT r.FLM, 'FLM', 'flm', CAST(r.FLM_ID AS NVARCHAR(50))
        FROM vw_td_ebi_region_rpt r
        WHERE r.FLM IS NOT NULL AND r.FLM <> '#N/A' AND r.FLM LIKE @query
        UNION
        SELECT DISTINCT r.SLM, 'SLM', 'slm', r.SLM
        FROM vw_td_ebi_region_rpt r
        WHERE r.SLM IS NOT NULL AND r.SLM <> '#N/A' AND r.SLM LIKE @query
        UNION
        SELECT DISTINCT r.TLM, 'TLM', 'tlm', r.TLM
        FROM vw_td_ebi_region_rpt r
        WHERE r.TLM IS NOT NULL AND r.TLM <> '#N/A' AND r.TLM LIKE @query
      ) x
    `;

    const result = await request.query(searchSql);

    const rows = result.recordset || [];
    const seen = new Set();
    const deduped = rows.filter((row) => {
      const key = `${row.name}|${row.role}|${row.impersonateType}|${row.impersonateId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const out = deduped.slice(0, limit).map((r) => ({
      name: r.name,
      role: r.role || '',
      impersonateType: r.impersonateType,
      impersonateId: r.impersonateId,
    }));

    res.json(out);
  } catch (err) {
    logger.error('Impersonate search failed', { error: err.message });
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;
