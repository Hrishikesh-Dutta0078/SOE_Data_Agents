import { useState, useEffect, useRef, useMemo } from 'react';
import { Check } from 'lucide-react';

// ─── Node-to-dot mapping (spec table) ───────────────────────────
const DOT_CONFIG = [
  { label: 'Classify', short: 'Cls', nodes: ['classify', 'decompose', 'alignSubQueries'] },
  { label: 'Research', short: 'Res', nodes: ['contextFetch'] },
  { label: 'SQL Write', short: 'SQL', nodes: ['generateSql'] },
  { label: 'Validate', short: 'Val', nodes: ['injectRls', 'validate', 'correct'] },
  { label: 'Execute',  short: 'Exe', nodes: ['execute', 'checkResults', 'diagnoseEmptyResults'] },
  { label: 'Present',  short: 'Pre', nodes: ['present', 'dashboardAgent'] },
];
const TOTAL_DOTS = DOT_CONFIG.length;

/** Derive done/active/pending status for each dot position. */
function deriveDotStatuses(steps, isComplete) {
  const done = new Set(steps.filter(s => s.status === 'completed').map(s => s.node));
  const statuses = DOT_CONFIG.map(dot => ({
    ...dot,
    done: dot.nodes.some(n => done.has(n)),
  }));
  // Active = first dot after the highest completed dot
  let highest = -1;
  for (let i = statuses.length - 1; i >= 0; i--) {
    if (statuses[i].done) { highest = i; break; }
  }
  const activeIdx = isComplete ? -1 : Math.min(highest + 1, TOTAL_DOTS - 1);
  return statuses.map((d, i) => ({
    ...d,
    status: d.done ? 'done' : i === activeIdx ? 'active' : 'pending',
  }));
}

/** Count how many dot positions have at least one completed node. */
function countCompletedDots(steps) {
  const done = new Set(steps.filter(s => s.status === 'completed').map(s => s.node));
  return DOT_CONFIG.filter(dot => dot.nodes.some(n => done.has(n))).length;
}

// ─── ProgressBar ────────────────────────────────────────────────
function ProgressBar({ completed, total, isComplete }) {
  const pct = (completed / total) * 100;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(99,102,241,0.12)' }}>
        <div style={{
          height: '100%', borderRadius: 2, width: `${pct}%`,
          background: isComplete
            ? 'linear-gradient(90deg, #10B981, #34D399)'
            : 'linear-gradient(90deg, #6366F1, #818CF8)',
          transition: 'width 0.5s ease',
        }} />
      </div>
      <span style={{
        fontSize: 11, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
        color: isComplete ? '#10B981' : '#6366F1', minWidth: 36, textAlign: 'right',
      }}>
        {completed} of {total}
      </span>
    </div>
  );
}

// ─── StepDotTrack ───────────────────────────────────────────────
function connectorColor(left, right) {
  if (left.done && right.done) return '#10B981';
  if (left.done && right.status === 'active') return 'linear-gradient(90deg, #10B981, #6366F1)';
  return 'rgba(156,163,175,0.3)';
}

