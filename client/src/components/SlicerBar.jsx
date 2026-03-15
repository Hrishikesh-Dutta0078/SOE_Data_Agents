import React from 'react';

export default function SlicerBar({ slicers, activeFilters, onFilterChange, onResetAll }) {
  if (!slicers || slicers.length === 0) return null;

  const hasActiveFilters = Object.values(activeFilters || {}).some((v) => v != null);

  return (
    <div className="flex items-center gap-3 px-5 py-2.5 bg-white/80 backdrop-blur-xl border-b border-stone-100 overflow-x-auto">
      <span className="text-[12px] font-medium text-stone-500 whitespace-nowrap">
        Filters
      </span>
      {slicers.map((slicer) => (
        <div key={slicer.id} className="flex items-center gap-1.5">
          <label className="text-xs text-stone-600 whitespace-nowrap" htmlFor={slicer.id}>
            {slicer.dimension}
          </label>
          <select
            id={slicer.id}
            value={activeFilters?.[slicer.dimension] ?? ''}
            onChange={(e) => onFilterChange(slicer.dimension, e.target.value || null)}
            className="text-xs bg-white border border-stone-200 rounded-[8px] px-2 py-1 text-stone-700
                       focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400
                       cursor-pointer min-w-[100px] transition-all"
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
          className="text-[11px] text-indigo-500 hover:text-indigo-600 font-medium
                     bg-transparent hover:bg-indigo-50 px-2.5 py-1 rounded-full transition-all
                     whitespace-nowrap cursor-pointer border-none"
        >
          Reset All
        </button>
      )}
    </div>
  );
}
