'use strict';

const { getThreshold } = require('../vectordb/definitionsFetcher');

const STATUS_COLUMN = 'Computed_Status';
const MAX_TABLE_COLUMNS = 6;
const MAX_TABLE_ROWS = 8;

const NORMALIZED_STATUS = {
  green: 'On Track',
  yellow: 'At Risk',
  red: 'Behind',
  'on track': 'On Track',
  'at risk': 'At Risk',
  behind: 'Behind',
  healthy: 'On Track',
  warning: 'At Risk',
  critical: 'Behind',
};

const NEUTRAL_STATUS = new Set(['na', 'n/a', 'none', 'null', 'unknown', '']);

function normalizeStatusValue(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim().toLowerCase();
  return NORMALIZED_STATUS[normalized] || null;
}

function isNeutralStatusValue(value) {
  if (value === null || value === undefined) return true;
  return NEUTRAL_STATUS.has(String(value).trim().toLowerCase());
}

function findColumn(columns, patterns) {
  return columns.find((column) => patterns.some((pattern) => pattern.test(column))) || null;
}

function isNumericValue(value) {
  return typeof value === 'number' || (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value)));
}

function isNumericColumn(rows, column) {
  const values = rows.map((row) => row[column]).filter((value) => value !== null && value !== undefined && value !== '');
  if (!values.length) return false;
  return values.every(isNumericValue);
}

function inferThresholdType(columnName) {
  if (!columnName) return 'coverage';
  return /creation/i.test(columnName) ? 'creation' : 'coverage';
}

function computeStatusFromRatio(ratio, thresholdType) {
  const numericRatio = Number(ratio);
  if (!Number.isFinite(numericRatio)) return null;

  const thresholds = getThreshold(thresholdType);
  if (!Number.isFinite(thresholds.green) || !Number.isFinite(thresholds.yellow)) return null;

  if (numericRatio >= thresholds.green) return 'On Track';
  if (numericRatio >= thresholds.yellow) return 'At Risk';
  return 'Behind';
}

function buildSupportingColumns(columns, thresholdType, exclude = []) {
  const excluded = new Set(exclude);
  const supportPatterns = thresholdType === 'creation'
    ? [/grosscreationpipe/i, /grosscreationtarget/i, /creation_coverage/i]
    : [/^pipe$/i, /^quota$/i, /coverage_ratio/i];

  return columns.filter((column) => (
    !excluded.has(column) &&
    supportPatterns.some((pattern) => pattern.test(column))
  ));
}

function detectQualityColumnBasis(execution) {
  const { columns, rows } = execution;

  for (const column of columns) {
    if (!/(status|quality|health)/i.test(column)) continue;

    const values = rows
      .map((row) => row[column])
      .filter((value) => value !== null && value !== undefined && value !== '');

    if (!values.length) continue;

    const hasRecognizedStatus = values.some((value) => normalizeStatusValue(value));
    const hasUnsupportedValue = values.some((value) => !normalizeStatusValue(value) && !isNeutralStatusValue(value));

    if (!hasRecognizedStatus || hasUnsupportedValue) continue;

    const thresholdType = inferThresholdType(column);
    return {
      type: 'quality_column',
      thresholdType,
      sourceColumn: column,
      supportingColumns: buildSupportingColumns(columns, thresholdType, [column]),
    };
  }

  return null;
}

function detectRatioColumnBasis(execution) {
  const { columns, rows } = execution;
  const ratioCandidates = [
    { pattern: /creation_coverage/i, thresholdType: 'creation' },
    { pattern: /coverage_ratio/i, thresholdType: 'coverage' },
  ];

  for (const candidate of ratioCandidates) {
    const column = findColumn(columns, [candidate.pattern]);
    if (!column || !isNumericColumn(rows, column)) continue;
    return {
      type: 'ratio_column',
      thresholdType: candidate.thresholdType,
      sourceColumn: column,
      supportingColumns: buildSupportingColumns(columns, candidate.thresholdType, []),
    };
  }

  return null;
}

function detectActualTargetPairBasis(execution) {
  const { columns } = execution;
  const actualTargetPairs = [
    {
      thresholdType: 'creation',
      actualColumn: findColumn(columns, [/grosscreationpipe/i]),
      targetColumn: findColumn(columns, [/grosscreationtarget/i]),
    },
    {
      thresholdType: 'coverage',
      actualColumn: findColumn(columns, [/^pipe$/i]),
      targetColumn: findColumn(columns, [/^quota$/i]),
    },
  ];

  const pair = actualTargetPairs.find((candidate) => candidate.actualColumn && candidate.targetColumn);
  if (!pair) return null;

  return {
    type: 'actual_target_pair',
    thresholdType: pair.thresholdType,
    actualColumn: pair.actualColumn,
    targetColumn: pair.targetColumn,
    supportingColumns: buildSupportingColumns(columns, pair.thresholdType, []),
  };
}

