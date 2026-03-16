import React, { useState, useEffect, useRef } from 'react';
import ChatPanel from './components/ChatPanel';
import { request, searchImpersonate } from './utils/api';

const RESEARCH_TOOLS = [
  'discover_context',
  'query_distinct_values',
  'inspect_table_columns',
  'check_null_ratio',
  'search_session_memory',
  'submit_research',
];

const SQL_WRITER_TOOLS = ['submit_sql'];

function generateSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function useEnabledTools() {
  const [enabledTools, setEnabledTools] = useState(() => ({
    research: ['discover_context', 'query_distinct_values'],
    sqlWriter: ['submit_sql'],
  }));

  const toggleTool = (agent, name) => {
    setEnabledTools((prev) => {
      const list = prev[agent] || [];
      const set = new Set(list);
      if (set.has(name)) set.delete(name);
      else set.add(name);
      const next = [...set];
      return { ...prev, [agent]: next };
    });
  };

  const setAll = (agent, on) => {
    const all = agent === 'research' ? RESEARCH_TOOLS : SQL_WRITER_TOOLS;
    setEnabledTools((prev) => ({ ...prev, [agent]: on ? [...all] : [] }));
  };

  const isEnabled = (agent, name) => (enabledTools[agent] || []).includes(name);
  const allEnabled = (agent) => {
    const all = agent === 'research' ? RESEARCH_TOOLS : SQL_WRITER_TOOLS;
    const current = enabledTools[agent] || [];
    return all.length > 0 && current.length === all.length;
  };
  const noneEnabled = (agent) => (enabledTools[agent] || []).length === 0;

  return { enabledTools, toggleTool, setAll, isEnabled, allEnabled, noneEnabled, RESEARCH_TOOLS, SQL_WRITER_TOOLS };
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [impersonateContext, setImpersonateContext] = useState(null);
  const [impersonateSearch, setImpersonateSearch] = useState('');
  const [impersonateResults, setImpersonateResults] = useState([]);
  const [impersonateLoading, setImpersonateLoading] = useState(false);
  const [impersonateDropdownOpen, setImpersonateDropdownOpen] = useState(false);
  const impersonateDropdownRef = useRef(null);
  const [validationEnabled, setValidationEnabled] = useState(false);
  const [sessionId, setSessionId] = useState(() => {
    const stored = localStorage.getItem('autoagents_sessionId');
    return stored || generateSessionId();
  });
  const [useFastModel, setUseFastModel] = useState(() => {
    const stored = localStorage.getItem('autoagents_useFastModel');
    return stored !== 'false';
  });
  const toolToggles = useEnabledTools();

  const [userName, setUserName] = useState('');

  useEffect(() => {
    request('/api/auth/me')
      .then((user) => {
        if (user && (user.name || user.given_name)) {
          setUserName(user.given_name || user.name);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!impersonateSearch || impersonateSearch.trim().length < 2) {
      setImpersonateResults([]);
      return;
    }
    const t = setTimeout(() => {
      setImpersonateLoading(true);
      searchImpersonate(impersonateSearch, 10)
        .then((data) => setImpersonateResults(Array.isArray(data) ? data : []))
        .catch(() => setImpersonateResults([]))
        .finally(() => setImpersonateLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [impersonateSearch]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (impersonateDropdownRef.current && !impersonateDropdownRef.current.contains(e.target)) {
        setImpersonateDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectImpersonate = (item) => {
    setImpersonateContext({ type: item.impersonateType, id: item.impersonateId, name: item.name, role: item.role });
    setImpersonateSearch('');
    setImpersonateResults([]);
    setImpersonateDropdownOpen(false);
  };

  const clearImpersonate = () => {
    setImpersonateContext(null);
    setImpersonateSearch('');
    setImpersonateResults([]);
    setImpersonateDropdownOpen(false);
  };

  const handleNewChat = () => setSessionId(generateSessionId());

  return (
    <div className="h-screen w-screen overflow-hidden" style={{ background: 'var(--gradient-page)' }}>
      {/* Background blobs */}
      <div className="bg-blob bg-blob-1" />
      <div className="bg-blob bg-blob-2" />
      <div className="bg-blob bg-blob-3" />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Single glass pane */}
      <div className="glass-shell">
        <div className="glass-pane">

          {/* Sidebar */}
          <aside
            className={`
              fixed inset-y-0 left-0 z-30 w-64 shrink-0 flex flex-col p-6
              transition-transform duration-200
              md:static md:translate-x-0
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}
            style={{ borderRight: '1px solid var(--color-border)' }}
          >
            <div className="text-lg font-bold mb-4 tracking-tight" style={{ color: 'var(--color-text-primary)', animation: 'slide-in-left 0.5s 0.2s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
              Welcome{userName ? `, ${userName}` : ''}
            </div>

            {/* New Chat button */}
            <button
              type="button"
              onClick={handleNewChat}
              className="flex items-center gap-2 w-full px-3.5 py-2.5 rounded-[12px] text-[13px] font-semibold cursor-pointer transition-all duration-200 mb-5 border"
              style={{ color: 'var(--color-accent)', background: 'var(--color-accent-light)', borderColor: 'rgba(99,102,241,0.15)', animation: 'slide-in-left 0.5s 0.3s cubic-bezier(0.16, 1, 0.3, 1) both' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Chat
            </button>

            {/* Chat History */}
            <div className="flex-1 min-h-0 flex flex-col" style={{ animation: 'slide-in-left 0.5s 0.4s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
              <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--color-text-muted)' }}>Chat History</div>
              <div className="flex-1 overflow-y-auto flex flex-col gap-0.5">
                {['Pipeline by region analysis', 'Top deals closing this quarter', 'Revenue trend YoY', 'Rep performance breakdown', 'EMEA pipeline hygiene', 'Stalled deals last 90 days'].map((title, i) => (
                  <div
                    key={title}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-[10px] text-[13px] cursor-pointer transition-all duration-150 ${i === 0 ? 'font-medium' : ''}`}
                    style={{
                      color: i === 0 ? 'var(--color-accent-hover)' : 'var(--color-text-secondary)',
                      background: i === 0 ? 'var(--color-accent-light)' : 'transparent',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" style={{ color: i === 0 ? 'var(--color-accent)' : 'var(--color-text-faint)' }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <span className="truncate">{title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom: Impersonate + Fast Model */}
            <div className="pt-5 space-y-4" style={{ borderTop: '1px solid rgba(160,150,200,0.2)', animation: 'slide-in-left 0.5s 0.5s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
              <div className="relative" ref={impersonateDropdownRef}>
                <div className="text-xs font-semibold mb-1" style={{ color: 'var(--color-text-secondary)' }}>Impersonate</div>
                <div className="text-[11px] mt-0.5 mb-2" style={{ color: 'var(--color-text-muted)' }}>Search by name to filter data</div>
                {impersonateContext ? (
                  <div className="flex items-center justify-between gap-2 rounded-[10px] px-3 py-1.5 text-xs" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                    <span className="truncate">{impersonateContext.name} — {impersonateContext.role}</span>
                    <button type="button" onClick={clearImpersonate} className="shrink-0 opacity-60 hover:opacity-100" aria-label="Clear impersonation">×</button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={impersonateSearch}
                      onChange={(e) => { setImpersonateSearch(e.target.value); setImpersonateDropdownOpen(true); }}
                      onFocus={() => impersonateDropdownOpen && setImpersonateDropdownOpen(true)}
                      placeholder="Search by name..."
                      className="w-full rounded-[10px] px-3 py-1.5 text-xs outline-none transition-all"
                      style={{ background: 'var(--glass-bg-light)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                    />
                    {impersonateDropdownOpen && (impersonateSearch.trim().length >= 2 || impersonateResults.length > 0) && (
                      <div className="absolute left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded-[12px] z-50" style={{ background: 'var(--glass-bg-heavy)', backdropFilter: 'var(--glass-blur)', border: '1px solid var(--color-border-white)', boxShadow: 'var(--shadow-elevated)' }}>
                        {impersonateLoading ? (
                          <div className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>Searching...</div>
                        ) : impersonateResults.length === 0 ? (
                          <div className="px-3 py-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>No results</div>
                        ) : (
                          impersonateResults.map((item, i) => (
                            <button
                              key={`${item.name}-${item.role}-${item.impersonateId}-${i}`}
                              type="button"
                              onClick={() => selectImpersonate(item)}
                              className="w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-white/30"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              {item.name} — {item.role}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Fast Model (Haiku)</div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Use faster LLM for agents</div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={useFastModel}
                  onClick={() => setUseFastModel((v) => { const next = !v; localStorage.setItem('autoagents_useFastModel', String(next)); return next; })}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${useFastModel ? 'bg-indigo-500' : 'bg-stone-300'}`}
                  style={{ boxShadow: useFastModel ? '0 2px 6px rgba(99,102,241,0.3)' : 'none' }}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition duration-200 ease-in-out ${useFastModel ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 flex flex-col min-w-0">
            <ChatPanel onMenuClick={() => setSidebarOpen((v) => !v)} impersonateContext={impersonateContext} validationEnabled={validationEnabled} sessionId={sessionId} onNewChat={handleNewChat} enabledTools={toolToggles.enabledTools} useFastModel={useFastModel} userName={userName} />
          </main>

        </div>
      </div>
    </div>
  );
}
