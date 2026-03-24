/**
 * SqlAgent Node — The autonomous core.
 *
 * A ReAct agent with 13 tools that autonomously decides what to research
 * (search schema, check column values, look up business rules) and when
 * it has enough context to write SQL.
 */

const { createReactAgent } = require('@langchain/langgraph/prebuilt');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');
const { DynamicStructuredTool } = require('@langchain/core/tools');
const { getModel } = require('../../config/llm');
const { SQL_AGENT_MAX_ITERATIONS, SQL_AGENT_TIMEOUT_MS, SQL_AGENT_TIMEOUT_COMPLEX_MS } = require('../../config/constants');
const logger = require('../../utils/logger');

const searchSchema = require('../../tools/searchSchema');
const searchExamples = require('../../tools/searchExamples');
const searchBusinessRules = require('../../tools/searchBusinessRules');
const getJoinRulesTool = require('../../tools/getJoinRules');
const queryDistinctValues = require('../../tools/queryDistinctValues');
const verifyJoin = require('../../tools/verifyJoin');
const getColumnMetadata = require('../../tools/getColumnMetadata');
const sampleTableData = require('../../tools/sampleTableData');
const dryRunSql = require('../../tools/dryRunSql');
const checkNullRatio = require('../../tools/checkNullRatio');
const getCurrentFiscalPeriod = require('../../tools/getCurrentFiscalPeriod');
const searchSessionMemoryMod = require('../../tools/searchSessionMemory');
const submitSql = require('../../tools/submitSql');

const ALL_TOOLS = [
  searchSchema, searchExamples, searchBusinessRules,
  getJoinRulesTool, queryDistinctValues, verifyJoin, getColumnMetadata,
  sampleTableData, dryRunSql, checkNullRatio, getCurrentFiscalPeriod,
  searchSessionMemoryMod.tool || searchSessionMemoryMod,
  submitSql,
];

function stableStringify(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

function parseSubmitSqlPayload(content) {
  if (!content) return { sql: '', reasoning: '' };
  if (typeof content === 'object') {
    return {
      sql: typeof content.sql === 'string' ? content.sql : '',
      reasoning: typeof content.reasoning === 'string' ? content.reasoning : '',
    };
  }
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      return {
        sql: typeof parsed.sql === 'string' ? parsed.sql : '',
        reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
      };
    } catch {
      return { sql: content, reasoning: '' };
    }
  }
  return { sql: '', reasoning: '' };
}

function buildToolCallDedupKey(toolCall, msg) {
  if (toolCall.id) return `id:${toolCall.id}`;
  const msgId = msg?.id ? `msg:${msg.id}` : '';
  return `${msgId}|${toolCall.name}|${stableStringify(toolCall.args || {})}`;
}

function buildToolResultDedupKey(msg) {
  if (msg.tool_call_id) return `${msg.name}|${msg.tool_call_id}`;
  if (msg.id) return `${msg.name}|${msg.id}`;
  const preview = typeof msg.content === 'string'
    ? msg.content.substring(0, 240)
    : stableStringify(msg.content);
  return `${msg.name}|${preview}`;
}

function createMemoizedTools(cacheStats) {
  const toolCache = new Map();
  return ALL_TOOLS.map((tool) => new DynamicStructuredTool({
    name: tool.name,
    description: tool.description,
    schema: tool.schema,
    func: async (args) => {
      const cacheKey = `${tool.name}|${stableStringify(args || {})}`;
      if (toolCache.has(cacheKey)) {
        cacheStats.hits += 1;
        logger.debug('SqlAgent tool cache hit', { tool: tool.name });
        return toolCache.get(cacheKey);
      }
      cacheStats.misses += 1;
      const result = await tool.func(args);
      toolCache.set(cacheKey, result);
      return result;
    },
  }));
}

const { buildAgentSystemPrompt } = require('../../prompts/sqlAgent');

function extractAgentOutput(result) {
  const toolCalls = [];
  const seenToolCalls = new Set();
  let sql = '';
  let reasoning = '';

  const messages = result.messages || [];

  for (const msg of messages) {
    if (msg.tool_calls?.length > 0) {
      for (const tc of msg.tool_calls) {
        const key = `${tc.id || ''}|${tc.name}|${stableStringify(tc.args || {})}`;
        if (seenToolCalls.has(key)) continue;
        seenToolCalls.add(key);
        toolCalls.push({ name: tc.name, args: tc.args });
      }
    }

    if (msg.name === 'submit_sql' && msg.content) {
      const parsed = parseSubmitSqlPayload(msg.content);
      sql = parsed.sql || '';
      reasoning = parsed.reasoning || '';
    }
  }

  if (!sql) {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.content && typeof lastMsg.content === 'string') {
      const fenceMatch = lastMsg.content.match(/```(?:sql)?\s*([\s\S]*?)```/i);
      if (fenceMatch) {
        sql = fenceMatch[1].trim();
        reasoning = lastMsg.content.replace(fenceMatch[0], '').trim();
      }
    }
  }

  return { sql, reasoning, toolCalls };
}

