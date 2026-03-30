const test = require('node:test');
const assert = require('node:assert');
const { findMeasureRefs, buildDependencyGraph, topologicalSort } = require('../dependencyGraph');

test('findMeasureRefs - finds standalone measure refs', () => {
  const measureNames = new Set(['PIPE $', 'WON $', 'OPPTY']);
  const expression = '[PIPE $] + [WON $]';
  const refs = findMeasureRefs(expression, measureNames);
  assert.deepStrictEqual(refs, new Set(['PIPE $', 'WON $']));
});

test('findMeasureRefs - ignores table-qualified column refs', () => {
  const measureNames = new Set(['PIPE $', 'WON $', 'OPPTY']);
  const expression = "SUM('Pipeline'[OPPTY])";
  const refs = findMeasureRefs(expression, measureNames);
  assert.deepStrictEqual(refs, new Set([]));
});

test('findMeasureRefs - finds measure refs inside CALCULATE blocks', () => {
  const measureNames = new Set(['PIPE $', 'WON $', 'Base Value']);
  const expression = 'CALCULATE([Base Value], Filter1, Filter2) + [WON $]';
  const refs = findMeasureRefs(expression, measureNames);
  assert.deepStrictEqual(refs, new Set(['Base Value', 'WON $']));
});

test('findMeasureRefs - ignores column names matching measure names when preceded by table name', () => {
  const measureNames = new Set(['OPPTY', 'PIPE $']);
  const expression = 'SUM(Pipeline[OPPTY]) + [PIPE $]';
  const refs = findMeasureRefs(expression, measureNames);
  // Should only find [PIPE $], not OPPTY (which is table-qualified)
  assert.deepStrictEqual(refs, new Set(['PIPE $']));
});

test('buildDependencyGraph - builds correct graph', () => {
  const measures = [
    { name: 'A', expression: '[B] + [C]' },
    { name: 'B', expression: 'SUM(Table[Column])' }, // base measure
    { name: 'C', expression: '[B] * 2' }
  ];
  const graph = buildDependencyGraph(measures);

  assert.deepStrictEqual(graph.A, new Set(['B', 'C']));
  assert.deepStrictEqual(graph.B, new Set([]));
  assert.deepStrictEqual(graph.C, new Set(['B']));
});

test('topologicalSort - sorts base measures first', () => {
  const graph = {
    A: new Set(['B', 'C']),
    B: new Set([]),
    C: new Set(['B'])
  };
  const result = topologicalSort(graph);

  // B should come before C, and C before A
  assert.deepStrictEqual(result.cycles, []);
  const aIndex = result.order.indexOf('A');
  const bIndex = result.order.indexOf('B');
  const cIndex = result.order.indexOf('C');

  assert.ok(bIndex < cIndex, 'B should come before C');
  assert.ok(cIndex < aIndex, 'C should come before A');
});

test('topologicalSort - detects cycles', () => {
  const graph = {
    A: new Set(['B']),
    B: new Set(['A'])
  };
  const result = topologicalSort(graph);

  assert.ok(result.cycles.length > 0, 'Should detect cycle');
  assert.ok(result.cycles.includes('A') || result.cycles.includes('B'), 'Cycle should include A or B');
});

test('topologicalSort - handles complex dependency chain', () => {
  const graph = {
    A: new Set(['B']),
    B: new Set(['C', 'D']),
    C: new Set([]),
    D: new Set(['C']),
    E: new Set([])
  };
  const result = topologicalSort(graph);

  assert.deepStrictEqual(result.cycles, []);

  const aIndex = result.order.indexOf('A');
  const bIndex = result.order.indexOf('B');
  const cIndex = result.order.indexOf('C');
  const dIndex = result.order.indexOf('D');

  // C must come before D and B
  assert.ok(cIndex < dIndex, 'C before D');
  assert.ok(cIndex < bIndex, 'C before B');
  // D must come before B
  assert.ok(dIndex < bIndex, 'D before B');
  // B must come before A
  assert.ok(bIndex < aIndex, 'B before A');
});
