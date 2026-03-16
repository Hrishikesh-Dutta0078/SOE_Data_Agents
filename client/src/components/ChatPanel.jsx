import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { analyzeQuestionStream, fetchBlueprints } from '../utils/api';
import ResultsPanel from './ResultsPanel';
import AgentTracePanel from './AgentTracePanel';
import ThinkingPanel from './ThinkingPanel';
import DashboardOverlay from './DashboardOverlay';
import VoiceInput from './VoiceInput';
import BlueprintPicker from './BlueprintPicker';
import { Menu, ArrowUp, X, MessageSquare, Copy, Check } from 'lucide-react';

function Badge({ className = '', children }) {
  return (
    <span className={`inline-block text-[11px] font-medium px-2.5 py-0.5 rounded-full ${className}`}>
      {children}
    </span>
  );
}

function formatUsd(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return `$${n.toFixed(n < 0.01 ? 6 : 4)}`;
}

function formatTokensInMillions(n) {
  if (n == null || !Number.isFinite(n)) return null;
  const millions = n / 1e6;
  return millions >= 0.001 ? `${millions.toFixed(3)}M` : '<0.001M';
}

function formatDurationMs(ms) {
  if (ms == null || !Number.isFinite(ms)) return null;
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

function getModelsFromTrace(trace) {
  const models = new Set();
  for (const step of trace || []) {
    const llm = step?.llm;
    if (!llm) continue;
    const extract = (m) => { if (m?.modelName) models.add(m.modelName); };
    if (llm.primary) extract(llm.primary);
    if (llm.fallback) extract(llm.fallback);
    if (llm.insights) extract(llm.insights);
    if (llm.chart) extract(llm.chart);
    if (llm.modelName) extract(llm);
  }
  return [...models];
}

const STORAGE_PREFIX = 'autoagents_messages_';

function saveMessages(sessionId, messages) {
  try {
    const serializable = messages.map((m) => {
      const clone = { ...m };
      if (clone.execution?.rows) {
        clone.execution = { ...clone.execution, rows: clone.execution.rows.slice(0, 5) };
      }
      return clone;
    });
    localStorage.setItem(`${STORAGE_PREFIX}${sessionId}`, JSON.stringify(serializable));
  } catch { /* quota exceeded — silently ignore */ }
}

function loadMessages(sessionId) {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${sessionId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export default function ChatPanel({ onMenuClick, impersonateContext = null, validationEnabled = true, sessionId, onNewChat, enabledTools: enabledToolsProp = null, useFastModel = false, userName = '' }) {
  const [messages, setMessages] = useState(() => loadMessages(sessionId));
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingAnswers, setPendingAnswers] = useState({});
  const [otherText, setOtherText] = useState({});
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [expanded, setExpanded] = useState({});
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [progress, setProgress] = useState(null);
  const [streamingInsights, setStreamingInsights] = useState('');
  const [voiceListening, setVoiceListening] = useState(false);
  const [activeTools, setActiveTools] = useState([]);
  const [thinkingEntries, setThinkingEntries] = useState([]);
  const [queryPlan, setQueryPlan] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [followUpMode, setFollowUpMode] = useState(false);
  const [followUpInput, setFollowUpInput] = useState('');
  const [blueprints, setBlueprints] = useState([]);
  const [showBlueprintPicker, setShowBlueprintPicker] = useState(false);
  const [blueprintSelectedIdx, setBlueprintSelectedIdx] = useState(0);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const saveTimerRef = useRef(null);
  const voiceStopRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, progress]);

  useEffect(() => {
    fetchBlueprints()
      .then((data) => {
        if (Array.isArray(data)) setBlueprints(data);
      })
      .catch(() => {
        // Retry once after a short delay (session may not be established yet)
        setTimeout(() => {
          fetchBlueprints()
            .then((data) => { if (Array.isArray(data)) setBlueprints(data); })
            .catch(() => {});
        }, 2000);
      });
  }, []);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (sessionId && messages.length > 0) saveMessages(sessionId, messages);
    }, 500);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [messages, sessionId]);

  useEffect(() => {
    localStorage.setItem('autoagents_sessionId', sessionId);
  }, [sessionId]);

  useEffect(() => {
    setMessages(loadMessages(sessionId));
    setPendingAnswers({});
    setOtherText({});
    setAdditionalNotes('');
    setExpanded({});
  }, [sessionId]);

  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    });
  };

  const buildHistory = useCallback(() => {
    return messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => {
        const entry = { role: m.role, content: m.content };
        if (m.type === 'sql' && m.content) {
          entry.sql = m.content;
        }
        if (m.type === 'sql' && m.execution?.success) {
          const cols = m.execution.columns || [];
          const rowCount = m.execution.rowCount ?? m.execution.rows?.length ?? 0;
          entry.resultSummary = `${rowCount} rows — columns: ${cols.join(', ')}`;
        }
        return entry;
      });
  }, [messages]);

  const getAccumulatedEntities = useCallback(() => {
    const accumulated = { metrics: [], dimensions: [], filters: [], operations: [] };
    for (const msg of messages) {
      if (msg.type === 'clarification' && msg.entities) {
        for (const key of Object.keys(accumulated)) {
          if (Array.isArray(msg.entities[key])) {
            accumulated[key].push(...msg.entities[key]);
          }
        }
      }
    }
    for (const key of Object.keys(accumulated)) {
      accumulated[key] = [...new Set(accumulated[key])];
    }
    const hasAny = Object.values(accumulated).some((arr) => arr.length > 0);
    return hasAny ? accumulated : null;
  }, [messages]);

  const getAccumulatedResolved = useCallback(() => {
    const all = [];
    const seen = new Set();
    for (const msg of messages) {
      if (msg.type === 'clarification-answer' && Array.isArray(msg.resolvedQuestions)) {
        for (const rq of msg.resolvedQuestions) {
          if (!seen.has(rq.id)) {
            seen.add(rq.id);
            all.push(rq);
          }
        }
      }
    }
    return all;
  }, [messages]);

  const handleResponse = (data) => {
    const intent = data.intent;

    if (intent === 'DASHBOARD' && data.dashboardSpec) {
      const spec = data.dashboardSpec;
      const sources = [];

      if (data.queries?.length > 0) {
        for (const q of data.queries) sources.push({ question: q.subQuestion, sql: q.sql, execution: q.execution });
      }
      if (data.execution?.success) {
        const alreadyCovered = sources.some((s) => s.execution?.rows === data.execution.rows);
        if (!alreadyCovered) sources.push({ question: data.question, sql: data.sql?.generated || data.sql || '', execution: data.execution });
      }

      const history = messages.filter((m) => m.type === 'sql' && m.execution?.success);
      for (const m of history) {
        sources.push({ question: m.content, sql: m.content, execution: m.execution });
      }

      if (spec.tiles?.length > 0) {
        setDashboardData({ spec, dataSources: sources });
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            type: 'dashboard',
            content: spec.title || 'Dashboard',
            dashboardSpec: spec,
            tileCount: spec.tiles.length,
            trace: data.trace || null,
            usage: data.usage || null,
            usageByNodeAndModel: data.usageByNodeAndModel || null,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            type: 'chat',
            content: spec.description || 'No data available to build a dashboard.',
          },
        ]);
      }
      return;
    }

    if (intent === 'SQL_QUERY' || data.sql) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          type: 'sql',
          content: data.sql?.generated || data.sql || '',
          sqlReasoning: data.sql?.reasoning || '',
          orchestration: { intent: data.intent, complexity: data.complexity },
          execution: data.execution || null,
          insights: data.insights || null,
          chart: data.chart || null,
          queries: data.queries || [],
          queryPlan: data.queryPlan || [],
          suggestedFollowUps: data.suggestedFollowUps || [],
          trace: data.trace || null,
          usage: data.usage || null,
          usageByNodeAndModel: data.usageByNodeAndModel || null,
          warnings: data.warnings || null,
          entities: data.entities || null,
        },
      ]);
    } else if (intent === 'CLARIFICATION') {
      const questions = data.clarificationQuestions || [];
      let hint = 'I need a bit more information to generate a query.';
      if (data.orchestrationReasoning) {
        hint += '\n\n' + data.orchestrationReasoning;
      }
      setPendingAnswers({});
      setOtherText({});
      setAdditionalNotes('');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          type: 'clarification',
          content: hint,
          entities: data.entities || {},
          questions,
        },
      ]);
    } else if (intent === 'GENERAL_CHAT' || data.generalChatReply) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          type: 'chat',
          content: data.generalChatReply || 'I could not generate a response.',
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          type: 'chat',
          content: 'Done.',
        },
      ]);
    }
  };

  const streamOnEvent = useCallback((eventType, eventData) => {
    if (eventType === 'node_complete') {
      setActiveTools([]);
      setProgress((prev) => {
        if (!prev) return prev;
        const steps = prev.steps
          .map((s) =>
            s.status === 'active'
              ? { ...s, node: eventData.node, status: 'completed', duration: eventData.duration, summary: eventData.summary }
              : s
          );
        steps.push({ node: '_pending', status: 'active' });
        return { ...prev, steps, usage: eventData.usage || prev.usage };
      });
    } else if (eventType === 'tool_call') {
      setActiveTools((prev) => [
        ...prev.filter((t) => t.status !== 'done'),
        { name: eventData.name, phase: eventData.phase, index: eventData.index, status: 'running' },
      ]);
    } else if (eventType === 'tool_result') {
      setActiveTools((prev) =>
        prev.map((t) =>
          t.name === eventData.name && t.status === 'running'
            ? { ...t, status: 'done' }
            : t
        )
      );
    } else if (eventType === 'insight_token') {
      setStreamingInsights((prev) => prev + (eventData.content || ''));
    } else if (eventType === 'thinking') {
      setThinkingEntries((prev) => [
        ...prev,
        { message: eventData.message, category: eventData.category, elapsed: eventData.elapsed },
      ]);
    } else if (eventType === 'query_plan') {
      setQueryPlan(eventData.queryPlan || null);
      setThinkingEntries((prev) => [
        ...prev,
        {
          message: `Decomposed into ${(eventData.queryPlan || []).length} sub-queries`,
          category: 'decompose',
          elapsed: eventData.elapsed,
          detail: (eventData.queryPlan || []).map((q, i) => `${i + 1}. ${q.subQuestion}`).join('\n'),
        },
      ]);
    } else if (eventType === 'query_progress') {
      setThinkingEntries((prev) => [
        ...prev,
        {
          message: eventData.nextSubQuestion
            ? `Query ${eventData.queryIndex + 1}/${eventData.total} complete. Next: "${eventData.nextSubQuestion}"`
            : `Query ${eventData.queryIndex + 1}/${eventData.total} complete.`,
          category: 'loop',
          elapsed: eventData.elapsed,
        },
      ]);
    } else if (eventType === 'dashboard_progress') {
      setThinkingEntries((prev) => [
        ...prev,
        {
          message: eventData.status === 'planning'
            ? `Building dashboard from ${eventData.sourceCount} data source(s)...`
            : `Dashboard ready — ${eventData.tileCount} tiles`,
          category: 'dashboardAgent',
          elapsed: eventData.elapsed,
        },
      ]);
    }
  }, []);

  const runStream = useCallback(async (question, history, entities, resolved, { isFollowUp = false } = {}) => {
    const startTime = Date.now();
    setProgress({ steps: [{ node: '_pending', status: 'active' }], usage: {}, startTime });
    setStreamingInsights('');
    setActiveTools([]);
    setThinkingEntries([]);
    setQueryPlan(null);

    const opts = { impersonateContext: impersonateContext ? { type: impersonateContext.type, id: impersonateContext.id } : null, validationEnabled, sessionId, isFollowUp, useFastModel, enabledTools: enabledToolsProp ?? null };
    const result = await analyzeQuestionStream(
      question,
      history,
      entities,
      resolved,
      streamOnEvent,
      opts,
    );

    setProgress(null);
    setStreamingInsights('');
    setActiveTools([]);
    return result;
  }, [streamOnEvent, impersonateContext, validationEnabled, sessionId, enabledToolsProp, useFastModel]);

  const handleSend = async (text, { isFollowUp = false } = {}) => {
    voiceStopRef.current?.();
    const question = (text || input).trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { role: 'user', type: 'user', content: question }]);
    setInput('');
    setShowBlueprintPicker(false);
    setFollowUpMode(false);
    setFollowUpInput('');
    setLoading(true);

    try {
      const result = await runStream(
        question,
        buildHistory(),
        getAccumulatedEntities(),
        getAccumulatedResolved(),
        { isFollowUp },
      );
      if (result) handleResponse(result);
    } catch (err) {
      setProgress(null);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', type: 'chat', content: `Error: ${err.message || 'Something went wrong.'}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDashboardRefinement = useCallback(async (refinementText) => {
    if (!dashboardData?.spec || !refinementText?.trim()) return;

    const serializedSources = (dashboardData.dataSources || []).map((s) => ({
      question: s.question || null,
      sql: s.sql || null,
      execution: s.execution ? {
        success: s.execution.success,
        rowCount: s.execution.rowCount ?? s.execution.rows?.length ?? 0,
        columns: s.execution.columns || [],
        rows: (s.execution.rows || []).slice(0, 8),
      } : null,
    }));

    const dashboardOpts = {
      impersonateContext: impersonateContext ? { type: impersonateContext.type, id: impersonateContext.id } : null,
      validationEnabled,
      sessionId,
      previousDashboardSpec: dashboardData.spec,
      dashboardDataSources: serializedSources,
      useFastModel,
      enabledTools: enabledToolsProp ?? null,
    };
    const result = await analyzeQuestionStream(
      refinementText.trim(),
      buildHistory(),
      null,
      [],
      streamOnEvent,
      dashboardOpts,
    );

    if (result?.dashboardSpec) {
      setDashboardData((prev) => ({ ...prev, spec: result.dashboardSpec }));
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          type: 'dashboard',
          content: result.dashboardSpec.title || 'Dashboard (refined)',
          dashboardSpec: result.dashboardSpec,
          tileCount: result.dashboardSpec.tiles?.length || 0,
          trace: result.trace || null,
          usage: result.usage || null,
          usageByNodeAndModel: result.usageByNodeAndModel || null,
        },
      ]);
    }

    return result;
  }, [dashboardData, buildHistory, streamOnEvent, impersonateContext, validationEnabled, sessionId, enabledToolsProp, useFastModel]);

  const handleClarificationSubmit = async (questions) => {
    if (loading) return;

    const resolved = questions.map((q) => {
      const selected = pendingAnswers[q.id];
      let answer;
      if (selected === '__other__') {
        answer = (otherText[q.id] || '').trim() || 'Not specified';
      } else {
        answer = selected;
      }
      return { id: q.id, answer };
    });

    const notes = additionalNotes.trim();
    if (notes) {
      resolved.push({ id: 'additional_notes', answer: notes });
    }

    const summaryLines = resolved.map((r) =>
      r.id === 'additional_notes' ? `Additional notes: ${r.answer}` : `${r.id}: ${r.answer}`
    );

    setMessages((prev) => [
      ...prev,
      { role: 'user', type: 'clarification-answer', content: summaryLines.join('\n'), resolvedQuestions: resolved },
    ]);
    setPendingAnswers({});
    setOtherText({});
    setAdditionalNotes('');
    setLoading(true);

    try {
      const lastUserQ = [...messages].reverse().find((m) => m.role === 'user' && m.type === 'user');
      const questionToUse = lastUserQ?.content || 'Follow up on previous question';

      const result = await runStream(
        questionToUse,
        buildHistory(),
        getAccumulatedEntities(),
        [...getAccumulatedResolved(), ...resolved],
      );
      if (result) handleResponse(result);
    } catch (err) {
      setProgress(null);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', type: 'chat', content: `Error: ${err.message || 'Something went wrong.'}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleBlueprintSelect = (bp) => {
    setInput(bp.slashCommand + ' ');
    setShowBlueprintPicker(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (showBlueprintPicker && blueprints.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setBlueprintSelectedIdx((prev) => Math.min(prev + 1, blueprints.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setBlueprintSelectedIdx((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        handleBlueprintSelect(blueprints[blueprintSelectedIdx]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowBlueprintPicker(false);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- Render helpers ---

  const renderSqlMessage = (msg, idx) => (
    <>
      <div className="mb-2 flex flex-wrap gap-1">
        {msg.orchestration?.intent && (
          <Badge className="bg-blue-100 text-blue-800">{msg.orchestration.intent}</Badge>
        )}
        {msg.orchestration?.complexity && (
          <Badge className="bg-amber-100 text-amber-800">{msg.orchestration.complexity}</Badge>
        )}
        {msg.execution && (
          <Badge className={msg.execution.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}>
            {msg.execution.success
              ? `${msg.execution.rowCount ?? msg.execution.rows?.length ?? 0} row${(msg.execution.rowCount ?? msg.execution.rows?.length ?? 0) !== 1 ? 's' : ''}`
              : 'Execution Failed'}
          </Badge>
        )}
      </div>

      {msg.entities && (() => {
        const entries = Object.entries(msg.entities).filter(([, v]) => Array.isArray(v) && v.length > 0);
        if (entries.length === 0) return null;
        return (
          <div className="mb-3 p-2.5 bg-stone-50 border border-stone-200 rounded-[12px] text-xs leading-relaxed text-stone-700">
            <div className="font-semibold text-[11px] text-stone-500 mb-1">
              Detected Entities
            </div>
            {entries.map(([key, values]) => (
              <div key={key} className="flex gap-1.5 mb-0.5 flex-wrap items-baseline">
                <span className="font-semibold text-stone-600 min-w-[80px]">{key}:</span>
                <span>
                  {values.map((v, i) => (
                    <span key={i} className="inline-block px-2 py-px bg-stone-100 rounded-full text-[11px] text-stone-600 mr-1">
                      {v}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        );
      })()}

      {(msg.insights || msg.chart || (msg.execution?.success && msg.execution.rows?.length > 0) || (msg.queries?.length > 0)) && (
        <ResultsPanel execution={msg.execution} insights={msg.insights} chart={msg.chart} queries={msg.queries || []} />
      )}

      {msg.execution && !msg.execution.success && (
        <div className="mt-2.5 p-2.5 bg-red-50/50 border border-red-100 rounded-[12px] text-xs text-red-700 leading-relaxed">
          <div className="font-semibold text-[11px] text-red-600 mb-1">
            Query execution failed
          </div>
          {msg.execution.error}
        </div>
      )}

      {msg.content && (
        <div className="mt-2">
          <button
            className="text-[13px] font-medium text-indigo-500 hover:text-indigo-600 cursor-pointer bg-transparent border-none p-0 transition-colors"
            onClick={() => toggle(`${idx}-sql`)}
          >
            {expanded[`${idx}-sql`] ? 'Hide SQL' : 'Show generated SQL'}
          </button>
          {expanded[`${idx}-sql`] && (
            <>
              {msg.sqlReasoning && (
                <div className="mt-2 p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-[12px] text-[12px] text-indigo-700 leading-relaxed whitespace-pre-wrap">
                  {msg.sqlReasoning}
                </div>
              )}
              <div className="mt-2 relative bg-gray-900 text-gray-200 rounded-[12px] p-3 text-[13px] font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
                <button
                  className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-gray-300 border-none rounded-[6px] px-2 py-0.5 text-[11px] cursor-pointer transition-colors"
                  onClick={() => copyToClipboard(msg.content, idx)}
                >
                  {copiedIdx === idx ? 'Copied!' : 'Copy'}
                </button>
                {msg.content}
              </div>
            </>
          )}
        </div>
      )}

      <AgentTracePanel trace={msg.trace} />

      {(msg.usage || msg.usageByNodeAndModel) && (
        <div className="mt-2 text-[10px] text-stone-400">
          {msg.usageByNodeAndModel ? (
            <div className="space-y-1">
              {[
                { key: 'researchAgent', label: 'Research Agent' },
                { key: 'sqlWriterAgent', label: 'SQL Writer Agent' },
              ].map(({ key, label }) => {
                const byModel = msg.usageByNodeAndModel[key];
                if (!byModel) return null;
                const fmt = (u) => {
                  if (!u || (u.inputTokens === 0 && u.outputTokens === 0)) return null;
                  const inStr = formatTokensInMillions(u.inputTokens) || '—';
                  const outStr = formatTokensInMillions(u.outputTokens) || '—';
                  return `${inStr} in / ${outStr} out`;
                };
                const opus = fmt(byModel.opus);
                const haiku = fmt(byModel.haiku);
                if (!opus && !haiku) return null;
                return (
                  <div key={key} className="flex flex-wrap gap-x-3 gap-y-0.5">
                    <span className="font-medium text-stone-500 min-w-[100px]">{label}:</span>
                    {opus && <span>Opus {opus}</span>}
                    {opus && haiku && <span>·</span>}
                    {haiku && <span>Haiku {haiku}</span>}
                  </div>
                );
              })}
              {msg.usage?.totalTokens > 0 &&
                !['researchAgent', 'sqlWriterAgent'].some(
                  (k) =>
                    (msg.usageByNodeAndModel[k]?.opus?.totalTokens ?? 0) +
                    (msg.usageByNodeAndModel[k]?.haiku?.totalTokens ?? 0) > 0
                ) && (
                  <div className="pt-0.5 border-t border-stone-200 mt-1">
                    <span className="text-stone-500">Total: </span>
                    <span>{formatTokensInMillions(msg.usage.totalTokens)} tokens</span>
                    {formatDurationMs(msg.usage?.duration) && (
                      <span className="text-stone-500"> · {formatDurationMs(msg.usage.duration)}</span>
                    )}
                    <span className="text-stone-500"> (classify, present, etc.)</span>
                  </div>
                )}
              {formatDurationMs(msg.usage?.duration) &&
                ['researchAgent', 'sqlWriterAgent'].some(
                  (k) =>
                    (msg.usageByNodeAndModel[k]?.opus?.totalTokens ?? 0) +
                    (msg.usageByNodeAndModel[k]?.haiku?.totalTokens ?? 0) > 0
                ) && (
                  <div className="pt-0.5 border-t border-stone-200 mt-1">
                    <span className="text-stone-500">Query time: </span>
                    <span>{formatDurationMs(msg.usage.duration)}</span>
                  </div>
                )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {formatTokensInMillions(msg.usage?.totalTokens) && (
                <span>{formatTokensInMillions(msg.usage.totalTokens)} tokens</span>
              )}
              {formatDurationMs(msg.usage?.duration) && (
                <span>· {formatDurationMs(msg.usage.duration)}</span>
              )}
              {getModelsFromTrace(msg.trace).length > 0 ? (
                <span>· {getModelsFromTrace(msg.trace).join(', ')}</span>
              ) : (
                <span>· —</span>
              )}
            </div>
          )}
        </div>
      )}

      {msg.warnings && msg.warnings.length > 0 && (
        <div className="mt-2 p-2.5 bg-amber-50/50 border border-amber-100 rounded-[12px] text-[11px] text-amber-700 space-y-0.5">
          {msg.warnings.map((w, i) => (
            <div key={i} className="flex gap-1.5 items-start">
              <span className="shrink-0">&#9888;</span>
              <span>{typeof w === 'string' ? w : w.message || JSON.stringify(w)}</span>
            </div>
          ))}
        </div>
      )}

      {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
        <div className="mt-3 pt-3 border-t border-stone-100">
          <div className="text-[12px] font-medium text-stone-400 mb-2">
            Suggested Follow-Ups
          </div>
          <div className="flex flex-col gap-1.5">
            {msg.suggestedFollowUps.map((q, i) => (
              <button
                key={i}
                className="text-left px-3 py-2.5 text-[13px] text-stone-700 bg-stone-50 border border-stone-200 rounded-[12px]
                           hover:bg-stone-100 hover:shadow-[0_1px_2px_rgba(0,0,0,0.03)] cursor-pointer transition-all leading-relaxed"
                onClick={() => handleSend(q, { isFollowUp: true })}
                disabled={loading}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {msg.type === 'sql' && msg.execution?.success && !loading && (
        <div className="mt-2 pt-2 border-t border-slate-100">
          <button
            className="px-3.5 py-1.5 text-[12px] font-medium text-indigo-500 bg-indigo-50 border border-indigo-100
                       rounded-[8px] hover:bg-indigo-100 cursor-pointer transition-all"
            onClick={() => setFollowUpMode(true)}
          >
            Follow Up
          </button>
        </div>
      )}
    </>
  );

  const renderClarificationMessage = (msg, idx) => {
    const questions = msg.questions || [];
    const isLatestClarification =
      idx === messages.length - 1 ||
      !messages.slice(idx + 1).some((m) => m.type === 'clarification');
    const isInteractive = isLatestClarification && !loading;

    const allAnswered =
      questions.length > 0 &&
      questions.every((q) => {
        const sel = pendingAnswers[q.id];
        if (!sel) return false;
        if (sel === '__other__') return (otherText[q.id] || '').trim().length > 0;
        return true;
      });

    return (
      <div className="text-xs leading-relaxed">
        <div className="mb-2">
          <Badge className="bg-amber-50 text-amber-600">Clarification Needed</Badge>
        </div>
        <div className="text-[13px] text-slate-700 whitespace-pre-wrap mb-2">{msg.content}</div>

        {questions.length > 0 && (
          <div className="mt-2">
            {questions.map((q) => {
              const selected = pendingAnswers[q.id];
              const isOther = selected === '__other__';

              return (
                <div key={q.id} className="my-1.5">
                  <div className="text-[11px] font-semibold text-slate-800 mb-1">{q.question}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {q.options.map((opt) => (
                      <span
                        key={opt}
                        className={`
                          px-2.5 py-1 text-[11px] rounded-full border select-none transition-all cursor-pointer
                          ${selected === opt
                            ? 'bg-stone-900 text-white border-stone-900'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50 hover:border-stone-300'
                          }
                          ${!isInteractive ? 'cursor-default opacity-60' : ''}
                        `}
                        onClick={() => {
                          if (!isInteractive) return;
                          setPendingAnswers((prev) => ({ ...prev, [q.id]: opt }));
                        }}
                      >
                        {opt}
                      </span>
                    ))}
                    <span
                      className={`
                        px-2.5 py-1 text-[11px] rounded-full border border-dashed select-none italic cursor-pointer transition-all
                        ${isOther
                          ? 'bg-amber-50 text-amber-700 border-amber-300 border-solid'
                          : 'bg-white text-stone-500 border-stone-300 hover:bg-stone-50'
                        }
                        ${!isInteractive ? 'cursor-default opacity-60' : ''}
                      `}
                      onClick={() => {
                        if (!isInteractive) return;
                        setPendingAnswers((prev) => ({ ...prev, [q.id]: '__other__' }));
                      }}
                    >
                      Other
                    </span>
                  </div>
                  {isOther && isInteractive && (
                    <input
                      type="text"
                      className="mt-1.5 w-full px-2.5 py-1 text-[11px] border border-amber-200 rounded-[8px] bg-amber-50/50 outline-none font-sans focus:ring-2 focus:ring-amber-300/30"
                      placeholder="Type your answer..."
                      value={otherText[q.id] || ''}
                      onChange={(e) =>
                        setOtherText((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                    />
                  )}
                  {!isInteractive && selected && (
                    <div className="mt-0.5 text-[10px] text-stone-400 italic">
                      Selected: {isOther ? otherText[q.id] || 'Other' : selected}
                    </div>
                  )}
                </div>
              );
            })}

            {isInteractive && (
              <>
                <div className="mt-2.5 pt-2 border-t border-stone-200">
                  <div className="text-[11px] font-medium text-stone-400 mb-1">
                    Anything else to clarify? (optional)
                  </div>
                  <textarea
                    className="w-full px-2.5 py-1.5 text-[11px] border border-stone-200 rounded-[8px] outline-none font-sans resize-y min-h-[28px] text-stone-700 focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-400 transition-all"
                    rows={2}
                    placeholder="Add any extra context, filters, or preferences..."
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                  />
                </div>
                <button
                  className={`
                    mt-2.5 px-3.5 py-1.5 text-[11px] font-semibold bg-stone-900 text-white border-none rounded-[8px] cursor-pointer
                    hover:bg-stone-800 transition-all
                    ${!allAnswered ? 'opacity-40 cursor-not-allowed' : ''}
                  `}
                  disabled={!allAnswered}
                  onClick={() => handleClarificationSubmit(questions)}
                >
                  Submit Answers
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderDashboardMessage = (msg) => (
    <div className="text-xs leading-relaxed">
      <div className="mb-2 flex flex-wrap gap-1">
        <Badge className="bg-violet-50 text-violet-600">DASHBOARD</Badge>
        <Badge className="bg-stone-100 text-stone-500">{msg.tileCount} tiles</Badge>
      </div>
      <div className="text-[13px] font-semibold text-slate-800 mb-2">{msg.content}</div>
      <button
        className="px-3.5 py-1.5 text-[12px] font-semibold text-white bg-indigo-500 hover:bg-indigo-600
                   rounded-[8px] transition-all cursor-pointer border-none"
        onClick={() => {
          if (msg.dashboardSpec) {
            const sources = [];
            const history = messages.filter((m) => m.type === 'sql' && m.execution?.success);
            for (const m of history) sources.push({ question: m.content, sql: m.content, execution: m.execution });
            setDashboardData({ spec: msg.dashboardSpec, dataSources: sources });
          }
        }}
      >
        View Dashboard
      </button>
      {(msg.usage || msg.usageByNodeAndModel) && (
        <div className="mt-2 text-[10px] text-stone-400">
          {msg.usageByNodeAndModel ? (
            <div className="space-y-1">
              {[
                { key: 'researchAgent', label: 'Research Agent' },
                { key: 'sqlWriterAgent', label: 'SQL Writer Agent' },
              ].map(({ key, label }) => {
                const byModel = msg.usageByNodeAndModel[key];
                if (!byModel) return null;
                const fmt = (u) => {
                  if (!u || (u.inputTokens === 0 && u.outputTokens === 0)) return null;
                  const inStr = formatTokensInMillions(u.inputTokens) || '—';
                  const outStr = formatTokensInMillions(u.outputTokens) || '—';
                  return `${inStr} in / ${outStr} out`;
                };
                const opus = fmt(byModel.opus);
                const haiku = fmt(byModel.haiku);
                if (!opus && !haiku) return null;
                return (
                  <div key={key} className="flex flex-wrap gap-x-3 gap-y-0.5">
                    <span className="font-medium text-stone-500 min-w-[100px]">{label}:</span>
                    {opus && <span>Opus {opus}</span>}
                    {opus && haiku && <span>·</span>}
                    {haiku && <span>Haiku {haiku}</span>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {formatTokensInMillions(msg.usage?.totalTokens) && (
                <span>{formatTokensInMillions(msg.usage.totalTokens)} tokens</span>
              )}
              {getModelsFromTrace(msg.trace).length > 0 ? (
                <span>· {getModelsFromTrace(msg.trace).join(', ')}</span>
              ) : (
                <span>· —</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderMessageBody = (msg, idx) => {
    if (msg.type === 'user' || msg.role === 'user') return msg.content;
    if (msg.type === 'sql') return renderSqlMessage(msg, idx);
    if (msg.type === 'clarification') return renderClarificationMessage(msg, idx);
    if (msg.type === 'dashboard') return renderDashboardMessage(msg);
    return <div className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</div>;
  };

  const getBubbleClasses = (msg) => {
    const base = 'px-4 py-3 rounded-[20px] text-sm leading-relaxed break-words';
    if (msg.role === 'user')
      return `${base} self-end max-w-[70%] bg-indigo-500 text-white rounded-br-[8px] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] whitespace-pre-wrap`;
    const assistantBase = `${base} self-start bg-white text-stone-800 border border-stone-100 rounded-bl-[8px] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]`;
    if (msg.type === 'sql' && msg.execution?.success) return `${assistantBase} w-[90%]`;
    if (msg.type === 'dashboard') return `${assistantBase} max-w-[70%]`;
    return `${assistantBase} max-w-[70%]`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-stone-100 bg-white/80 backdrop-blur-xl">
        <button
          className="md:hidden p-1.5 rounded-[8px] text-stone-500 hover:bg-stone-100 transition-colors"
          onClick={onMenuClick}
          aria-label="Toggle sidebar"
        >
          <Menu size={20} strokeWidth={1.5} />
        </button>
        <span className="font-semibold text-base text-stone-900 tracking-tight">{userName ? `Welcome, ${userName}` : 'Auto Agents'}</span>
        <div className="ml-auto">
          <button
            className="px-3.5 py-1.5 text-sm font-medium text-indigo-500 bg-transparent border-none rounded-[8px]
                       hover:bg-indigo-50 transition-all cursor-pointer"
            onClick={() => { if (onNewChat) onNewChat(); }}
            disabled={loading}
          >
            New Chat
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        {messages.length === 0 && !loading && (
          <div className="m-auto flex flex-col items-center gap-4 max-w-md text-center animate-fade-in-up">
            <div className="w-14 h-14 rounded-[16px] bg-stone-100 flex items-center justify-center">
              <MessageSquare size={24} strokeWidth={1.5} className="text-stone-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-stone-900 mb-1.5 tracking-tight">What would you like to know?</h2>
              <p className="text-sm text-stone-500">Ask a question about your data in plain English.</p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={getBubbleClasses(msg)}>
            {renderMessageBody(msg, i)}
          </div>
        ))}

        {loading && (
          <div className="self-start w-[90%] px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm text-sm">
            {progress ? (
              <>
                <ThinkingPanel
                  entries={thinkingEntries}
                  queryPlan={queryPlan}
                  startTime={progress.startTime}
                />
                {streamingInsights && (
                  <div className="mt-3 pt-3 border-t border-stone-100 text-[13px] leading-relaxed text-stone-700">
                    <ReactMarkdown>{streamingInsights}</ReactMarkdown>
                    <span className="inline-block w-0.5 h-[18px] bg-indigo-500 rounded-full animate-subtle-pulse align-text-bottom ml-0.5" />
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-1.5 py-1">
                <span className="w-2 h-2 rounded-full bg-stone-300 animate-progress-dot" style={{animationDelay: '0ms'}} />
                <span className="w-2 h-2 rounded-full bg-stone-300 animate-progress-dot" style={{animationDelay: '200ms'}} />
                <span className="w-2 h-2 rounded-full bg-stone-300 animate-progress-dot" style={{animationDelay: '400ms'}} />
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Follow-up input */}
      {followUpMode && (
        <div className="px-5 py-2.5 border-t border-indigo-100 bg-indigo-50/40">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-indigo-500 shrink-0">Follow-up</span>
            <input
              type="text"
              className="flex-1 px-3 py-2 text-sm border border-stone-200 rounded-[12px] outline-none font-sans
                         bg-white focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-400 transition-all
                         disabled:bg-stone-50 disabled:text-stone-400"
              placeholder="Ask a follow-up question..."
              value={followUpInput}
              onChange={(e) => setFollowUpInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && followUpInput.trim()) {
                  e.preventDefault();
                  handleSend(followUpInput, { isFollowUp: true });
                }
              }}
              disabled={loading}
              autoFocus
            />
            <button
              className={`
                px-4 py-2 text-sm font-semibold bg-indigo-500 text-white rounded-[8px] shrink-0
                hover:bg-indigo-600 transition-all
                ${loading || !followUpInput.trim() ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              onClick={() => handleSend(followUpInput, { isFollowUp: true })}
              disabled={loading || !followUpInput.trim()}
            >
              Send
            </button>
            <button
              className="p-1.5 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
              onClick={() => { setFollowUpMode(false); setFollowUpInput(''); }}
              title="Cancel follow-up"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="relative px-5 py-3.5 border-t border-stone-100 bg-white/80 backdrop-blur-xl">
        {showBlueprintPicker && (
          <BlueprintPicker
            blueprints={blueprints}
            selectedIndex={blueprintSelectedIdx}
            onSelect={handleBlueprintSelect}
            onClose={() => setShowBlueprintPicker(false)}
          />
        )}
        {/* Screen reader announcement for voice transcription */}
        <div aria-live="polite" aria-atomic="false" className="sr-only" id="voice-transcript-status" />
        <div className="flex items-center gap-3">
          <div className={`voice-input-wrapper flex-1 ${voiceListening ? 'voice-active' : ''}`}>
            <input
              ref={inputRef}
              type="text"
              className="voice-input-field w-full px-4 py-2.5 text-sm bg-stone-50 border border-stone-200 rounded-[16px] outline-none font-sans
                         focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-400
                         disabled:bg-stone-50 disabled:text-stone-400"
              placeholder={voiceListening ? 'Listening...' : 'Ask a new question...'}
              value={input}
              onChange={(e) => {
                const val = e.target.value;
                setInput(val);
                if (val === '/' && blueprints.length > 0) {
                  setShowBlueprintPicker(true);
                  setBlueprintSelectedIdx(0);
                } else if (showBlueprintPicker && !val.startsWith('/')) {
                  setShowBlueprintPicker(false);
                }
              }}
              onKeyDown={handleKeyDown}
              onBlur={() => setTimeout(() => setShowBlueprintPicker(false), 150)}
              disabled={loading}
            />
          </div>
          <VoiceInput
            stopRef={voiceStopRef}
            onInterimTranscript={(text) => {
              setInput(text);
              inputRef.current?.focus();
              const el = document.getElementById('voice-transcript-status');
              if (el) el.textContent = text;
            }}
            onFinalTranscript={(text) => {
              setInput(text);
              inputRef.current?.focus();
              const el = document.getElementById('voice-transcript-status');
              if (el) el.textContent = 'Final: ' + text;
            }}
            onListeningChange={(listening) => {
              setVoiceListening(listening);
              if (listening) inputRef.current?.focus();
            }}
            onError={(msg) => {
              setMessages((prev) => [...prev, { role: 'system', type: 'error', content: msg }]);
            }}
            disabled={loading}
          />
          <button
            className={`
              w-10 h-10 flex items-center justify-center bg-indigo-500 text-white rounded-[8px] shrink-0
              hover:bg-indigo-600 transition-all
              ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            onClick={() => handleSend()}
            disabled={loading}
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {dashboardData && (
        <DashboardOverlay
          dashboardData={dashboardData}
          onClose={() => setDashboardData(null)}
          onSuggestionClick={(q) => handleSend(q)}
          onRefineDashboard={handleDashboardRefinement}
        />
      )}
    </div>
  );
}
