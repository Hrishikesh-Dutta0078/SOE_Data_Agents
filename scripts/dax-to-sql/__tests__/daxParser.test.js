/**
 * daxParser.test.js
 *
 * Tests for DAX expression parser
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  stripDaxComments,
  extractFunctionCall,
  splitTopLevelArgs,
  parseTableColumnRef,
  parseVarReturn,
  parseDaxExpression
} = require('../daxParser');

// ========== stripDaxComments ==========

test('stripDaxComments - removes --- line comments', () => {
  const input = '---comment\nSUM(x)';
  const expected = '\nSUM(x)';
  assert.equal(stripDaxComments(input), expected);
});

test('stripDaxComments - removes -- inline comments', () => {
  const input = 'x + y --note\n+ z';
  const expected = 'x + y \n+ z';
  assert.equal(stripDaxComments(input), expected);
});

test('stripDaxComments - handles multiple comment types', () => {
  const input = '---header\nCALCULATE(\n  SUM(x), --inline\n  y = 1\n)';
  const expected = '\nCALCULATE(\n  SUM(x), \n  y = 1\n)';
  assert.equal(stripDaxComments(input), expected);
});

test('stripDaxComments - handles no comments', () => {
  const input = 'SUM(x) + SUM(y)';
  assert.equal(stripDaxComments(input), input);
});

// ========== extractFunctionCall ==========

test('extractFunctionCall - extracts CALCULATE with nested parens', () => {
  const input = 'CALCULATE(SUM(x), a = 1)';
  const result = extractFunctionCall(input);
  assert.deepEqual(result, {
    name: 'CALCULATE',
    innerRaw: 'SUM(x), a = 1',
    rest: ''
  });
});

test('extractFunctionCall - extracts DIVIDE', () => {
  const input = 'DIVIDE(SUM(a), SUM(b))';
  const result = extractFunctionCall(input);
  assert.deepEqual(result, {
    name: 'DIVIDE',
    innerRaw: 'SUM(a), SUM(b)',
    rest: ''
  });
});

test('extractFunctionCall - handles nested braces', () => {
  const input = 'FILTER(Table, [x] IN {1, 2, 3})';
  const result = extractFunctionCall(input);
  assert.deepEqual(result, {
    name: 'FILTER',
    innerRaw: 'Table, [x] IN {1, 2, 3}',
    rest: ''
  });
});

test('extractFunctionCall - handles rest after function', () => {
  const input = 'SUM(x) + 1';
  const result = extractFunctionCall(input);
  assert.equal(result.name, 'SUM');
  assert.equal(result.innerRaw, 'x');
  assert.equal(result.rest, ' + 1');
});

test('extractFunctionCall - returns null for non-function', () => {
  const input = '[PIPE $] + 1';
  const result = extractFunctionCall(input);
  assert.equal(result, null);
});

test('extractFunctionCall - returns null for measure ref', () => {
  const input = '[Total Revenue]';
  const result = extractFunctionCall(input);
  assert.equal(result, null);
});

test('extractFunctionCall - handles function with no args', () => {
  const input = 'BLANK()';
  const result = extractFunctionCall(input);
  assert.deepEqual(result, {
    name: 'BLANK',
    innerRaw: '',
    rest: ''
  });
});

// ========== splitTopLevelArgs ==========

test('splitTopLevelArgs - splits simple args', () => {
  const input = 'a, b, c';
  const result = splitTopLevelArgs(input);
  assert.deepEqual(result, ['a', 'b', 'c']);
});

test('splitTopLevelArgs - respects parens', () => {
  const input = 'SUM(x), a = 1, b IN {1,2}';
  const result = splitTopLevelArgs(input);
  assert.deepEqual(result, ['SUM(x)', 'a = 1', 'b IN {1,2}']);
});

test('splitTopLevelArgs - respects nested parens and braces', () => {
  const input = 'CALCULATE(SUM(x), FILTER(T, [y] IN {1,2})), MAX(z)';
  const result = splitTopLevelArgs(input);
  assert.deepEqual(result, [
    'CALCULATE(SUM(x), FILTER(T, [y] IN {1,2}))',
    'MAX(z)'
  ]);
});

test('splitTopLevelArgs - handles empty string', () => {
  const result = splitTopLevelArgs('');
  assert.deepEqual(result, []);
});

test('splitTopLevelArgs - handles single arg', () => {
  const result = splitTopLevelArgs('SUM(x)');
  assert.deepEqual(result, ['SUM(x)']);
});

// ========== parseTableColumnRef ==========

test('parseTableColumnRef - parses quoted table name', () => {
  const input = "'Sales Stage'[SALES_STAGE_GROUP]";
  const result = parseTableColumnRef(input);
  assert.deepEqual(result, {
    table: 'Sales Stage',
    column: 'SALES_STAGE_GROUP'
  });
});

test('parseTableColumnRef - parses unquoted table name', () => {
  const input = 'Pipeline[OPPTY]';
  const result = parseTableColumnRef(input);
  assert.deepEqual(result, {
    table: 'Pipeline',
    column: 'OPPTY'
  });
});

test('parseTableColumnRef - handles spaces in brackets', () => {
  const input = 'Pipeline[ OPPTY_ID ]';
  const result = parseTableColumnRef(input);
  assert.deepEqual(result, {
    table: 'Pipeline',
    column: 'OPPTY_ID'
  });
});

test('parseTableColumnRef - returns null for standalone measure ref', () => {
  const input = '[PIPE $]';
  const result = parseTableColumnRef(input);
  assert.equal(result, null);
});

test('parseTableColumnRef - returns null for invalid format', () => {
  const input = 'SUM(x)';
  const result = parseTableColumnRef(input);
  assert.equal(result, null);
});

// ========== parseVarReturn ==========

test('parseVarReturn - parses single VAR', () => {
  const input = 'VAR x = 1\nRETURN x * 2';
  const result = parseVarReturn(input);
  assert.deepEqual(result, {
    vars: [{ name: 'x', expr: '1' }],
    returnExpr: 'x * 2'
  });
});

test('parseVarReturn - parses multiple VARs', () => {
  const input = 'VAR x = 1\nVAR y = x + 2\nRETURN y * 3';
  const result = parseVarReturn(input);
  assert.deepEqual(result, {
    vars: [
      { name: 'x', expr: '1' },
      { name: 'y', expr: 'x + 2' }
    ],
    returnExpr: 'y * 3'
  });
});

test('parseVarReturn - handles complex expressions', () => {
  const input = `VAR Total = SUM(Sales[Amount])
VAR Average = AVERAGE(Sales[Amount])
RETURN DIVIDE(Total, Average)`;
  const result = parseVarReturn(input);
  assert.equal(result.vars.length, 2);
  assert.equal(result.vars[0].name, 'Total');
  assert.equal(result.vars[0].expr, 'SUM(Sales[Amount])');
  assert.equal(result.vars[1].name, 'Average');
  assert.equal(result.vars[1].expr, 'AVERAGE(Sales[Amount])');
  assert.equal(result.returnExpr, 'DIVIDE(Total, Average)');
});

test('parseVarReturn - returns null without RETURN', () => {
  const input = 'VAR x = 1';
  const result = parseVarReturn(input);
  assert.equal(result, null);
});

// ========== parseDaxExpression ==========

test('parseDaxExpression - identifies integer literal', () => {
  const result = parseDaxExpression('42');
  assert.deepEqual(result, { type: 'LITERAL', value: 42 });
});

test('parseDaxExpression - identifies negative number', () => {
  const result = parseDaxExpression('-3.14');
  assert.deepEqual(result, { type: 'LITERAL', value: -3.14 });
});

test('parseDaxExpression - identifies string literal', () => {
  const result = parseDaxExpression('"hello"');
  assert.deepEqual(result, { type: 'LITERAL', value: 'hello' });
});

test('parseDaxExpression - identifies standalone measure ref', () => {
  const result = parseDaxExpression('[PIPE $]');
  assert.deepEqual(result, { type: 'MEASURE_REF', name: 'PIPE $' });
});

test('parseDaxExpression - identifies table column ref', () => {
  const result = parseDaxExpression('Pipeline[OPPTY]');
  assert.deepEqual(result, {
    type: 'TABLE_COLUMN_REF',
    table: 'Pipeline',
    column: 'OPPTY'
  });
});

test('parseDaxExpression - identifies SUM function', () => {
  const result = parseDaxExpression('SUM(Sales[Amount])');
  assert.equal(result.type, 'SUM');
  assert.equal(result.name, 'SUM');
  assert.deepEqual(result.args, ['Sales[Amount]']);
});

test('parseDaxExpression - identifies CALCULATE function', () => {
  const result = parseDaxExpression('CALCULATE(SUM(x), a = 1)');
  assert.equal(result.type, 'CALCULATE');
  assert.equal(result.name, 'CALCULATE');
  assert.deepEqual(result.args, ['SUM(x)', 'a = 1']);
});

test('parseDaxExpression - identifies DIVIDE function', () => {
  const result = parseDaxExpression('DIVIDE(SUM(a), SUM(b))');
  assert.equal(result.type, 'DIVIDE');
  assert.equal(result.name, 'DIVIDE');
  assert.deepEqual(result.args, ['SUM(a)', 'SUM(b)']);
});

test('parseDaxExpression - identifies SWITCH function', () => {
  const result = parseDaxExpression('SWITCH(x, 1, "A", 2, "B")');
  assert.equal(result.type, 'SWITCH');
  assert.equal(result.name, 'SWITCH');
  assert.deepEqual(result.args, ['x', '1', '"A"', '2', '"B"']);
});

test('parseDaxExpression - identifies VAR_RETURN', () => {
  const result = parseDaxExpression('VAR x = 1\nRETURN x * 2');
  assert.equal(result.type, 'VAR_RETURN');
  assert.deepEqual(result.vars, [{ name: 'x', expr: '1' }]);
  assert.equal(result.returnExpr, 'x * 2');
});

test('parseDaxExpression - identifies unknown function', () => {
  const result = parseDaxExpression('CUSTOMFUNC(a, b)');
  assert.equal(result.type, 'FUNCTION');
  assert.equal(result.name, 'CUSTOMFUNC');
  assert.deepEqual(result.args, ['a', 'b']);
});

test('parseDaxExpression - identifies binary expression', () => {
  const result = parseDaxExpression('[A] + [B]');
  assert.equal(result.type, 'EXPRESSION');
  assert.equal(result.raw, '[A] + [B]');
});

test('parseDaxExpression - identifies expression with comparison', () => {
  const result = parseDaxExpression('x > 10');
  assert.equal(result.type, 'EXPRESSION');
  assert.equal(result.raw, 'x > 10');
});

test('parseDaxExpression - identifies expression with logical operators', () => {
  const result = parseDaxExpression('x && y');
  assert.equal(result.type, 'EXPRESSION');
  assert.equal(result.raw, 'x && y');
});

test('parseDaxExpression - identifies known aggregation functions', () => {
  const funcs = ['DISTINCTCOUNT', 'COUNTROWS', 'MAX', 'MIN', 'AVERAGE'];
  for (const func of funcs) {
    const result = parseDaxExpression(`${func}(Table[Col])`);
    assert.equal(result.type, func);
    assert.equal(result.name, func);
  }
});

test('parseDaxExpression - identifies filter functions', () => {
  const result = parseDaxExpression('FILTER(Table, [x] > 10)');
  assert.equal(result.type, 'FILTER');
  assert.equal(result.name, 'FILTER');
  assert.deepEqual(result.args, ['Table', '[x] > 10']);
});

test('parseDaxExpression - identifies iterator functions', () => {
  const result = parseDaxExpression('SUMX(Table, [Amount] * [Quantity])');
  assert.equal(result.type, 'SUMX');
  assert.equal(result.name, 'SUMX');
  assert.deepEqual(result.args, ['Table', '[Amount] * [Quantity]']);
});

test('parseDaxExpression - falls back to RAW for ambiguous input', () => {
  const result = parseDaxExpression('SomeVariable');
  assert.equal(result.type, 'RAW');
  assert.equal(result.raw, 'SomeVariable');
});

test('parseDaxExpression - handles empty/whitespace', () => {
  const result = parseDaxExpression('   ');
  assert.equal(result.type, 'RAW');
  assert.equal(result.raw, '');
});
