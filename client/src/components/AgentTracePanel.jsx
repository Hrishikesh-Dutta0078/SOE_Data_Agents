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
  if (score >= 0.8) return 'bg-emerald-100';
  if (score >= 0.5) return 'bg-amber-100';
  return 'bg-rose-100';
}

function TraceEntry({ entry }) {
  const style = NODE_STYLES[entry.node] || { color: 'bg-slate-400', label: entry.node };

  return (
    <div className="flex gap-3 relative">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${style.color} shrink-0 mt-0.5 ring-2 ring-white`} />
        <div className="w-px flex-1 bg-slate-200" />
      </div>

      <div className="pb-4 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-800">{style.label}</span>
          {entry.duration != null && (
            <span className="text-[10px] text-slate-400 font-mono">{entry.duration}ms</span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
          {entry.node === 'classify' && (
            <>
              {entry.intent && (
                <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded">
                  {entry.intent}
                </span>
              )}
              {entry.complexity && (
                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                  {entry.complexity}
                </span>
              )}
            </>
          )}

          {entry.node === 'sqlAgent' && (
            <>
              {entry.toolCallCount != null && (
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                  {entry.toolCallCount} tool call{entry.toolCallCount !== 1 ? 's' : ''}
                </span>
              )}
              {entry.toolNames?.length > 0 && (
                <span className="text-slate-500">
                  {entry.toolNames.join(', ')}
                </span>
              )}
              {entry.decision && (
                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
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
                <span className="text-slate-500 truncate max-w-[200px]">
                  {entry.issues.length} issue{entry.issues.length !== 1 ? 's' : ''}
                </span>
              )}
            </>
          )}

          {entry.node === 'validate' && entry.valid != null && (
            <span className={`px-1.5 py-0.5 rounded ${
              entry.valid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {entry.valid ? 'valid' : entry.errorType || 'invalid'}
            </span>
          )}

          {entry.node === 'correct' && (
            <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">
              {entry.errorType || 'correction'}
            </span>
          )}

          {entry.node === 'execute' && (
            <span className={`px-1.5 py-0.5 rounded ${
              entry.success ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {entry.success ? `${entry.rowCount ?? 0} rows` : 'failed'}
            </span>
          )}

          {entry.node === 'injectRls' && (
            <span className={`px-1.5 py-0.5 rounded ${
              entry.rlsApplied ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {entry.rlsApplied ? 'RLS applied' : 'skipped'}
            </span>
          )}

          {entry.node === 'checkResults' && entry.warningCount != null && (
            <span className={`px-1.5 py-0.5 rounded ${
              entry.warningCount === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {entry.warningCount === 0 ? 'OK' : `${entry.warningCount} warning${entry.warningCount !== 1 ? 's' : ''}`}
            </span>
          )}

          {entry.node === 'present' && (
            <>
              {entry.chartType && (
                <span className="px-1.5 py-0.5 bg-fuchsia-100 text-fuchsia-700 rounded">
                  {entry.chartType}
                </span>
              )}
              {entry.insightLength != null && (
                <span className="text-slate-500">
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
        className="text-xs text-indigo-500 hover:text-indigo-700 cursor-pointer bg-transparent border-none p-0 underline transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Hide Agent Trace' : 'Show Agent Trace'}
      </button>

      {open && (
        <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-3">
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
