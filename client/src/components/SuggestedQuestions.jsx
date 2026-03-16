import React, { useState, useEffect, useRef, useCallback } from 'react';

const FACTS = [
  "Did you know? Auto Agents uses a 7-node LangGraph pipeline — Classify → Research → Write → Validate → Execute → Check → Present.",
  "Did you know? The Research Agent has 6 tools including schema discovery, null-ratio checks, and session memory search.",
  "Did you know? Every SQL query is validated 3 ways — syntax dry-run, schema check, and LLM semantic review.",
  "Did you know? Failed queries auto-correct up to 3 times before giving up — most fix themselves on the first retry.",
  "Did you know? Complex questions get decomposed into parallel sub-queries that stream results as each one completes.",
  "Did you know? The Classify node detects intent, extracts entities, and matches against verified gold templates in under 50ms.",
  "Did you know? Row-Level Security is injected after SQL is written — your data access is enforced automatically.",
  "Did you know? Auto Agents tracks token usage per-node with cost estimates — full transparency on every query.",
  "Did you know? Dashboard mode builds interactive tile specs with charts, KPIs, and slicers — all from a single question.",
  "Did you know? The system supports 19 agent tools across research and SQL writing — fully autonomous, no human SQL needed.",
  "Did you know? Empty results trigger an automatic diagnosis that can rewrite and retry the query with adjusted filters.",
  "Did you know? Blueprint queries use pre-verified templates that skip research entirely — results in under 5 seconds.",
  "Did you know? All inputs are sanitized against SQL injection — malicious payloads are stripped before they reach any agent.",
  "Did you know? Helmet.js enforces strict HTTP security headers — XSS, clickjacking, and MIME sniffing are blocked by default.",
  "Did you know? Rate limiting is applied per-user with custom thresholds — brute force and abuse attempts are automatically throttled.",
  "Did you know? Okta OAuth 2.0 with PKCE flow handles authentication — no passwords are stored, tokens are verified server-side.",
  "Did you know? 11 dedicated security test suites run on every build — covering injection, auth bypass, header hardening, and more.",
  "Did you know? HTTPS with TLS is enforced for all connections — even local development uses self-signed certificates.",
  "Did you know? Session secrets are environment-isolated — credentials never appear in code, logs, or client bundles.",
];

const SUGGESTIONS = [
  { icon: '📊', text: 'Pipeline by region' },
  { icon: '🎯', text: 'Deals likely to close' },
  { icon: '📈', text: 'Pipeline coverage trend' },
  { icon: '⚠️', text: 'Stalled deals' },
  { icon: '👥', text: 'Top performing reps' },
  { icon: '🔍', text: '/pipeline-hygiene' },
];

function Typewriter({ facts, pauseMs = 10000, typeSpeed = 28, deleteSpeed = 12 }) {
  const [display, setDisplay] = useState('');
  const idxRef = useRef(0);
  const charRef = useRef(0);
  const deletingRef = useRef(false);
  const timerRef = useRef(null);

  const tick = useCallback(() => {
    const text = facts[idxRef.current];
    if (!deletingRef.current) {
      charRef.current++;
      setDisplay(text.substring(0, charRef.current));
      if (charRef.current === text.length) {
        timerRef.current = setTimeout(() => { deletingRef.current = true; tick(); }, pauseMs);
        return;
      }
      timerRef.current = setTimeout(tick, typeSpeed);
    } else {
      charRef.current--;
      setDisplay(text.substring(0, charRef.current));
      if (charRef.current === 0) {
        deletingRef.current = false;
        idxRef.current = (idxRef.current + 1) % facts.length;
        timerRef.current = setTimeout(tick, 400);
        return;
      }
      timerRef.current = setTimeout(tick, deleteSpeed);
    }
  }, [facts, pauseMs, typeSpeed, deleteSpeed]);

  useEffect(() => {
    timerRef.current = setTimeout(tick, 800);
    return () => clearTimeout(timerRef.current);
  }, [tick]);

  return <>{display}<span className="typewriter-cursor" /></>;
}

export default function SuggestedQuestions({ onSelect, renderInput }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4" style={{ animation: 'fade-in-up 0.6s 0.3s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
      {/* Adobe Logo */}
      <div className="relative mb-5" style={{ animation: 'fade-in-up 0.6s 0.3s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
        <div className="absolute -inset-6 rounded-full" style={{ background: 'radial-gradient(circle, rgba(235,16,0,0.06) 0%, transparent 70%)', animation: 'logo-glow-pulse 4s ease-in-out infinite' }} />
        <svg width="90" height="80" viewBox="0 0 1551 1375" style={{ animation: 'logo-float 4s ease-in-out infinite', filter: 'drop-shadow(0 4px 12px rgba(235,16,0,0.15))' }}>
          <path d="m576.5 0.4h403.6l570.4 1374.6h-426.7l-360.5-912.8-238.4 598.9h283.4l112.9 313.9h-921.2z" fill="#EB1000"/>
        </svg>
      </div>

      {/* Welcome heading */}
      <div className="text-[28px] font-bold tracking-tight mb-1.5" style={{ color: 'var(--color-text-primary)', animation: 'fade-in-up 0.6s 0.45s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
        How can I help you today?
      </div>

      {/* Typewriter subtitle */}
      <div
        className="text-[14px] text-center mb-8 w-full overflow-hidden"
        style={{ color: 'var(--color-text-muted)', maxWidth: 520, height: 44, animation: 'fade-in-up 0.6s 0.55s cubic-bezier(0.16, 1, 0.3, 1) both' }}
      >
        <Typewriter facts={FACTS} />
      </div>

      {/* Input bar slot */}
      {renderInput && renderInput()}

      {/* Suggestion chips */}
      <div className="flex flex-wrap justify-center gap-2 w-full" style={{ maxWidth: 600 }}>
        {SUGGESTIONS.map((s, i) => (
          <button
            key={s.text}
            onClick={() => onSelect(s.text)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[20px] text-[13px] cursor-pointer transition-all border-none whitespace-nowrap hover:translate-y-[-2px]"
            style={{
              background: 'var(--glass-bg-light)',
              border: '1px solid var(--color-border-light)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'inherit',
              animation: `chip-pop 0.4s ${0.8 + i * 0.08}s cubic-bezier(0.16, 1, 0.3, 1) both`,
            }}
          >
            <span className="text-[14px]">{s.icon}</span>
            {s.text}
          </button>
        ))}
      </div>
    </div>
  );
}
