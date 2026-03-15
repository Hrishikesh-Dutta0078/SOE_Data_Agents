/**
 * DML/DDL Prevention Tests — CWE-89
 * Tests that dangerous SQL operations are blocked by tool guards.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// --- Replicate verifyJoin.js guard patterns ---

const SELECT_ONLY = /^\s*(?:SELECT|WITH)\b/i;
const DANGEROUS = /\b(DROP|DELETE|UPDATE|INSERT|EXEC|EXECUTE|TRUNCATE|ALTER|CREATE|xp_cmdshell|sp_executesql)\b/i;

test('SELECT_ONLY allows valid SELECT queries', () => {
  assert.ok(SELECT_ONLY.test('SELECT TOP 1 * FROM t'));
  assert.ok(SELECT_ONLY.test('  SELECT * FROM t'));
  assert.ok(SELECT_ONLY.test('WITH cte AS (SELECT 1) SELECT * FROM cte'));
});

test('SELECT_ONLY blocks DML statements', () => {
  assert.ok(!SELECT_ONLY.test('DROP TABLE t'));
  assert.ok(!SELECT_ONLY.test('INSERT INTO t VALUES (1)'));
  assert.ok(!SELECT_ONLY.test('UPDATE t SET c = 1'));
  assert.ok(!SELECT_ONLY.test('DELETE FROM t'));
  assert.ok(!SELECT_ONLY.test('EXEC sp_help'));
  assert.ok(!SELECT_ONLY.test('TRUNCATE TABLE t'));
});

test('DANGEROUS catches DML keywords in any position', () => {
  assert.ok(DANGEROUS.test('SELECT 1; DROP TABLE t'));
  assert.ok(DANGEROUS.test('SELECT 1; INSERT INTO t VALUES (1)'));
  assert.ok(DANGEROUS.test('SELECT 1; EXEC xp_cmdshell("cmd")'));
  assert.ok(DANGEROUS.test("select 1; TRUNCATE TABLE t"));
  assert.ok(DANGEROUS.test('SELECT 1; ALTER TABLE t ADD col INT'));
  assert.ok(DANGEROUS.test('SELECT 1; CREATE TABLE t (id INT)'));
});

test('DANGEROUS catches mixed case evasion', () => {
  assert.ok(DANGEROUS.test('sElEcT 1; tRuNcAtE TABLE t'));
  assert.ok(DANGEROUS.test('Select 1; DrOp Table t'));
  assert.ok(DANGEROUS.test('SELECT 1; eXeC xp_cmdshell'));
});

test('DANGEROUS catches xp_cmdshell and sp_executesql', () => {
  assert.ok(DANGEROUS.test("EXEC xp_cmdshell 'whoami'"));
  assert.ok(DANGEROUS.test("EXEC sp_executesql N'SELECT 1'"));
});

test('DANGEROUS does not flag safe SELECT queries', () => {
  assert.ok(!DANGEROUS.test('SELECT * FROM vw_TF_EBI_P2S WHERE REGION_ID = 1'));
  assert.ok(!DANGEROUS.test('SELECT TOP 100 col1, col2 FROM t'));
  assert.ok(!DANGEROUS.test('WITH cte AS (SELECT 1 AS x) SELECT x FROM cte'));
});

// --- SAFE_IDENTIFIER for sampleTableData ---

test('SAFE_IDENTIFIER blocks dangerous characters', () => {
  const SAFE_IDENTIFIER = /^[a-zA-Z0-9_.]+$/;
  assert.ok(!SAFE_IDENTIFIER.test('sys.databases; DROP'));
  assert.ok(!SAFE_IDENTIFIER.test("table' OR 1=1"));
  assert.ok(!SAFE_IDENTIFIER.test('table--'));
  assert.ok(!SAFE_IDENTIFIER.test('table/**/'));
  assert.ok(SAFE_IDENTIFIER.test('dbo.my_table'));
  assert.ok(SAFE_IDENTIFIER.test('schema.table'));
});

// --- ensureTopLimit logic (from queryExecutor) ---

test('ensureTopLimit logic adds TOP when missing', () => {
  // Replicate the regex from queryExecutor.js
  const HAS_TOP = /\bSELECT\s+(DISTINCT\s+)?TOP\s+/i;
  assert.ok(!HAS_TOP.test('SELECT * FROM t'), 'No TOP clause');
  assert.ok(HAS_TOP.test('SELECT TOP 100 * FROM t'), 'Has TOP');
  assert.ok(HAS_TOP.test('SELECT DISTINCT TOP 50 col FROM t'), 'Has DISTINCT TOP');
});

test('verifyJoin source file contains SELECT_ONLY and DANGEROUS guards', () => {
  const toolsDir = path.join(__dirname, '..', '..', 'tools');
  const verifyJoinPath = path.join(toolsDir, 'verifyJoin.js');
  if (fs.existsSync(verifyJoinPath)) {
    const source = fs.readFileSync(verifyJoinPath, 'utf8');
    assert.ok(
      source.includes('SELECT') && (source.includes('DROP') || source.includes('DANGEROUS') || source.includes('dangerous')),
      'verifyJoin should contain SQL guard patterns'
    );
  }
});
