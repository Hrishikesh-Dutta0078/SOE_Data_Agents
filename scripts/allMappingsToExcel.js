/**
 * One-off: read all_mappings.md and write all_mappings.xlsx (multi-sheet).
 * Run from repo root: node scripts/allMappingsToExcel.js
 * Requires: client/node_modules/xlsx
 */

const fs = require('fs');
const path = require('path');

const XLSX = require(path.join(__dirname, '../client/node_modules/xlsx'));

const MD_PATH = path.join(__dirname, '../all_mappings.md');
const OUT_PATH = path.join(__dirname, '../all_mappings.xlsx');

function parsePipeRow(line) {
  if (!line.trim().startsWith('|')) return null;
  const cells = line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
  if (cells.length && cells.every((c) => /^-+$/.test(c.replace(/\s+/g, '')))) {
    return { separator: true };
  }
  return { cells };
}

function isTableStart(lines, i) {
  const row = parsePipeRow(lines[i]);
  if (!row || row.separator || !row.cells) return false;
  const next = parsePipeRow(lines[i + 1]);
  return next && next.separator;
}

function extractTable(lines, startIdx) {
  const rows = [];
  let i = startIdx;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') break;
    const parsed = parsePipeRow(line);
    if (!parsed) break;
    if (parsed.separator) {
      i += 1;
      continue;
    }
    rows.push(parsed.cells);
    i += 1;
  }
  return { rows, endIdx: i };
}

const SHEET_ALIASES = {
  'Calendar Tables (all from vw_EBI_Caldate)': 'Calendar Tables',
  'Key Calculated Columns (PBI-only, not in DB)': 'Calculated Columns',
  'OCC-Local Parameter Tables (not in DB)': 'OCC Parameter Tables',
  'Business Logic Quick Reference': 'Business Logic',
};

function sheetNameSafe(name, used) {
  const resolved = SHEET_ALIASES[name] || name;
  let n = resolved.replace(/[:\\/?*[\]]/g, '').slice(0, 31);
  let base = n;
  let k = 2;
  while (used.has(n)) {
    const suffix = ` (${k})`;
    n = base.slice(0, 31 - suffix.length) + suffix;
    k += 1;
  }
  used.add(n);
  return n;
}

function main() {
  const raw = fs.readFileSync(MD_PATH, 'utf8');
  const lines = raw.split(/\r?\n/);

  const sections = [];
  let cur = { title: 'Intro', bodyLines: [] };
  for (const line of lines) {
    const m = line.match(/^##\s+(.+)/);
    if (m) {
      sections.push(cur);
      cur = { title: m[1].trim(), bodyLines: [] };
    } else {
      cur.bodyLines.push(line);
    }
  }
  sections.push(cur);

  const wb = XLSX.utils.book_new();
  const usedNames = new Set();

  for (const sec of sections) {
    if (sec.title === 'Intro') {
      const intro = sec.bodyLines
        .filter((l) => l.trim() && !l.startsWith('---'))
        .join('\n')
        .trim();
      if (intro) {
        const ws = XLSX.utils.aoa_to_sheet([['Intro'], [intro]]);
        XLSX.utils.book_append_sheet(wb, ws, sheetNameSafe('Intro', usedNames));
      }
      continue;
    }

    const bl = sec.bodyLines;
    const sheetRows = [];
    let i = 0;
    let subsection = '';
    let calcHeaderDone = false;
    let pendingBulletBlock = false;

    while (i < bl.length) {
      const line = bl[i];
      const sub = line.match(/^###\s+(.+)/);
      if (sub) {
        subsection = sub[1].trim();
        let j = i + 1;
        while (j < bl.length && bl[j].trim() === '') j += 1;
        pendingBulletBlock = j < bl.length && !isTableStart(bl, j);
        i += 1;
        continue;
      }

      if (isTableStart(bl, i)) {
        const { rows, endIdx } = extractTable(bl, i);
        if (rows.length) {
          const isCalc = sec.title.includes('Calculated');
          if (sheetRows.length) {
            sheetRows.push([]);
            if (subsection) {
              sheetRows.push([subsection]);
            }
          }
          const hasSub = subsection && isCalc;
          if (hasSub) {
            const header = rows[0];
            const withSource = ['Source Table', ...header];
            if (!calcHeaderDone) {
              sheetRows.push(withSource);
              calcHeaderDone = true;
            }
            for (let r = 1; r < rows.length; r += 1) {
              sheetRows.push([subsection, ...rows[r]]);
            }
          } else {
            sheetRows.push(...rows);
          }
        }
        i = endIdx;
        continue;
      }

      const bullet = line.match(/^\s*-\s+\*\*(.+?)\*\*\s*[—–-]\s*(.+)$/);
      if (bullet) {
        if (pendingBulletBlock) {
          if (sheetRows.length) {
            sheetRows.push([]);
            if (subsection) {
              sheetRows.push([subsection]);
            }
          }
          sheetRows.push(['Item', 'Description']);
          pendingBulletBlock = false;
        }
        sheetRows.push([bullet[1], bullet[2]]);
        i += 1;
        continue;
      }

      const bulletSimple = line.match(/^\s*-\s+(.+)$/);
      if (bulletSimple && sec.title.includes('Business Logic')) {
        if (sheetRows.length === 0 || sheetRows[0][0] !== 'Note') {
          sheetRows.push(['Note']);
        }
        sheetRows.push([bulletSimple[1]]);
        i += 1;
        continue;
      }

      const arch = line.match(/^```/);
      if (arch) {
        i += 1;
        const buf = [];
        while (i < bl.length && !bl[i].trim().startsWith('```')) {
          buf.push(bl[i]);
          i += 1;
        }
        if (buf.length) {
          const ws = XLSX.utils.aoa_to_sheet([['Architecture'], [buf.join('\n').trim()]]);
          XLSX.utils.book_append_sheet(wb, ws, sheetNameSafe('Architecture', usedNames));
        }
        i += 1;
        continue;
      }

      i += 1;
    }

    if (sheetRows.length > 0) {
      const shortTitle = sec.title.replace(/^\d+\.\s*/, '');
      const name = sheetNameSafe(shortTitle.slice(0, 31), usedNames);
      const ws = XLSX.utils.aoa_to_sheet(sheetRows);
      XLSX.utils.book_append_sheet(wb, ws, name);
    }
  }

  XLSX.writeFile(wb, OUT_PATH);
  console.log('Wrote', OUT_PATH);
}

main();
