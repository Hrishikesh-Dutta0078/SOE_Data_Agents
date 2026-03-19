/**
 * GET /token    — proxy a short-lived Azure Speech Services auth token
 * GET /phrases  — return domain-specific phrases for speech recognition
 */

const express = require('express');
const https = require('https');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const router = express.Router();

const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || '';
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY || '';

/* ── Token cache (module-level) ─────────────────────────────────── */

let cachedToken = { token: null, expiresAt: 0 };

/**
 * Fetch a new token from Azure Speech Services.
 * Returns { token, expiresAt }.
 */
function fetchToken() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `${AZURE_SPEECH_REGION}.api.cognitive.microsoft.com`,
      path: '/sts/v1.0/issueToken',
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
        'Content-Length': '0',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          // Azure tokens are valid for 10 minutes
          const expiresAt = Date.now() + 10 * 60 * 1000;
          resolve({ token: body, expiresAt });
        } else {
          reject(new Error(`Azure token request failed with status ${res.statusCode}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

/* ── GET /token ─────────────────────────────────────────────────── */

router.get('/token', async (req, res) => {
  try {
    // Refresh if within 60 seconds of expiry (or no token yet)
    if (cachedToken.expiresAt - Date.now() < 60_000) {
      cachedToken = await fetchToken();
    }

    const userEmail = req.session?.user?.email || 'unknown';
    logger.info('Voice token issued', { user: userEmail });

    res.json({
      token: cachedToken.token,
      region: AZURE_SPEECH_REGION,
      expiresAt: cachedToken.expiresAt,
    });
  } catch (err) {
    logger.error('Voice token fetch failed', { error: err });
    res.status(503).json({ error: 'Voice service unavailable' });
  }
});

/* ── Phrases cache (module-level) ───────────────────────────────── */

let cachedPhrases = null;

const PHRASE_LIMIT = 500;

const SQL_KEYWORDS = [
  'GROUP BY', 'WHERE', 'JOIN', 'HAVING', 'ORDER BY',
  'SUM', 'COUNT', 'AVG', 'DISTINCT', 'LIKE',
  'BETWEEN', 'LEFT JOIN', 'INNER JOIN',
];

/**
 * Build the domain-specific phrase list from knowledge files.
 */
function buildPhrases() {
  const knowledgeDir = path.join(__dirname, '..', 'context', 'knowledge');
  const phrases = new Set();

  // 1. Table names from schema-knowledge.json (top-level keys)
  try {
    const schema = JSON.parse(fs.readFileSync(path.join(knowledgeDir, 'schema-knowledge.json'), 'utf8'));
    for (const tableName of Object.keys(schema)) {
      phrases.add(tableName);
    }

    // 3. Column names (deduplicated) — collected here but added after KPI abbreviations
    const columnNames = new Set();
    for (const tableObj of Object.values(schema)) {
      if (tableObj.columns && typeof tableObj.columns === 'object') {
        for (const colName of Object.keys(tableObj.columns)) {
          columnNames.add(colName);
        }
      }
    }

    // 2. KPI abbreviations and their full names from definitions.json
    try {
      const definitions = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'context', 'definitions.json'), 'utf8'));
      if (definitions.abbreviations && typeof definitions.abbreviations === 'object') {
        for (const [abbr, fullName] of Object.entries(definitions.abbreviations)) {
          phrases.add(abbr);
          phrases.add(fullName);
        }
      }
    } catch (_) {
      // definitions.json not available — continue
    }

    // Now add column names (priority 3)
    for (const colName of columnNames) {
      phrases.add(colName);
    }
  } catch (_) {
    // schema-knowledge.json not available — continue
  }

  // 4. Business terms from business-rules.md
  try {
    const businessContext = fs.readFileSync(path.join(knowledgeDir, 'business-rules.md'), 'utf8');

    // Capitalized multi-word terms
    const multiWordRegex = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g;
    const multiWordMatches = businessContext.match(multiWordRegex) || [];
    for (const term of multiWordMatches) {
      phrases.add(term);
    }

    // All-caps acronyms
    const acronymRegex = /\b[A-Z]{2,}\b/g;
    const acronymMatches = businessContext.match(acronymRegex) || [];
    for (const acronym of acronymMatches) {
      phrases.add(acronym);
    }
  } catch (_) {
    // business-context.md not available — continue
  }

  // 5. SQL keywords
  for (const keyword of SQL_KEYWORDS) {
    phrases.add(keyword);
  }

  // Slice to limit
  return [...phrases].slice(0, PHRASE_LIMIT);
}

/* ── GET /phrases ───────────────────────────────────────────────── */

router.get('/phrases', (_req, res) => {
  try {
    if (!cachedPhrases) {
      cachedPhrases = buildPhrases();
    }
    res.json({ phrases: cachedPhrases });
  } catch (err) {
    logger.error('Failed to build voice phrases', { error: err });
    res.json({ phrases: [] });
  }
});

module.exports = router;
