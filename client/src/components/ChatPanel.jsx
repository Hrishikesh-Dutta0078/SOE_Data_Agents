import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { analyzeQuestionStream, fetchBlueprints } from '../utils/api';
import ResultsPanel from './ResultsPanel';

import NarrativeCard from './NarrativeCard';
import ThinkingBubble from './ThinkingBubble';
import DashboardOverlay from './DashboardOverlay';
import VoiceInput from './VoiceInput';
import BlueprintPicker from './BlueprintPicker';
import SuggestedQuestions from './SuggestedQuestions';
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

const NODE_LABELS = {
  classify: 'Classify', decompose: 'Decompose', contextFetch: 'Context Fetch',
  generateSql: 'Generate SQL', presentInsights: 'Insights', presentChart: 'Chart',
  dashboardAgent: 'Dashboard', correct: 'Correct', researchAgent: 'Research',
  sqlWriterAgent: 'SQL Writer',
};

const MODEL_BADGE = {
  opus:   { color: '#7C3AED', bg: 'rgba(139,92,246,0.1)' },
  sonnet: { color: '#4F46E5', bg: 'rgba(99,102,241,0.1)' },
  haiku:  { color: '#059669', bg: 'rgba(16,185,129,0.12)' },
};

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

export default function ChatPanel({ onMenuClick, impersonateContext = null, validationEnabled = true, sessionId, onNewChat, enabledTools: enabledToolsProp = null, nodeModelOverrides = {}, userName = '', onMetricsUpdate }) {
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
  const [partialQueries, setPartialQueries] = useState([]);
  const [querySummary, setQuerySummary] = useState('');
  const [confidence, setConfidence] = useState(null);
  const [isComplete, setIsComplete] = useState(false);

  const [streamingData, setStreamingData] = useState(null);
  const streamingDataRef = useRef(null);

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const inputRef = useRef(null);
  const saveTimerRef = useRef(null);
  const voiceStopRef = useRef(null);
  const progressTimeoutRef = useRef(null);
  const thinkingEntriesRef = useRef([]);

  // Keep ref in sync so handleResponse can snapshot thinkingEntries
  useEffect(() => { thinkingEntriesRef.current = thinkingEntries; }, [thinkingEntries]);

  // Scroll messages to bottom so the latest question sits just above the ThinkingBubble
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight; });
    }
  }, [messages, loading]);

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
        setDashboardData({
          spec,
          dataSources: sources,
          tileData: data.tileData || null,
          slicerValues: data.slicerValues || null,
          profileCacheKey: data.profileCacheKey || null,
        });
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            type: 'dashboard',
            content: spec.title || 'Dashboard',
            dashboardSpec: spec,
            tileCount: spec.tiles.length,
            tileData: data.tileData || null,
            slicerValues: data.slicerValues || null,
            profileCacheKey: data.profileCacheKey || null,
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
      // Merge rows from data_ready capture — the SSE done payload strips rows for payload size
      const capturedRows = streamingDataRef.current?.rows;
      const finalExecution = data.execution
        ? { ...data.execution, rows: capturedRows || data.execution.rows || [] }
        : (streamingDataRef.current || null);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          type: 'sql',
          content: data.sql?.generated || data.sql || '',
          sqlReasoning: data.sql?.reasoning || '',
          orchestration: { intent: data.intent, complexity: data.complexity },
          execution: finalExecution,
          insights: data.insights || null,
          chart: data.chart || null,
          queries: data.queries || [],
          queryPlan: data.queryPlan || [],
          suggestedFollowUps: data.suggestedFollowUps || [],
          retrySuggestions: data.retrySuggestions || [],
          trace: data.trace || null,
          usage: data.usage || null,
          usageByNodeAndModel: data.usageByNodeAndModel || null,
          warnings: data.warnings || null,
          entities: data.entities || null,
          reasoning: data.reasoning || null,
          thinkingLog: [...thinkingEntriesRef.current],
          confidence: data.confidence || null,
        },
      ]);
      if (data.confidence) setConfidence(data.confidence);
    } else if (intent === 'CLARIFICATION') {
      const questions = data.clarificationQuestions || [];
      let hint = 'I need a bit more information to generate a query.';
      if (data.orchestrationReasoning) {
        hint += '\n\n' + data.orchestrationReasoning;
      }
      setPendingAnswers({});
      setOtherText({});
      setAdditionalNotes('');
      // Find the original user question for disambiguation re-submission
      const lastUserQ = [...messages].reverse().find((m) => m.role === 'user' && m.type === 'user');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          type: 'clarification',
          content: hint,
          entities: data.entities || {},
          questions,
          originalQuestion: lastUserQ?.content || '',
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

  const nodeDurationsRef = useRef({});

  const streamOnEvent = useCallback((eventType, eventData) => {
    if (eventType === 'node_complete') {
      setActiveTools([]);
      nodeDurationsRef.current[eventData.node] = eventData.duration;
      setProgress(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          steps: [
            ...prev.steps,
            {
              node: eventData.node,
              status: 'completed',
              duration: eventData.duration,
              summary: eventData.summary,
              model: eventData.model,
            },
          ],
          usage: { ...prev.usage, ...eventData.usage },
        };
      });
      // Pipe node completion into reasoning stream with natural language
      const nodeThinking = {
        classify: (s) => s ? `Understood — this looks like ${s.toLowerCase()}` : 'Figured out what kind of question this is',
        decompose: (s) => s || 'Breaking this down into smaller pieces to tackle one at a time...',
        alignSubQueries: (s) => s || 'Matching sub-questions against known query patterns...',
        contextFetch: (s) => s || 'Digging through the schema to find the right tables and columns...',
        researchAgent: (s) => s || 'Researching the database structure to understand how things connect...',
        generateSql: (s) => s || 'Drafting the SQL query now — piecing together the joins and filters...',
        sqlWriterAgent: (s) => s || 'Writing the SQL — choosing the right approach for this data...',
        injectRls: () => 'Applying row-level security filters to keep the data properly scoped',
        validate: (s) => s || 'Double-checking the query logic — making sure everything looks right...',
        correct: (s) => s || 'Found an issue, revising the query to fix it...',
        execute: (s) => s ? `Running the query... ${s}` : 'Executing the query against the database now...',
        checkResults: (s) => s || 'Reviewing what came back — checking if the results make sense...',
        diagnoseEmptyResults: () => 'Got no results back — investigating why and trying a different approach...',
        present: () => 'Putting together the final answer with insights...',
        dashboardAgent: () => 'Building the dashboard layout and charts...',
      };
      const thinkFn = nodeThinking[eventData.node];
      const msg = thinkFn ? thinkFn(eventData.summary) : (eventData.summary || `Processing ${eventData.node}...`);
      setThinkingEntries(prev => [...prev, { message: msg, category: eventData.node }]);
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
    } else if (eventType === 'subquery_result') {
      setPartialQueries((prev) => {
        const next = [...prev];
        next[eventData.index] = eventData.result;
        return next;
      });
    } else if (eventType === 'query_summary') {
      setQuerySummary(eventData.summary || '');
    } else if (eventType === 'data_ready') {
      streamingDataRef.current = eventData.execution;
      setStreamingData(eventData.execution);
    } else if (eventType === 'done') {
      if (onMetricsUpdate) {
        onMetricsUpdate({
          usageByNodeAndModel: eventData.usageByNodeAndModel || null,
          nodeDurations: { ...nodeDurationsRef.current },
        });
      }
      nodeDurationsRef.current = {};
      setIsComplete(true);
    }
  }, [onMetricsUpdate]);

  const runStream = useCallback(async (question, history, entities, resolved, { isFollowUp = false } = {}) => {
    // Cancel any pending progress-clear timeout from a previous query
    if (progressTimeoutRef.current) {
      clearTimeout(progressTimeoutRef.current);
      progressTimeoutRef.current = null;
    }
    const startTime = Date.now();
    setProgress({ steps: [], usage: {}, startTime });
    setIsComplete(false);
    setStreamingInsights('');
    setActiveTools([]);
    setThinkingEntries([]);
    setQueryPlan(null);
    setPartialQueries([]);
    setQuerySummary('');
    setConfidence(null);

    const opts = { impersonateContext: impersonateContext ? { type: impersonateContext.type, id: impersonateContext.id } : null, validationEnabled, sessionId, isFollowUp, nodeModelOverrides, enabledTools: enabledToolsProp ?? null };
    const result = await analyzeQuestionStream(
      question,
      history,
      entities,
      resolved,
      streamOnEvent,
      opts,
    );

    setStreamingInsights('');
    setStreamingData(null);
    // NOTE: do NOT clear streamingDataRef here — handleResponse reads it after runStream returns.
    // It gets overwritten at the start of the next stream call.
    setActiveTools([]);
    return result;
  }, [streamOnEvent, impersonateContext, validationEnabled, sessionId, enabledToolsProp, nodeModelOverrides]);

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
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', type: 'chat', content: `Error: ${err.message || 'Something went wrong.'}` },
      ]);
    } finally {
      setLoading(false);
      progressTimeoutRef.current = setTimeout(() => {
        setProgress(null);
        setIsComplete(false);
        progressTimeoutRef.current = null;
      }, 800);
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
      ...(dashboardData.profileCacheKey
        ? { profileCacheKey: dashboardData.profileCacheKey }
        : { dashboardDataSources: serializedSources }),
      nodeModelOverrides,
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
  }, [dashboardData, buildHistory, streamOnEvent, impersonateContext, validationEnabled, sessionId, enabledToolsProp, nodeModelOverrides]);

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
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', type: 'chat', content: `Error: ${err.message || 'Something went wrong.'}` },
      ]);
    } finally {
      setLoading(false);
      progressTimeoutRef.current = setTimeout(() => {
        setProgress(null);
        setIsComplete(false);
        progressTimeoutRef.current = null;
      }, 800);
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
    <div
      style={{
        background: 'rgba(255,255,255,0.55)',
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.5)',
        boxShadow: '0 2px 12px rgba(100,80,160,0.04)',
        overflow: 'hidden',
        maxWidth: '88%',
      }}
    >
      <NarrativeCard
        execution={msg.execution}
        insights={msg.insights}
        chart={msg.chart}
        confidence={msg.confidence}
        sql={msg.content}
        reasoning={msg.reasoning}
        thinkingLog={msg.thinkingLog}
        onFollowUp={() => setFollowUpMode(true)}
        queries={msg.queries}
        isPartial={false}
        retrySuggestions={msg.retrySuggestions}
        onRetrySuggestion={(s) => handleSend(s)}
        zeroRowGuidance={msg.zeroRowGuidance}
        sessionId={sessionId}
        question={messages[messages.indexOf(msg) - 1]?.content}
        animate={messages.indexOf(msg) === messages.length - 1}
      />
    </div>
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

              const isSingleQuestion = questions.length === 1;
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
                          if (isSingleQuestion && msg.originalQuestion) {
                            // Quick-pick: re-submit with the resolved clarification
                            const clarifiedQuestion = `${msg.originalQuestion} (${opt})`;
                            handleSend(clarifiedQuestion, { isFollowUp: false });
                            return;
                          }
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
            setDashboardData({
              spec: msg.dashboardSpec,
              dataSources: sources,
              tileData: msg.tileData || null,
              slicerValues: msg.slicerValues || null,
              profileCacheKey: msg.profileCacheKey || null,
            });
          }
        }}
      >
        View Dashboard
      </button>
      {(msg.usage || msg.usageByNodeAndModel) && (
        <div className="mt-2 text-[10px] text-stone-400">
          {msg.usageByNodeAndModel && Object.keys(msg.usageByNodeAndModel).length > 0 ? (
            <div className="space-y-1">
              {Object.entries(msg.usageByNodeAndModel).map(([nodeKey, byModel]) => {
                const models = Object.entries(byModel).filter(([, u]) => u.totalTokens > 0);
                if (models.length === 0) return null;
                const label = NODE_LABELS[nodeKey] || nodeKey;
                return (
                  <div key={nodeKey} className="flex items-center gap-x-3 gap-y-0.5 flex-wrap">
                    <span className="font-medium text-stone-500 min-w-[90px]">{label}</span>
                    {models.map(([model, u]) => {
                      const badge = MODEL_BADGE[model];
                      return (
                        <span key={model} className="flex items-center gap-1">
                          {badge && <span className="font-semibold px-1.5 py-0.5 rounded-full" style={{ color: badge.color, background: badge.bg, fontSize: 9 }}>{model.charAt(0).toUpperCase() + model.slice(1)}</span>}
                          <span>{formatTokensInMillions(u.totalTokens) || '—'} tok</span>
                        </span>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {formatTokensInMillions(msg.usage?.totalTokens) && (
                <span>{formatTokensInMillions(msg.usage.totalTokens)} tokens</span>
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
      return `${base} self-end max-w-[70%] bubble-user text-white rounded-br-[8px] whitespace-pre-wrap`;
    if (msg.type === 'sql') return 'self-start w-[90%]';
    const assistantBase = `${base} self-start bubble-assistant text-stone-800 rounded-bl-[8px]`;
    if (msg.type === 'dashboard') return `${assistantBase} max-w-[70%]`;
    return `${assistantBase} max-w-[70%]`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat area */}
      <div className="chat-card">
      <div ref={scrollContainerRef} className={`flex-1 min-h-0 overflow-y-auto p-5 flex flex-col ${messages.length === 0 && !loading ? 'justify-center items-center' : 'gap-4'}`}>
        {messages.length === 0 && !loading && (
          <SuggestedQuestions
            onSelect={(text) => handleSend(text)}
            renderInput={() => (
              <div className="w-full flex justify-center mb-5" style={{ maxWidth: 560, animation: 'fade-in-up 0.6s 0.65s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
                <div className="relative w-full">
                  {showBlueprintPicker && (
                    <BlueprintPicker
                      blueprints={blueprints}
                      selectedIndex={blueprintSelectedIdx}
                      onSelect={handleBlueprintSelect}
                      onClose={() => setShowBlueprintPicker(false)}
                    />
                  )}
                  <div className="flex items-center gap-2.5 w-full rounded-[18px] px-1.5 py-1.5" style={{ background: 'var(--glass-bg)', border: '1px solid var(--color-border)' }}>
                    <div className={`voice-input-wrapper flex-1 ${voiceListening ? 'voice-active' : ''}`}>
                      <input
                        ref={inputRef}
                        type="text"
                        className="voice-input-field w-full bg-transparent border-none outline-none text-[14px] px-3 py-2.5"
                        style={{ color: 'var(--color-text-primary)', fontFamily: 'inherit' }}
                        placeholder={voiceListening ? 'Listening...' : 'Ask a question...'}
                        value={input}
                        onChange={(e) => {
                          const val = e.target.value;
                          setInput(val);
                          if (val === '/' && blueprints.length > 0) { setShowBlueprintPicker(true); setBlueprintSelectedIdx(0); }
                          else if (showBlueprintPicker && !val.startsWith('/')) { setShowBlueprintPicker(false); }
                        }}
                        onKeyDown={handleKeyDown}
                        onBlur={() => setTimeout(() => setShowBlueprintPicker(false), 150)}
                        disabled={loading}
                      />
                    </div>
                    <VoiceInput
                      stopRef={voiceStopRef}
                      onInterimTranscript={(text) => { setInput(text); inputRef.current?.focus(); }}
                      onFinalTranscript={(text) => { setInput(text); inputRef.current?.focus(); }}
                      onListeningChange={(listening) => { setVoiceListening(listening); if (listening) inputRef.current?.focus(); }}
                      onError={(msg) => { setMessages((prev) => [...prev, { role: 'system', type: 'error', content: msg }]); }}
                      disabled={loading}
                    />
                    <button
                      className="w-9 h-9 flex items-center justify-center rounded-[12px] shrink-0 cursor-pointer border-none text-white transition-all"
                      style={{ background: 'var(--gradient-send-btn)', boxShadow: '0 2px 8px rgba(99,102,241,0.25)' }}
                      onClick={() => handleSend()}
                      disabled={loading}
                    >
                      <ArrowUp size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          />
        )}

        {messages.map((msg, i) => (
          <div key={i} className={getBubbleClasses(msg)}>
            {renderMessageBody(msg, i)}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* ThinkingBubble — pinned below scroll area so it's always visible */}
      {(loading || progress) && (
        <div
          key={progress?.startTime || 'loading'}
          className="shrink-0 mx-5 mb-2"
          style={{
            background: 'rgba(255,255,255,0.55)',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.5)',
            boxShadow: '0 2px 12px rgba(100,80,160,0.04)',
            overflow: 'hidden',
          }}
        >
          <ThinkingBubble
            steps={progress?.steps || []}
            thinkingEntries={thinkingEntries}
            startTime={progress?.startTime}
            activeTools={activeTools}
            isComplete={isComplete}
          />
          <div className="px-5 pb-4">
            {partialQueries.filter(Boolean).map((pq, i) => (
              <div key={i} className="text-[12px] mb-2 p-2 rounded-lg" style={{ background: 'rgba(99,102,241,0.04)', color: 'var(--color-text-secondary)' }}>
                <span className="font-semibold text-[11px] mr-1.5" style={{ color: '#6366F1' }}>Q{i + 1}</span>
                {pq.subQuestion || `Sub-query ${i + 1} complete`}
                {pq.execution?.rowCount != null && <span className="ml-1.5 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>({pq.execution.rowCount} rows)</span>}
              </div>
            ))}
            {streamingInsights && (
              <div className="text-[13px] leading-relaxed mt-2" style={{ color: '#44403C' }}>
                <ReactMarkdown>{streamingInsights}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Follow-up input */}
      {followUpMode && (
        <div className="px-5 py-2.5 bg-indigo-50/40" style={{ borderTop: '1px solid rgba(199,210,254,0.4)' }}>
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
                px-4 py-2 text-sm font-semibold text-white rounded-[10px] shrink-0
                transition-all hover:brightness-110
                ${loading || !followUpInput.trim() ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              style={{ background: 'var(--gradient-send-btn)', boxShadow: '0 2px 6px rgba(99,102,241,0.25)' }}
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
      </div>{/* end chat-card */}

      {/* Input — pinned bottom, hidden on empty state */}
      <div className={`relative px-5 py-3.5 surface-gradient-input shrink-0 ${messages.length === 0 && !loading ? 'hidden' : ''}`}>
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
              className="voice-input-field w-full px-4 py-2.5 text-sm border rounded-[16px] outline-none font-sans
                         focus:border-indigo-400/30
                         disabled:bg-stone-50 disabled:text-stone-400"
              style={{ background: 'var(--glass-bg-light)', borderColor: 'var(--color-border)' }}
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
              w-10 h-10 flex items-center justify-center text-white rounded-[12px] shrink-0
              transition-all hover:brightness-110
              ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            style={{ background: 'var(--gradient-send-btn)', boxShadow: '0 2px 6px rgba(99,102,241,0.3), 0 4px 12px rgba(99,102,241,0.15)' }}
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
