import React, { useRef, useEffect, useState, useMemo } from 'react';

const CATEGORY_STYLES = {
  classify:       { bg: 'bg-violet-50',  text: 'text-violet-600', label: 'Classify' },
  decompose:      { bg: 'bg-purple-50',  text: 'text-purple-600', label: 'Decompose' },
  researchAgent:  { bg: 'bg-blue-50',    text: 'text-blue-600',   label: 'Research' },
  research:       { bg: 'bg-blue-50',    text: 'text-blue-600',   label: 'Research' },
  sqlWriterAgent: { bg: 'bg-sky-50',     text: 'text-sky-600',    label: 'SQL Write' },
  sql_generation: { bg: 'bg-sky-50',     text: 'text-sky-600',    label: 'SQL Write' },
  injectRls:      { bg: 'bg-cyan-50',    text: 'text-cyan-600',   label: 'RLS' },
  validate:       { bg: 'bg-teal-50',    text: 'text-teal-600',   label: 'Validate' },
  correct:        { bg: 'bg-amber-50',   text: 'text-amber-600',  label: 'Correct' },
  execute:        { bg: 'bg-emerald-50', text: 'text-emerald-600',label: 'Execute' },
  checkResults:   { bg: 'bg-lime-50',    text: 'text-lime-600',   label: 'Check' },
  accumulateResult:{ bg: 'bg-amber-50',  text: 'text-amber-600',  label: 'Loop' },
  loop:           { bg: 'bg-amber-50',   text: 'text-amber-600',  label: 'Loop' },
  present:        { bg: 'bg-pink-50',    text: 'text-pink-600',   label: 'Present' },
  tool:           { bg: 'bg-stone-50',   text: 'text-stone-500',  label: 'Tool' },
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
    <div className="rounded-[12px] p-3 mb-2" style={{ background: 'linear-gradient(135deg, rgba(238,242,255,0.5) 0%, rgba(224,231,254,0.4) 100%)', border: '1px solid rgba(199,210,254,0.4)', boxShadow: '0 1px 4px rgba(99,102,241,0.06)' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-medium text-indigo-500">
          Parallel discovery
        </span>
        <span className="text-[11px] text-stone-400">
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
                    i <= completed ? 'bg-indigo-400' : 'bg-stone-200'
                  }`}
                />
              )}
              <div
                className={`w-2.5 h-2.5 rounded-full border border-indigo-200 transition-all duration-300 ${
                  ready
                    ? 'bg-indigo-500'
                    : 'bg-stone-200 animate-subtle-pulse'
                }`}
                title={ready ? `Sub-query ${i + 1} context ready` : `Sub-query ${i + 1} discovering...`}
              />
            </React.Fragment>
          );
        })}
        {total > 6 && (
          <span className="ml-1 text-[11px] text-stone-400">+{total - 6}</span>
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
      className={`flex gap-3 py-2 px-2 rounded-[8px] hover:bg-stone-50 transition-colors ${
        isLatest ? 'animate-fade-in' : ''
      }`}
    >
      <span className="text-[12px] font-mono text-stone-400 w-[44px] shrink-0 text-right pt-0.5 tabular-nums">
        {formatElapsed(entry.elapsed)}
      </span>
      <span
        className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 h-fit ${style.bg} ${style.text}`}
      >
        {style.label}
      </span>
      <div className="flex-1 min-w-0">
        <span
          className={`text-[13px] text-stone-700 leading-relaxed whitespace-pre-wrap ${
            hasDetail ? 'cursor-pointer hover:text-stone-900' : ''
          }`}
          onClick={() => hasDetail && setExpanded(!expanded)}
        >
          {entry.message}
          {hasDetail && (
            <span className="ml-1 text-[10px] text-indigo-500">{expanded ? '[-]' : '[+]'}</span>
          )}
        </span>
        {expanded && entry.detail && (
          <div className="mt-1.5 p-2.5 bg-stone-50 border border-stone-200 rounded-[8px] text-[11px] font-mono text-stone-500 whitespace-pre-wrap max-h-[120px] overflow-y-auto">
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
    <div className="mb-2 p-3 rounded-[12px]" style={{ background: 'linear-gradient(135deg, rgba(250,245,255,0.5) 0%, rgba(243,232,255,0.4) 100%)', border: '1px solid rgba(233,213,255,0.4)', boxShadow: '0 1px 4px rgba(168,85,247,0.06)' }}>
      <div className="text-[11px] font-medium text-purple-600 mb-2">
        Multi-query plan — {queryPlan.length} sub-queries
      </div>
      {queryPlan.map((q, i) => (
        <div key={q.id} className="flex gap-2 text-[13px] text-stone-600 py-0.5">
          <span className="text-purple-400 shrink-0">{i + 1}.</span>
          <span className="text-stone-700">{q.subQuestion}</span>
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
      <div className="flex items-center gap-2 text-[13px] text-stone-500 rounded-[12px] px-3 py-2.5" style={{ background: 'linear-gradient(135deg, #FAFAF9 0%, #F0EEFF 100%)', border: '1px solid rgba(231,229,228,0.5)', boxShadow: 'var(--shadow-card)' }}>
        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-subtle-pulse" />
        <span>Standby</span>
      </div>
    );
  }

  const latestEntry = entries[entries.length - 1];

  return (
    <div className="rounded-[16px] overflow-hidden bg-white relative" style={{ border: '1px solid rgba(231,229,228,0.5)', boxShadow: 'var(--shadow-float)' }}>
      <div
        className="relative flex items-center justify-between px-3.5 py-2.5 cursor-pointer select-none"
        style={{ background: 'linear-gradient(90deg, #F5F5F4 0%, #F0EEFF 100%)', borderBottom: '1px solid rgba(231,229,228,0.4)' }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-subtle-pulse" />
          <span className="text-[13px] font-medium text-stone-600">
            Agent Activity
          </span>
          <span className="text-[12px] text-stone-400">
            {entries.length} step{entries.length !== 1 ? 's' : ''}
          </span>
          {showParallelViz && (
            <span className="text-[10px] font-medium text-indigo-500 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
              parallel
            </span>
          )}
        </div>
        <span className="text-[12px] font-medium text-stone-400">
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
          style={{ scrollbarColor: 'rgba(168,162,158,0.3) transparent' }}
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
