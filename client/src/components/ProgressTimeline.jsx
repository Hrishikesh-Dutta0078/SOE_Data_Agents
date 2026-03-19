import React, { useState, useEffect } from 'react';

const NODE_META = {
  classify:             { label: 'Classify' },
  decompose:            { label: 'Decompose' },
  researchAgent:        { label: 'Research' },
  sqlWriterAgent:       { label: 'SQL Writer' },
  generateSql:          { label: 'SQL Writer' },
  injectRls:            { label: 'Inject RLS' },
  validate:             { label: 'Validate' },
  correct:              { label: 'Correct' },
  execute:              { label: 'Execute' },
  checkResults:         { label: 'Check Results' },
  accumulateResult:     { label: 'Next Query' },
  diagnoseEmptyResults: { label: 'Diagnose' },
  present:              { label: 'Present' },
  contextFetch:         { label: 'Context' },
};

const TOOL_LABELS = {
  discover_context: 'Discovery',
  query_distinct_values: 'Values',
  check_null_ratio: 'Nulls',
  search_session_memory: 'Memory',
  submit_research: 'Submit',
  submit_sql: 'Submit SQL',
};

function formatDuration(ms) {
  if (ms == null) return '';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function StepDot({ status }) {
  if (status === 'completed') {
    return (
      <div className="w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
        <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }
  if (status === 'active') {
    return (
      <div
        className="w-3 h-3 rounded-full shrink-0"
        style={{ background: '#6366F1', animation: 'pulse-step-dot 1.5s ease infinite' }}
      />
    );
  }
  return <div className="w-3 h-3 rounded-full shrink-0" style={{ background: 'rgba(200,195,220,0.4)' }} />;
}

export default function ProgressTimeline({ steps, usage, startTime, activeTools = [], collapsed = false }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (collapsed) return;
    const interval = setInterval(() => setElapsed(Date.now() - startTime), 200);
    return () => clearInterval(interval);
  }, [startTime, collapsed]);

  const allDone = steps.length > 0 && steps.every(s => s.status === 'completed');
  const totalDuration = usage?.duration || elapsed;
  const activeStep = steps.find(s => s.status === 'active');
  const runningTools = activeTools.filter(t => t.status === 'running');

  return (
    <div
      className="overflow-hidden"
      style={{
        maxHeight: collapsed ? 0 : 200,
        padding: collapsed ? '0 20px' : '14px 20px',
        opacity: collapsed ? 0 : 1,
        borderBottom: collapsed ? 'none' : '1px solid rgba(200,195,220,0.15)',
        transition: 'max-height 0.6s cubic-bezier(0.16, 1, 0.3, 1), padding 0.5s ease, opacity 0.4s ease, border-bottom-color 0.3s ease',
      }}
    >
      <div className="flex justify-between items-center mb-3">
        <div className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {allDone ? `Completed in ${formatDuration(totalDuration)}` : 'Analyzing your question...'}
        </div>
        <div className="text-[11px] tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
          {formatDuration(totalDuration)}
        </div>
      </div>

      <div className="flex items-center mb-3">
        {steps.map((step, i) => {
          const meta = NODE_META[step.node] || { label: step.node };
          const isLast = i === steps.length - 1;
          return (
            <React.Fragment key={`${step.node}-${i}`}>
              <div className="flex flex-col items-center">
                <StepDot status={step.status} />
                <div
                  className="text-[8px] mt-1 whitespace-nowrap font-medium"
                  style={{
                    color: step.status === 'completed' ? '#059669'
                      : step.status === 'active' ? '#6366F1'
                      : 'var(--color-text-muted)',
                    fontWeight: step.status === 'active' ? 600 : 500,
                  }}
                >
                  {meta.label}
                </div>
                {step.status === 'completed' && step.duration != null && (
                  <div className="text-[7px] mt-0.5 tabular-nums" style={{ color: 'var(--color-text-faint)' }}>
                    {formatDuration(step.duration)}
                  </div>
                )}
              </div>
              {!isLast && (
                <div
                  className="flex-1 h-0.5 min-w-4"
                  style={{
                    background:
                      step.status === 'completed' && steps[i + 1]?.status === 'completed' ? '#10B981'
                      : step.status === 'completed' && steps[i + 1]?.status === 'active' ? 'linear-gradient(90deg, #10B981, #6366F1)'
                      : 'rgba(200,195,220,0.3)',
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {activeStep && !allDone && (
        <div className="flex items-center gap-2 rounded-[9px] px-3 py-2" style={{ background: 'rgba(99,102,241,0.04)' }}>
          <div
            className="w-4 h-4 rounded-full border-2 shrink-0"
            style={{
              borderColor: 'rgba(99,102,241,0.15)',
              borderTopColor: '#6366F1',
              animation: 'spin-progress 0.8s linear infinite',
            }}
          />
          <div className="text-[11px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {NODE_META[activeStep.node]?.label || activeStep.node}...
          </div>
          {runningTools.length > 0 && (
            <div className="ml-auto flex gap-1">
              {runningTools.map(t => (
                <span
                  key={t.name}
                  className="text-[9px] font-medium px-2 py-0.5 rounded"
                  style={{
                    background: 'rgba(99,102,241,0.1)',
                    color: '#6366F1',
                    animation: 'tool-badge-pulse 1.2s ease infinite',
                  }}
                >
                  {TOOL_LABELS[t.name] || t.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
