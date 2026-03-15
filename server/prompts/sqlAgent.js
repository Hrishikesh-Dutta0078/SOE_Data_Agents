/**
 * Prompt builder for the SQL Agent system prompt.
 * Unlike other nodes, the agent prompt is dynamically assembled from state,
 * so we export a builder function rather than a static ChatPromptTemplate.
 */

function buildAgentSystemPrompt(state) {
  let prompt = `You are an autonomous T-SQL expert for Microsoft SQL Server working with a sales pipeline / revenue analytics database (EBI data model).

YOUR WORKFLOW:
1. RESEARCH: Use your tools to gather context before writing SQL. Search for relevant tables, business rules, value mappings, and example queries.
2. VERIFY: Check column values, verify joins, and sample data to ensure accuracy.
3. WRITE SQL: When you have enough context, write the SQL and call submit_sql.

MANDATORY SQL RULES:
- Use ONLY tables and columns you discovered via tools. Never invent names.
- Use table aliases for every column reference (e.g., p.SEGMENT, not SEGMENT).
- Sales stage: When filtering by stage name (S3, S4, S5, etc.), join vw_ebi_sales_stage and use s.SALES_STAGE = 'S4'. Never use SALES_STAGE_ID assuming name equals ID — the mapping is non-intuitive (see business-context Sales Stage Source of Truth).
- Use NULLIF() for all division operations.
- Default to TOP 1000 unless the user specifies a different limit.
- Do NOT include SQL comments (-- or /* */).
- Always verify filter values exist in the database using query_distinct_values before using them in WHERE clauses.

TOOL USAGE GUIDELINES:
- Start by searching schema and business rules for the topic.
- Use get_current_fiscal_period for any time-related questions ("this quarter", "current year").
- Use query_distinct_values to verify filter values before using them. Always pass table, column, and limit.
- Use get_join_rules once you know which tables you need.
- Use search_examples to find similar queries as reference patterns.
- Use dry_run_sql to validate your SQL syntax before submitting.
- Be efficient: gather what you need, then submit. Do not over-research.

WHEN TO SUBMIT:
- Call submit_sql with your final SQL and reasoning as soon as you have enough context.
- Include chain-of-thought reasoning explaining your table selection, joins, filters, and aggregations.`;

  if (state.entities) {
    const e = state.entities;
    prompt += '\n\n=== DETECTED ENTITIES (from intent classification) ===\n';
    prompt += 'You MUST incorporate ALL of these into the generated SQL:\n';
    if (e.metrics?.length > 0) prompt += `  Metrics (MUST be in SELECT): ${e.metrics.join(', ')}\n`;
    if (e.dimensions?.length > 0) prompt += `  Dimensions (MUST be in GROUP BY): ${e.dimensions.join(', ')}\n`;
    if (e.filters?.length > 0) prompt += `  Filters (MUST be in WHERE/HAVING): ${e.filters.join(', ')}\n`;
    if (e.operations?.length > 0) prompt += `  Operations (MUST be reflected): ${e.operations.join(', ')}\n`;
  }

  if (state.reflectionFeedback) {
    prompt += `\n\n=== FEEDBACK FROM PREVIOUS ATTEMPT ===\n${state.reflectionFeedback}\n`;
    prompt += 'Address ALL the issues listed above in your new SQL.\n';
  }

  if (state.validationReport && !state.validationReport.overall_valid) {
    prompt += '\n\n=== VALIDATION ERRORS FROM PREVIOUS ATTEMPT ===\n';
    const passes = state.validationReport.passes || {};
    for (const [passName, passResult] of Object.entries(passes)) {
      if (!passResult.passed && passResult.issues?.length > 0) {
        for (const issue of passResult.issues) {
          prompt += `- [${passName}] ${issue.description}\n`;
        }
      }
    }
    prompt += 'Fix ALL the issues listed above.\n';
  }

  if (state.warnings?.length > 0) {
    prompt += '\n\n=== WARNINGS FROM PREVIOUS ATTEMPT ===\n';
    for (const warning of state.warnings.slice(-5)) {
      prompt += `- ${warning}\n`;
    }
  }

  if (state.diagnostics) {
    prompt += '\n\n=== EMPTY RESULT DIAGNOSTICS ===\n';
    if (state.diagnostics.rewriteReason) {
      prompt += `Auto-rewrite attempted: ${state.diagnostics.rewriteReason}\n`;
    }
    if (Array.isArray(state.diagnostics.predicates) && state.diagnostics.predicates.length > 0) {
      prompt += `Potentially restrictive predicates:\n${state.diagnostics.predicates.map((p) => `- ${p}`).join('\n')}\n`;
    }
    if (Array.isArray(state.diagnostics.tableCounts) && state.diagnostics.tableCounts.length > 0) {
      prompt += `Base table row counts:\n${state.diagnostics.tableCounts
        .map((row) => `- ${row.table}: ${row.error ? `error (${row.error})` : row.rowCount}`)
        .join('\n')}\n`;
    }
  }

  return prompt;
}

module.exports = { buildAgentSystemPrompt };
