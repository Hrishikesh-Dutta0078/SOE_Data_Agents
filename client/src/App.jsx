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

  return (
    <div className="flex h-screen font-sans text-stone-900 bg-stone-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 flex-shrink-0 flex flex-col
          bg-stone-100 text-stone-700 border-r border-stone-200/60 p-6 transition-transform duration-200
          md:static md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center gap-2 text-lg font-bold text-stone-900 mb-1 tracking-tight">
          <svg width="22" height="20" viewBox="0 0 1551 1375" className="shrink-0">
            <path d="m576.5 0.4h403.6l570.4 1374.6h-426.7l-360.5-912.8-238.4 598.9h283.4l112.9 313.9h-921.2z" fill="#EB1000"/>
          </svg>
          Auto Agents
        </div>
        <div className="text-[11px] text-stone-400 mb-1 whitespace-nowrap">
          Autonomous Text-to-SQL System
        </div>
        <div className="text-[11px] text-stone-300 mb-8">v0.0.5</div>
        <div className="text-sm text-stone-500 leading-relaxed">
          Fully autonomous agent with 19 tools. Every query is researched, verified, and validated by the agent.
        </div>

        <div className="mt-auto pt-6 border-t border-stone-200 space-y-4">
          <div className="relative" ref={impersonateDropdownRef}>
            <div className="text-xs font-semibold text-stone-600 mb-1">Impersonate</div>
            <div className="text-[11px] text-stone-400 mt-0.5 mb-2">Search by name to filter data</div>
            {impersonateContext ? (
              <div className="flex items-center justify-between gap-2 rounded-[8px] bg-indigo-50 text-indigo-600 px-3 py-1.5 text-xs">
                <span className="truncate">{impersonateContext.name} — {impersonateContext.role}</span>
                <button
                  type="button"
                  onClick={clearImpersonate}
                  className="text-indigo-400 hover:text-indigo-700 shrink-0"
                  aria-label="Clear impersonation"
                >
                  ×
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={impersonateSearch}
                  onChange={(e) => { setImpersonateSearch(e.target.value); setImpersonateDropdownOpen(true); }}
                  onFocus={() => impersonateDropdownOpen && setImpersonateDropdownOpen(true)}
                  placeholder="Search by name..."
                  className="w-full rounded-[8px] bg-white text-stone-800 border border-stone-200 px-3 py-1.5 text-xs placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
                {impersonateDropdownOpen && (impersonateSearch.trim().length >= 2 || impersonateResults.length > 0) && (
                  <div className="absolute left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded-[12px] bg-white border border-stone-200 shadow-[0_12px_32px_rgba(0,0,0,0.08)] z-50">
                    {impersonateLoading ? (
                      <div className="px-3 py-2 text-xs text-stone-400">Searching...</div>
                    ) : impersonateResults.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-stone-400">No results</div>
                    ) : (
                      impersonateResults.map((item, i) => (
                        <button
                          key={`${item.name}-${item.role}-${item.impersonateId}-${i}`}
                          type="button"
                          onClick={() => selectImpersonate(item)}
                          className="w-full text-left px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors"
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
              <div className="text-xs font-semibold text-stone-600">Fast Model (Haiku)</div>
              <div className="text-[11px] text-stone-400 mt-0.5">Use faster LLM for agents</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={useFastModel}
              onClick={() => setUseFastModel((v) => { const next = !v; localStorage.setItem('autoagents_useFastModel', String(next)); return next; })}
              className={`
                relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full
                border-2 border-transparent transition-colors duration-200 ease-in-out
                focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:ring-offset-2 focus:ring-offset-stone-100
                ${useFastModel ? 'bg-indigo-500' : 'bg-stone-300'}
              `}
            >
              <span
                className={`
                  pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow
                  transform transition duration-200 ease-in-out
                  ${useFastModel ? 'translate-x-4' : 'translate-x-0'}
                `}
              />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <ChatPanel onMenuClick={() => setSidebarOpen((v) => !v)} impersonateContext={impersonateContext} validationEnabled={validationEnabled} sessionId={sessionId} onNewChat={() => setSessionId(generateSessionId())} enabledTools={toolToggles.enabledTools} useFastModel={useFastModel} userName={userName} />
      </main>
    </div>
  );
}
