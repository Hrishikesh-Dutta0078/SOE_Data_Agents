import React, { useEffect, useRef } from 'react';
import { Stethoscope, Zap } from 'lucide-react';

const ICON_MAP = {
  stethoscope: Stethoscope,
};

function BlueprintPicker({ blueprints, selectedIndex, onSelect, onClose }) {
  const listRef = useRef(null);

  useEffect(() => {
    const active = listRef.current?.querySelector('[data-active="true"]');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!blueprints || blueprints.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 mx-5 bg-white border border-stone-200 rounded-[12px] shadow-lg overflow-hidden z-50">
      <div className="px-3 py-2 border-b border-stone-100 flex items-center gap-2">
        <Zap size={13} className="text-indigo-500" />
        <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide">Analysis Blueprints</span>
      </div>
      <ul ref={listRef} className="max-h-48 overflow-y-auto py-1">
        {blueprints.map((bp, i) => {
          const IconComponent = ICON_MAP[bp.icon] || Zap;
          const isActive = i === selectedIndex;
          return (
            <li
              key={bp.id}
              data-active={isActive}
              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                isActive ? 'bg-indigo-50' : 'hover:bg-stone-50'
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(bp);
              }}
            >
              <div className={`w-8 h-8 flex items-center justify-center rounded-lg shrink-0 ${
                isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-stone-100 text-stone-500'
              }`}>
                <IconComponent size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isActive ? 'text-indigo-700' : 'text-stone-800'}`}>
                    {bp.name}
                  </span>
                  <span className="text-[11px] text-stone-400 font-mono">{bp.slashCommand}</span>
                </div>
                <p className="text-[12px] text-stone-500 truncate">{bp.description}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="px-3 py-1.5 border-t border-stone-100 bg-stone-50">
        <span className="text-[10px] text-stone-400">
          <kbd className="px-1 py-0.5 bg-white border border-stone-200 rounded text-[10px]">Enter</kbd> to select
          {' '}<kbd className="px-1 py-0.5 bg-white border border-stone-200 rounded text-[10px]">Esc</kbd> to dismiss
        </span>
      </div>
    </div>
  );
}

export default BlueprintPicker;
