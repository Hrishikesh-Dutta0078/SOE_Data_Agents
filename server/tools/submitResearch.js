/**
 * submit_research tool — the Research Agent calls this to output
 * its structured research brief when it has gathered enough context.
 *
 * Enriches the brief by validating LLM-provided relevantColumns against
 * the actual schema, filtering out hallucinated names and attaching
 * verified column metadata so downstream agents never use invented columns.
 */

const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { getSchemaByTableNames, getColumnMetadataForTable, fuzzyResolveTable } = require('../vectordb/schemaFetcher');

function tableNameFromJoinSide(side) {
  if (!side || typeof side !== 'string') return '';
  const trimmed = side.trim();
  const dot = trimmed.indexOf('.');
  return dot >= 0 ? trimmed.substring(0, dot).trim() : trimmed;
}

function enrichBriefWithSchema(brief) {
  if (!brief.tables || brief.tables.length === 0) return brief;

  const allowedTableNames = new Set();
  const resolvedTables = [];
  const omittedTables = [];

  for (const table of brief.tables) {
    const resolved = fuzzyResolveTable(table.name);
    if (!resolved) {
      omittedTables.push(table.name);
      continue;
    }

    const canonicalName = resolved.resolvedName;
    allowedTableNames.add(canonicalName);
    const schema = resolved.entry;
    if (!schema.columns) continue;

    const actualColumnNames = Object.keys(schema.columns);
    const actualUpper = new Set(actualColumnNames.map((c) => c.toUpperCase()));

    const verified = (table.relevantColumns || []).filter((c) => actualUpper.has(c.toUpperCase()));
    resolvedTables.push({
      name: canonicalName,
      description: table.description,
      relevantColumns: verified.length > 0 ? verified : actualColumnNames,
      verifiedColumns: actualColumnNames,
      columnMetadata: getColumnMetadataForTable(canonicalName),
    });
  }

  brief.tables = resolvedTables;
  if (omittedTables.length > 0) {
    brief._omittedTables = omittedTables;
  }

  if (brief.joins && brief.joins.length > 0) {
    brief.joins = brief.joins.filter((j) => {
      const fromTable = tableNameFromJoinSide(j.from);
      const toTable = tableNameFromJoinSide(j.to);
      const fromResolved = fromTable ? fuzzyResolveTable(fromTable) : null;
      const toResolved = toTable ? fuzzyResolveTable(toTable) : null;
      return fromResolved && toResolved && allowedTableNames.has(fromResolved.resolvedName) && allowedTableNames.has(toResolved.resolvedName);
    });
  }

  return brief;
}

const submitResearchTool = new DynamicStructuredTool({
  name: 'submit_research',
  description: 'Submit the research brief once you have gathered enough context. Include all relevant tables, columns, joins, business rules, example patterns, and filter values.',
  schema: z.object({
    tables: z.array(z.object({
      name: z.string().describe('Table name'),
      relevantColumns: z.array(z.string()).describe('Relevant columns from this table'),
      description: z.string().nullable().describe('Brief description of how this table is relevant'),
    })).describe('Tables discovered during research'),
    joins: z.array(z.object({
      from: z.string().describe('Source table.column'),
      to: z.string().describe('Target table.column'),
      type: z.string().nullable().describe('Join type: INNER, LEFT, etc.'),
    })).describe('Join relationships between tables'),
    businessRules: z.array(z.string()).describe('Relevant business rules and constraints'),
    examplePatterns: z.array(z.string()).describe('SQL patterns from similar example queries'),
    filterValues: z.array(z.object({
      column: z.string(),
      values: z.array(z.string()),
    })).describe('Verified distinct values for filter columns'),
    fiscalPeriod: z.string().nullable().describe('Current fiscal period if relevant'),
    reasoning: z.string().describe('Summary of research findings and recommendation for SQL approach'),
  }),
  func: async (brief) => {
    const enriched = enrichBriefWithSchema(brief);
    let out = JSON.stringify(enriched);
    if (enriched._omittedTables && enriched._omittedTables.length > 0) {
      out += `\n\nNote: Table(s) not found in schema and omitted from the brief: ${enriched._omittedTables.join(', ')}. Use only the tables listed above.`;
    }
    return out;
  },
});

module.exports = submitResearchTool;
module.exports.enrichBriefWithSchema = enrichBriefWithSchema;
