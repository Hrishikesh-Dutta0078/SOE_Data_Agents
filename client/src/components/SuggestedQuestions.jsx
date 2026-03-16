import React from 'react';

const SUGGESTIONS = [
  { icon: '\u{1F4CA}', text: 'Show me pipeline by region', category: 'Pipeline' },
  { icon: '\u{1F3AF}', text: 'What deals are likely to close this quarter?', category: 'Deals' },
  { icon: '\u{1F4C8}', text: 'How is pipeline coverage trending?', category: 'Coverage' },
  { icon: '\u26A0\uFE0F', text: 'Which deals have stalled?', category: 'Risk' },
  { icon: '\u{1F465}', text: 'Who are my top performing reps?', category: 'Team' },
  { icon: '\u{1F50D}', text: '/pipeline-hygiene', category: 'Blueprint' },
];

export default function SuggestedQuestions({ onSelect }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="text-lg font-semibold text-stone-700 mb-1">What would you like to know?</div>
      <div className="text-[13px] text-stone-400 mb-6">Ask a question about your sales data, or try one of these:</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.text}
            onClick={() => onSelect(s.text)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left text-[13px] text-stone-600 hover:text-stone-900 cursor-pointer transition-all hover:scale-[1.01] bg-transparent border-none"
            style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(231,229,228,0.5)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}
          >
            <span className="text-base">{s.icon}</span>
            <span>{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
