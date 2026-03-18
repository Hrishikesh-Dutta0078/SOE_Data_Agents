/**
 * LLM configuration — routes calls to Opus (quality) or Haiku (fast) via Azure AI Foundry.
 */

const { ChatAnthropic } = require('@langchain/anthropic');
const { InMemoryCache } = require('@langchain/core/caches');
const logger = require('../utils/logger');
const {
  LLM_DEFAULT_TEMPERATURE,
  LLM_DEFAULT_MAX_TOKENS,
  MODEL_PROFILES,
} = require('./constants');

const _sharedCache = new InMemoryCache();
const MODEL_META_KEY = '__modelMeta';

// --- Per-request token tracker (reset per request via route handlers) ---
const _usage = { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, calls: 0, llmMs: 0 };
const _llmStartTimes = new Map();
const _usageByNodeAndModel = {};

function toTokenCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

function resetUsage() {
  _usage.inputTokens = 0;
  _usage.cachedInputTokens = 0;
  _usage.outputTokens = 0;
  _usage.calls = 0;
  _usage.llmMs = 0;
  _llmStartTimes.clear();
  for (const key of Object.keys(_usageByNodeAndModel)) delete _usageByNodeAndModel[key];
}

function recordUsage(promptTokens, completionTokens, cachedInputTokens = 0) {
  _usage.inputTokens += toTokenCount(promptTokens);
  _usage.cachedInputTokens += toTokenCount(cachedInputTokens);
  _usage.outputTokens += toTokenCount(completionTokens);
  _usage.calls += 1;
}

function getUsage() {
  return { ..._usage };
}

function recordUsageWithContext(promptTokens, completionTokens, cachedInputTokens, nodeKey, profile) {
  if (!nodeKey || !profile) return;
  const p = String(profile).toLowerCase();
  if (!_usageByNodeAndModel[nodeKey]) _usageByNodeAndModel[nodeKey] = {};
  if (!_usageByNodeAndModel[nodeKey][p]) {
    _usageByNodeAndModel[nodeKey][p] = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, totalTokens: 0 };
  }
  const u = _usageByNodeAndModel[nodeKey][p];
  const inp = toTokenCount(promptTokens);
  const out = toTokenCount(completionTokens);
  const cached = toTokenCount(cachedInputTokens);
  u.inputTokens += inp;
  u.outputTokens += out;
  u.cachedInputTokens += cached;
  u.totalTokens += inp + out;
}

function getUsageByNodeAndModel() {
  const out = {};
  for (const [nodeKey, byModel] of Object.entries(_usageByNodeAndModel)) {
    out[nodeKey] = {};
    for (const [profile, u] of Object.entries(byModel)) {
      out[nodeKey][profile] = { ...u };
    }
  }
  return out;
}

function getEnvValue(name, fallback = '') {
  if (!name) return fallback;
  const raw = process.env[name];
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  return fallback;
}

const FAST_NODE_KEYS = new Set([
  'sqlAgent', 'sqlWriterAgent',
]);

const SONNET_NODE_KEYS = new Set([
  'correct', 'presentChart',
]);

function resolveProfileName(opts) {
  if (opts.profile && MODEL_PROFILES[opts.profile]) return opts.profile;
  if (opts.nodeKey && FAST_NODE_KEYS.has(opts.nodeKey)) return 'haiku';
  if (opts.nodeKey && SONNET_NODE_KEYS.has(opts.nodeKey)) return 'sonnet';
  return 'opus';
}

function resolveRuntimeConfig(opts = {}) {
  const profileName = resolveProfileName(opts);
  const profile = MODEL_PROFILES[profileName];
  return {
    profileName,
    provider: 'anthropic',
    modelName: opts.modelName || getEnvValue(profile.modelNameEnv, profile.defaultModelName),
    endpoint: opts.endpoint || getEnvValue(profile.endpointEnv),
    apiKey: opts.apiKey || getEnvValue(profile.apiKeyEnv),
  };
}

function extractTokenUsageFromLlmOutput(output) {
  const usage = output?.llmOutput?.tokenUsage || output?.llmOutput?.usage || {};
  return {
    promptTokens: toTokenCount(
      usage.promptTokens
      ?? usage.prompt_tokens
      ?? usage.inputTokens
      ?? usage.input_tokens
    ),
    completionTokens: toTokenCount(
      usage.completionTokens
      ?? usage.completion_tokens
      ?? usage.outputTokens
      ?? usage.output_tokens
    ),
  };
}

