---
name: context-tuning
description: "Tune the AI context layer when the user provides a question, SQL query, and corrections. Use this skill whenever the user wants to add a gold example, fix query patterns, update abbreviations, enrich column descriptions, or correct how the Text-to-SQL system understands domain terminology. Trigger on phrases like 'add this example', 'update the context', 'here is a query correction', 'add gold example', 'tune context', or when the user supplies a question + SQL + correction triplet."
---

# Context Tuning

When the user provides a **question**, **SQL query**, and **corrections/notes**, propagate those changes across all relevant context files so the Text-to-SQL AI learns the pattern.

## Input

The user will provide three things:
1. **Question** — the natural language question a user would ask
2. **SQL query** — the correct SQL that answers it
3. **Corrections** — notes about filters, abbreviations, column usage, or business logic the AI should learn

## Workflow

### Step 1: Read all context files

Read these files in parallel to understand current state:

| File | Purpose |
|------|---------|
| `server/context/goldExamples.json` | Gold example entries for template matching |
| `server/context/definitions.json` | Abbreviations and threshold definitions |
| `server/context/knowledge/schema-knowledge.json` | Column metadata, types, distinct values, descriptions |
| `server/context/knowledge/kpi-glossary.json` | KPI definitions, formulas, aliases |
| `server/context/knowledge/business-rules.md` | Classification rules, business logic |

For `schema-knowledge.json` (large file), don't read the whole thing — use Grep to search for the specific columns mentioned in the SQL and corrections.

### Step 2: Determine what needs updating

Analyze the user's corrections and SQL to identify which files need changes:

| Signal | File to update |
|--------|----------------|
| New question + SQL pair | `goldExamples.json` — always add a new entry |
| New abbreviation or shorthand (e.g., WFCU, CU) | `definitions.json` — add/update abbreviation mappings |
| Column used with specific filter values the AI should learn | `schema-knowledge.json` — enrich column description |
| New KPI or metric definition | `kpi-glossary.json` — add/update KPI entry |
| New classification rule or business logic | `business-rules.md` — add/update rule |

### Step 3: Add gold example

Add a new entry to `goldExamples.json` in the `examples` array. Follow this structure exactly:

```json
{
  "id": "exact__<descriptive_snake_case_id>",
  "question": "<the user's question>",
  "questionCategory": "<WHAT_HAPPENED | WHY | WHAT_TO_DO>",
  "questionSubCategory": "<from taxonomy: pipeline_level_mix, coverage_creation, deal_lists, pipeline_walk, gap_drivers, stall_push_risk, signals, forecast_confidence, progression_actions, creation_actions, deal_focus, remediation, outlook_views, geography_lookup>",
  "sql": "<the SQL query — use \\n for newlines>",
  "tables_used": ["<list every table/view in the FROM and JOIN clauses>"],
  "filterNotes": "<optional — explain non-obvious filters so AI knows WHEN to apply them>",
  "variants": ["<8-12 alternative phrasings a user might say>"]
}
```

**Guidelines for the gold example:**
- The `id` must start with `exact__` and use a short descriptive snake_case suffix
- Pick `questionCategory` based on the taxonomy in `business-rules.md` Section 1
- `tables_used` must list every table/view referenced in FROM and JOIN clauses
- Add `filterNotes` when there are domain-specific filters (like ADJ_COMMITMENT, STALLED_BUT_INACTIVE, etc.) that the AI needs to learn when to apply
- `variants` should cover different phrasings: formal, casual, abbreviated, keyword-only. Aim for 8-12 variants that are genuinely different from each other

### Step 4: Update abbreviations

If the corrections introduce new abbreviations or shorthand:

1. **`definitions.json` → `abbreviations` object**: Add each new abbreviation with its expansion AND the column it maps to. Format: `"ABBREV": "Expansion — maps to COLUMN_NAME = 'value'"`. If it's a composite (like WFCU = multiple values), spell out the full IN clause.

2. Also add common misspellings or alternate orderings (e.g., CU and UC for Upside).

### Step 5: Enrich column descriptions

If the corrections highlight how a column should be filtered or what abbreviations map to it:

1. **`schema-knowledge.json`**: Find the column entry and expand its `description` to include the abbreviation mapping and usage guidance. Keep it concise — one sentence added to existing description.

Only update the column description if the correction teaches something genuinely new about when/how to use that column. Don't repeat what's already there.

### Step 6: Update KPI glossary (if applicable)

If the correction introduces a new metric or changes how an existing KPI is calculated:

1. **`kpi-glossary.json`**: Add or update the KPI entry with proper `id`, `name`, `aliases`, `definition`, `formula`, `components`, and `relatedTables`.

Skip this step if the correction is purely about filters/abbreviations and doesn't define a new metric.

### Step 7: Update business rules (if applicable)

If the correction introduces a new classification rule, threshold, or business logic pattern:

1. **`business-rules.md`**: Add the rule in the appropriate section.

Skip this step if the correction is about query patterns, not business rules.

### Step 8: Validate

After all edits, verify:
- `goldExamples.json` is valid JSON (check by reading the area around your edit)
- `definitions.json` is valid JSON
- `schema-knowledge.json` is valid JSON (check the edited section)
- No duplicate `id` values in goldExamples
- All tables in `tables_used` actually appear in the SQL

### Step 9: Summarize

Tell the user exactly what was changed:

```
**Changes made:**
1. `goldExamples.json` — Added entry `exact__<id>` with <N> variants
2. `definitions.json` — Added abbreviations: <list>
3. `schema-knowledge.json` — Enriched description for <column>
4. (any other files updated)
```

## Important Notes

- **Don't duplicate**: Before adding abbreviations, check if they already exist in `definitions.json`. Before enriching a description, check if it already says what you'd add.
- **Preserve existing entries**: Never modify or remove existing gold examples. Only append new ones.
- **JSON safety**: When editing JSON files, use the Edit tool with precise old_string/new_string to avoid corrupting the file. Never rewrite the whole file.
- **Mandatory filters**: Every pipeline SQL should include the standard mandatory filters from `definitions.json → mandatoryFilters`. Don't add them to `filterNotes` — they're already enforced globally. Only document filters that are specific to this example.
- **Column references in SQL**: The SQL in the gold example should use the exact column names as they appear in `schema-knowledge.json`.
