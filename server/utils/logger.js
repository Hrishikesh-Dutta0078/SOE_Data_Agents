/**
 * Minimal console logger with timing support.
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const CURRENT_LEVEL = LEVELS[process.env.LOG_LEVEL || 'info'];

const ICONS = { debug: '·', info: '▸', warn: '⚠', error: '✖' };

function ts() {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

/** Flatten object to "key: value" string for logging (one level, no recursion). */
function flattenObject(obj) {
  const parts = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    const s = typeof v === 'object' ? (typeof v.message === 'string' ? v.message : JSON.stringify(v)) : String(v);
    if (s && s !== '[object Object]') parts.push(`${k}: ${s}`);
  }
  return parts.length ? parts.join('; ') : '';
}

/** Turn a value (often object) into a single string for error messages. */
function toErrorString(obj) {
  if (obj == null) return '';
  if (typeof obj === 'string') return obj === '[object Object]' ? '' : obj;
  if (typeof obj !== 'object') return String(obj);
  if (obj instanceof Error) {
    const fromOriginal = obj.originalError != null ? toErrorString(obj.originalError) : '';
    if (fromOriginal) return fromOriginal;
    const fromMsg = toErrorString(obj.message);
    if (fromMsg) return fromMsg;
    if (typeof obj.message === 'object' && obj.message !== null) return flattenObject(obj.message);
    return obj.name || 'Error';
  }
  if (obj.originalError != null) return toErrorString(obj.originalError);
  const msg = obj.message ?? obj.msg ?? obj.description ?? obj.error;
  if (msg != null) {
    const s = toErrorString(msg);
    if (s) return s;
  }
  if (typeof obj.code === 'string') return obj.code;
  for (const val of Object.values(obj)) {
    if (typeof val === 'string' && val.length > 0 && val !== '[object Object]') return val;
  }
  const flat = flattenObject(obj);
  if (flat) return flat;
  try {
    const j = JSON.stringify(obj);
    if (j && j !== '{}') return j;
  } catch (_) {}
  return Object.prototype.toString.call(obj);
}

/** Remove "[object Object]" from error stack first line so logs are readable. */
function sanitizeStack(stack) {
  if (typeof stack !== 'string') return stack;
  return stack.replace(/^(\w+Error): \[object Object\]/m, '$1');
}

/** Turn any thrown/error-like value into a readable string for logs. */
function stringifyValue(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v !== 'object') return String(v);
  // Error-like: use originalError first (e.g. mssql ConnectionError wraps driver error)
  if (v instanceof Error) {
    const msg =
      toErrorString(v.originalError) ||
      toErrorString(v.message) ||
      (typeof v.code === 'string' ? v.code : '') ||
      v.name ||
      'Error';
    const stack = v.stack ? sanitizeStack(v.stack) : '';
    return stack ? `${msg} | ${stack}` : msg;
  }
  if (v && typeof v.message === 'string') return v.message;
  if (v && typeof v.code === 'string') return `[${v.code}] ${toErrorString(v.message || v.msg)}`.trim();
  return toErrorString(v);
}

function fmt(meta) {
  if (!meta || Object.keys(meta).length === 0) return '';
  const parts = [];
  for (const [k, v] of Object.entries(meta)) {
    if (v === null || v === undefined || v === '') continue;
    const s = stringifyValue(v);
    if (!s) continue;
    parts.push(`${k}=${s.length > 8000 ? s.substring(0, 7997) + '...' : s}`);
  }
  return parts.length ? `  ${parts.join('  ')}` : '';
}

function log(level, msg, meta) {
  if (LEVELS[level] < CURRENT_LEVEL) return;
  const line = `${ts()} ${ICONS[level]} ${msg}${fmt(meta)}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

function stage(number, name, detail) {
  if (LEVELS.info < CURRENT_LEVEL) return;
  const d = detail ? ` — ${detail}` : '';
  console.log(`${ts()} ── ${number}. ${name}${d} ──`);
}

function startTimer(label) {
  const start = Date.now();
  return (meta) => {
    const ms = Date.now() - start;
    log('info', `${label} (${ms}ms)`, meta);
    return ms;
  };
}

module.exports = {
  debug: (msg, meta) => log('debug', msg, meta),
  info:  (msg, meta) => log('info', msg, meta),
  warn:  (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
  stage,
  startTimer,
};
