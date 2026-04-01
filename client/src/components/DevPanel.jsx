import React, { useState, useCallback, useMemo } from 'react';

const MODEL_OPTIONS = [
  { value: 'opus', label: 'Opus 4.6', color: '#7C3AED' },
  { value: 'gpt', label: 'GPT 5.4', color: '#059669' },
];

const PHASE_CONFIG = [
  { key: 'contextFetch', label: 'Research' },
  { key: 'generateSql', label: 'Writer' },
];

const MODEL_COLORS = {
  opus:   { label: 'Opus 4.6',   color: '#7C3AED' },
  sonnet: { label: 'Sonnet 4.6', color: '#4F46E5' },
  haiku:  { label: 'Haiku 4.5',  color: '#059669' },
  gpt:    { label: 'GPT 5.4',    color: '#059669' },
};

function formatTokenCount(n) {
  if (n == null || !Number.isFinite(n) || n <= 0) return '0';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

const GearIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

export default function DevPanel({ globalModel, setGlobalModel, lastRunMetrics }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen(v => !v), []);

  const selectedModel = MODEL_OPTIONS.find(m => m.value === globalModel) || MODEL_OPTIONS[0];

  // Calculate total time from metrics
  const totalSeconds = useMemo(() => {
    if (!lastRunMetrics?.nodeDurations) return null;
    const totalMs = Object.values(lastRunMetrics.nodeDurations).reduce((sum, ms) => sum + (ms || 0), 0);
    return (totalMs / 1000).toFixed(2);
  }, [lastRunMetrics]);

  const tokensByPhase = useMemo(() => {
    const raw = lastRunMetrics?.usageByNodeAndModel;
    if (!raw) return null;
    let totalCost = 0;
    const phases = PHASE_CONFIG.map(({ key, label }) => {
      const byModel = raw[key] || {};
      const entries = Object.entries(byModel)
        .filter(([, u]) => u && u.totalTokens > 0)
        .map(([model, u]) => {
          totalCost += u.estimatedCostUsd || 0;
          return { model, inputTokens: u.inputTokens || 0, outputTokens: u.outputTokens || 0 };
        });
      return { key, label, entries };
    });
    return { phases, totalCost };
  }, [lastRunMetrics]);

  return (
    <>
      {/* Scrim overlay */}
      <div
        onClick={toggle}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 998,
          background: 'rgba(0,0,0,0.05)',
          backdropFilter: 'blur(1px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Trigger button */}
      <button
        onClick={toggle}
        style={{
          position: 'fixed',
          right: open ? 320 : 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1000,
          width: 32,
          height: 64,
          background: 'var(--glass-bg-heavy)',
          backdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--color-border)',
          borderRight: 'none',
          borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all var(--transition-base)',
          boxShadow: '-2px 0 8px rgba(100,80,160,0.06)',
          color: 'var(--color-accent)',
          padding: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.width = '38px'; e.currentTarget.style.background = 'rgba(255,255,255,0.65)'; }}
        onMouseLeave={e => { e.currentTarget.style.width = '32px'; e.currentTarget.style.background = 'var(--glass-bg-heavy)'; }}
        aria-label="Toggle Model Comparison"
      >
        <GearIcon />
      </button>

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: open ? 0 : -320,
          bottom: 0,
          width: 320,
          zIndex: 999,
          background: 'var(--glass-bg-heavy)',
          backdropFilter: 'var(--glass-blur)',
          borderLeft: '1px solid var(--color-border)',
          boxShadow: '-4px 0 24px rgba(100,80,160,0.08)',
          transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          padding: 24,
          gap: 24,
        }}
      >
        {/* Header */}
        <div>
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            marginBottom: 4,
          }}>
            Model Comparison
          </div>
          <div style={{
            fontSize: 11,
            color: 'var(--color-text-muted)',
          }}>
            Compare Opus 4.6 vs GPT 5.4 end-to-end performance
          </div>
        </div>

        {/* Toggle */}
        <div>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            color: 'var(--color-text-faint)',
            marginBottom: 12,
          }}>
            Active Model
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            {MODEL_OPTIONS.map(model => (
              <button
                key={model.value}
                onClick={() => setGlobalModel(model.value)}
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13,
                  fontWeight: 600,
                  background: globalModel === model.value
                    ? `${model.color}15`
                    : 'rgba(255,255,255,0.45)',
                  border: `2px solid ${globalModel === model.value ? model.color : 'var(--color-border)'}`,
                  color: globalModel === model.value ? model.color : 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  border: `2px solid ${model.color}`,
                  background: globalModel === model.value ? model.color : 'transparent',
                  flexShrink: 0,
                }} />
                {model.label}
              </button>
            ))}
          </div>
        </div>

        {/* Token Usage */}
        {tokensByPhase && (
          <div>
            <div style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              color: 'var(--color-text-faint)',
              marginBottom: 12,
            }}>
              Token Usage
            </div>
            <div style={{
              padding: 16,
              background: 'rgba(255,255,255,0.3)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-light)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              {tokensByPhase.phases.map(({ key, label, entries }) => (
                <div key={key}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                    {label}
                  </div>
                  {entries.length === 0 ? (
                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>—</div>
                  ) : (
                    entries.map(({ model, inputTokens, outputTokens }) => {
                      const mc = MODEL_COLORS[model];
                      return (
                        <div key={model} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--color-text-muted)' }}>
                          <span style={{
                            fontSize: 9,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 999,
                            color: mc?.color || '#6B7280',
                            background: mc ? `${mc.color}15` : 'rgba(107,114,128,0.1)',
                          }}>
                            {mc?.label || model}
                          </span>
                          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                            In: {formatTokenCount(inputTokens)}
                          </span>
                          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                            Out: {formatTokenCount(outputTokens)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              ))}
              {tokensByPhase.totalCost > 0 && (
                <div style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: 8, marginTop: 2, fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                  Est. Cost: {tokensByPhase.totalCost >= 0.01 ? `$${tokensByPhase.totalCost.toFixed(4)}` : `$${tokensByPhase.totalCost.toFixed(6)}`}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Metrics */}
        <div style={{
          marginTop: 'auto',
          padding: 16,
          background: 'rgba(255,255,255,0.3)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border-light)',
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            color: 'var(--color-text-faint)',
            marginBottom: 8,
          }}>
            Last Query
          </div>
          <div style={{
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {totalSeconds ? `${totalSeconds}s` : '—'}
          </div>
          <div style={{
            fontSize: 11,
            color: 'var(--color-text-muted)',
            marginTop: 4,
          }}>
            {totalSeconds ? `Using ${selectedModel.label}` : 'No query yet'}
          </div>
        </div>
      </div>
    </>
  );
}
