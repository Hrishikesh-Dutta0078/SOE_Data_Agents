import React, { useState, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, Download } from 'lucide-react';
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  AreaChart, Area,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = [
  '#6366F1', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444',
  '#06B6D4', '#F97316', '#EC4899', '#14B8A6', '#84CC16',
];

const VALID_TYPES = new Set(['bar', 'stacked_bar', 'line', 'pie', 'area', 'scatter']);

const tooltipStyle = {
  contentStyle: {
    background: '#ffffff',
    border: '1px solid #E7E5E4',
    borderRadius: 10,
    fontSize: 13,
    color: '#1C1917',
    boxShadow: '0 12px 32px rgba(0,0,0,0.08)',
    padding: '8px 12px',
  },
  itemStyle: { color: '#44403C' },
  labelStyle: { color: '#78716C', fontWeight: 600 },
};

function formatCellValue(val) {
  if (val === null || val === undefined) return '\u2014';
  if (typeof val === 'number') {
    if (Number.isInteger(val) && Math.abs(val) > 9999) return val.toLocaleString();
    if (!Number.isInteger(val)) return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return val.toLocaleString();
  }
  return String(val);
}

function toNum(v) {
  return typeof v === 'number' ? v : parseFloat(v) || 0;
}

function aggregateRows(rows, groupByKey, aggFn, yKeys) {
  const groups = {};
  for (const row of rows) {
    const gv = row[groupByKey];
    if (!groups[gv]) groups[gv] = { _rows: [] };
    groups[gv]._rows.push(row);
  }

  return Object.entries(groups).map(([key, g]) => {
    const out = { [groupByKey]: key };
    for (const yk of yKeys) {
      const vals = g._rows.map((r) => toNum(r[yk]));
      switch (aggFn) {
        case 'avg':
          out[yk] = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
          break;
        case 'count':
          out[yk] = vals.length;
          break;
        case 'min':
          out[yk] = Math.min(...vals);
          break;
        case 'max':
          out[yk] = Math.max(...vals);
          break;
        default:
          out[yk] = vals.reduce((a, b) => a + b, 0);
      }
    }
    return out;
  });
}

function pivotForSeries(rows, xKey, seriesKey, yKey, aggFn) {
  const buckets = {};
  const seriesVals = new Set();

  for (const row of rows) {
    const xv = row[xKey];
    const sv = String(row[seriesKey]);
    seriesVals.add(sv);
    if (!buckets[xv]) buckets[xv] = {};
    if (!buckets[xv][sv]) buckets[xv][sv] = [];
    buckets[xv][sv].push(toNum(row[yKey]));
  }

  const agg = (vals) => {
    if (!vals || vals.length === 0) return 0;
    switch (aggFn) {
      case 'avg': return vals.reduce((a, b) => a + b, 0) / vals.length;
      case 'count': return vals.length;
      case 'min': return Math.min(...vals);
      case 'max': return Math.max(...vals);
      default: return vals.reduce((a, b) => a + b, 0);
    }
  };

  const seriesKeys = [...seriesVals];
  const data = Object.entries(buckets).map(([xv, svMap]) => {
    const point = { [xKey]: xv };
    for (const sk of seriesKeys) {
      point[sk] = agg(svMap[sk]);
    }
    return point;
  });

  return { data, seriesKeys };
}

function prepareChartData(rows, config) {
  const xKey = config.xAxis?.key;
  const yKeys = config.yAxis?.map((y) => y.key) || [];
  if (!xKey || yKeys.length === 0) return { data: [], seriesKeys: [] };

  const hasSeries = config.series?.length > 0 && config.series[0]?.key;

  if (hasSeries) {
    const seriesKey = config.series[0].key;
    return pivotForSeries(rows, xKey, seriesKey, yKeys[0], config.aggregation || 'sum');
  }

  if (config.groupBy && config.aggregation) {
    const aggData = aggregateRows(rows, config.groupBy, config.aggregation, yKeys);
    return { data: aggData, seriesKeys: [] };
  }

  const data = rows.map((row) => {
    const point = { [xKey]: row[xKey] };
    for (const yk of yKeys) point[yk] = toNum(row[yk]);
    return point;
  });
  return { data, seriesKeys: [] };
}

