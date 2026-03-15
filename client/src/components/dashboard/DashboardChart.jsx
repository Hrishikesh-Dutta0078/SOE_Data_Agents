import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  AreaChart, Area,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { fetchDashboardPage } from '../../utils/api';

const COLORS = [
  '#0077B6', '#F4A261', '#2A9D8F', '#E76F51', '#6A4C93',
  '#17BEBB', '#E9C46A', '#264653', '#EF476F', '#06D6A0',
];

function RichTooltip({ active, payload, label, tooltipFields }) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload || {};
  const fields = tooltipFields?.length > 0 ? tooltipFields : Object.keys(row);

  return (
    <div className="bg-slate-800 text-slate-100 rounded-lg px-3 py-2 text-xs shadow-lg max-w-xs">
      {label && <div className="font-semibold text-slate-300 mb-1 text-[11px]">{label}</div>}
      <table className="w-full">
        <tbody>
          {fields.map((field) => {
            const val = row[field];
            if (val === undefined || val === null) return null;
            const formatted = typeof val === 'number'
              ? val.toLocaleString(undefined, { maximumFractionDigits: 2 })
              : String(val);
            return (
              <tr key={field}>
                <td className="pr-3 text-slate-400 whitespace-nowrap">{field}</td>
                <td className="font-semibold text-right">{formatted}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function toNum(v) {
  return typeof v === 'number' ? v : parseFloat(v) || 0;
}

function prepareData(data, config) {
  if (!Array.isArray(data) || data.length === 0) return [];
  const { aggregation, groupBy, xAxis } = config;
  const xKey = xAxis?.key;
  if (!xKey) return data;

  if (groupBy && aggregation) {
    const groups = {};
    for (const row of data) {
      const gv = row[groupBy];
      if (!groups[gv]) groups[gv] = { _rows: [] };
      groups[gv]._rows.push(row);
    }
    const yKeys = Array.isArray(config.yAxis) ? config.yAxis.map((y) => y.key || y) : [];
    return Object.entries(groups).map(([key, g]) => {
      const out = { [groupBy]: key };
      for (const yk of yKeys) {
        const vals = g._rows.map((r) => toNum(r[yk]));
        out[yk] = aggregation === 'avg'
          ? vals.reduce((a, b) => a + b, 0) / (vals.length || 1)
          : vals.reduce((a, b) => a + b, 0);
      }
      return out;
    });
  }

  return data;
}

function autoAggregate(data, xKey, yKeys) {
  const groups = {};
  for (const row of data) {
    const gv = String(row[xKey] ?? '');
    if (!groups[gv]) groups[gv] = { [xKey]: gv, _count: 0 };
    groups[gv]._count++;
    for (const yk of yKeys) {
      groups[gv][yk] = (groups[gv][yk] || 0) + (Number(row[yk]) || 0);
    }
  }
  return Object.values(groups);
}

function applyChartGuards(data, chartType, xKey, yKeys) {
  if (!Array.isArray(data) || data.length === 0) return data;

  const uniqueX = new Set(data.map((r) => r[xKey]));
  let result = data;

  if (chartType === 'pie') {
    if (uniqueX.size > 8) {
      result = autoAggregate(data, xKey, yKeys);
    }
    if (result.length > 8) {
      const sortKey = yKeys[0];
      result = [...result].sort((a, b) => toNum(b[sortKey]) - toNum(a[sortKey])).slice(0, 8);
    }
  } else if (chartType === 'bar' || chartType === 'stacked_bar') {
    if (uniqueX.size > 20) {
      result = autoAggregate(data, xKey, yKeys);
    }
    if (result.length > 20) {
      const sortKey = yKeys[0];
      result = [...result].sort((a, b) => toNum(b[sortKey]) - toNum(a[sortKey])).slice(0, 20);
    }
  } else if (chartType === 'line' || chartType === 'area') {
    if (result.length > 50) {
      const step = Math.ceil(result.length / 50);
      result = result.filter((_, i) => i % step === 0);
    }
  }

  if (result.length > 100) {
    result = result.slice(0, 100);
  }

  return result;
}

export default function DashboardChart({ config, data, sql }) {
  const {
    chartType = 'bar', xAxis, yAxis, series, tooltipFields,
  } = config || {};

  const [serverData, setServerData] = useState(null);
  const [loading, setLoading] = useState(false);

  const inMemoryEmpty = !Array.isArray(data) || data.length === 0;

  useEffect(() => {
    if (inMemoryEmpty && sql) {
      setLoading(true);
      fetchDashboardPage(sql, 1, 1000)
        .then((res) => setServerData(res.rows || []))
        .catch(() => setServerData(null))
        .finally(() => setLoading(false));
    }
  }, [inMemoryEmpty, sql]);

  const activeData = inMemoryEmpty && serverData ? serverData : data;

  const xKey = xAxis?.key || xAxis;
  const yKeys = Array.isArray(yAxis)
    ? yAxis.map((y) => (typeof y === 'string' ? y : y.key))
    : [typeof yAxis === 'string' ? yAxis : yAxis?.key].filter(Boolean);

  const rawChartData = prepareData(activeData, config);
  const chartData = applyChartGuards(rawChartData, chartType, xKey, yKeys);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        <svg className="animate-spin h-4 w-4 mr-2 text-slate-400" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading chart...
      </div>
    );
  }

  if (chartData.length === 0 || !xKey) {
    return <div className="flex items-center justify-center h-full text-slate-400 text-sm">No data</div>;
  }

  const customTooltip = <RichTooltip tooltipFields={tooltipFields} />;

  const commonProps = {
    data: chartData,
    margin: { top: 8, right: 16, bottom: 4, left: 8 },
  };

  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip content={customTooltip} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {yKeys.map((yk, i) => (
              <Line key={yk} type="monotone" dataKey={yk} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        );

      case 'pie': {
        const yKey = yKeys[0];
        return (
          <PieChart>
            <Pie data={chartData} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%" outerRadius="75%" label={{ fontSize: 11 }}>
              {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip content={customTooltip} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        );
      }

      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip content={customTooltip} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {yKeys.map((yk, i) => (
              <Area key={yk} type="monotone" dataKey={yk} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.15} />
            ))}
          </AreaChart>
        );

      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#64748b' }} name={xKey} />
            <YAxis dataKey={yKeys[0]} tick={{ fontSize: 11, fill: '#64748b' }} name={yKeys[0]} />
            <Tooltip content={customTooltip} />
            <Scatter data={chartData} fill={COLORS[0]} />
          </ScatterChart>
        );

      case 'stacked_bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip content={customTooltip} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {yKeys.map((yk, i) => (
              <Bar key={yk} dataKey={yk} stackId="stack" fill={COLORS[i % COLORS.length]} />
            ))}
          </BarChart>
        );

      default:
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
            <Tooltip content={customTooltip} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {yKeys.map((yk, i) => (
              <Bar key={yk} dataKey={yk} fill={COLORS[i % COLORS.length]} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        );
    }
  };

  return (
    <div className="w-full h-full p-1">
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}