function determineBasis(execution) {
  return detectQualityColumnBasis(execution)
    || detectRatioColumnBasis(execution)
    || detectActualTargetPairBasis(execution);
}

function computeRowStatus(row, basis) {
  if (!basis) return null;

  if (basis.type === 'quality_column') {
    return normalizeStatusValue(row[basis.sourceColumn]);
  }

  if (basis.type === 'ratio_column') {
    return computeStatusFromRatio(row[basis.sourceColumn], basis.thresholdType);
  }

  if (basis.type === 'actual_target_pair') {
    const actual = Number(row[basis.actualColumn]);
    const target = Number(row[basis.targetColumn]);
    if (!Number.isFinite(actual) || !Number.isFinite(target) || target <= 0) return null;
    return computeStatusFromRatio(actual / target, basis.thresholdType);
  }

  return null;
}

function dedupe(items) {
  return [...new Set(items.filter(Boolean))];
}

function selectDisplayColumns(execution, basis) {
  const { columns, rows } = execution;
  const excluded = new Set([STATUS_COLUMN]);
  if (basis.type === 'quality_column') excluded.add(basis.sourceColumn);

  const labelColumns = columns.filter((column) => (
    !excluded.has(column) &&
    !/(status|quality|health)/i.test(column) &&
    !isNumericColumn(rows, column)
  ));

  const displayColumns = dedupe([
    ...labelColumns.slice(0, 2),
    ...(basis.supportingColumns || []),
  ]);

  for (const column of columns) {
    if (displayColumns.length >= MAX_TABLE_COLUMNS - 1) break;
    if (excluded.has(column) || displayColumns.includes(column)) continue;
    displayColumns.push(column);
  }

  return [...displayColumns.slice(0, MAX_TABLE_COLUMNS - 1), STATUS_COLUMN];
}

function formatValue(value, column) {
  if (value === null || value === undefined || value === '') return '—';
  if (column === STATUS_COLUMN) return String(value);

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(value);

  if (/ratio|coverage/i.test(column)) {
    return `${numericValue.toFixed(2)}x`;
  }

  if (Number.isInteger(numericValue)) {
    return numericValue.toLocaleString('en-US');
  }

  return numericValue.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function escapeMarkdownCell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function buildStatusTableMarkdown(rows, displayColumns) {
  const visibleColumns = displayColumns.map((column) => column === STATUS_COLUMN ? 'Status' : column);
  const visibleRows = rows.slice(0, MAX_TABLE_ROWS);
  const header = `| ${visibleColumns.join(' | ')} |`;
  const divider = `| ${visibleColumns.map(() => '---').join(' | ')} |`;
  const body = visibleRows.map((row) => {
    const values = displayColumns.map((column) => escapeMarkdownCell(formatValue(row[column], column)));
    return `| ${values.join(' | ')} |`;
  });
  return [header, divider, ...body].join('\n');
}

function buildDeterministicStatusAssessment(execution) {
  if (!execution?.rows?.length || !execution?.columns?.length) {
    return {
      supported: false,
      basis: null,
      execution,
      displayColumns: [],
      tableMarkdown: null,
    };
  }

  const basis = determineBasis(execution);
  if (!basis) {
    return {
      supported: false,
      basis: null,
      execution,
      displayColumns: [],
      tableMarkdown: null,
    };
  }

  const rows = execution.rows.map((row) => ({
    ...row,
    [STATUS_COLUMN]: computeRowStatus(row, basis),
  }));

  const statusExecution = {
    ...execution,
    columns: execution.columns.includes(STATUS_COLUMN)
      ? execution.columns
      : [...execution.columns, STATUS_COLUMN],
    rows,
  };

  const displayColumns = selectDisplayColumns(statusExecution, basis);

  return {
    supported: true,
    basis,
    execution: statusExecution,
    displayColumns,
    tableMarkdown: buildStatusTableMarkdown(rows, displayColumns),
  };
}

module.exports = {
  STATUS_COLUMN,
  buildDeterministicStatusAssessment,
};
