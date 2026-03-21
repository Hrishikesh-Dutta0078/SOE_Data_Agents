import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { ChevronLeft, Download, LayoutGrid } from 'lucide-react';
import { fetchSlicerValues } from '../utils/api';
import SlicerBar from './SlicerBar';
import DashboardGrid from './DashboardGrid';

function EmptyState({ onSuggestionClick }) {
  const suggestions = [
    'What is pipeline by segment?',
    'Show coverage vs. target by region',
    'List top 10 deals at risk',
  ];

  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <LayoutGrid size={32} strokeWidth={1.5} className="text-stone-300" />
      <h3 className="text-xl font-semibold text-stone-700 mb-2 tracking-tight">No dashboard data yet</h3>
      <p className="text-sm text-stone-500 mb-5 max-w-md">
        Ask some data questions in the chat, then come back and create a dashboard to visualize your results.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onSuggestionClick?.(s)}
            className="text-xs bg-stone-50 hover:bg-stone-100 text-stone-700 px-3 py-1.5 rounded-full
                       border border-stone-200 hover:border-stone-300 transition-all cursor-pointer"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function generateRefinementSuggestions(spec) {
  if (!spec?.tiles?.length) return [];
  const suggestions = [];
  const tileTypes = spec.tiles.map((t) => t.type);
  const chartTypes = spec.tiles
    .filter((t) => t.type === 'chart')
    .map((t) => t.config?.chartType);

  if (!tileTypes.includes('kpi')) {
    suggestions.push('Add a KPI for the top metric');
  }
  if (chartTypes.includes('bar') && !chartTypes.includes('line')) {
    suggestions.push('Change a bar chart to a line chart');
  }
  if (chartTypes.includes('line') && !chartTypes.includes('bar')) {
    suggestions.push('Change a line chart to a bar chart');
  }
  if (!chartTypes.includes('pie') && spec.tiles.length < 6) {
    suggestions.push('Add a pie chart breakdown');
  }
  if (!tileTypes.includes('insight') && spec.tiles.length < 6) {
    suggestions.push('Add an insight card with analysis');
  }
  if (spec.tiles.length > 3) {
    suggestions.push('Simplify to only the top 3 tiles');
  }

  return suggestions.slice(0, 3);
}

function extractInMemorySlicerValues(spec, dataSources) {
  if (!spec?.slicers?.length || !dataSources?.length) return [];
  const tiles = spec.tiles || [];

  return spec.slicers.map((slicer) => {
    const realValues = new Set();
    for (const tile of tiles) {
      if (!tile.filterDimensions?.includes(slicer.dimension)) continue;
      const rows = dataSources?.[tile.sourceIndex]?.execution?.rows || [];
      for (const row of rows) {
        const val = row[slicer.dimension];
        if (val != null && val !== '') realValues.add(String(val));
      }
    }
    return { ...slicer, values: [...realValues].sort() };
  }).filter((s) => s.values.length > 0);
}

