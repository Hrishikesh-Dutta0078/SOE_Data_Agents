'use strict';

/**
 * Dependency Graph and Topological Sort for DAX Measures
 *
 * This module analyzes measure dependencies to determine the correct
 * translation order (base measures first, then measures that depend on them).
 */

/**
 * Find all measure references in a DAX expression.
 *
 * Measure refs are in the form [MeasureName]. We must distinguish them from
 * table-qualified column refs like 'Table'[Column] or TableName[Column].
 *
 * @param {string} expression - The DAX expression to analyze
 * @param {Set<string>} measureNames - Set of all known measure names
 * @returns {Set<string>} Set of measure names referenced in the expression
 */
function findMeasureRefs(expression, measureNames) {
  const refs = new Set();

  // Match all [Name] patterns
  const bracketPattern = /\[([^\]]+)\]/g;
  let match;

  while ((match = bracketPattern.exec(expression)) !== null) {
    const name = match[1];
    const bracketIndex = match.index;

    // Check if this name is a known measure
    if (!measureNames.has(name)) {
      continue;
    }

    // Check the character before the opening bracket
    if (bracketIndex > 0) {
      const charBefore = expression[bracketIndex - 1];

      // Skip if preceded by single quote (table-qualified: 'Table'[Column])
      if (charBefore === "'") {
        continue;
      }

      // Skip if preceded by a word character (table name without quotes: TableName[Column])
      if (/\w/.test(charBefore)) {
        continue;
      }
    }

    // This is a measure reference
    refs.add(name);
  }

  return refs;
}

/**
 * Build a dependency graph from an array of measures.
 *
 * @param {Array<{name: string, expression: string}>} measures - Array of measure objects
 * @returns {Object} Map of measureName → Set of measure names it depends on
 */
function buildDependencyGraph(measures) {
  const graph = {};
  const measureNames = new Set(measures.map(m => m.name));

  for (const measure of measures) {
    const deps = findMeasureRefs(measure.expression, measureNames);
    graph[measure.name] = deps;
  }

  return graph;
}

/**
 * Topologically sort measures so base measures come first.
 *
 * Uses DFS with cycle detection. Returns an ordered list where measures
 * with no dependencies come first, and measures that depend on others come later.
 *
 * @param {Object} graph - Map of measureName → Set of dependencies
 * @returns {{order: string[], cycles: string[]}} Sorted order and any detected cycles
 */
function topologicalSort(graph) {
  const order = [];
  const cycles = [];
  const visited = new Set();
  const inStack = new Set();

  /**
   * DFS visit function
   * @param {string} node - Current node name
   * @returns {boolean} True if a cycle was detected
   */
  function visit(node) {
    if (inStack.has(node)) {
      // Cycle detected
      cycles.push(node);
      return true;
    }

    if (visited.has(node)) {
      // Already processed
      return false;
    }

    visited.add(node);
    inStack.add(node);

    // Visit all dependencies first
    const deps = graph[node] || new Set();
    for (const dep of deps) {
      visit(dep);
    }

    inStack.delete(node);

    // Add to order after all dependencies are processed
    order.push(node);

    return false;
  }

  // Visit all nodes
  for (const node of Object.keys(graph)) {
    if (!visited.has(node)) {
      visit(node);
    }
  }

  return { order, cycles };
}

module.exports = {
  findMeasureRefs,
  buildDependencyGraph,
  topologicalSort
};
