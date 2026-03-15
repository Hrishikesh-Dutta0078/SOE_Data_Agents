import React from 'react';
import ReactMarkdown from 'react-markdown';

export default function InsightCard({ config }) {
  const { markdown } = config || {};

  if (!markdown) {
    return <div className="flex items-center justify-center h-full text-stone-400 text-sm">No insights</div>;
  }

  return (
    <div className="overflow-auto h-full px-3 py-2 text-[14px] text-stone-700 leading-relaxed prose prose-sm max-w-none">
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
}
