import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import ResultsPanel from './ResultsPanel';

/**
 * NarrativeCard — Executive-first response card.
 * Headline insight leads, mini-chart inline, details behind pills.
 *
 * Props:
 *   execution   — { success, rowCount, rows, columns, error }
 *   insights    — markdown string from LLM
 *   chart       — { charts: [], reasoning }
 *   confidence  — { level, reason }
 *   sql         — generated SQL string
 *   entities    — { intent, complexity, metrics, dimensions, ... }
 *   onFollowUp  — callback to enter follow-up mode
 *   queries     — sub-query array for multi-query
 *   isPartial   — boolean, still streaming
 *   retrySuggestions — array of alternative phrasings
 *   onRetrySuggestion — callback
 *   zeroRowGuidance — { message, suggestion }
 *   sessionId   — for feedback
 *   question    — original question text
 *   children    — slot for expanded content (table, full chart)
 */

const CONFIDENCE_STYLES = {
  high:   { color: '#059669', dot: '#10B981', bg: 'rgba(16,185,129,0.15)' },
  medium: { color: '#D97706', dot: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
  low:    { color: '#DC2626', dot: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
};

const CONFIDENCE_TEXT = {
  high: 'High confidence',
  medium: 'Moderate confidence',
  low: 'Low confidence',
};

function extractHeadlineAndBody(insights) {
  if (!insights) return { headline: null, body: null, extras: [] };
  // Split on "Key Takeaways" header or "## " headers
  const lines = insights.split('\n');
  const contentLines = [];
  let inHeader = true;
  for (const line of lines) {
    if (inHeader && (line.startsWith('# ') || line.startsWith('## ') || line.trim() === '')) {
      continue;
    }
    inHeader = false;
    contentLines.push(line);
  }

  const text = contentLines.join('\n').trim();
  // First bold text becomes headline
  const boldMatch = text.match(/\*\*(.+?)\*\*/);
  const headline = boldMatch ? boldMatch[1].replace(/:$/, '') : null;

  // Split remaining into first paragraph (narrative) and rest (extra insights)
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
  const body = paragraphs[0] || null;
  const extras = paragraphs.slice(1);

  return { headline, body, extras };
}

function MiniChart({ chart, rows }) {
  if (!chart?.charts?.length || !rows?.length) return null;
  const config = chart.charts[0];
  if (!config?.xAxis?.key || !config?.yAxis?.length) return null;

  const xKey = config.xAxis?.key || config.x;
  const yKey = config.yAxis?.[0]?.key || config.y?.[0];
  const sorted = [...rows].sort((a, b) => (Number(b[yKey]) || 0) - (Number(a[yKey]) || 0)).slice(0, 8);
  const maxVal = Math.max(...sorted.map(r => Math.abs(Number(r[yKey]) || 0)), 1);

  // Color bars by relative position in the dataset (top third green, middle yellow, bottom red)
  const vals = sorted.map(r => Math.abs(Number(r[yKey]) || 0));
  const third = Math.ceil(sorted.length / 3);
  function barColor(idx) {
    if (idx < third) return 'rgba(16,185,129,0.55)';
    if (idx < third * 2) return 'rgba(245,158,11,0.55)';
    return 'rgba(239,68,68,0.55)';
  }

  return (
    <div className="rounded-[11px] p-3.5 mb-4" style={{ background: 'rgba(99,102,241,0.035)' }}>
      <div className="text-[11px] font-medium mb-2.5" style={{ color: 'var(--color-text-muted)' }}>
        {config.title || `${yKey} by ${xKey}`}
      </div>
      {/* Bar area — fixed height for the bars only */}
      <div className="flex items-end gap-2.5" style={{ height: 72 }}>
        {sorted.map((row, i) => {
          const val = Number(row[yKey]) || 0;
          const pct = Math.max((Math.abs(val) / maxVal) * 100, 4);
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full text-center">
              <div
                className="w-full max-w-[44px] rounded-t"
                style={{
                  height: `${pct}%`,
                  background: `linear-gradient(180deg, ${barColor(i)}, ${barColor(i).replace('0.55', '0.25')})`,
                }}
              />
            </div>
          );
        })}
      </div>
      {/* Labels below bars — outside the fixed-height container so they don't clip */}
      <div className="flex gap-2.5 mt-1.5">
        {sorted.map((row, i) => {
          const val = Number(row[yKey]) || 0;
          return (
            <div key={i} className="flex-1 text-center min-w-0">
              <div className="text-[10px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(2) : val}
              </div>
              <div className="text-[9px] mt-0.5 truncate" title={String(row[xKey])} style={{ color: 'var(--color-text-muted)' }}>
                {row[xKey]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InsightBlock({ text, isRisk }) {
  return (
    <div
      className="text-[13px] leading-relaxed mb-2.5 py-1.5 px-3"
      style={{
        color: 'var(--color-text-secondary)',
        borderLeft: `2.5px solid ${isRisk ? 'rgba(239,68,68,0.3)' : 'rgba(99,102,241,0.2)'}`,
        borderRadius: '0 7px 7px 0',
        background: isRisk ? 'rgba(239,68,68,0.015)' : 'rgba(99,102,241,0.02)',
      }}
    >
      <ReactMarkdown
        components={{
          p: ({ children }) => <p>{children}</p>,
          strong: ({ children }) => <strong style={{ color: 'var(--color-text-primary)' }}>{children}</strong>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

export default function NarrativeCard({
  execution,
  insights,
  chart,
  confidence,
  sql,
  entities,
  onFollowUp,
  queries,
  isPartial,
  retrySuggestions,
  onRetrySuggestion,
  zeroRowGuidance,
  sessionId,
  question,
  animate = false,
}) {
  const [expandedPill, setExpandedPill] = useState(null); // 'table' | 'chart' | 'sql' | 'entities' | null
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const { headline, body, extras } = useMemo(() => extractHeadlineAndBody(insights), [insights]);
  const confStyle = CONFIDENCE_STYLES[confidence?.level] || CONFIDENCE_STYLES.high;
  const confText = CONFIDENCE_TEXT[confidence?.level] || '';
  const rowCount = execution?.rowCount ?? execution?.rows?.length ?? 0;

  const handleCopyInsights = () => {
    if (insights) {
      navigator.clipboard.writeText(insights);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFeedback = async (rating) => {
    setFeedback(rating);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, question, sql, rating }),
      });
    } catch { /* silent */ }
  };

  const togglePill = (pill) => setExpandedPill(prev => prev === pill ? null : pill);

  // Staggered reveal class
  const revealStyle = (idx) => animate ? {
    opacity: 0, transform: 'translateY(12px)',
    animation: `reveal-section 0.5s cubic-bezier(0.16, 1, 0.3, 1) ${0.1 + idx * 0.15}s forwards`,
  } : {};

  return (
    <div className="p-5">
      {/* Confidence + row count header */}
      <div className="flex justify-between items-center mb-3" style={revealStyle(0)}>
        {confText && (
          <div className="flex items-center gap-1.5">
            <div className="w-[7px] h-[7px] rounded-full" style={{ background: confStyle.dot, boxShadow: `0 0 0 3px ${confStyle.bg}` }} />
            <span className="text-[11px] font-medium" style={{ color: confStyle.color }}>{confText}</span>
          </div>
        )}
        {rowCount > 0 && (
          <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{rowCount} rows</span>
        )}
      </div>

      {/* Headline */}
      {headline && (
        <div className="text-[17px] font-bold leading-snug mb-2" style={{ ...revealStyle(1), color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
          {headline}
        </div>
      )}

      {/* Narrative body */}
      {body && (
        <div className="text-[13.5px] leading-relaxed mb-4" style={{ ...revealStyle(2), color: '#44403C' }}>
          <ReactMarkdown
            components={{
              p: ({ children }) => <p>{children}</p>,
              strong: ({ children }) => <strong style={{ color: 'var(--color-text-primary)' }}>{children}</strong>,
            }}
          >
            {body}
          </ReactMarkdown>
        </div>
      )}

      {/* Mini chart */}
      <div style={revealStyle(3)}>
        <MiniChart chart={chart} rows={execution?.rows} />
      </div>

      {/* Extra insight blocks */}
      <div style={revealStyle(4)}>
        {extras.map((text, i) => {
          const isRisk = /risk|critical|gap|zero|shortfall/i.test(text);
          return <InsightBlock key={i} text={text} isRisk={isRisk} />;
        })}
      </div>

      {/* Zero-row guidance */}
      {zeroRowGuidance && (
        <div className="text-[13px] leading-relaxed mb-3 p-3 rounded-lg" style={{ ...revealStyle(4), background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', color: '#92400E' }}>
          <strong>{zeroRowGuidance.message}</strong>
          {zeroRowGuidance.suggestion && <p className="mt-1 text-[12px]">{zeroRowGuidance.suggestion}</p>}
        </div>
      )}

      {/* Retry suggestions */}
      {retrySuggestions?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3" style={revealStyle(4)}>
          {retrySuggestions.map((s, i) => (
            <button key={i} onClick={() => onRetrySuggestion?.(s)} className="text-[11px] px-3 py-1.5 rounded-lg border cursor-pointer font-medium" style={{ color: '#6366F1', background: 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.1)' }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Follow-up button */}
      {onFollowUp && !isPartial && (
        <div style={revealStyle(5)}>
          <button
            onClick={onFollowUp}
            className="text-[12px] font-medium px-3.5 py-1.5 rounded-[9px] border cursor-pointer mb-3.5"
            style={{ color: '#6366F1', background: 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.12)' }}
          >
            Follow Up
          </button>
        </div>
      )}

      {/* Feedback */}
      {!isPartial && execution?.success && (
        <div className="flex gap-2 mb-3" style={revealStyle(5)}>
          <button onClick={() => handleFeedback('up')} className="text-[11px] px-2 py-1 rounded-md border" style={{ color: feedback === 'up' ? '#059669' : 'var(--color-text-muted)', background: feedback === 'up' ? 'rgba(16,185,129,0.08)' : 'transparent', borderColor: feedback === 'up' ? 'rgba(16,185,129,0.2)' : 'rgba(0,0,0,0.06)' }}>
            👍
          </button>
          <button onClick={() => handleFeedback('down')} className="text-[11px] px-2 py-1 rounded-md border" style={{ color: feedback === 'down' ? '#DC2626' : 'var(--color-text-muted)', background: feedback === 'down' ? 'rgba(239,68,68,0.08)' : 'transparent', borderColor: feedback === 'down' ? 'rgba(239,68,68,0.2)' : 'rgba(0,0,0,0.06)' }}>
            👎
          </button>
        </div>
      )}

      {/* Progressive disclosure pills */}
      <div className="flex gap-1.5 flex-wrap pt-3" style={{ ...revealStyle(6), borderTop: '1px solid rgba(0,0,0,0.04)' }}>
        {execution?.rows?.length > 0 && (
          <button onClick={() => togglePill('table')} className="text-[11px] font-medium px-3 py-1.5 rounded-lg border flex items-center gap-1 cursor-pointer" style={{ color: '#6366F1', background: expandedPill === 'table' ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.1)' }}>
            {expandedPill === 'table' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            View table
          </button>
        )}
        {chart?.charts?.length > 0 && (
          <button onClick={() => togglePill('chart')} className="text-[11px] font-medium px-3 py-1.5 rounded-lg border flex items-center gap-1 cursor-pointer" style={{ color: '#6366F1', background: expandedPill === 'chart' ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.1)' }}>
            {expandedPill === 'chart' ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Full chart
          </button>
        )}
        {sql && (
          <button onClick={() => togglePill('sql')} className="text-[11px] px-3 py-1.5 rounded-lg border cursor-pointer" style={{ color: 'var(--color-text-muted)', background: expandedPill === 'sql' ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.02)', borderColor: 'rgba(0,0,0,0.04)' }}>
            SQL
          </button>
        )}
        {entities && (
          <button onClick={() => togglePill('entities')} className="text-[11px] px-3 py-1.5 rounded-lg border cursor-pointer" style={{ color: 'var(--color-text-muted)', background: expandedPill === 'entities' ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.02)', borderColor: 'rgba(0,0,0,0.04)' }}>
            Entities
          </button>
        )}
        <button onClick={handleCopyInsights} className="text-[11px] px-3 py-1.5 rounded-lg border cursor-pointer flex items-center gap-1 ml-auto" style={{ color: 'var(--color-text-muted)', background: 'rgba(0,0,0,0.02)', borderColor: 'rgba(0,0,0,0.04)' }}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Expanded pill content */}
      {expandedPill === 'table' && execution?.rows?.length > 0 && (
        <div className="mt-3 rounded-xl overflow-hidden border" style={{ borderColor: 'rgba(200,195,220,0.25)', animation: 'reveal-section 0.3s ease forwards' }}>
          {/* Export buttons */}
          <div className="flex gap-2 px-3 py-2" style={{ borderBottom: '1px solid rgba(200,195,220,0.15)' }}>
            <button
              onClick={() => {
                const cols = execution.columns || Object.keys(execution.rows[0] || {});
                const csv = [cols.join(','), ...execution.rows.map(r => cols.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'export.csv'; a.click();
              }}
              className="text-[10px] font-medium px-2.5 py-1 rounded-md border cursor-pointer"
              style={{ color: '#6366F1', background: 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.1)' }}
            >
              Export CSV
            </button>
            <span className="text-[10px] ml-auto" style={{ color: 'var(--color-text-muted)', alignSelf: 'center' }}>
              {execution.rows.length} rows
            </span>
          </div>
          <div className="overflow-x-auto" style={{ maxHeight: 320 }}>
            <table className="w-full text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                  {(execution.columns || Object.keys(execution.rows[0] || {})).map(col => (
                    <th key={col} className="text-left px-3 py-2 font-semibold sticky top-0" style={{ background: 'rgba(250,250,249,0.95)', borderBottom: '1px solid rgba(200,195,220,0.2)' }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {execution.rows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(200,195,220,0.1)' }}>
                    {(execution.columns || Object.keys(row)).map(col => (
                      <td key={col} className="px-3 py-1.5">{row[col] ?? '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {expandedPill === 'sql' && sql && (
        <div className="mt-3 rounded-xl overflow-hidden" style={{ background: '#1a1a2e', animation: 'reveal-section 0.3s ease forwards' }}>
          <pre className="p-4 overflow-x-auto text-[12px] leading-relaxed" style={{ color: '#e2e8f0' }}>
            <code>{sql}</code>
          </pre>
        </div>
      )}

      {expandedPill === 'entities' && entities && (
        <div className="mt-3 rounded-xl p-3 border" style={{ borderColor: 'rgba(200,195,220,0.2)', background: 'rgba(0,0,0,0.01)', animation: 'reveal-section 0.3s ease forwards' }}>
          {entities.intent && (
            <div className="flex gap-2 mb-2">
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1' }}>{entities.intent}</span>
              {entities.complexity && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>{entities.complexity}</span>}
            </div>
          )}
          {entities.metrics?.length > 0 && (
            <div className="text-[11px] mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              <span className="font-semibold">metrics:</span>{' '}
              {entities.metrics.map((m, i) => (
                <span key={i} className="inline-block px-1.5 py-0.5 rounded mr-1 mb-0.5" style={{ background: 'rgba(0,0,0,0.04)', fontSize: 10 }}>{m}</span>
              ))}
            </div>
          )}
          {entities.dimensions?.length > 0 && (
            <div className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
              <span className="font-semibold">dimensions:</span>{' '}
              {entities.dimensions.map((d, i) => (
                <span key={i} className="inline-block px-1.5 py-0.5 rounded mr-1 mb-0.5" style={{ background: 'rgba(0,0,0,0.04)', fontSize: 10 }}>{d}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {expandedPill === 'chart' && chart?.charts?.length > 0 && (
        <div className="mt-3" style={{ animation: 'reveal-section 0.3s ease forwards' }}>
          {/* Render full interactive charts directly using ResultsPanel's ChartsView.
              NOTE: ResultsPanel.jsx must be modified to export ChartsView as a named export,
              OR render ResultsPanel here with initialTab="chart" (requires adding initialTab prop).
              The implementer should add `initialTab` prop support to ResultsPanel:
              change `const [activeTab, setActiveTab] = useState('insights');`
              to `const [activeTab, setActiveTab] = useState(initialTab || 'insights');`
              and add `initialTab` to the destructured props. */}
          <ResultsPanel
            execution={execution}
            insights=""
            chart={chart}
            queries={[]}
            isPartial={false}
            confidence={confidence}
            sessionId={sessionId}
            question={question}
            sql={sql}
            initialTab="chart"
          />
        </div>
      )}
    </div>
  );
}