function SingleChart({ config, rows, colorIndex }) {
  const xKey = config.xAxis?.key;
  const yKeys = config.yAxis?.map((y) => y.key) || [];
  if (!xKey || yKeys.length === 0) return null;

  const { data: chartData, seriesKeys } = prepareChartData(rows, config);
  if (chartData.length === 0) return null;

  const dataKeys = seriesKeys.length > 0 ? seriesKeys : yKeys;

  const renderChart = () => {
    const { chartType } = config;

    switch (chartType) {
      case 'bar':
      case 'stacked_bar':
        return (
          <BarChart data={chartData}>
            <CartesianGrid stroke="#F5F5F4" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: '#A8A29E' }} />
            <YAxis tick={{ fontSize: 12, fill: '#A8A29E' }} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {dataKeys.map((dk, i) => (
              <Bar
                key={dk}
                dataKey={dk}
                fill={COLORS[(colorIndex + i) % COLORS.length]}
                name={seriesKeys.length > 0 ? dk : (config.yAxis[i]?.label || dk)}
                stackId={chartType === 'stacked_bar' ? 'stack' : undefined}
                radius={[6, 6, 0, 0]}
              />
            ))}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart data={chartData}>
            <CartesianGrid stroke="#F5F5F4" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: '#A8A29E' }} />
            <YAxis tick={{ fontSize: 12, fill: '#A8A29E' }} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {dataKeys.map((dk, i) => (
              <Line
                key={dk}
                type="monotone"
                dataKey={dk}
                stroke={COLORS[(colorIndex + i) % COLORS.length]}
                name={seriesKeys.length > 0 ? dk : (config.yAxis[i]?.label || dk)}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            ))}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={chartData}>
            <CartesianGrid stroke="#F5F5F4" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12, fill: '#A8A29E' }} />
            <YAxis tick={{ fontSize: 12, fill: '#A8A29E' }} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {dataKeys.map((dk, i) => (
              <Area
                key={dk}
                type="monotone"
                dataKey={dk}
                stroke={COLORS[(colorIndex + i) % COLORS.length]}
                fill={COLORS[(colorIndex + i) % COLORS.length]}
                fillOpacity={0.15}
                name={seriesKeys.length > 0 ? dk : (config.yAxis[i]?.label || dk)}
              />
            ))}
          </AreaChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={chartData}
              dataKey={yKeys[0]}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              outerRadius={120}
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              labelLine={{ strokeWidth: 1 }}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        );

      case 'scatter':
        return (
          <ScatterChart>
            <CartesianGrid stroke="#F5F5F4" />
            <XAxis dataKey={xKey} name={config.xAxis?.label || xKey} tick={{ fontSize: 12, fill: '#A8A29E' }} />
            <YAxis dataKey={yKeys[0]} name={config.yAxis[0]?.label || yKeys[0]} tick={{ fontSize: 12, fill: '#A8A29E' }} />
            <Tooltip {...tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={chartData} fill={COLORS[colorIndex % COLORS.length]} name={config.yAxis[0]?.label || yKeys[0]} />
          </ScatterChart>
        );

      default:
        return <div className="p-6 text-center text-stone-400 text-[13px]">Unsupported chart type: {chartType}</div>;
    }
  };

  return (
    <div className="w-full py-2 mb-4">
      {config.title && (
        <div className="text-[13px] font-semibold text-slate-800 mb-3 text-center">{config.title}</div>
      )}
      <ResponsiveContainer width="100%" height={300}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}

