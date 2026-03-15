import React, { useRef, useEffect, useState, useMemo } from 'react';

const CATEGORY_STYLES = {
  classify:       { border: 'border-violet-500/50', text: 'text-violet-400', label: 'CLASSIFY' },
  decompose:     { border: 'border-purple-500/50', text: 'text-purple-400', label: 'DECOMPOSE' },
  researchAgent: { border: 'border-cyan-500/50', text: 'text-cyan-400', label: 'RESEARCH' },
  research:      { border: 'border-cyan-500/50', text: 'text-cyan-400', label: 'RESEARCH' },
  sqlWriterAgent:{ border: 'border-blue-500/50', text: 'text-blue-400', label: 'SQL_WRITE' },
  sql_generation:{ border: 'border-blue-500/50', text: 'text-blue-400', label: 'SQL_WRITE' },
  injectRls:     { border: 'border-cyan-400/50', text: 'text-cyan-300', label: 'RLS' },
  validate:      { border: 'border-teal-500/50', text: 'text-teal-400', label: 'VALIDATE' },
  correct:       { border: 'border-amber-500/50', text: 'text-amber-400', label: 'CORRECT' },
  execute:       { border: 'border-emerald-500/50', text: 'text-emerald-400', label: 'EXECUTE' },
  checkResults:  { border: 'border-lime-500/50', text: 'text-lime-400', label: 'CHECK' },
  accumulateResult: { border: 'border-amber-500/50', text: 'text-amber-400', label: 'LOOP' },
  loop:          { border: 'border-amber-500/50', text: 'text-amber-400', label: 'LOOP' },
  present:       { border: 'border-fuchsia-500/50', text: 'text-fuchsia-400', label: 'PRESENT' },
  tool:          { border: 'border-slate-500/50', text: 'text-slate-400', label: 'TOOL' },
};

