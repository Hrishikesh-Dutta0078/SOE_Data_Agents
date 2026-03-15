import React from 'react';

export default function SlicerBar({ slicers, activeFilters, onFilterChange, onResetAll }) {
  if (!slicers || slicers.length === 0) return null;

  const hasActiveFilters = Object.values(activeFilters || {}).some((v) => v != null);

  return (
    <div className="flex items-center gap-3 px-5 py-2.5 bg-white border-b border-slate-200 overflow-x-auto">
      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
        Filters
      </span>
      {slicers.map((slicer) => (
        <div key={slicer.id} className="flex items-center gap-1.5">
          <label className="text-xs text-slate-600 whitespace-nowrap" htmlFor={slicer.id}>
            {slicer.dimension}
          </label>
          <select
            id={slicer.id}
            value={activeFilters?.[slicer.dimension] ?? ''}
            onChange={(e) => onFilterChange(slicer.dimension, e.target.value || null)}
            className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700
                       focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-300
                       cursor-pointer min-w-[100px]"
          >
            <option value="">All</option>
            {slicer.values.map((val) => (
              <option key={val} value={val}>{val}</option>
            ))}
          </select>
        </div>
      ))}
      {hasActiveFilters && (
        <button
          onClick={onResetAll}
          className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold
                     bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded transition-colors
                     whitespace-nowrap cursor-pointer border-none"
        >
          Reset All
        </button>
      )}
    </div>
  );
}
