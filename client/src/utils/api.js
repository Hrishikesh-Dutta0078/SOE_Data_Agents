const BASE_URL = '';

export async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && typeof window !== 'undefined') {
    window.location.href = '/login';
    throw new Error('Not authenticated');
  }
  if (!res.ok) {
    const error = new Error(data.error || `Request failed (${res.status})`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

export function checkHealth() {
  return request('/api/health');
}

export function searchImpersonate(query, limit = 10) {
  if (!query || String(query).trim().length < 2) return Promise.resolve([]);
  const q = encodeURIComponent(String(query).trim());
  return request(`/api/impersonate/search?q=${q}&limit=${limit}`);
}

export function analyzeQuestion(
  question,
  conversationHistory = [],
  previousEntities = null,
  resolvedQuestions = [],
  { impersonateContext = null, validationEnabled = true, sessionId, isFollowUp = false, enabledTools = null, nodeModelOverrides } = {},
) {
  const payload = { question, conversationHistory, previousEntities, resolvedQuestions, impersonateContext, validationEnabled, isFollowUp };
  payload.enabledTools = enabledTools ?? null;
  if (nodeModelOverrides && Object.keys(nodeModelOverrides).length > 0) payload.nodeModelOverrides = nodeModelOverrides;
  const headers = {};
  if (sessionId) headers['x-session-id'] = sessionId;
  return request('/api/text-to-sql/analyze', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
}

export async function analyzeQuestionStream(
  question,
  conversationHistory = [],
  previousEntities = null,
  resolvedQuestions = [],
  onEvent,
  { impersonateContext = null, validationEnabled = true, sessionId, isFollowUp = false, previousDashboardSpec = null, dashboardDataSources = null, enabledTools = null, nodeModelOverrides } = {},
) {
  const payload = { question, conversationHistory, previousEntities, resolvedQuestions, impersonateContext, validationEnabled, isFollowUp };
  payload.enabledTools = enabledTools ?? null;
  if (previousDashboardSpec) {
    payload.previousDashboardSpec = previousDashboardSpec;
    payload.dashboardDataSources = dashboardDataSources || [];
  }
  if (nodeModelOverrides && Object.keys(nodeModelOverrides).length > 0) payload.nodeModelOverrides = nodeModelOverrides;
  const headers = { 'Content-Type': 'application/json' };
  if (sessionId) headers['x-session-id'] = sessionId;

  const res = await fetch(`${BASE_URL}/api/text-to-sql/analyze-stream`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(payload),
  });

  if (res.status === 401 && typeof window !== 'undefined') {
    window.location.href = '/login';
    throw new Error('Not authenticated');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult = null;
  let currentEvent = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith('data: ') && currentEvent) {
        try {
          const parsed = JSON.parse(line.slice(6));
          if (currentEvent === 'done') {
            finalResult = parsed;
          } else if (currentEvent === 'error') {
            throw new Error(parsed.error || 'Stream error');
          }
          if (onEvent) onEvent(currentEvent, parsed);
        } catch (e) {
          if (e.message !== 'Stream error' && !e.message.startsWith('Stream error')) {
            /* ignore parse errors for partial chunks */
          } else {
            throw e;
          }
        }
        currentEvent = null;
      } else if (line === '') {
        currentEvent = null;
      }
    }
  }

  return finalResult;
}

export function fetchBlueprints() {
  return request('/api/text-to-sql/blueprints');
}

export function fetchDashboardPage(sql, page = 1, pageSize = 50) {
  return request('/api/text-to-sql/dashboard-data', {
    method: 'POST',
    body: JSON.stringify({ mode: 'page', sql, page, pageSize }),
  });
}

export function fetchSlicerValues(sql, columns) {
  return request('/api/text-to-sql/dashboard-data', {
    method: 'POST',
    body: JSON.stringify({ mode: 'distinct', sql, columns }),
  });
}
