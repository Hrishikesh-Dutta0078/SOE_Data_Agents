'use strict';

function formatValue(num, prefix, suffix) {
  const formatted = Math.abs(num) >= 1e6
    ? `${(num / 1e6).toFixed(1)}M`
    : Math.abs(num) >= 1e3
      ? `${(num / 1e3).toFixed(1)}K`
      : num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return `${prefix || ''}${formatted}${suffix || ''}`;
}

function buildTileData(spec, profiles) {
  const result = {};

  for (const tile of spec.tiles) {
    const profile = profiles[tile.sourceIndex];
    if (!profile) {
      result[tile.id] = null;
      continue;
    }

    const pre = profile.preComputed || {};

    if (tile.type === 'kpi') {
      const col = tile.config?.valueColumn;
      const agg = tile.config?.aggregation || 'sum';
      const kpiData = pre.kpiAggregates?.[col];
      if (!kpiData) {
        result[tile.id] = null;
        continue;
      }
      const value = kpiData[agg] ?? kpiData.sum;
      result[tile.id] = {
        value,
        formatted: formatValue(value, tile.config?.prefix, tile.config?.suffix),
        sparklinePoints: pre.sparklineData || [],
      };
    } else if (tile.type === 'chart') {
      const groupBy = tile.config?.groupBy;
      const yKey = Array.isArray(tile.config?.yAxis) ? tile.config.yAxis[0]?.key || tile.config.yAxis[0] : null;
      const aggKey = groupBy && yKey ? `${groupBy}__${yKey}` : null;
      const rows = aggKey ? pre.groupedAggregates?.[aggKey] : null;
      result[tile.id] = { rows: rows || null };
    } else if (tile.type === 'insight') {
      result[tile.id] = { markdown: tile.config?.markdown || '' };
    } else {
      result[tile.id] = null;
    }
  }

  return result;
}

module.exports = { buildTileData };
