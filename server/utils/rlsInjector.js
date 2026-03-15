const logger = require('./logger');

const RLS_TABLE_CONFIG = {
  'vw_TF_EBI_P2S': { type: 'direct' },
  'vw_TF_EBI_QUOTA': { type: 'direct' },
  'vw_TF_EBI_PIPE_WALK': { type: 'direct' },
  'vw_TF_EBI_CUSTOMER_SOLUTION_HEALTH_MOVEMENT': { type: 'direct' },
  'vw_TD_ICP_UCP_SCORES': {
    type: 'indirect',
    targetColumn: 'ACCOUNT_SUB_ID',
    steps: [
      { table: 'vw_TD_EBI_ACCOUNT', selectColumn: 'ACCOUNT_SUB_ID', filterColumn: 'ACCOUNT_ID' },
      { table: 'vw_TF_EBI_P2S', selectColumn: 'ACCOUNT_ID', filterColumn: 'REGION_ID' },
    ],
  },
  'TD_EBI_UCP_COMPETITORS': {
    type: 'indirect',
    targetColumn: 'sub_std_name_key',
    steps: [
      { table: 'vw_TD_EBI_ACCOUNT', selectColumn: 'SUB_ID', filterColumn: 'ACCOUNT_ID' },
      { table: 'vw_TF_EBI_P2S', selectColumn: 'ACCOUNT_ID', filterColumn: 'REGION_ID' },
    ],
  },
  'TD_EBI_REPORT_DX_ACCOUNT_PROFILE_OPG': {
    type: 'indirect',
    targetColumn: 'SUB_ID',
    steps: [
      { table: 'vw_TD_EBI_ACCOUNT', selectColumn: 'ACCOUNT_SUB_ID', filterColumn: 'ACCOUNT_ID' },
      { table: 'vw_TF_EBI_P2S', selectColumn: 'ACCOUNT_ID', filterColumn: 'REGION_ID' },
    ],
  },
  'TF_EBI_TPT_INFO': {
    type: 'indirect',
    targetColumn: 'TPT_ID',
    steps: [
      { table: 'vw_TF_EBI_P2S', selectColumn: 'TPT_ID', filterColumn: 'REGION_ID' },
    ],
  },
};

const RLS_TABLES = Object.keys(RLS_TABLE_CONFIG);

function stripComments(sql) {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    if (sql[i] === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') { out += ' '; i++; }
    } else if (sql[i] === '/' && sql[i + 1] === '*') {
      out += '  '; i += 2;
      while (i < sql.length) {
        if (sql[i] === '*' && sql[i + 1] === '/') { out += '  '; i += 2; break; }
        out += sql[i] === '\n' ? '\n' : ' '; i++;
      }
    } else if (sql[i] === "'") {
      out += sql[i]; i++;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") { out += sql[i] + sql[i + 1]; i += 2; }
        else if (sql[i] === "'") { out += sql[i]; i++; break; }
        else { out += sql[i]; i++; }
      }
    } else { out += sql[i]; i++; }
  }
  return out;
}

function findTableOccurrences(sql, tableName) {
  const escaped = tableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`\\b(${escaped})(?:\\s+(?:AS\\s+)?(\\w+))?\\b`, 'gi');
  const results = [];
  let match;
  while ((match = pattern.exec(sql)) !== null) {
    results.push({ table: match[1], alias: match[2] || match[1], index: match.index });
  }
  return results;
}

function findEnclosingScope(sql, position) {
  let depth = 0;
  let openPos = -1;
  for (let i = position; i >= 0; i--) {
    if (sql[i] === ')') depth++;
    else if (sql[i] === '(') {
      if (depth === 0) { openPos = i; break; }
      depth--;
    }
  }
  if (openPos === -1) return { start: 0, end: sql.length };
  depth = 0;
  let closePos = sql.length;
  for (let i = openPos; i < sql.length; i++) {
    if (sql[i] === '(') depth++;
    else if (sql[i] === ')') { depth--; if (depth === 0) { closePos = i; break; } }
  }
  return { start: openPos + 1, end: closePos };
}

