import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import ResultsPanel from './ResultsPanel';

const mdTableComponents = {
  table: ({ children }) => (
    <div className="overflow-x-auto my-3 rounded-lg" style={{ border: '1px solid rgba(231,229,228,0.6)' }}>
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-stone-50">{children}</thead>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide border-b border-stone-200" style={{ color: '#78716C' }}>
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 border-b border-stone-100 whitespace-nowrap" style={{ color: '#44403C' }}>
      {children}
    </td>
  ),
  tr: ({ children }) => <tr className="hover:bg-stone-50/60 transition-colors">{children}</tr>,
};

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
 *   reasoning   — { matchType, intent, complexity, tablesSelected, kpisMatched, ... }
 *   thinkingLog — [{ message, category, elapsed }] chronological decision log
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
        remarkPlugins={[remarkGfm]}
        components={{
          ...mdTableComponents,
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
  reasoning,
  thinkingLog,
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
  const [expandedPill, setExpandedPill] = useState(null); // 'table' | 'sql' | 'reasoning' | null
  const hasReasoning = reasoning || (thinkingLog && thinkingLog.length > 0);
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
            remarkPlugins={[remarkGfm]}
            components={{
              ...mdTableComponents,
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
            Table
          </button>
        )}
        {sql && (
          <button onClick={() => togglePill('sql')} className="text-[11px] px-3 py-1.5 rounded-lg border cursor-pointer" style={{ color: 'var(--color-text-muted)', background: expandedPill === 'sql' ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.02)', borderColor: 'rgba(0,0,0,0.04)' }}>
            SQL
          </button>
        )}
        {hasReasoning && (
          <button onClick={() => togglePill('reasoning')} className="text-[11px] px-3 py-1.5 rounded-lg border cursor-pointer" style={{ color: 'var(--color-text-muted)', background: expandedPill === 'reasoning' ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.02)', borderColor: 'rgba(0,0,0,0.04)' }}>
            Reasoning
          </button>
        )}
        <button onClick={handleCopyInsights} className="text-[11px] px-3 py-1.5 rounded-lg border cursor-pointer flex items-center gap-1 ml-auto" style={{ color: 'var(--color-text-muted)', background: 'rgba(0,0,0,0.02)', borderColor: 'rgba(0,0,0,0.04)' }}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Expanded pill content */}
      {expandedPill === 'table' && execution?.rows?.length > 0 && (
        <div className="mt-3 rounded-xl overflow-hidden bg-white p-3" style={{ animation: 'reveal-section 0.3s ease forwards' }}>
          <ResultsPanel
            execution={execution}
            insights=""
            chart={null}
            queries={[]}
            isPartial={false}
            confidence={confidence}
            sessionId={sessionId}
            question={question}
            sql={sql}
            initialTab="table"
          />
        </div>
      )}

      {expandedPill === 'sql' && sql && (
        <div className="mt-3 rounded-xl overflow-hidden" style={{ background: '#1a1a2e', animation: 'reveal-section 0.3s ease forwards' }}>
          <pre className="p-4 overflow-x-auto text-[12px] leading-relaxed" style={{ color: '#e2e8f0' }}>
            <code>{sql}</code>
          </pre>
        </div>
      )}

      {expandedPill === 'reasoning' && hasReasoning && (
        <div className="mt-3 rounded-xl p-3 border" style={{ borderColor: 'rgba(200,195,220,0.2)', background: 'rgba(0,0,0,0.01)', animation: 'reveal-section 0.3s ease forwards' }}>
          {/* Header badges */}
          {reasoning && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {reasoning.intent && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1' }}>{reasoning.intent}</span>}
              {reasoning.complexity && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }}>{reasoning.complexity}</span>}
              {reasoning.matchType && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#059669' }}>{reasoning.matchType}</span>}
              {reasoning.validationPassed != null && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: reasoning.validationPassed ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: reasoning.validationPassed ? '#059669' : '#DC2626' }}>
                  {reasoning.validationPassed ? 'validation passed' : 'validation failed'}
                </span>
              )}
              {reasoning.correctionAttempts > 0 && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#DC2626' }}>{reasoning.correctionAttempts} correction(s)</span>
              )}
            </div>
          )}

          {/* Thinking log timeline */}
          {thinkingLog && thinkingLog.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Decision Log</div>
              <div className="space-y-1">
                {thinkingLog.map((entry, i) => (
                  <div key={i} className="flex gap-2 text-[11px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    <span className="shrink-0 text-[9px] font-mono mt-0.5 px-1.5 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.06)', color: '#6366F1' }}>
                      {entry.category || 'info'}
                    </span>
                    <span style={{ whiteSpace: 'pre-wrap' }}>{entry.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-file context breakdown */}
          {reasoning?.contextFiles?.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Context Files Used</div>
              <div className="space-y-2">
                {reasoning.contextFiles.map((cf, i) => (
                  <div key={i} className="rounded-lg p-2" style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.04)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.08)', color: '#6366F1' }}>{cf.file}</span>
                      <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>{cf.label}</span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full ml-auto" style={{ background: 'rgba(16,185,129,0.1)', color: '#059669' }}>{cf.count} selected</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {cf.items.map((item, j) => (
                        <span key={j} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.04)', color: 'var(--color-text-secondary)' }}>{item}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reasoning?.sqlReasoning && (
            <div className="text-[11px] mt-2 pt-2" style={{ color: 'var(--color-text-secondary)', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
              <span className="font-semibold">SQL reasoning:</span>{' '}
              <span style={{ color: 'var(--color-text-muted)' }}>{reasoning.sqlReasoning}</span>
            </div>
          )}

          {reasoning?.validationIssues?.length > 0 && (
            <div className="text-[11px] mt-1.5" style={{ color: '#DC2626' }}>
              <span className="font-semibold">Validation issues:</span>{' '}
              {reasoning.validationIssues.map((issue, i) => (
                <span key={i} className="block ml-2 text-[10px] py-0.5">{issue}</span>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
