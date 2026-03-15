import React, { useState } from 'react';

const NODE_STYLES = {
  classify:          { color: 'bg-violet-500',  label: 'Classify' },
  decompose:         { color: 'bg-purple-500',  label: 'Decompose' },
  researchAgent:     { color: 'bg-indigo-500',  label: 'Research' },
  sqlWriterAgent:    { color: 'bg-blue-500',    label: 'SQL Writer' },
  sqlAgent:          { color: 'bg-blue-500',    label: 'SQL Agent' },
  reflect:           { color: 'bg-amber-500',   label: 'Reflect' },
  injectRls:         { color: 'bg-cyan-500',    label: 'Inject RLS' },
  validate:          { color: 'bg-teal-500',    label: 'Validate' },
  correct:           { color: 'bg-orange-500',  label: 'Correct' },
  execute:           { color: 'bg-emerald-500', label: 'Execute' },
  checkResults:      { color: 'bg-lime-500',    label: 'Check Results' },
  accumulateResult:  { color: 'bg-amber-500',   label: 'Next Query' },
  diagnoseEmptyResults: { color: 'bg-rose-500', label: 'Diagnose' },
  present:           { color: 'bg-fuchsia-500', label: 'Present' },
};

function confidenceColor(score) {
  if (score >= 0.8) return 'text-emerald-600';
  if (score >= 0.5) return 'text-amber-600';
  return 'text-rose-600';
}

function confidenceBg(score) {
  if (score >= 0.8) return 'bg-emerald-50';
  if (score >= 0.5) return 'bg-amber-50';
  return 'bg-rose-50';
}

function TraceEntry({ entry }) {
  const style = NODE_STYLES[entry.node] || { color: 'bg-slate-400', label: entry.node };

  return (
    <div className="flex gap-3 relative">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${style.color} shrink-0 mt-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.1)]`} />
        <div className="w-px flex-1 bg-stone-200" />
      </div>

      <div className="pb-4 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-stone-800">{style.label}</span>
          {entry.duration != null && (
            <span className="text-[10px] text-stone-400 font-mono">{entry.duration}ms</span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
          {entry.node === 'classify' && (
            <>
              {entry.intent && (
                <span className="px-1.5 py-0.5 bg-violet-50 text-violet-600 rounded">
                  {entry.intent}
                </span>
              )}
              {entry.complexity && (
                <span className="px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded">
                  {entry.complexity}
                </span>
              )}
            </>
          )}

          {entry.node === 'sqlAgent' && (
            <>
              {entry.toolCallCount != null && (
                <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                  {entry.toolCallCount} tool call{entry.toolCallCount !== 1 ? 's' : ''}
                </span>
              )}
              {entry.toolNames?.length > 0 && (
                <span className="text-stone-500">
                  {entry.toolNames.join(', ')}
                </span>
              )}
              {entry.decision && (
                <span className="px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded">
                  {entry.decision}
                </span>
              )}
            </>
          )}

          {entry.node === 'reflect' && (
            <>
              {entry.confidence != null && (
                <span className={`px-1.5 py-0.5 rounded font-semibold ${confidenceBg(entry.confidence)} ${confidenceColor(entry.confidence)}`}>
                  confidence: {entry.confidence.toFixed(2)}
                </span>
              )}
              {entry.issues?.length > 0 && (
                <span className="text-stone-500 truncate max-w-[200px]">
                  {entry.issues.length} issue{entry.issues.length !== 1 ? 's' : ''}
                </span>
              )}
            </>
          )}

          {entry.node === 'validate' && entry.valid != null && (
            <span className={`px-1.5 py-0.5 rounded ${
              entry.valid ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
              {entry.valid ? 'valid' : entry.errorType || 'invalid'}
            </span>
          )}

          {entry.node === 'correct' && (
            <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded">
              {entry.errorType || 'correction'}
            </span>
          )}

          {entry.node === 'execute' && (
            <span className={`px-1.5 py-0.5 rounded ${
              entry.success ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
              {entry.success ? `${entry.rowCount ?? 0} rows` : 'failed'}
            </span>
          )}

          {entry.node === 'injectRls' && (
            <span className={`px-1.5 py-0.5 rounded ${
              entry.rlsApplied ? 'bg-cyan-50 text-cyan-600' : 'bg-stone-100 text-stone-500'
            }`}>
              {entry.rlsApplied ? 'RLS applied' : 'skipped'}
            </span>
          )}

          {entry.node === 'checkResults' && entry.warningCount != null && (
            <span className={`px-1.5 py-0.5 rounded ${
              entry.warningCount === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
            }`}>
              {entry.warningCount === 0 ? 'OK' : `${entry.warningCount} warning${entry.warningCount !== 1 ? 's' : ''}`}
            </span>
          )}

          {entry.node === 'present' && (
            <>
              {entry.chartType && (
                <span className="px-1.5 py-0.5 bg-fuchsia-50 text-fuchsia-600 rounded">
                  {entry.chartType}
                </span>
              )}
              {entry.insightLength != null && (
                <span className="text-stone-500">
                  {entry.insightLength} chars of insights
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AgentTracePanel({ trace }) {
  const [open, setOpen] = useState(false);

  if (!trace || trace.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        className="text-[13px] font-medium text-indigo-500 hover:text-indigo-600 cursor-pointer bg-transparent border-none p-0 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Hide Agent Trace' : 'Show Agent Trace'}
      </button>

      {open && (
        <div className="mt-2 p-3 bg-stone-50 border border-stone-200 rounded-[12px]">
          <div className="text-[12px] font-medium text-stone-500 mb-3">
            Execution Trace
          </div>
          {trace.map((entry, i) => (
            <TraceEntry key={i} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