function findWhereInsertionInScope(scopeText) {
  const upper = scopeText.toUpperCase();
  const terminators = ['GROUP BY', 'ORDER BY', 'HAVING', 'UNION', 'EXCEPT', 'INTERSECT'];
  let depth = 0;
  let lastWhereIdx = -1;
  for (let i = 0; i < scopeText.length; i++) {
    if (scopeText[i] === '(') depth++;
    else if (scopeText[i] === ')') depth--;
    if (depth === 0 && upper.startsWith('WHERE', i)) {
      const before = i > 0 ? scopeText[i - 1] : ' ';
      const after = scopeText[i + 5] || ' ';
      if (/\s/.test(before) && /\s/.test(after)) lastWhereIdx = i;
    }
  }
  if (lastWhereIdx === -1) {
    let insertIdx = scopeText.length;
    for (const term of terminators) {
      let d = 0;
      for (let i = 0; i < scopeText.length; i++) {
        if (scopeText[i] === '(') d++;
        else if (scopeText[i] === ')') d--;
        if (d === 0 && upper.startsWith(term, i)) {
          const before = i > 0 ? scopeText[i - 1] : ' ';
          if (/\s/.test(before)) insertIdx = Math.min(insertIdx, i);
        }
      }
    }
    return { insertIndex: insertIdx, useAnd: false };
  }
  let endIdx = scopeText.length;
  let depth2 = 0;
  for (let i = lastWhereIdx + 5; i < scopeText.length; i++) {
    if (scopeText[i] === '(') depth2++;
    else if (scopeText[i] === ')') depth2--;
    if (depth2 === 0) {
      for (const term of terminators) {
        if (upper.startsWith(term, i)) {
          const before = i > 0 ? scopeText[i - 1] : ' ';
          if (/\s/.test(before)) endIdx = Math.min(endIdx, i);
        }
      }
    }
  }
  return { insertIndex: endIdx, useAnd: true };
}

function getRlsContextKey(rlsContext) {
  if (!rlsContext) return null;
  if (rlsContext.flmId != null) return { type: 'flm', id: rlsContext.flmId };
  if (rlsContext.repId != null) return { type: 'rep', id: rlsContext.repId };
  if (rlsContext.slmName != null) return { type: 'slm', id: rlsContext.slmName };
  if (rlsContext.tlmName != null) return { type: 'tlm', id: rlsContext.tlmName };
  return null;
}

