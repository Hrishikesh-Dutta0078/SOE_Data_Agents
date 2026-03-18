import React, { useState, useCallback, useMemo } from 'react';

/* ------------------------------------------------------------------ */
/*  Node configuration – groups of pipeline nodes                      */
/* ------------------------------------------------------------------ */
const NODE_CONFIG = [
  { group: 'Pipeline', nodes: [
    { key: 'classify', label: 'Classify', role: 'intent + entities' },
    { key: 'decompose', label: 'Decompose', role: 'multi-query split' },
    { key: 'generateSql', label: 'Generate SQL', role: 'SQL generation' },
  ]},
  { group: 'Output', nodes: [
    { key: 'presentInsights', label: 'Insights', role: 'analysis' },
    { key: 'presentChart', label: 'Chart', role: 'visualization' },
    { key: 'dashboardAgent', label: 'Dashboard', role: 'tile layout' },
  ]},
];

const ALL_NODE_KEYS = NODE_CONFIG.flatMap(g => g.nodes.map(n => n.key));

/* ------------------------------------------------------------------ */
/*  Server defaults — mirrors resolveProfileName() in llm.js           */
/*  SONNET_NODE_KEYS: presentChart                                     */
/*  Everything else: opus                                               */
/* ------------------------------------------------------------------ */
const SONNET_NODES = new Set(['presentChart']);
const SERVER_DEFAULTS = Object.fromEntries(
  ALL_NODE_KEYS.map(k => [k, SONNET_NODES.has(k) ? 'sonnet' : 'opus'])
);

/* ------------------------------------------------------------------ */
/*  Built-in presets                                                    */
/* ------------------------------------------------------------------ */
const BUILTIN_PRESETS = {
  'All Haiku': Object.fromEntries(ALL_NODE_KEYS.map(k => [k, 'haiku'])),
  'All Sonnet': Object.fromEntries(ALL_NODE_KEYS.map(k => [k, 'sonnet'])),
  'All Opus': Object.fromEntries(ALL_NODE_KEYS.map(k => [k, 'opus'])),
  'Balanced': { ...SERVER_DEFAULTS },
};

/* ------------------------------------------------------------------ */
/*  Model colour helpers                                               */
/* ------------------------------------------------------------------ */
const MODEL_COLORS = {
  haiku:  { text: '#059669', bg: 'rgba(16,185,129,0.12)', shadow: 'rgba(16,185,129,0.1)' },
  sonnet: { text: '#4F46E5', bg: 'rgba(99,102,241,0.1)',  shadow: 'rgba(99,102,241,0.1)' },
  opus:   { text: '#7C3AED', bg: 'rgba(139,92,246,0.1)',  shadow: 'rgba(139,92,246,0.1)' },
};

const MODELS = ['haiku', 'sonnet', 'opus'];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatTokens(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

function getNodeMetrics(nodeKey, lastRunMetrics) {
  if (!lastRunMetrics) return null;
  const usage = lastRunMetrics.usageByNodeAndModel;
  const durations = lastRunMetrics.nodeDurations;
  let tokens = null;
  let latencyMs = null;

  if (usage && usage[nodeKey]) {
    tokens = 0;
    for (const prof of Object.values(usage[nodeKey])) {
      tokens += prof.totalTokens || 0;
    }
  }

  if (durations && durations[nodeKey] != null) {
    latencyMs = durations[nodeKey];
  }

  if (tokens == null && latencyMs == null) return null;
  return { tokens, latencyMs };
}

function getTotalMetrics(lastRunMetrics) {
  if (!lastRunMetrics) return null;
  const usage = lastRunMetrics.usageByNodeAndModel;
  const durations = lastRunMetrics.nodeDurations;
  let totalTokens = 0;
  let totalMs = 0;

  if (usage) {
    for (const nodeData of Object.values(usage)) {
      for (const prof of Object.values(nodeData)) {
        totalTokens += prof.totalTokens || 0;
      }
    }
  }

  if (durations) {
    for (const ms of Object.values(durations)) {
      totalMs += ms || 0;
    }
  }

  return { totalTokens, totalMs };
}

/* ------------------------------------------------------------------ */
/*  SVG icons (inline, matching mockup)                                */
/* ------------------------------------------------------------------ */
const GearIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const CodeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6"/>
    <polyline points="8 6 2 12 8 18"/>
  </svg>
);

const TokenIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" style={{ width: 10, height: 10 }}>
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor" style={{ width: 10, height: 10 }}>
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