function StepDotTrack({ dotStatuses }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 10, width: '100%' }}>
      {dotStatuses.map((dot, i) => (
        <div key={dot.label} style={{ display: 'contents' }}>
          {/* Connector line — flex:1 stretches to fill available width */}
          {i > 0 && (
            <div style={{
              flex: 1, height: 1.5, minWidth: 12, marginTop: 4,
              background: connectorColor(dotStatuses[i - 1], dot),
              transition: 'background 0.4s ease',
            }} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 32 }}>
            <div style={{
              width: dot.status === 'active' ? 10 : 8,
              height: dot.status === 'active' ? 10 : 8,
              borderRadius: '50%',
              background: dot.done ? '#10B981' : dot.status === 'active' ? '#6366F1' : 'rgba(156,163,175,0.35)',
              boxShadow: dot.status === 'active' ? '0 0 0 4px rgba(99,102,241,0.2)' : 'none',
              animation: dot.status === 'active' ? 'thinking-bubble-pulse 2s ease-in-out infinite' : 'none',
              transition: 'all 0.4s ease',
            }} />
            <span style={{
              fontSize: 9, fontWeight: 500, marginTop: 3,
              color: dot.done ? '#10B981' : dot.status === 'active' ? '#6366F1' : 'rgba(156,163,175,0.6)',
              transition: 'color 0.4s ease',
            }}>
              {dot.short}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── ReasoningWindow ────────────────────────────────────────────
function ReasoningWindow({ entries, isComplete }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [entries.length]);

  return (
    <div style={{ position: 'relative', height: 100, overflow: 'hidden', marginTop: 4 }}>
      {/* Scrollable entries */}
      <div ref={scrollRef} className="thinking-bubble-scroll" style={{
        height: '100%', overflowY: 'auto', padding: '8px 0 4px 12px',
      }}>
        {entries.map((entry, i) => {
          const isLatest = i === entries.length - 1 && !isComplete;
          return (
            <div key={i} style={{
              padding: '2px 0',
              fontSize: 12, color: 'rgba(120,113,160,0.35)',
              fontFamily: 'ui-monospace, monospace', lineHeight: 1.5,
              animation: isLatest ? 'subtle-pulse 1.5s ease-in-out infinite' : 'none',
            }}>
              {entry.message}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Filler messages when LLM is thinking silently ──────────────
const FILLER_POOL = {
  Classify: [
    'Reading the question carefully...',
    'Figuring out what kind of analysis this needs...',
    'Identifying the key entities and intent...',
  ],
  Research: [
    'Exploring table relationships and join paths...',
    'Hmm, checking if there are any tricky column names...',
    'Mapping out which tables hold the data we need...',
    'Cross-referencing schema details...',
    'This requires some careful schema navigation...',
  ],
  'SQL Write': [
    'Thinking about the best way to structure this query...',
    'Considering the right aggregation approach...',
    'Working through the WHERE clause logic...',
    'Choosing between a few different SQL strategies...',
    'Piecing together the SELECT columns...',
    'Making sure the GROUP BY is correct...',
  ],
  Validate: [
    'Reviewing the query for logical consistency...',
    'Checking column references against the schema...',
    'Making sure the filters are scoped correctly...',
    'Running a syntax check...',
  ],
  Execute: [
    'Waiting for the database to return results...',
    'Query is running — this one might take a moment...',
    'Processing the result set...',
  ],
  Present: [
    'Analyzing the results for key patterns...',
    'Crafting a clear summary of what the data shows...',
    'Pulling out the most important insights...',
  ],
  _generic: [
    'Still working on this...',
    'Thinking through the details...',
    'Almost there, just a bit more...',
    'Considering the best approach here...',
  ],
};

// ─── ThinkingBubble (main) ──────────────────────────────────────
export default function ThinkingBubble({
  steps = [],
  thinkingEntries = [],
  startTime,
  activeTools = [],
  isComplete = false,
}) {
  const [elapsed, setElapsed] = useState(0);
  const [fillers, setFillers] = useState([]);
  const fillerIdxRef = useRef(0);

  // Tick elapsed every 200ms while running
  useEffect(() => {
    if (!startTime || isComplete) return;
    const id = setInterval(() => setElapsed((Date.now() - startTime) / 1000), 200);
    return () => clearInterval(id);
  }, [startTime, isComplete]);

  // Freeze elapsed on completion
  useEffect(() => {
    if (isComplete && startTime) setElapsed((Date.now() - startTime) / 1000);
  }, [isComplete, startTime]);

  // Clear fillers on completion or when real entries arrive
  useEffect(() => {
    if (isComplete) setFillers([]);
  }, [isComplete]);

  useEffect(() => {
    setFillers([]);
    fillerIdxRef.current = 0;
  }, [thinkingEntries.length]);

  const dotStatuses = useMemo(() => deriveDotStatuses(steps, isComplete), [steps, isComplete]);
  const completedCount = useMemo(() => countCompletedDots(steps), [steps]);

  // Inject filler messages during silent gaps
  const activeDot = dotStatuses.find(d => d.status === 'active');
  useEffect(() => {
    if (isComplete) return;
    const pool = (activeDot && FILLER_POOL[activeDot.label]) || FILLER_POOL._generic;
    const id = setInterval(() => {
      const msg = pool[fillerIdxRef.current % pool.length];
      fillerIdxRef.current++;
      setFillers(prev => [...prev, { message: msg }]);
    }, 4000);
    return () => clearInterval(id);
  }, [isComplete, activeDot?.label]);

  // Combine real entries + fillers for display
  const displayEntries = useMemo(() => {
    if (thinkingEntries.length === 0 && fillers.length === 0) {
      return [{ message: 'Reading your question and thinking about the best approach...' }];
    }
    return [...thinkingEntries, ...fillers];
  }, [thinkingEntries, fillers]);

  return (
    <div style={{
      padding: '12px 16px 8px',
      width: '100%',
    }}>
      <StepDotTrack dotStatuses={dotStatuses} />

      {/* Header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '2px 0',
        }}
      >
        {isComplete
          ? <Check size={14} style={{ color: '#10B981' }} />
          : <span style={{
              display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
              background: '#6366F1',
              animation: 'thinking-bubble-pulse 2s ease-in-out infinite',
            }} />
        }
        <span style={{
          fontSize: 13, fontWeight: 600,
          color: isComplete ? '#10B981' : '#4338CA',
        }}>
          {isComplete ? 'Completed' : 'Thinking'}
        </span>
        <span style={{
          fontSize: 11, color: 'rgba(100,80,160,0.5)',
          fontVariantNumeric: 'tabular-nums', marginLeft: 'auto',
        }}>
          {elapsed.toFixed(1)}s
        </span>
      </div>

      {/* Streaming reasoning */}
      <ReasoningWindow
        entries={displayEntries}
        isComplete={isComplete}
      />
    </div>
  );
}