const EventEmitter = require('events');
const _toolEvents = new EventEmitter();

async function sqlAgentNode(state) {
  const start = Date.now();
  const attempts = { ...state.attempts, agent: (state.attempts?.agent || 0) + 1 };

  logger.stage('2', 'SqlAgent', `Autonomous SQL generation (attempt ${attempts.agent})`);

  const model = getModel({
    temperature: 0,
    maxTokens: 4096,
    nodeKey: 'sqlAgent',
    profile: state.useFastModel === true ? 'haiku' : state.useFastModel === false ? 'opus' : undefined,
  });
  const systemPrompt = buildAgentSystemPrompt(state);
  const cacheStats = { hits: 0, misses: 0 };
  const memoizedTools = createMemoizedTools(cacheStats);

  const agent = createReactAgent({
    llm: model,
    tools: memoizedTools,
    stateModifier: new SystemMessage(systemPrompt),
  });

  const timeoutMs = state.complexity === 'COMPLEX' ? SQL_AGENT_TIMEOUT_COMPLEX_MS : SQL_AGENT_TIMEOUT_MS;
  let result;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const stream = await agent.stream({
        messages: [new HumanMessage(state.question)],
      }, { recursionLimit: SQL_AGENT_MAX_ITERATIONS * 2, signal: controller.signal, streamMode: 'updates' });

      let toolCallCount = 0;
      let lastAgentState = null;
      const seenToolCallKeys = new Set();
      const seenToolResultKeys = new Set();
      const toolIndexByCallId = new Map();
      let submittedSqlDetected = false;

      for await (const chunk of stream) {
        lastAgentState = chunk;

        const msgs = chunk.messages || [];
        for (const msg of msgs) {
          if (msg.tool_calls?.length > 0) {
            for (const tc of msg.tool_calls) {
              const callDedupKey = buildToolCallDedupKey(tc, msg);
              if (seenToolCallKeys.has(callDedupKey)) {
                continue;
              }
              seenToolCallKeys.add(callDedupKey);
              toolCallCount++;
              if (tc.id) {
                toolIndexByCallId.set(tc.id, toolCallCount);
              }
              logger.info(`🔧 Tool [${toolCallCount}]: ${tc.name}`, { args: JSON.stringify(tc.args).substring(0, 120) });
              _toolEvents.emit('tool_call', {
                name: tc.name,
                index: toolCallCount,
                attempt: attempts.agent,
                callId: tc.id || '',
                sessionId: state.sessionId || '',
              });
            }
          }
          if (msg.name && msg.content) {
            const resultDedupKey = buildToolResultDedupKey(msg);
            if (seenToolResultKeys.has(resultDedupKey)) {
              continue;
            }
            seenToolResultKeys.add(resultDedupKey);
            const preview = typeof msg.content === 'string' ? msg.content.substring(0, 80) : '';
            logger.debug(`   ↳ ${msg.name} result`, { preview });
            const resultIndex = msg.tool_call_id
              ? (toolIndexByCallId.get(msg.tool_call_id) || toolCallCount)
              : toolCallCount;
            _toolEvents.emit('tool_result', {
              name: msg.name,
              index: resultIndex,
              attempt: attempts.agent,
              callId: msg.tool_call_id || '',
              sessionId: state.sessionId || '',
            });

            if (msg.name === 'submit_sql') {
              const parsed = parseSubmitSqlPayload(msg.content);
              if (parsed.sql) {
                submittedSqlDetected = true;
              }
            }
          }
        }

        if (submittedSqlDetected) {
          logger.debug('SqlAgent stream stopped early after submit_sql');
          break;
        }
      }

      result = lastAgentState;
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    const msg = isTimeout ? `Agent timed out after ${timeoutMs / 1000}s` : err.message;
    logger.error(isTimeout ? 'SqlAgent timed out' : 'SqlAgent failed', { error: msg });
    return {
      sql: '',
      reasoning: `Agent error: ${msg}`,
      agentToolCalls: [],
      attempts,
      trace: [{ node: 'sqlAgent', timestamp: start, duration: Date.now() - start, error: msg }],
    };
  }

  const { sql, reasoning, toolCalls } = extractAgentOutput(result);
  const duration = Date.now() - start;

  logger.info('SqlAgent complete', {
    toolCalls: toolCalls.length,
    sqlChars: sql.length,
    durationMs: duration,
    cacheHits: cacheStats.hits,
    cacheMisses: cacheStats.misses,
  });
  if (reasoning) {
    logger.info('SqlAgent reasoning:\n' + reasoning);
  }

  return {
    sql,
    reasoning,
    agentToolCalls: toolCalls,
    attempts,
    trace: [{
      node: 'sqlAgent',
      timestamp: start,
      duration,
      toolCallCount: toolCalls.length,
      toolNames: toolCalls.map((tc) => tc.name),
      cacheHits: cacheStats.hits,
      cacheMisses: cacheStats.misses,
      decision: sql ? 'submitted SQL' : 'no SQL produced',
    }],
  };
}

module.exports = { sqlAgentNode, toolEvents: _toolEvents };