/* ------------------------------------------------------------------ */
/*  DevPanel Component                                                 */
/* ------------------------------------------------------------------ */
export default function DevPanel({ nodeModelOverrides, setNodeModelOverrides, savedPresets, setSavedPresets, lastRunMetrics }) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen(v => !v), []);

  const selectModel = useCallback((nodeKey, profile) => {
    setNodeModelOverrides({ ...nodeModelOverrides, [nodeKey]: profile });
  }, [nodeModelOverrides, setNodeModelOverrides]);

  const applyPreset = useCallback((presetValues) => {
    setNodeModelOverrides({ ...presetValues });
  }, [setNodeModelOverrides]);

  const resetDefaults = useCallback(() => {
    setNodeModelOverrides({ ...SERVER_DEFAULTS });
  }, [setNodeModelOverrides]);

  const savePreset = useCallback(() => {
    const name = window.prompt('Preset name:');
    if (!name || !name.trim()) return;
    setSavedPresets({ ...savedPresets, [name.trim()]: { ...nodeModelOverrides } });
  }, [savedPresets, setSavedPresets, nodeModelOverrides]);

  const deletePreset = useCallback((name) => {
    const next = { ...savedPresets };
    delete next[name];
    setSavedPresets(next);
  }, [savedPresets, setSavedPresets]);

  // Determine active preset for highlighting
  const activePresetName = useMemo(() => {
    const allPresets = { ...BUILTIN_PRESETS, ...savedPresets };
    for (const [name, values] of Object.entries(allPresets)) {
      const match = ALL_NODE_KEYS.every(k => (nodeModelOverrides[k] || undefined) === (values[k] || undefined));
      if (match) return name;
    }
    return null;
  }, [nodeModelOverrides, savedPresets]);

  const totals = useMemo(() => getTotalMetrics(lastRunMetrics), [lastRunMetrics]);

  const getSelectedModel = useCallback((nodeKey) => {
    return nodeModelOverrides[nodeKey] || SERVER_DEFAULTS[nodeKey] || null;
  }, [nodeModelOverrides]);

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
          right: open ? 400 : 0,
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
        onMouseEnter={e => { e.currentTarget.style.width = '38px'; e.currentTarget.style.background = 'rgba(255,255,255,0.65)'; e.currentTarget.style.boxShadow = '-2px 0 12px rgba(100,80,160,0.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.width = '32px'; e.currentTarget.style.background = 'var(--glass-bg-heavy)'; e.currentTarget.style.boxShadow = '-2px 0 8px rgba(100,80,160,0.06)'; }}
        aria-label="Toggle Developer Panel"
      >
        <GearIcon />
      </button>

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: open ? 0 : -400,
          bottom: 0,
          width: 400,
          zIndex: 999,
          background: 'var(--glass-bg-heavy)',
          backdropFilter: 'var(--glass-blur)',
          borderLeft: '1px solid var(--color-border)',
          boxShadow: '-4px 0 24px rgba(100,80,160,0.08)',
          transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 20px 14px',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}>
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            letterSpacing: '-0.3px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ color: 'var(--color-accent)', display: 'flex' }}><CodeIcon /></span>
            Developer Panel
          </div>
          <div style={{
            fontSize: 11,
            color: 'var(--color-text-muted)',
            marginTop: 3,
          }}>
            Per-node model selection for speed/accuracy analysis
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
            {MODELS.map(m => (
              <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600 }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: MODEL_COLORS[m].text,
                }} />
                <span style={{ color: MODEL_COLORS[m].text, textTransform: 'capitalize' }}>{m.charAt(0).toUpperCase() + m.slice(1)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Presets bar */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--color-border-light)',
          flexShrink: 0,
        }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            color: 'var(--color-text-faint)',
            marginBottom: 8,
          }}>
            Presets
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {/* Built-in presets */}
            {Object.entries(BUILTIN_PRESETS).map(([name, values]) => (
              <PresetButton
                key={name}
                name={name}
                active={activePresetName === name}
                onClick={() => applyPreset(values)}
              />
            ))}
            {/* Saved presets */}
            {Object.entries(savedPresets).map(([name, values]) => (
              <PresetButton
                key={`saved-${name}`}
                name={name}
                active={activePresetName === name}
                onClick={() => applyPreset(values)}
                onDelete={() => deletePreset(name)}
                deletable
              />
            ))}
            {/* Save button */}
            <button
              onClick={savePreset}
              style={{
                padding: '5px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 11,
                fontWeight: 600,
                background: 'transparent',
                border: '1px dashed var(--color-border)',
                color: 'var(--color-text-faint)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-faint)'; }}
            >
              + Save
            </button>
          </div>
        </div>

        {/* Scrollable node list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {NODE_CONFIG.map(group => (
            <div key={group.group}>
              {/* Group header */}
              <div style={{
                padding: '12px 20px 4px',
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                color: 'var(--color-text-faint)',
              }}>
                {group.group}
              </div>
              {/* Node rows */}
              {group.nodes.map(node => {
                const metrics = getNodeMetrics(node.key, lastRunMetrics);
                const selected = getSelectedModel(node.key);
                return (
                  <NodeRow
                    key={node.key}
                    node={node}
                    metrics={metrics}
                    selected={selected}
                    onSelect={(profile) => selectModel(node.key, profile)}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--color-border)',
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
            {totals ? (
              <>
                Last query: {totals.totalMs > 0 && <><strong style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>{(totals.totalMs / 1000).toFixed(1)}s</strong> &middot; </>}<strong style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>{formatTokens(totals.totalTokens)}</strong> tok
              </>
            ) : (
              <span style={{ color: 'var(--color-text-faint)' }}>No run data yet</span>
            )}
          </div>
          <button
            onClick={resetDefaults}
            style={{
              padding: '5px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 11,
              fontWeight: 600,
              background: 'rgba(239,68,68,0.06)',
              border: '1px solid rgba(239,68,68,0.15)',
              color: '#DC2626',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.06)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.15)'; }}
          >
            Reset Defaults
          </button>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  PresetButton sub-component                                         */
/* ------------------------------------------------------------------ */
function PresetButton({ name, active, onClick, onDelete, deletable }) {
  return (
    <button
      onClick={onClick}
      onContextMenu={deletable ? (e) => { e.preventDefault(); onDelete(); } : undefined}
      style={{
        padding: '5px 10px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 11,
        fontWeight: 600,
        background: active ? 'var(--color-accent-light)' : 'rgba(255,255,255,0.45)',
        border: `1px solid ${active ? 'rgba(99,102,241,0.25)' : 'var(--color-border)'}`,
        color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        position: 'relative',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = 'var(--color-accent-light)';
          e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)';
          e.currentTarget.style.color = 'var(--color-accent)';
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.45)';
          e.currentTarget.style.borderColor = 'var(--color-border)';
          e.currentTarget.style.color = 'var(--color-text-secondary)';
        }
      }}
      title={deletable ? 'Right-click to delete' : undefined}
    >
      {name}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  NodeRow sub-component                                              */
/* ------------------------------------------------------------------ */
function NodeRow({ node, metrics, selected, onSelect }) {
  const hasData = metrics != null;
  const dimStyle = { display: 'flex', alignItems: 'center', gap: 3, color: 'var(--color-text-faint)', opacity: 0.5 };
  const litStyle = { display: 'flex', alignItems: 'center', gap: 3 };

  return (
    <div
      className="flex items-center justify-between"
      style={{
        padding: '7px 20px',
        gap: 10,
        transition: 'background var(--transition-fast)',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.3)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Node info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {node.label}
        </div>
        <div style={{
          fontSize: 10,
          color: 'var(--color-text-muted)',
          marginTop: 1,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
        }}>
          {/* Latency metric */}
          {hasData && metrics.latencyMs != null ? (
            <span style={litStyle}>
              <ClockIcon />
              {(metrics.latencyMs / 1000).toFixed(1)}s
            </span>
          ) : (
            <span style={dimStyle}>
              <ClockIcon />
              --
            </span>
          )}
          {/* Token metric */}
          {hasData && metrics.tokens != null ? (
            <span style={litStyle}>
              <TokenIcon />
              {formatTokens(metrics.tokens)} tok
            </span>
          ) : (
            <span style={dimStyle}>
              <TokenIcon />
              --
            </span>
          )}
          {/* Role tag */}
          {node.role && (
            <span style={{
              fontSize: 9,
              color: 'var(--color-text-faint)',
              fontStyle: 'italic',
            }}>
              {node.role}
            </span>
          )}
          {/* Show "not triggered" for nodes without data and without a role */}
          {!node.role && !hasData && (
            <span style={{
              fontSize: 9,
              color: 'var(--color-text-faint)',
              fontStyle: 'italic',
            }}>
              not triggered
            </span>
          )}
        </div>
      </div>

      {/* Segmented control */}
      <div style={{
        display: 'flex',
        background: 'rgba(255,255,255,0.5)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        padding: 2,
        gap: 1,
        flexShrink: 0,
      }}>
        {MODELS.map(m => {
          const isActive = selected === m;
          const colors = MODEL_COLORS[m];
          return (
            <button
              key={m}
              onClick={() => onSelect(m)}
              style={{
                padding: '3px 8px',
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 600,
                background: isActive ? colors.bg : 'transparent',
                border: 'none',
                color: isActive ? colors.text : 'var(--color-text-faint)',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)',
                boxShadow: isActive ? `0 1px 3px ${colors.shadow}` : 'none',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.5)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--color-text-faint)';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
