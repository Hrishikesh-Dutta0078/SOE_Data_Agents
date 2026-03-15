import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { fetchDashboardPage } from '../../utils/api';

function formatCellValue(val) {
  if (val === null || val === undefined) return '\u2014';
  if (typeof val === 'number') {
    if (Number.isInteger(val) && Math.abs(val) > 9999) return val.toLocaleString();
    if (!Number.isInteger(val)) return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return val.toLocaleString();
  }
  return String(val);
}

const DEFAULT_PAGE_SIZE = 50;

export default function DashboardTable({ config, data, sql, activeFilters, filterDimensions }) {
  const { columns, maxRows } = config || {};
  const pageSize = maxRows || DEFAULT_PAGE_SIZE;

  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const [serverRows, setServerRows] = useState(null);
  const [serverCols, setServerCols] = useState(null);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const useServerPagination = !!sql;

  const loadPage = useCallback(async (pg) => {
    if (!sql) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDashboardPage(sql, pg, pageSize);
      setServerRows(result.rows || []);
      setServerCols(result.columns || []);
      setTotalRows(result.totalRows || 0);
      setPage(result.page || pg);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sql, pageSize]);

  useEffect(() => {
    if (useServerPagination) {
      loadPage(1);
    }
  }, [useServerPagination, loadPage]);

  const activeRows = useServerPagination ? (serverRows || []) : (Array.isArray(data) ? data : []);

  const filteredRows = useMemo(() => {
    if (!activeFilters || !filterDimensions?.length) return activeRows;
    let rows = activeRows;
    for (const dim of filterDimensions) {
      const val = activeFilters[dim];
      if (val != null) {
        rows = rows.filter((row) => String(row[dim]) === String(val));
      }
    }
    return rows;
  }, [activeRows, activeFilters, filterDimensions]);

  const cols = columns?.length > 0
    ? columns
    : (serverCols?.length > 0 ? serverCols : (filteredRows.length > 0 ? Object.keys(filteredRows[0]) : []));

  const sorted = useMemo(() => {
    if (!sortKey) return filteredRows;
    return [...filteredRows].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av === bv) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredRows, sortKey, sortDir]);

  const displayedRows = useServerPagination ? sorted : sorted.slice(0, pageSize);
  const knowsTotal = totalRows >= 0;
  const totalForDisplay = useServerPagination ? (knowsTotal ? totalRows : null) : (Array.isArray(data) ? data.length : 0);
  const totalPages = useServerPagination && knowsTotal ? Math.max(1, Math.ceil(totalRows / pageSize)) : null;

  const handleSort = (col) => {
    if (sortKey === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col);
      setSortDir('asc');
    }
  };

  const goToPage = (pg) => {
    const clamped = totalPages ? Math.max(1, Math.min(pg, totalPages)) : Math.max(1, pg);
    if (useServerPagination) {
      loadPage(clamped);
    } else {
      setPage(clamped);
    }
  };

  if (cols.length === 0 && !loading) {
    return <div className="flex items-center justify-center h-full text-stone-400 text-sm">No data</div>;
  }

  return (
    <div className="flex flex-col h-full text-xs">
      <div className="flex-1 overflow-auto">
        {loading && displayedRows.length === 0 ? (
          <div className="flex items-center justify-center h-full text-stone-400 text-sm">
            <svg className="animate-spin h-4 w-4 mr-2 text-stone-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading...
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-stone-50">
              <tr>
                {cols.map((col) => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="px-2.5 py-1.5 text-left text-[11px] font-semibold text-stone-500 uppercase tracking-wide border-b border-stone-200 cursor-pointer hover:bg-stone-100 select-none whitespace-nowrap"
                  >
                    {col}
                    {sortKey === col && (
                      <span className="ml-1 text-indigo-500">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedRows.map((row, i) => (
                <tr key={i} className="border-b border-stone-100 hover:bg-stone-50">
                  {cols.map((col) => (
                    <td key={col} className="px-2.5 py-1.5 text-stone-700 whitespace-nowrap">
                      {formatCellValue(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {error && (
          <div className="px-2.5 py-1.5 text-[11px] text-red-500">{error}</div>
        )}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-stone-200 bg-stone-50 text-[11px] text-stone-500">
        <span>
          {totalForDisplay != null && totalForDisplay > 0
            ? `${((page - 1) * pageSize) + 1}\u2013${totalForDisplay ? Math.min(page * pageSize, totalForDisplay) : (page * pageSize)} of ${totalForDisplay.toLocaleString()} rows`
            : totalForDisplay === null && displayedRows.length > 0
              ? `Page ${page} \u00B7 ${displayedRows.length} rows`
              : 'No rows'}
        </span>
        {useServerPagination && (totalPages === null || totalPages > 1) && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1 || loading}
              className="px-2 py-0.5 rounded border border-stone-200 bg-white hover:bg-stone-100
                         disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-stone-600 text-[11px]"
            >
              Prev
            </button>
            <span className="px-2 text-stone-600 font-semibold">
              {totalPages ? `${page} / ${totalPages}` : `Page ${page}`}
            </span>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={(totalPages && page >= totalPages) || loading || displayedRows.length < pageSize}
              className="px-2 py-0.5 rounded border border-stone-200 bg-white hover:bg-stone-100
                         disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-stone-600 text-[11px]"
            >
              Next
            </button>
          </div>
        )}
        {loading && displayedRows.length > 0 && (
          <span className="text-indigo-500 animate-subtle-pulse">Loading...</span>
        )}
      </div>
    </div>
  );
}
