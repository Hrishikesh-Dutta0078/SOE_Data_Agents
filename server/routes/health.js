const express = require('express');
const router = express.Router();
const { pingLLM } = require('../config/llm');
const { getPool } = require('../config/database');

router.get('/', async (_req, res) => {
  const checks = { server: 'ok', database: 'unknown', llm: 'unknown' };

  try {
    await getPool();
    checks.database = 'ok';
  } catch (err) {
    checks.database = 'error';
  }

  try {
    await pingLLM();
    checks.llm = 'ok';
  } catch (err) {
    checks.llm = 'error';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');
  res.status(allOk ? 200 : 503).json(checks);
});

module.exports = router;