export default function DashboardOverlay({ dashboardData, onClose, onSuggestionClick, onRefineDashboard }) {
  const { spec, dataSources, slicerValues: precomputedSlicerValues, tileData, profileCacheKey } = dashboardData || {};
  const [activeFilters, setActiveFilters] = useState({});
  const [slicerValues, setSlicerValues] = useState(precomputedSlicerValues || {});
  const [slicersLoading, setSlicersLoading] = useState(false);
  const [refineInput, setRefineInput] = useState('');
  const [refining, setRefining] = useState(false);
  const [version, setVersion] = useState(1);
  const refineInputRef = React.useRef(null);

  const handleFilterChange = useCallback((dimension, value) => {
    setActiveFilters((prev) => ({ ...prev, [dimension]: value }));
  }, []);

  const handleResetAll = useCallback(() => {
    setActiveFilters({});
  }, []);

  const handleRefineSubmit = useCallback(async () => {
    const text = refineInput.trim();
    if (!text || refining || !onRefineDashboard) return;

    setRefining(true);
    setRefineInput('');
    try {
      await onRefineDashboard(text);
      setVersion((v) => v + 1);
    } catch {
      /* error is handled by ChatPanel */
    } finally {
      setRefining(false);
    }
  }, [refineInput, refining, onRefineDashboard]);

  useEffect(() => {
    // Skip fetch if we already have precomputed slicer values
    if (precomputedSlicerValues && Object.keys(precomputedSlicerValues).length > 0) {
      setSlicerValues(precomputedSlicerValues);
      return;
    }

    if (!spec?.slicers?.length || !dataSources?.length) return;
    const tiles = spec.tiles || [];

    const sqlToDimensions = new Map();
    for (const slicer of spec.slicers) {
      for (const tile of tiles) {
        if (!tile.filterDimensions?.includes(slicer.dimension)) continue;
        const sql = dataSources?.[tile.sourceIndex]?.sql;
        if (!sql) continue;
        if (!sqlToDimensions.has(sql)) sqlToDimensions.set(sql, new Set());
        sqlToDimensions.get(sql).add(slicer.dimension);
      }
    }

    if (sqlToDimensions.size === 0) return;

    setSlicersLoading(true);
    const promises = [];

    for (const [sql, dims] of sqlToDimensions) {
      promises.push(
        fetchSlicerValues(sql, [...dims])
          .then((res) => res.slicerValues || {})
          .catch(() => ({})),
      );
    }

    Promise.all(promises).then((results) => {
      const merged = {};
      for (const result of results) {
        for (const [dim, vals] of Object.entries(result)) {
          if (!merged[dim]) merged[dim] = new Set();
          for (const v of vals) merged[dim].add(v);
        }
      }
      const final = {};
      for (const [dim, valSet] of Object.entries(merged)) {
        final[dim] = [...valSet].sort();
      }
      setSlicerValues(final);
      setSlicersLoading(false);
    });
  }, [spec, dataSources, precomputedSlicerValues]);

  const enrichedSlicers = useMemo(() => {
    if (!spec?.slicers?.length) return [];

    const hasApiValues = Object.keys(slicerValues).length > 0;

    if (hasApiValues) {
      return spec.slicers.map((slicer) => ({
        ...slicer,
        values: slicerValues[slicer.dimension] || [],
      })).filter((s) => s.values.length > 0);
    }

    return extractInMemorySlicerValues(spec, dataSources);
  }, [spec, dataSources, slicerValues]);

  const refineSuggestions = useMemo(() => generateRefinementSuggestions(spec), [spec]);

  const handleExportJson = useCallback(() => {
    if (!spec) return;
    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(spec.title || 'dashboard').replace(/\s+/g, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [spec]);

  if (!spec) return null;

  const hasTiles = spec.tiles?.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-50 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-white/80 backdrop-blur-xl border-b border-stone-100">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-[8px] hover:bg-stone-100
                       text-stone-500 hover:text-stone-700 transition-colors cursor-pointer border-none bg-transparent"
            title="Back to chat"
          >
            <ChevronLeft size={20} strokeWidth={1.5} />
          </button>
          <div>
            <h1 className="text-base font-semibold text-stone-900 tracking-tight">{spec.title || 'Dashboard'}</h1>
            {spec.description && (
              <p className="text-[11px] text-stone-400 mt-0.5">{spec.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {slicersLoading && (
            <span className="text-[10px] text-indigo-500 animate-subtle-pulse">Loading filters...</span>
          )}
          {version > 1 && (
            <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
              v{version}
            </span>
          )}
          <span className="text-[10px] text-stone-400">
            {spec.tiles?.length || 0} tiles
          </span>
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-stone-500 hover:text-stone-700
                       bg-transparent hover:bg-stone-100 border border-stone-200 rounded-[8px] transition-all cursor-pointer"
            title="Export dashboard spec as JSON"
          >
            <Download size={14} strokeWidth={1.5} />
            Export
          </button>
        </div>
      </div>

      {/* Slicer bar */}
      {hasTiles && (
        <SlicerBar
          slicers={enrichedSlicers}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onResetAll={handleResetAll}
        />
      )}

      {/* Dashboard body */}
      <div className="flex-1 overflow-auto px-4 py-4 relative">
        {hasTiles ? (
          <DashboardGrid
            tiles={spec.tiles}
            dataSources={dataSources}
            activeFilters={activeFilters}
            tileData={tileData}
          />
        ) : (
          <EmptyState onSuggestionClick={(q) => { onClose?.(); onSuggestionClick?.(q); }} />
        )}

        {/* Shimmer overlay while refining */}
        {refining && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-indigo-500">Refining dashboard...</span>
            </div>
          </div>
        )}
      </div>

      {/* Refinement input bar */}
      {onRefineDashboard && (
        <div className="border-t border-stone-100 bg-white/80 backdrop-blur-xl px-4 py-3">
          {refineSuggestions.length > 0 && !refining && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {refineSuggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => { setRefineInput(s); refineInputRef.current?.focus(); }}
                  className="text-[11px] bg-stone-50 hover:bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full
                             border border-stone-200 transition-all cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              ref={refineInputRef}
              type="text"
              className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-[12px] outline-none font-sans
                         bg-white focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-400 transition-all
                         disabled:bg-stone-50 disabled:text-stone-400"
              placeholder="Refine this dashboard..."
              value={refineInput}
              onChange={(e) => setRefineInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && refineInput.trim()) {
                  e.preventDefault();
                  handleRefineSubmit();
                }
              }}
              disabled={refining}
            />
            <button
              className={`
                px-4 py-2 text-sm font-semibold bg-indigo-500 text-white rounded-[8px] shrink-0
                hover:bg-indigo-600 transition-all
                ${refining || !refineInput.trim() ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              onClick={handleRefineSubmit}
              disabled={refining || !refineInput.trim()}
            >
              {refining ? 'Refining...' : 'Refine'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