function buildRegionSubquery(rlsContext) {
  if (!rlsContext) return null;
  if (rlsContext.flmId != null) {
    const id = Number(rlsContext.flmId);
    if (!Number.isFinite(id)) return null;
    return `SELECT rls_r.REGION_ID FROM vw_td_ebi_region_rpt rls_r WHERE rls_r.FLM_ID = ${id}`;
  }
  if (rlsContext.repId != null) {
    const id = Number(rlsContext.repId);
    if (!Number.isFinite(id)) return null;
    return `SELECT rls_r.REGION_ID FROM vw_td_ebi_region_rpt rls_r WHERE rls_r.REP_ID = ${id}`;
  }
  if (rlsContext.slmName != null) {
    const escaped = String(rlsContext.slmName).replace(/'/g, "''");
    return `SELECT rls_r.REGION_ID FROM vw_td_ebi_region_rpt rls_r WHERE rls_r.SLM = N'${escaped}'`;
  }
  if (rlsContext.tlmName != null) {
    const escaped = String(rlsContext.tlmName).replace(/'/g, "''");
    return `SELECT rls_r.REGION_ID FROM vw_td_ebi_region_rpt rls_r WHERE rls_r.TLM = N'${escaped}'`;
  }
  return null;
}

function hasExistingRlsFilter(sql, rlsContext) {
  const key = getRlsContextKey(rlsContext);
  if (!key) return false;
  if (key.type === 'flm' || key.type === 'rep') {
    const safeId = String(Number(key.id));
    if (safeId === 'NaN') return false;
    const col = key.type === 'flm' ? 'FLM_ID' : 'REP_ID';
    return new RegExp(`${col}\\s*=\\s*${safeId}\\b`, 'i').test(sql);
  }
  if (key.type === 'slm' || key.type === 'tlm') {
    const escaped = String(key.id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const col = key.type === 'slm' ? 'SLM' : 'TLM';
    return new RegExp(`${col}\\s*=\\s*N?'[^']*${escaped}[^']*'`, 'i').test(sql);
  }
  return false;
}

function replaceExistingRlsFilters(sql, rlsContext) {
  let result = sql;
  const regionSubquery = buildRegionSubquery(rlsContext);
  if (!regionSubquery) return result;

  const rlsSubqueryPattern = /REGION_ID\s+IN\s*\(\s*SELECT\s+rls_r\.REGION_ID\s+FROM\s+vw_td_ebi_region_rpt\s+rls_r\s+WHERE\s+rls_r\.(?:FLM_ID|REP_ID|SLM|TLM)\s*=[^)]+\)/gi;

  result = result.replace(rlsSubqueryPattern, () => `REGION_ID IN (${regionSubquery})`);

  if (rlsContext.flmId != null) {
    const id = Number(rlsContext.flmId);
    if (Number.isFinite(id)) {
      result = result.replace(/FLM_ID\s*=\s*\d+\b/gi, `FLM_ID = ${id}`);
    }
  }
  if (rlsContext.repId != null) {
    const id = Number(rlsContext.repId);
    if (Number.isFinite(id)) {
      result = result.replace(/REP_ID\s*=\s*\d+\b/gi, `REP_ID = ${id}`);
    }
  }
  if (rlsContext.slmName != null) {
    const escaped = String(rlsContext.slmName).replace(/'/g, "''");
    result = result.replace(/SLM\s*=\s*N?'[^']*'/gi, `SLM = N'${escaped}'`);
  }
  if (rlsContext.tlmName != null) {
    const escaped = String(rlsContext.tlmName).replace(/'/g, "''");
    result = result.replace(/TLM\s*=\s*N?'[^']*'/gi, `TLM = N'${escaped}'`);
  }

  return result;
}

function buildRlsFilter(alias, rlsContext, tableName) {
  const prefix = alias ? `${alias}.` : '';
  const config = RLS_TABLE_CONFIG[tableName];
  const regionSubquery = buildRegionSubquery(rlsContext);
  if (!regionSubquery) return null;

  if (!config || config.type === 'direct') {
    return `${prefix}REGION_ID IN (${regionSubquery})`;
  }

  let inner = regionSubquery;
  for (let i = config.steps.length - 1; i >= 0; i--) {
    const s = config.steps[i];
    const a = `rls_${i}`;
    inner = `SELECT ${a}.${s.selectColumn} FROM ${s.table} ${a} WHERE ${a}.${s.filterColumn} IN (${inner})`;
  }
  return `${prefix}${config.targetColumn} IN (${inner})`;
}

function applyRls(sql, rlsContext) {
  const key = getRlsContextKey(rlsContext);
  if (!key) {
    return sql;
  }

  let result = replaceExistingRlsFilters(sql, rlsContext);
  const clean = stripComments(result);

  if (hasExistingRlsFilter(clean, rlsContext)) {
    return result.replace(/@FLM_ID\b/gi, rlsContext.flmId != null ? String(rlsContext.flmId) : '');
  }

  const occurrences = [];
  for (const tableName of RLS_TABLES) {
    for (const occ of findTableOccurrences(clean, tableName)) {
      occurrences.push({ ...occ, canonicalTable: tableName });
    }
  }
  if (occurrences.length === 0) {
    return result.replace(/@FLM_ID\b/gi, rlsContext.flmId != null ? String(rlsContext.flmId) : '');
  }

  const scopeMap = new Map();
  for (const occ of occurrences) {
    const scope = findEnclosingScope(clean, occ.index);
    const keyScope = `${scope.start}-${scope.end}`;
    if (!scopeMap.has(keyScope)) scopeMap.set(keyScope, { scope, filters: [] });
    const entry = scopeMap.get(keyScope);
    const filter = buildRlsFilter(occ.alias, rlsContext, occ.canonicalTable);
    if (filter && !entry.filters.includes(filter)) {
      entry.filters.push(filter);
    }
  }
  const entries = [...scopeMap.values()].filter((e) => e.filters.length > 0);
  const insertions = [];
  for (const { scope, filters } of entries) {
    const cleanScopeText = clean.substring(scope.start, scope.end);
    const { insertIndex, useAnd } = findWhereInsertionInScope(cleanScopeText);
    const position = scope.start + insertIndex;
    const combinedFilter = filters.join('\n  AND ');
    const connector = useAnd ? '\n  AND ' : '\nWHERE ';
    insertions.push({ position, filterClause: connector + combinedFilter });
  }
  insertions.sort((a, b) => b.position - a.position);
  for (const { position, filterClause } of insertions) {
    result = result.substring(0, position).trimEnd() + filterClause + '\n' + result.substring(position);
  }
  result = result.replace(/@FLM_ID\b/gi, rlsContext.flmId != null ? String(rlsContext.flmId) : '');
  return result;
}

function buildRlsContextFromImpersonate(impersonateContext) {
  if (!impersonateContext || !impersonateContext.type || impersonateContext.id == null) return null;
  const { type, id } = impersonateContext;
  if (type === 'flm') return { flmId: Number(id) };
  if (type === 'rep') return { repId: Number(id) };
  if (type === 'slm') return { slmName: String(id) };
  if (type === 'tlm') return { tlmName: String(id) };
  return null;
}

module.exports = { applyRls, RLS_TABLES, buildRlsContextFromImpersonate };
