/**
 * Typed error classes for structured error handling across the pipeline.
 */

class PipelineError extends Error {
  constructor(message, { node, cause, details } = {}) {
    super(message);
    this.name = 'PipelineError';
    this.node = node;
    this.details = details;
    if (cause) this.cause = cause;
  }
}

class LLMError extends PipelineError {
  constructor(message, opts = {}) {
    super(message, opts);
    this.name = 'LLMError';
    this.retryable = opts.retryable ?? true;
    this.statusCode = opts.statusCode;
  }
}

class ValidationError extends PipelineError {
  constructor(message, opts = {}) {
    super(message, opts);
    this.name = 'ValidationError';
    this.errorType = opts.errorType;
    this.issues = opts.issues || [];
  }
}

class ExecutionError extends PipelineError {
  constructor(message, opts = {}) {
    super(message, opts);
    this.name = 'ExecutionError';
    this.sqlState = opts.sqlState;
    this.query = opts.query;
  }
}

class AgentTimeoutError extends PipelineError {
  constructor(message, opts = {}) {
    super(message, opts);
    this.name = 'AgentTimeoutError';
    this.timeoutMs = opts.timeoutMs;
    this.agent = opts.agent;
  }
}

class ResearchError extends PipelineError {
  constructor(message, opts = {}) {
    super(message, opts);
    this.name = 'ResearchError';
  }
}

function classifyError(err) {
  if (err instanceof PipelineError) return err;

  if (err.name === 'AbortError') {
    return new AgentTimeoutError(err.message, { cause: err });
  }

  const msg = err.message || '';

  if (msg.includes('429') || msg.includes('rate limit')) {
    return new LLMError(msg, { cause: err, retryable: true, statusCode: 429 });
  }
  if (msg.includes('503') || msg.includes('service unavailable')) {
    return new LLMError(msg, { cause: err, retryable: true, statusCode: 503 });
  }
  if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
    return new LLMError(msg, { cause: err, retryable: true });
  }

  return new PipelineError(msg, { cause: err });
}

module.exports = {
  PipelineError,
  LLMError,
  ValidationError,
  ExecutionError,
  AgentTimeoutError,
  ResearchError,
  classifyError,
};
