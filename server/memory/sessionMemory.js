/**
 * Session memory store.
 *
 * Primary storage is now the LangGraph checkpointer (MemorySaver),
 * which persists full workflow state per thread_id.
 *
 * This module provides a lightweight in-memory overlay for
 * per-session query/correction history that the agent tools can search.
 * It's populated by the route handler after each completed run.
 */

const sessions = new Map();

function getSession(sessionId) {
  return sessions.get(sessionId) ?? null;
}

function setSession(sessionId, data) {
  sessions.set(sessionId, data);
}

function updateSession(sessionId, updates) {
  const existing = sessions.get(sessionId) ?? {
    queryHistory: [],
    correctionHistory: [],
  };
  const merged = {
    ...existing,
    ...updates,
    queryHistory: updates.queryHistory ?? existing.queryHistory,
    correctionHistory: updates.correctionHistory ?? existing.correctionHistory,
  };
  sessions.set(sessionId, merged);
  return merged;
}

function addQueryToSession(sessionId, query) {
  const session = getSession(sessionId) ?? {
    queryHistory: [],
    correctionHistory: [],
  };
  const queryHistory = [...(session.queryHistory || []), query];
  updateSession(sessionId, { queryHistory });
}

function addCorrectionToSession(sessionId, correction) {
  const session = getSession(sessionId) ?? {
    queryHistory: [],
    correctionHistory: [],
  };
  const correctionHistory = [...(session.correctionHistory || []), correction];
  updateSession(sessionId, { correctionHistory });
}

function clearSession(sessionId) {
  sessions.delete(sessionId);
}

module.exports = {
  getSession,
  setSession,
  updateSession,
  addQueryToSession,
  addCorrectionToSession,
  clearSession,
};
