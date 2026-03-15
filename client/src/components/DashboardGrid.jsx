import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { ResponsiveGridLayout } from 'react-grid-layout';

import KpiSparklineCard from './dashboard/KpiSparklineCard';
import DashboardChart from './dashboard/DashboardChart';
import DashboardTable from './dashboard/DashboardTable';
import InsightCard from './dashboard/InsightCard';

const CHART_TYPES = ['bar', 'stacked_bar', 'line', 'pie', 'area', 'scatter'];

function useWidth(ref) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    setWidth(el.offsetWidth);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

function filterDataForTile(data, tile, activeFilters) {
  if (!Array.isArray(data) || data.length === 0) return data;
  const dims = tile.filterDimensions || [];
  if (dims.length === 0) return data;

  let filtered = data;
  for (const dim of dims) {
    const filterVal = activeFilters?.[dim];
    if (filterVal != null) {
      filtered = filtered.filter((row) => String(row[dim]) === String(filterVal));
    }
  }
  return filtered;
}

function TileToolbar({ tile, onChangeChartType, onSwapAxes, onRemove, onFullscreen }) {
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const isChart = tile.type === 'chart';

  return (
    <div className="flex items-center gap-0.5">
      {isChart && (
        <div className="relative">
          <button
            onClick={() => setShowTypeMenu((v) => !v)}
            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer bg-transparent border-none"
            title="Change chart type"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 16V9m4 7V5m4 11v-4m4 4V8" />
            </svg>
          </button>
          {showTypeMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 min-w-[120px]">
              {CHART_TYPES.map((ct) => (
                <button
                  key={ct}
                  onClick={() => { onChangeChartType(ct); setShowTypeMenu(false); }}
                  className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-indigo-50 transition-colors cursor-pointer border-none bg-transparent
                    ${tile.config?.chartType === ct ? 'text-indigo-600 font-semibold' : 'text-slate-600'}`}
                >
                  {ct.replace('_', ' ')}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {isChart && (
        <button
          onClick={onSwapAxes}
          className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer bg-transparent border-none"
          title="Swap axes"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>
      )}
      <button
        onClick={onFullscreen}
        className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer bg-transparent border-none"
        title="Expand tile"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
        </svg>
      </button>
      <button
        onClick={onRemove}
        className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors cursor-pointer bg-transparent border-none"
        title="Remove tile"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function TileErrorCard({ message, availableColumns }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-3 text-center">
      <svg className="w-8 h-8 text-amber-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      <p className="text-xs text-slate-600 mb-1">{message}</p>
      {availableColumns?.length > 0 && (
        <p className="text-[10px] text-slate-400">Available: {availableColumns.join(', ')}</p>
      )}
    </div>
  );
}

function validateTile(tile, data) {
  if (tile.type === 'insight') return null;
  if (!Array.isArray(data) || data.length === 0) return null;

  const columns = Object.keys(data[0] || {});
  if (columns.length === 0) return null;

  if (tile.type === 'kpi' && tile.config?.valueColumn) {
    if (!columns.includes(tile.config.valueColumn)) {
      return { message: `Column "${tile.config.valueColumn}" not found in data.`, availableColumns: columns };
    }
  }

  if (tile.type === 'chart') {
    const xKey = tile.config?.xAxis?.key || tile.config?.xAxis;
    if (xKey && !columns.includes(xKey)) {
      return { message: `X-axis column "${xKey}" not found in data.`, availableColumns: columns };
    }
  }

  return null;
}

function TileRenderer({ tile, data, sql, activeFilters }) {
  const filteredData = filterDataForTile(data, tile, activeFilters);

  const error = validateTile(tile, filteredData);
  if (error) {
    return <TileErrorCard message={error.message} availableColumns={error.availableColumns} />;
  }

  switch (tile.type) {
    case 'kpi':
      return <KpiSparklineCard config={tile.config} data={filteredData} />;
    case 'chart':
      return <DashboardChart config={tile.config} data={filteredData} sql={sql} />;
    case 'table':
      return <div className="flex items-center justify-center h-full text-slate-400 text-sm italic">Data available in paginated view via filters</div>;
    case 'insight':
      return <InsightCard config={tile.config} />;
    default:
      return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Unknown tile type</div>;
  }
}

function FullscreenModal({ tile, data, sql, activeFilters, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-6" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <span className="text-sm font-bold text-slate-700">{tile.title}</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer bg-transparent border-none"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-hidden p-4">
          <TileRenderer tile={tile} data={data} sql={sql} activeFilters={activeFilters} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardGrid({ tiles: initialTiles, dataSources, activeFilters }) {
  const containerRef = useRef(null);
  const width = useWidth(containerRef);
  const [localTiles, setLocalTiles] = useState(initialTiles);
  const [fullscreenTileId, setFullscreenTileId] = useState(null);

  useEffect(() => {
    setLocalTiles(initialTiles);
  }, [initialTiles]);

  const handleChangeChartType = useCallback((tileId, chartType) => {
    setLocalTiles((prev) => prev.map((t) =>
      t.id === tileId ? { ...t, config: { ...t.config, chartType } } : t,
    ));
  }, []);

  const handleSwapAxes = useCallback((tileId) => {
    setLocalTiles((prev) => prev.map((t) => {
      if (t.id !== tileId || t.type !== 'chart') return t;
      const { xAxis, yAxis } = t.config;
      if (!xAxis || !Array.isArray(yAxis) || yAxis.length === 0) return t;
      const newXAxis = yAxis[0];
      const newYAxis = [xAxis, ...yAxis.slice(1)];
      return { ...t, config: { ...t.config, xAxis: newXAxis, yAxis: newYAxis } };
    }));
  }, []);

  const handleRemoveTile = useCallback((tileId) => {
    setLocalTiles((prev) => prev.filter((t) => t.id !== tileId));
  }, []);

  const initialLayouts = useMemo(() => {
    const lg = (localTiles || []).map((tile) => ({
      i: tile.id,
      x: tile.layout?.x ?? 0,
      y: tile.layout?.y ?? 0,
      w: tile.layout?.w ?? 6,
      h: tile.layout?.h ?? 4,
      minW: tile.layout?.minW ?? 2,
      minH: tile.layout?.minH ?? 2,
    }));
    return { lg, md: lg, sm: lg.map((l) => ({ ...l, w: 12, x: 0 })) };
  }, [localTiles]);

  const [layouts, setLayouts] = useState(initialLayouts);

  useEffect(() => {
    setLayouts(initialLayouts);
  }, [initialLayouts]);

  const fullscreenTile = fullscreenTileId ? localTiles.find((t) => t.id === fullscreenTileId) : null;

  if (!localTiles || localTiles.length === 0) return null;

  return (
    <div ref={containerRef} style={{ minHeight: 200 }}>
      {width > 0 && (
        <ResponsiveGridLayout
          className="layout"
          width={width}
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768 }}
          cols={{ lg: 12, md: 12, sm: 1 }}
          rowHeight={60}
          onLayoutChange={(_, allLayouts) => setLayouts(allLayouts)}
          draggableHandle=".tile-drag-handle"
          isResizable={true}
          isDraggable={true}
          compactType="vertical"
          margin={[12, 12]}
        >
          {localTiles.map((tile) => {
            const sourceData = dataSources?.[tile.sourceIndex]?.execution?.rows || [];
            const sourceSql = dataSources?.[tile.sourceIndex]?.sql || null;
            return (
              <div key={tile.id} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col group">
                <div className="tile-drag-handle flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-100 cursor-grab active:cursor-grabbing select-none">
                  <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide truncate">
                    {tile.title}
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <TileToolbar
                        tile={tile}
                        onChangeChartType={(ct) => handleChangeChartType(tile.id, ct)}
                        onSwapAxes={() => handleSwapAxes(tile.id)}
                        onRemove={() => handleRemoveTile(tile.id)}
                        onFullscreen={() => setFullscreenTileId(tile.id)}
                      />
                    </div>
                    <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="5" cy="3" r="1.2" /><circle cx="11" cy="3" r="1.2" />
                      <circle cx="5" cy="8" r="1.2" /><circle cx="11" cy="8" r="1.2" />
                      <circle cx="5" cy="13" r="1.2" /><circle cx="11" cy="13" r="1.2" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <TileRenderer tile={tile} data={sourceData} sql={sourceSql} activeFilters={activeFilters} />
                </div>
              </div>
            );
          })}
        </ResponsiveGridLayout>
      )}

      {fullscreenTile && (
        <FullscreenModal
          tile={fullscreenTile}
          data={dataSources?.[fullscreenTile.sourceIndex]?.execution?.rows || []}
          sql={dataSources?.[fullscreenTile.sourceIndex]?.sql || null}
          activeFilters={activeFilters}
          onClose={() => setFullscreenTileId(null)}
        />
      )}
    </div>
  );
}
