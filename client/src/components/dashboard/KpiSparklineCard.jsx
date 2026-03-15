import React from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

function computeKpiValue(data, config) {
  const { valueColumn, aggregation = 'sum', prefix = '', suffix = '' } = config || {};
  if (!valueColumn || !Array.isArray(data) || data.length === 0) return config?.value ?? '\u2014';

  const nums = data.map((r) => Number(r[valueColumn])).filter((n) => !isNaN(n));
  if (nums.length === 0) return config?.value ?? '\u2014';

  let result;
  switch (aggregation) {
    case 'avg': result = nums.reduce((a, b) => a + b, 0) / nums.length; break;
    case 'count': result = nums.length; break;
    case 'min': result = Math.min(...nums); break;
    case 'max': result = Math.max(...nums); break;
    default: result = nums.reduce((a, b) => a + b, 0);
  }

  const formatted = Math.abs(result) >= 1e6
    ? `${(result / 1e6).toFixed(1)}M`
    : Math.abs(result) >= 1e3
      ? `${(result / 1e3).toFixed(1)}K`
      : result.toLocaleString(undefined, { maximumFractionDigits: 2 });

  return `${prefix}${formatted}${suffix}`;
}

export default function KpiSparklineCard({ config, data }) {
  const { delta, trend, sparklineKey, sparklineData } = config || {};

  const displayValue = computeKpiValue(data, config);

  const trendColor = trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#64748b';
  const trendArrow = trend === 'up' ? '\u25B2' : trend === 'down' ? '\u25BC' : '\u25CF';

  const sparkPoints = sparklineData
    || (sparklineKey && Array.isArray(data)
      ? data.map((row) => ({ value: Number(row[sparklineKey]) || 0 }))
      : []);

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-3">
      <div className="text-3xl font-bold text-stone-900 tracking-tight">
        {displayValue}
      </div>
      {delta && (
        <div className="mt-1 flex items-center gap-1 text-sm font-semibold" style={{ color: trendColor }}>
          <span>{trendArrow}</span>
          <span>{delta}</span>
        </div>
      )}
      {sparkPoints.length > 1 && (
        <div className="mt-2 w-full h-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkPoints} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`spark-${trend}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={trendColor} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={trendColor} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={trendColor}
                strokeWidth={1.5}
                fill={`url(#spark-${trend})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
