#!/usr/bin/env node

/**
 * Generate schema-knowledge.json from table-descriptions.md.
 *
 * Parses the markdown into a structured JSON with per-table description,
 * columns (with type, nullable, pk, fk, description), and keyword lists
 * for programmatic keyword-based search.
 *
 * Run from project root:
 *   node scripts/generateSchemaKnowledge.js
 */

const fs = require('fs');
const path = require('path');

const KNOWLEDGE_DIR = path.join(__dirname, '..', 'server', 'context', 'knowledge');
const INPUT_FILE = path.join(KNOWLEDGE_DIR, 'table-descriptions.md');
const OUTPUT_FILE = path.join(KNOWLEDGE_DIR, 'schema-knowledge.json');

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'only', 'own', 'same', 'than', 'too', 'very', 'just', 'because',
  'that', 'this', 'these', 'those', 'it', 'its', 'all', 'any',
  'per', 'e', 'g', 'etc', 'vs', 'ie',
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function parseColumnLine(line) {
  const match = line.match(
    /^-\s+(\S+)\s+\(([^)]+)\)\s*(?:—\s*(.*))?$/
  );
  if (!match) return null;

  const colName = match[1];
  const typeInfo = match[2];
  const description = (match[3] || '').trim();

  const typeParts = typeInfo.split(',').map((p) => p.trim());
  const rawType = typeParts[0] || '';
  const flags = typeParts.slice(1).map((f) => f.toUpperCase());

  const pk = flags.includes('PK');
  const fk = flags.includes('FK');
  const nullable = !pk && !flags.includes('NOT NULL');

  return {
    colName,
    type: rawType.toUpperCase(),
    nullable,
    pk,
    fk,
    description,
  };
}

function parseTableDescriptions(text) {
  const tables = {};
  const sections = text.split(/^## /gm).filter((s) => s.trim().length > 0);

  for (const section of sections) {
    const lines = section.trim().split('\n');
    const tableName = lines[0].trim();

    if (tableName.toLowerCase().startsWith('table descriptions') || tableName.startsWith('#')) {
      continue;
    }

    const body = lines.slice(1).join('\n').trim();

    const keyColsMatch = body.match(/Key columns used in joins:\s*(.+)/i);
    const keyColumns = keyColsMatch
      ? new Set(keyColsMatch[1].split(',').map((c) => c.trim().toUpperCase()).filter(Boolean))
      : new Set();

    const descriptionLines = [];
    let hitImportant = false;
    for (const line of body.split('\n')) {
      const trimmed = line.trim();
      if (/^Key columns used in joins:/i.test(trimmed)) continue;
      if (/^Important columns:/i.test(trimmed)) {
        hitImportant = true;
        continue;
      }
      if (!hitImportant && trimmed.length > 0 && !trimmed.startsWith('-')) {
        descriptionLines.push(trimmed);
      }
    }
    const description = descriptionLines.join(' ').trim();

    const columns = {};
    let inImportantSection = false;
    for (const line of body.split('\n')) {
      const trimmed = line.trim();
      if (/^Important columns:/i.test(trimmed)) {
        inImportantSection = true;
        continue;
      }
      if (inImportantSection && trimmed.startsWith('-')) {
        const col = parseColumnLine(trimmed);
        if (col) {
          if (!col.fk && keyColumns.has(col.colName.toUpperCase())) {
            col.fk = true;
          }
          columns[col.colName] = {
            type: col.type,
            nullable: col.nullable,
            pk: col.pk,
            fk: col.fk,
            description: col.description,
          };
        }
      } else if (inImportantSection && trimmed.length > 0 && !trimmed.startsWith('-')) {
        inImportantSection = false;
      }
    }

    const keywordSources = [
      tableName,
      description,
      ...Object.keys(columns),
      ...Object.values(columns).map((c) => c.description),
    ].join(' ');

    const keywords = [...new Set(tokenize(keywordSources))].sort();

    tables[tableName] = {
      description,
      columns,
      keywords,
    };
  }

  return tables;
}

function main() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  const mdText = fs.readFileSync(INPUT_FILE, 'utf-8');
  const tables = parseTableDescriptions(mdText);
  const tableCount = Object.keys(tables).length;
  const columnCount = Object.values(tables).reduce(
    (sum, t) => sum + Object.keys(t.columns).length, 0
  );

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(tables, null, 2), 'utf-8');

  console.log(`schema-knowledge.json generated:`);
  console.log(`  Tables: ${tableCount}`);
  console.log(`  Total columns: ${columnCount}`);
  console.log(`  Output: ${OUTPUT_FILE}`);
}

main();
