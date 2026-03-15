const {
  COST_PER_1M_INPUT_TOKENS,
  COST_PER_1M_CACHED_INPUT_TOKENS,
  COST_PER_1M_OUTPUT_TOKENS,
} = require('../config/constants');

const TOKENS_PER_MILLION = 1000000;

function toSafeInt(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

function buildUsageSnapshot(rawUsage = {}, opts = {}) {
  const inputTokens = toSafeInt(rawUsage.inputTokens);
  const cachedInputTokens = Math.min(toSafeInt(rawUsage.cachedInputTokens), inputTokens);
  const outputTokens = toSafeInt(rawUsage.outputTokens);
  const calls = toSafeInt(rawUsage.calls);

  const billableInputTokens = Math.max(inputTokens - cachedInputTokens, 0);
  const totalTokens = inputTokens + outputTokens;

  const inputCostUsd = (billableInputTokens / TOKENS_PER_MILLION) * COST_PER_1M_INPUT_TOKENS;
  const cachedInputCostUsd = (cachedInputTokens / TOKENS_PER_MILLION) * COST_PER_1M_CACHED_INPUT_TOKENS;
  const outputCostUsd = (outputTokens / TOKENS_PER_MILLION) * COST_PER_1M_OUTPUT_TOKENS;
  const estimatedCostUsd = inputCostUsd + cachedInputCostUsd + outputCostUsd;

  const usage = {
    inputTokens,
    cachedInputTokens,
    billableInputTokens,
    outputTokens,
    totalTokens,
    calls,
    estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)),
    estimatedCostBreakdownUsd: {
      input: Number(inputCostUsd.toFixed(6)),
      cachedInput: Number(cachedInputCostUsd.toFixed(6)),
      output: Number(outputCostUsd.toFixed(6)),
    },
  };

  if (typeof opts.duration === 'number') {
    usage.duration = opts.duration;
  }

  return usage;
}

/** Normalize per-node, per-model usage for the client. Ensures researchAgent and sqlWriterAgent have opus/haiku keys. */
function buildUsageBreakdown(rawByNodeAndModel = {}) {
  const nodes = ['researchAgent', 'sqlWriterAgent'];
  const models = ['opus', 'haiku'];
  const out = {};
  for (const nodeKey of nodes) {
    out[nodeKey] = {};
    const byModel = rawByNodeAndModel[nodeKey] || {};
    for (const model of models) {
      const u = byModel[model];
      const inputTokens = u?.inputTokens ?? 0;
      const outputTokens = u?.outputTokens ?? 0;
      const totalTokens = u?.totalTokens ?? inputTokens + outputTokens;
      out[nodeKey][model] = { inputTokens, outputTokens, totalTokens };
    }
  }
  return out;
}

module.exports = { buildUsageSnapshot, buildUsageBreakdown };