function ChartsView({ chart, rows }) {
  const chartRef = useRef(null);
  const chartsToRender = chart?.charts?.filter((c) => VALID_TYPES.has(c.chartType)) ?? [];

  const handleDownload = async () => {
    if (!chartRef.current) return;
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(chartRef.current, { backgroundColor: '#ffffff', scale: 2 });
    const link = document.createElement('a');
    link.download = `chart-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  if (chartsToRender.length === 0) {
    return (
      <div className="p-6 text-center text-stone-400 text-[13px]">
        {chart?.reasoning || 'No chart available for this data.'}
      </div>
    );
  }

  return (
    <div className="relative">
      <button onClick={handleDownload} className="absolute top-0 right-0 p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer z-10" title="Download chart">
        <Download size={14} />
      </button>
      <div ref={chartRef} className="w-full max-h-[1200px] overflow-y-auto">
        {chartsToRender.map((cfg, idx) => (
          <SingleChart key={idx} config={cfg} rows={rows} colorIndex={idx} />
        ))}
      </div>
    </div>
  );
}

function TableView({ columns, rows }) {
  const handleExportExcel = async () => {
    const { utils, writeFile } = await import('xlsx');
    const ws = utils.json_to_sheet(rows, { header: columns });
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Results');
    writeFile(wb, `results-${Date.now()}.xlsx`);
  };

  const handleExportCsv = () => {
    const header = columns.join(',');
    const csvRows = rows.map(row => columns.map(col => {
      const val = row[col];
      if (val === null || val === undefined) return '';
      const str = String(val);
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(','));
    const csv = [header, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.download = `results-${Date.now()}.csv`;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  if (!columns || columns.length === 0) {
    return <div className="p-6 text-center text-stone-400 text-[13px]">No data to display.</div>;
  }

  return (
    <>
      <div className="flex justify-end gap-1 mb-2">
        <button onClick={handleExportExcel} className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-stone-500 hover:text-stone-700 rounded-md hover:bg-stone-100 cursor-pointer transition-colors bg-transparent border-none" title="Download as Excel">
          <Download size={12} /> Excel
        </button>
        <button onClick={handleExportCsv} className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-stone-500 hover:text-stone-700 rounded-md hover:bg-stone-100 cursor-pointer transition-colors bg-transparent border-none" title="Download as CSV">
          <Download size={12} /> CSV
        </button>
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="sticky top-0 px-3 py-2 text-left font-semibold text-[11px] uppercase tracking-wide text-stone-500 bg-stone-50 border-b border-stone-200 whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={`transition-colors hover:bg-stone-50/60 ${i % 2 !== 0 ? 'bg-stone-50/30' : ''}`}
              >
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-3 py-1.5 border-b border-stone-100 text-stone-700 whitespace-nowrap max-w-[300px] overflow-hidden text-ellipsis"
                  >
                    {formatCellValue(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-[11px] text-stone-400 text-right">
        {rows.length} row{rows.length !== 1 ? 's' : ''}
      </div>
    </>
  );
}

function SubQuerySection({ query, index }) {
  const [open, setOpen] = useState(index === 0);
  const exec = query.execution;
  const hasRows = exec?.success && exec?.rows?.length > 0;
  const hasSql = !!query.sql?.trim();

  return (
    <div className="rounded-[12px] overflow-hidden mb-2" style={{ border: '1px solid rgba(231,229,228,0.5)', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.03)' }}>
      <button
        className="w-full flex items-center justify-between px-3 py-2 bg-stone-50 hover:bg-stone-100 transition-colors cursor-pointer border-none text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-stone-400 bg-stone-100 rounded-[6px] px-1.5 py-0.5">
            Q{index + 1}
          </span>
          <span className="text-[12px] font-medium text-stone-700">{query.subQuestion}</span>
        </div>
        <div className="flex items-center gap-2">
          {exec?.success && (
            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              {exec.rowCount} rows
            </span>
          )}
          <span className="text-[10px] text-stone-400">{open ? 'collapse' : 'expand'}</span>
        </div>
      </button>
      {open && (hasSql || hasRows) && (
        <div className="p-3 border-t border-stone-200 space-y-3">
          {query.purpose && (
            <div className="text-[11px] text-stone-500 italic">{query.purpose}</div>
          )}
          {hasSql && (
            <div>
              <div className="text-[11px] font-semibold text-stone-500 mb-1">SQL</div>
              <pre className="p-3 bg-gray-900 text-gray-200 text-[11px] font-mono rounded-lg overflow-x-auto whitespace-pre-wrap break-words max-h-[300px] overflow-y-auto">
                {query.sql}
              </pre>
            </div>
          )}
          {hasRows && (
            <TableView columns={exec.columns || []} rows={exec.rows || []} />
          )}
        </div>
      )}
    </div>
  );
}

export default function ResultsPanel({ execution, insights, chart, queries = [], isPartial = false, confidence, retrySuggestions, onRetrySuggestion, sessionId, question, sql, zeroRowGuidance }) {
  const [activeTab, setActiveTab] = useState('insights');
  const [showDetail, setShowDetail] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const isMultiQuery = queries.length > 1;

  const insightSections = useMemo(() => {
    if (!insights) return { summary: '', detail: '' };
    const detailMarker = /^## Detailed Analysis/m;
    const match = insights.match(detailMarker);
    if (!match) return { summary: insights, detail: '' };
    const splitIdx = insights.indexOf(match[0]);
    return {
      summary: insights.substring(0, splitIdx).trim(),
      detail: insights.substring(splitIdx).trim(),
    };
  }, [insights]);

  // For multi-query results, fall back to the first successful sub-query's execution
  const primaryExec = execution
    || queries.find((q) => q.execution?.success && q.execution?.rows?.length > 0)?.execution;
  const primaryRows = primaryExec?.rows || [];

  const hasCharts = chart?.charts?.some((c) => VALID_TYPES.has(c.chartType)) ?? false;

  const tabs = useMemo(() => {
    const t = [];
    if (isPartial && queries.length > 0) {
      const completed = queries.filter((q) => q.execution?.success).length;
      t.push({ id: 'subqueries', label: `Results (${completed}/${queries.length} complete)` });
      return t;
    }
    if (insights) t.push({ id: 'insights', label: 'Insights' });
    if (hasCharts) t.push({ id: 'chart', label: 'Charts' });
    if (isMultiQuery) {
      t.push({ id: 'subqueries', label: `Sub-Queries (${queries.length})` });
      if (primaryRows.length > 0) {
        t.push({ id: 'table', label: 'Table' });
      }
    } else if (primaryRows.length > 0) {
      t.push({ id: 'table', label: 'Table' });
    }
    return t;
  }, [insights, hasCharts, execution, isMultiQuery, queries.length, primaryRows.length, isPartial]);

  if (tabs.length === 0) return null;

  const currentTab = tabs.find((t) => t.id === activeTab) ? activeTab : tabs[0]?.id;

  return (
    <div className="mt-3 rounded-[16px] overflow-hidden bg-white" style={{ border: '1px solid rgba(231,229,228,0.5)', boxShadow: 'var(--shadow-float)' }}>
      <div className="flex items-center gap-1 p-1 m-3 mb-0 rounded-[10px]" style={{ background: 'linear-gradient(135deg, #F5F5F4 0%, #EEF2FF 100%)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`
              flex-1 text-center px-3 py-1.5 text-xs font-medium cursor-pointer transition-all
              ${currentTab === t.id
                ? 'text-stone-900 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] rounded-[8px] font-semibold'
                : 'text-stone-500 bg-transparent hover:text-stone-700 rounded-[8px]'
              }
            `}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        {confidence && !isPartial && (
          <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
            confidence.level === 'high' ? 'bg-emerald-50 text-emerald-700' :
            confidence.level === 'medium' ? 'bg-amber-50 text-amber-700' :
            'bg-red-50 text-red-700'
          }`}>
            {confidence.level === 'high' ? 'High confidence' :
             confidence.level === 'medium' ? 'Moderate confidence' :
             'Low confidence — verify results'}
          </span>
        )}
      </div>

      <div className="p-4">
        {currentTab === 'insights' && insights && (
          <div className="relative">
            <button
              onClick={() => { navigator.clipboard.writeText(insights); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="absolute top-0 right-0 p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
              title="Copy insights"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            </button>
            <div className="text-[13px] leading-relaxed text-stone-700 pr-8">
              <ReactMarkdown>{insightSections.summary}</ReactMarkdown>
            </div>
            {insightSections.detail && (
              <>
                <button
                  onClick={() => setShowDetail(!showDetail)}
                  className="mt-2 text-[12px] font-medium text-indigo-500 hover:text-indigo-700 cursor-pointer transition-colors bg-transparent border-none p-0"
                >
                  {showDetail ? 'Show less' : 'Show detailed analysis'}
                </button>
                {showDetail && (
                  <div className="mt-3 pt-3 border-t border-stone-100 text-[13px] leading-relaxed text-stone-600">
                    <ReactMarkdown>{insightSections.detail}</ReactMarkdown>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {currentTab === 'chart' && (
          <ChartsView chart={chart} rows={primaryRows} />
        )}

        {currentTab === 'table' && (
          <TableView
            columns={primaryExec?.columns || []}
            rows={primaryRows}
          />
        )}

        {currentTab === 'subqueries' && (
          <div>
            {isPartial && (
              <div className="flex items-center gap-2 mb-3 px-2 py-1.5 text-[12px] text-indigo-600 bg-indigo-50/50 rounded-lg">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                Analyzing sub-queries...
              </div>
            )}
            {queries.map((q, i) => (
              <SubQuerySection key={q.id || i} query={q} index={i} />
            ))}
          </div>
        )}

        {retrySuggestions?.length > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50/50 border border-amber-100">
            <div className="text-[11px] font-semibold text-amber-700 mb-2">Try rephrasing:</div>
            <div className="flex flex-col gap-1.5">
              {retrySuggestions.map((s, i) => (
                <button key={i} onClick={() => onRetrySuggestion?.(s)}
                  className="text-left text-[12px] text-amber-800 hover:text-amber-950 px-2 py-1 rounded-lg hover:bg-amber-100/50 cursor-pointer transition-colors bg-transparent border-none">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {zeroRowGuidance && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50/50 border border-amber-100">
            <div className="text-[11px] font-semibold text-amber-700 mb-2">{zeroRowGuidance.message}</div>
            {zeroRowGuidance.suggestion && (
              <button onClick={() => onRetrySuggestion?.(zeroRowGuidance.suggestion)}
                className="text-left text-[12px] text-amber-800 hover:text-amber-950 px-2 py-1 rounded-lg hover:bg-amber-100/50 cursor-pointer transition-colors bg-transparent border-none">
                {zeroRowGuidance.suggestion}
              </button>
            )}
          </div>
        )}
      </div>

      {!isPartial && (
        <div className="flex items-center justify-end gap-1 px-4 pb-3 pt-1">
          <span className="text-[11px] text-stone-400 mr-1">Was this helpful?</span>
          <button onClick={() => {
            setFeedback('up');
            fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, question, sql, rating: 'up' }) }).catch(() => {});
          }}
            className={`p-1 rounded-md cursor-pointer transition-colors bg-transparent border-none ${feedback === 'up' ? 'text-emerald-500 bg-emerald-50' : 'text-stone-300 hover:text-emerald-500'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
          </button>
          <button onClick={() => {
            setFeedback('down');
            fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, question, sql, rating: 'down' }) }).catch(() => {});
          }}
            className={`p-1 rounded-md cursor-pointer transition-colors bg-transparent border-none ${feedback === 'down' ? 'text-red-500 bg-red-50' : 'text-stone-300 hover:text-red-500'}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}
