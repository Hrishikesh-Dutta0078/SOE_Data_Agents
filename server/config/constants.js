/**
 * Application-wide constants and defaults.
 */

const MODEL_PROFILES = Object.freeze({
  opus: Object.freeze({
    provider: 'anthropic',
    modelNameEnv: 'AZURE_ANTHROPIC_MODEL_NAME',
    defaultModelName: 'claude-opus-4-6-2',
    endpointEnv: 'AZURE_ANTHROPIC_ENDPOINT',
    apiKeyEnv: 'AZURE_ANTHROPIC_API_KEY',
  }),
  sonnet: Object.freeze({
    provider: 'anthropic',
    modelNameEnv: 'AZURE_ANTHROPIC_SONNET_MODEL_NAME',
    defaultModelName: 'claude-sonnet-4-6',
    endpointEnv: 'AZURE_ANTHROPIC_SONNET_ENDPOINT',
    apiKeyEnv: 'AZURE_ANTHROPIC_SONNET_API_KEY',
  }),
  haiku: Object.freeze({
    provider: 'anthropic',
    modelNameEnv: 'AZURE_ANTHROPIC_HAIKU_MODEL_NAME',
    defaultModelName: 'claude-haiku-4-5',
    endpointEnv: 'AZURE_ANTHROPIC_HAIKU_ENDPOINT',
    apiKeyEnv: 'AZURE_ANTHROPIC_HAIKU_API_KEY',
  }),
});

module.exports = {
  DEFAULT_PORT: 5000,

  // --- Database ---
  DB_REQUEST_TIMEOUT: 60000, // 1 minute query timeout
  DB_CONNECTION_TIMEOUT: 15000,
  DB_POOL_MIN: 2,
  DB_POOL_MAX: 10,
  DB_POOL_IDLE_TIMEOUT: 30000,

  // --- LLM (Claude via Azure AI Foundry) ---
  LLM_DEFAULT_TEMPERATURE: 0,
  LLM_DEFAULT_MAX_TOKENS: 4096,

  // --- Agent Limits ---
  SQL_AGENT_TIMEOUT_MS: 180000,
  SQL_AGENT_TIMEOUT_COMPLEX_MS: 300000,
  MAX_CORRECTION_ROUNDS: 2,
  /** Correction attempts per failed sub-query in the parallel pipeline (1–2 recommended for latency). */
  PARALLEL_CORRECTION_ROUNDS: 2,
  MAX_RESULT_RETRIES: 2,

  // --- Query Execution ---
  QUERY_RESULT_ROW_LIMIT: 100,
  INSIGHT_SAMPLE_ROWS: 50,
  CHART_SAMPLE_ROWS: 20,

  // --- LLM Tuning Per Node ---
  CLASSIFY_MAX_TOKENS: 1500,
  CLASSIFY_TEMPERATURE: 0,
  CORRECT_MAX_TOKENS: 4096,
  CORRECT_TEMPERATURE: 0,
  SEMANTIC_VALIDATOR_MAX_TOKENS: 1500,
  SEMANTIC_VALIDATOR_TEMPERATURE: 0,
  INSIGHT_MAX_TOKENS: 2048,
  INSIGHT_TEMPERATURE: 0.3,
  CHART_MAX_TOKENS: 1500,
  CHART_TEMPERATURE: 0,
  DECOMPOSE_MAX_TOKENS: 1500,
  DECOMPOSE_TEMPERATURE: 0,
  MAX_SUB_QUERIES: 4,
  SUB_QUERY_MATCH_THRESHOLD: 0.4,
  SUB_QUERY_LLM_MATCH_MAX_TOKENS: 512,
  SUB_QUERY_LLM_MATCH_TEMPERATURE: 0,
  DASHBOARD_MAX_TOKENS: 4096,
  DASHBOARD_TEMPERATURE: 0,
  DASHBOARD_DB_TIMEOUT: 180000,

  // --- Model ---
  MODEL_PROFILES,

  // --- Cost Tracking (estimated USD per 1M tokens — Claude Opus via Azure) ---
  COST_PER_1M_INPUT_TOKENS: 15,
  COST_PER_1M_CACHED_INPUT_TOKENS: 1.875,
  COST_PER_1M_OUTPUT_TOKENS: 75,

  COST_RATES: Object.freeze({
    opus:   Object.freeze({ input: 15,   cachedInput: 1.875, output: 75 }),
    sonnet: Object.freeze({ input: 3,    cachedInput: 0.375, output: 15 }),
    haiku:  Object.freeze({ input: 0.80, cachedInput: 0.10,  output: 4 }),
  }),
};