function formatElapsed(ms) {
  if (ms == null) return '--';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

/** Parse parallel discovery state from entries for the visual */
function useParallelDiscoveryState(entries) {
  return useMemo(() => {
    let total = 0;
    let completed = 0;
    let lastStartedIdx = -1;
    for (let i = 0; i < entries.length; i++) {
      const msg = entries[i].message || '';
      if (msg.includes('Parallel research started')) {
        const m = msg.match(/\((\d+)\s+sub-quer(y|ies)\)/);
        total = m ? parseInt(m[1], 10) : 0;
        lastStartedIdx = i;
      }
      if (msg.includes('Parallel research complete')) {
        const m = msg.match(/\((\d+)\/(\d+)\)/);
        if (m) completed = parseInt(m[1], 10);
        else completed = total;
      }
      // "context ready for sub-query 2/3" -> 1st prefetch done; "3/3" -> 2nd done
      if (msg.includes('context ready for sub-query') && lastStartedIdx >= 0 && i > lastStartedIdx) {
        const m = msg.match(/sub-query\s+(\d+)\/(\d+)/);
        if (m) completed = Math.max(completed, parseInt(m[1], 10) - 1);
      }
    }
    return { total, completed };
  }, [entries]);
}

function ParallelDiscoveryViz({ total, completed }) {
  if (total <= 0) return null;
  return (
    <div className="rounded border border-cyan-500/30 bg-slate-900/80 p-2.5 mb-2">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[9px] font-mono uppercase tracking-widest text-cyan-400/90">
          Parallel discovery
        </span>
        <span className="text-[9px] font-mono text-slate-500">
          {completed}/{total} context{total !== 1 ? 's' : ''} ready
        </span>
      </div>
      <div className="flex items-center gap-1">
        {Array.from({ length: Math.min(total, 6) }, (_, i) => {
          const ready = i < completed;
          return (
            <React.Fragment key={i}>
              {i > 0 && (
                <div
                  className={`h-px flex-1 max-w-[12px] transition-colors duration-300 ${
                    i <= completed ? 'bg-cyan-500/60' : 'bg-slate-600/40'
                  }`}
                />
              )}
              <div
                className={`w-2.5 h-2.5 rounded-full border border-cyan-500/50 transition-all duration-300 ${
                  ready
                    ? 'bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.6)] thinking-node-ready'
                    : 'bg-slate-700/80 thinking-node-pulse'
                }`}
                title={ready ? `Sub-query ${i + 1} context ready` : `Sub-query ${i + 1} discovering...`}
              />
            </React.Fragment>
          );
        })}
        {total > 6 && (
          <span className="ml-1 text-[9px] font-mono text-slate-500">+{total - 6}</span>
        )}
      </div>
    </div>
  );
}

function ThinkingEntry({ entry, isLatest }) {
  const style = CATEGORY_STYLES[entry.category] || CATEGORY_STYLES.tool;
  const [expanded, setExpanded] = useState(false);
  const hasDetail = entry.detail && entry.detail.length > 0;
  const isParallel = entry.message && (
    entry.message.includes('Parallel research') ||
    entry.message.includes('context ready for sub-query')
  );

  return (
    <div
      className={`flex gap-2 py-1.5 px-1 rounded border-l-2 ${style.border} bg-slate-800/30 ${
        isLatest ? 'animate-fade-in' : ''
      } ${isParallel ? 'bg-cyan-950/20' : ''}`}
    >
      <span className="text-[10px] font-mono text-cyan-400/80 w-[40px] shrink-0 text-right pt-0.5 tabular-nums">
        {formatElapsed(entry.elapsed)}
      </span>
      <span
        className={`text-[8px] font-mono font-semibold px-1.5 py-0.5 rounded shrink-0 h-fit border ${style.border} ${style.text} bg-slate-900/60`}
      >
        {style.label}
      </span>
      <div className="flex-1 min-w-0">
        <span
          className={`text-[11px] font-mono text-slate-300 leading-relaxed whitespace-pre-wrap ${
            hasDetail ? 'cursor-pointer hover:text-slate-100' : ''
          } ${isParallel ? 'text-cyan-200/90' : ''}`}
          onClick={() => hasDetail && setExpanded(!expanded)}
        >
          {entry.message}
          {hasDetail && (
            <span className="ml-1 text-[9px] text-cyan-500">{expanded ? '[-]' : '[+]'}</span>
          )}
        </span>
        {expanded && entry.detail && (
          <div className="mt-1.5 p-2 bg-slate-900/80 border border-slate-600/50 rounded text-[10px] font-mono text-slate-400 whitespace-pre-wrap max-h-[120px] overflow-y-auto">
            {entry.detail}
          </div>
        )}
      </div>
    </div>
  );
}

function QueryPlanBanner({ queryPlan }) {
  if (!queryPlan || queryPlan.length <= 1) return null;
  return (
    <div className="mb-2 p-2.5 rounded border border-purple-500/30 bg-slate-900/60">
      <div className="text-[9px] font-mono font-semibold text-purple-400 uppercase tracking-widest mb-1.5">
        Multi-query plan — {queryPlan.length} sub-queries
      </div>
      {queryPlan.map((q, i) => (
        <div key={q.id} className="flex gap-2 text-[10px] font-mono text-slate-400 py-0.5">
          <span className="text-purple-500 shrink-0">{i + 1}.</span>
          <span className="text-slate-300">{q.subQuestion}</span>
        </div>
      ))}
    </div>
  );
}

export default function ThinkingPanel({ entries = [], queryPlan = null, startTime }) {
  const scrollRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  const { total: parallelTotal, completed: parallelCompleted } = useParallelDiscoveryState(entries);
  const showParallelViz = parallelTotal > 0;

  useEffect(() => {
    if (scrollRef.current && !collapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, collapsed]);

  if (entries.length === 0 && !queryPlan) {
    return (
      <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500 bg-slate-900/50 rounded-lg border border-slate-600/30 px-3 py-2">
        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_6px_rgba(34,211,238,0.6)]" />
        <span className="uppercase tracking-wider">Standby</span>
        <span className="thinking-cursor">_</span>
      </div>
    );
  }

  const latestEntry = entries[entries.length - 1];

  return (
    <div className="rounded-xl overflow-hidden border border-cyan-500/20 bg-slate-900/95 shadow-lg shadow-slate-900/50 relative">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34,211,238,0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,211,238,0.15) 1px, transparent 1px)
          `,
          backgroundSize: '12px 12px',
        }}
      />
      {/* Scanline when active */}
      {entries.length > 0 && (
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none opacity-30"
          style={{ mixBlendMode: 'screen' }}
        >
          <div
            className="thinking-scanline absolute left-0 right-0 h-px bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent"
            style={{ width: '100%' }}
          />
        </div>
      )}

      <div
        className="relative flex items-center justify-between px-3 py-2 border-b border-cyan-500/20 bg-slate-800/60 cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
          <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-cyan-300/90">
            Agent cortex
          </span>
          <span className="text-[9px] font-mono text-slate-500">
            {entries.length} step{entries.length !== 1 ? 's' : ''}
          </span>
          {showParallelViz && (
            <span className="text-[8px] font-mono text-cyan-500/80 border border-cyan-500/30 px-1.5 py-0.5 rounded">
              parallel
            </span>
          )}
        </div>
        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wide">
          {collapsed ? 'expand' : 'collapse'}
        </span>
      </div>

      {collapsed ? (
        <div className="relative px-3 py-2">
          {latestEntry && <ThinkingEntry entry={latestEntry} isLatest />}
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="relative px-3 py-2 max-h-[320px] overflow-y-auto scrollbar-thin"
          style={{ scrollbarColor: 'rgba(34,211,238,0.2) transparent' }}
        >
          <QueryPlanBanner queryPlan={queryPlan} />
          {showParallelViz && (
            <ParallelDiscoveryViz total={parallelTotal} completed={parallelCompleted} />
          )}
          <div className="space-y-0.5">
            {entries.map((entry, i) => (
              <ThinkingEntry
                key={`${entry.elapsed}-${i}`}
                entry={entry}
                isLatest={i === entries.length - 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
