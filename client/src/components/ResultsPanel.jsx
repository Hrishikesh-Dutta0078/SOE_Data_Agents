import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
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
  const chartsToRender = chart?.charts?.filter((c) => VALID_TYPES.has(c.chartType)) ?? [];

  if (chartsToRender.length === 0) {
    return (
      <div className="p-6 text-center text-stone-400 text-[13px]">
        {chart?.reasoning || 'No chart available for this data.'}
      </div>
    );
  }

  return (
    <div className="w-full max-h-[1200px] overflow-y-auto">
      {chartsToRender.map((cfg, idx) => (
        <SingleChart key={idx} config={cfg} rows={rows} colorIndex={idx} />
      ))}
    </div>
  );
}

function TableView({ columns, rows }) {
  if (!columns || columns.length === 0) {
    return <div className="p-6 text-center text-stone-400 text-[13px]">No data to display.</div>;
  }

  return (
    <>
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
    <div className="border border-stone-200 rounded-[12px] overflow-hidden mb-2">
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

export default function ResultsPanel({ execution, insights, chart, queries = [] }) {
  const [activeTab, setActiveTab] = useState('insights');
  const isMultiQuery = queries.length > 1;

  const hasCharts = chart?.charts?.some((c) => VALID_TYPES.has(c.chartType)) ?? false;

  const tabs = useMemo(() => {
    const t = [];
    if (insights) t.push({ id: 'insights', label: 'Insights' });
    if (hasCharts) t.push({ id: 'chart', label: 'Charts' });
    if (isMultiQuery) {
      t.push({ id: 'subqueries', label: `Sub-Queries (${queries.length})` });
    } else if (execution?.rows?.length > 0) {
      t.push({ id: 'table', label: 'Table' });
    }
    return t;
  }, [insights, hasCharts, execution, isMultiQuery, queries.length]);

  if (tabs.length === 0) return null;

  const currentTab = tabs.find((t) => t.id === activeTab) ? activeTab : tabs[0]?.id;

  return (
    <div className="mt-3 border border-stone-200 rounded-[16px] overflow-hidden bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="flex gap-1 p-1 m-3 mb-0 bg-stone-100 rounded-[10px]">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`
              flex-1 text-center px-3 py-1.5 text-xs font-medium cursor-pointer transition-all
              ${currentTab === t.id
                ? 'text-stone-900 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] rounded-[8px] font-semibold'
                : 'text-stone-500 bg-transparent hover:text-stone-700 rounded-[8px]'
              }
            `}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {currentTab === 'insights' && insights && (
          <div className="text-[13px] leading-relaxed text-stone-700">
            <ReactMarkdown>{insights}</ReactMarkdown>
          </div>
        )}

        {currentTab === 'chart' && (
          <ChartsView chart={chart} rows={execution?.rows || []} />
        )}

        {currentTab === 'table' && (
          <TableView
            columns={execution?.columns || []}
            rows={execution?.rows || []}
          />
        )}

        {currentTab === 'subqueries' && (
          <div>
            {queries.map((q, i) => (
              <SubQuerySection key={q.id || i} query={q} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
