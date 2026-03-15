import React, { useState, useEffect } from 'react';

const NODE_META = {
  classify:            { color: 'bg-violet-500',  label: 'Classify' },
  decompose:           { color: 'bg-purple-500',  label: 'Decompose' },
  researchAgent:       { color: 'bg-indigo-500',  label: 'Research' },
  sqlWriterAgent:      { color: 'bg-blue-500',    label: 'SQL Writer' },
  sqlAgent:            { color: 'bg-blue-500',    label: 'SQL Agent' },
  injectRls:           { color: 'bg-cyan-500',    label: 'Inject RLS' },
  validate:            { color: 'bg-teal-500',    label: 'Validate' },
  correct:             { color: 'bg-orange-500',  label: 'Correct' },
  execute:             { color: 'bg-emerald-500', label: 'Execute' },
  checkResults:        { color: 'bg-lime-500',    label: 'Check Results' },
  accumulateResult:    { color: 'bg-amber-500',   label: 'Next Query' },
  diagnoseEmptyResults:{ color: 'bg-rose-500',    label: 'Diagnose' },
  present:             { color: 'bg-fuchsia-500', label: 'Present' },
};

function formatDuration(ms) {
  if (ms == null) return '';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function formatTokensInMillions(n) {
  if (n == null || !Number.isFinite(n)) return null;
  const millions = n / 1e6;
  return millions >= 0.001 ? `${millions.toFixed(3)}M` : '<0.001M';
}

function StepDot({ status, color }) {
  if (status === 'completed') {
    return (
      <div className={`w-4 h-4 rounded-full ${color} flex items-center justify-center shrink-0`}>
        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }
  if (status === 'active') {
    return (
      <div className="w-4 h-4 rounded-full bg-blue-500 shrink-0 animate-pulse ring-2 ring-blue-200" />
    );
  }
  return <div className="w-4 h-4 rounded-full bg-slate-200 shrink-0" />;
}

const TOOL_LABELS = {
  discover_context: 'Discovery',
  query_distinct_values: 'Values',
  check_null_ratio: 'Nulls',
  search_session_memory: 'Memory',
  submit_research: 'Submit',
  submit_sql: 'Submit SQL',
};

export default function ProgressTimeline({ steps, usage, startTime, activeTools = [] }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 200);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className="min-w-[240px]">
      <div className="space-y-0">
        {steps.map((step, i) => {
          const meta = NODE_META[step.node] || { color: 'bg-slate-400', label: step.node };
          const isLast = i === steps.length - 1;

          return (
            <div key={step.node + '-' + i} className="flex gap-2.5">
              <div className="flex flex-col items-center">
                <StepDot status={step.status} color={meta.color} />
                {!isLast && (
                  <div className={`w-px flex-1 min-h-[16px] ${step.status === 'completed' ? 'bg-slate-300' : 'bg-slate-100'}`} />
                )}
              </div>
              <div className={`pb-2 flex-1 min-w-0 ${step.status === 'pending' ? 'opacity-40' : ''}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-700">{meta.label}</span>
                  {step.status === 'completed' && step.duration != null && (
                    <span className="text-[10px] text-slate-400 font-mono">{formatDuration(step.duration)}</span>
                  )}
                  {step.status === 'active' && (
                    <span className="text-[10px] text-blue-500 italic">running...</span>
                  )}
                </div>
                {step.summary && step.status === 'completed' && (
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">{step.summary}</div>
                )}
                {step.status === 'active' && activeTools.length > 0 && (
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {activeTools.map((t, ti) => (
                      <span
                        key={`${t.name}-${ti}`}
                        className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full ${
                          t.status === 'running'
                            ? 'bg-blue-50 text-blue-600 border border-blue-200'
                            : 'bg-slate-50 text-slate-400 border border-slate-200'
                        }`}
                      >
                        {t.status === 'running' && (
                          <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                        )}
                        {TOOL_LABELS[t.name] || t.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 pt-2 border-t border-slate-200 flex flex-wrap gap-3 text-[10px] text-slate-400 font-mono">
        {formatTokensInMillions(usage?.totalTokens) && (
          <span>{formatTokensInMillions(usage.totalTokens)} tokens</span>
        )}
        <span>Net time: {usage?.duration != null ? `${(usage.duration / 1000).toFixed(1)}s` : formatDuration(elapsed)}</span>
      </div>
    </div>
  );
}