function extractTokenUsageFromGenerations(output) {
  const queue = Array.isArray(output?.generations) ? [...output.generations] : [];
  let promptTokens = 0;
  let completionTokens = 0;

  while (queue.length > 0) {
    const item = queue.shift();
    if (Array.isArray(item)) {
      queue.unshift(...item);
      continue;
    }

    const usage =
      item?.message?.usage_metadata
      || item?.message?.response_metadata?.tokenUsage
      || item?.message?.response_metadata?.usage
      || {};

    promptTokens = Math.max(
      promptTokens,
      toTokenCount(
        usage.input_tokens
        ?? usage.promptTokens
        ?? usage.prompt_tokens
        ?? usage.inputTokens
      ),
    );
    completionTokens = Math.max(
      completionTokens,
      toTokenCount(
        usage.output_tokens
        ?? usage.completionTokens
        ?? usage.completion_tokens
        ?? usage.outputTokens
      ),
    );
  }

  return { promptTokens, completionTokens };
}

function extractCachedInputTokens(output) {
  const queue = Array.isArray(output?.generations) ? [...output.generations] : [];
  let maxCachedTokens = 0;

  while (queue.length > 0) {
    const item = queue.shift();
    if (Array.isArray(item)) {
      queue.unshift(...item);
      continue;
    }

    const cached =
      item?.message?.usage_metadata?.input_token_details?.cache_read
      ?? item?.message?.response_metadata?.usage?.cache_read_input_tokens;

    if (cached != null) {
      maxCachedTokens = Math.max(maxCachedTokens, toTokenCount(cached));
    }
  }

  return maxCachedTokens;
}

function extractUsageFromOutput(output) {
  const llmUsage = extractTokenUsageFromLlmOutput(output);
  const generationUsage = extractTokenUsageFromGenerations(output);

  return {
    promptTokens: Math.max(llmUsage.promptTokens, generationUsage.promptTokens),
    completionTokens: Math.max(llmUsage.completionTokens, generationUsage.completionTokens),
    cachedInputTokens: extractCachedInputTokens(output),
  };
}

function recordLLMDuration(runId) {
  if (!runId) return;
  const start = _llmStartTimes.get(runId);
  _llmStartTimes.delete(runId);
  if (typeof start === 'number') {
    _usage.llmMs += Date.now() - start;
  }
}

/** Create callbacks with nodeKey/profile in closure so each model instance records to the correct bucket */
function usageCallbacks(nodeKey, profile) {
  return [
    {
      handleChatModelStart(_llm, _messages, runId) {
        if (runId) _llmStartTimes.set(runId, Date.now());
      },
      handleLLMStart(_llm, _prompts, runId) {
        if (runId) _llmStartTimes.set(runId, Date.now());
      },
      handleLLMEnd(output, runId) {
        recordLLMDuration(runId);
        const usage = extractUsageFromOutput(output);
        if (usage.promptTokens || usage.completionTokens || usage.cachedInputTokens) {
          recordUsage(usage.promptTokens, usage.completionTokens, usage.cachedInputTokens);
          if (nodeKey && profile) {
            recordUsageWithContext(usage.promptTokens, usage.completionTokens, usage.cachedInputTokens, nodeKey, profile);
          }
        }
      },
      handleLLMError(_err, runId) {
        _llmStartTimes.delete(runId);
      },
    },
  ];
}

function buildModelMeta(opts, runtime) {
  return {
    nodeKey: opts.nodeKey || null,
    profile: runtime.profileName || 'opus',
    provider: runtime.provider,
    modelName: runtime.modelName || null,
  };
}

function attachModelMeta(model, modelMeta) {
  if (model && modelMeta) {
    model[MODEL_META_KEY] = modelMeta;
  }
  return model;
}

function getModelMeta(model) {
  if (!model) return null;
  return model[MODEL_META_KEY] || null;
}

function getModel(opts = {}) {
  const maxTokens = opts.maxTokens ?? LLM_DEFAULT_MAX_TOKENS;
  const requestedTemp = opts.temperature ?? LLM_DEFAULT_TEMPERATURE;
  const timeout = opts.timeout ?? 60000;
  const maxRetries = opts.maxRetries ?? 3;

  const runtime = resolveRuntimeConfig(opts);
  const modelMeta = buildModelMeta(opts, runtime);
  const callbacks = usageCallbacks(opts.nodeKey, modelMeta.profile);

  const modelOpts = {
    anthropicApiKey: runtime.apiKey,
    anthropicApiUrl: runtime.endpoint,
    modelName: runtime.modelName,
    temperature: requestedTemp,
    maxTokens,
    clientOptions: { timeout, maxRetries },
    callbacks,
  };

  if (opts.cache) {
    modelOpts.cache = _sharedCache;
  }

  const model = attachModelMeta(new ChatAnthropic(modelOpts), modelMeta);

  // Azure Foundry Anthropic rejects -1 sent by defaults.
  model.topP = undefined;
  model.topK = undefined;
  return model;
}

/**
 * Quick LLM connectivity check using the default model route.
 */
async function pingLLM() {
  const model = getModel({ maxTokens: 5 });
  const response = await model.invoke([{ role: 'user', content: 'ping' }]);
  return response.content ?? '';
}

module.exports = {
  getModel,
  getModelMeta,
  resetUsage,
  getUsage,
  getUsageByNodeAndModel,
  recordUsage,
  pingLLM,
};
