import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { BarChart3, ArrowUpDown, Maximize2, X, GripVertical, AlertCircle } from 'lucide-react';
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
            className="p-1 rounded-[6px] hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer bg-transparent border-none"
            title="Change chart type"
          >
            <BarChart3 size={14} strokeWidth={1.5} />
          </button>
          {showTypeMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-stone-200 rounded-[10px] shadow-[0_12px_32px_rgba(0,0,0,0.08)] z-20 py-1 min-w-[120px]">
              {CHART_TYPES.map((ct) => (
                <button
                  key={ct}
                  onClick={() => { onChangeChartType(ct); setShowTypeMenu(false); }}
                  className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-stone-50 transition-colors cursor-pointer border-none bg-transparent
                    ${tile.config?.chartType === ct ? 'text-indigo-500 font-semibold' : 'text-stone-600'}`}
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
          className="p-1 rounded-[6px] hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer bg-transparent border-none"
          title="Swap axes"
        >
          <ArrowUpDown size={14} strokeWidth={1.5} />
        </button>
      )}
      <button
        onClick={onFullscreen}
        className="p-1 rounded-[6px] hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer bg-transparent border-none"
        title="Expand tile"
      >
        <Maximize2 size={14} strokeWidth={1.5} />
      </button>
      <button
        onClick={onRemove}
        className="p-1 rounded-[6px] hover:bg-red-50 text-stone-400 hover:text-red-500 transition-colors cursor-pointer bg-transparent border-none"
        title="Remove tile"
      >
        <X size={14} strokeWidth={1.5} />
      </button>
    </div>
  );
}

function TileErrorCard({ message, availableColumns }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-3 text-center">
      <AlertCircle size={32} strokeWidth={1.5} className="text-amber-400 mb-2" />
      <p className="text-xs text-stone-600 mb-1">{message}</p>
      {availableColumns?.length > 0 && (
        <p className="text-[10px] text-stone-400">Available: {availableColumns.join(', ')}</p>
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

function TileRenderer({ tile, data, sql, activeFilters, precomputed }) {
  const filteredData = filterDataForTile(data, tile, activeFilters);

  const error = validateTile(tile, filteredData);
  if (error) {
    return <TileErrorCard message={error.message} availableColumns={error.availableColumns} />;
  }

  switch (tile.type) {
    case 'kpi':
      return <KpiSparklineCard config={tile.config} data={filteredData} precomputed={precomputed} />;
    case 'chart': {
      // Use server-aggregated rows if available
      const chartData = precomputed?.rows || filteredData;
      return <DashboardChart config={tile.config} data={chartData} sql={sql} skipClientAggregation={!!precomputed?.rows} />;
    }
    case 'table':
      return <div className="flex items-center justify-center h-full text-stone-400 text-sm italic">Data available in paginated view via filters</div>;
    case 'insight':
      return <InsightCard config={tile.config} />;
    default:
      return <div className="flex items-center justify-center h-full text-stone-400 text-sm">Unknown tile type</div>;
  }
}

function FullscreenModal({ tile, data, sql, activeFilters, onClose, precomputed }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <div
        className="bg-white rounded-[20px] shadow-[0_12px_32px_rgba(0,0,0,0.08)] w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100">
          <span className="text-sm font-semibold text-stone-700">{tile.title}</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[8px] hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer bg-transparent border-none"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex-1 overflow-hidden p-4">
          <TileRenderer tile={tile} data={data} sql={sql} activeFilters={activeFilters} precomputed={precomputed} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardGrid({ tiles: initialTiles, dataSources, activeFilters, tileData }) {
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
              <div key={tile.id} className="bg-white rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] border border-stone-200/60 overflow-hidden flex flex-col group hover:shadow-[0_8px_24px_rgba(0,0,0,0.06),0_2px_6px_rgba(0,0,0,0.03)] transition-shadow">
                <div className="tile-drag-handle flex items-center justify-between px-3 py-2 bg-stone-50/50 border-b border-stone-100 cursor-grab active:cursor-grabbing select-none">
                  <span className="text-[12px] font-medium text-stone-600 truncate">
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
                    <GripVertical size={14} strokeWidth={1.5} className="text-stone-400 flex-shrink-0" />
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <TileRenderer tile={tile} data={sourceData} sql={sourceSql} activeFilters={activeFilters} precomputed={tileData?.[tile.id] || null} />
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
          precomputed={tileData?.[fullscreenTile.id] || null}
        />
      )}
    </div>
  );
}
