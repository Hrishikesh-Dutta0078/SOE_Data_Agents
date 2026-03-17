/**
 * Orchestrates all validation passes: RLS, syntax, and semantic.
 */

const { validateRls } = require('./rlsValidator');
const { validateSyntax } = require('./syntaxValidator');
const { validateSchema } = require('./schemaValidator');
const { validateSemantics } = require('./semanticValidator');
const logger = require('../utils/logger');

/**
 * Runs all validation passes in order.
 * Pass 3 (semantic) runs only if Pass 1 and 2 pass, to save LLM cost.
 *
 * @param {{
 *   sql: string,
 *   rlsContext?: { flmId?: string|number },
 *   question?: string,
 *   detectedEntities?: object,
 *   onProgress?: (pass: string, result: object) => void
 * }} params
 * @returns {Promise<{
 *   overall_valid: boolean,
 *   passes: {
 *     rls: { passed: boolean, issues: Array },
 *     syntax: { passed: boolean, issues: Array },
 *     semantic: { passed: boolean, issues: Array }
 *   }
 * }>}
 */
async function validate({
  sql,
  rlsContext,
  question,
  detectedEntities,
  skipSyntax,
  multiQueryContext,
  onProgress,
  nodeModelOverrides,
}) {
  const passes = {
    rls: { passed: false, issues: [] },
    syntax: { passed: false, issues: [] },
    schema: { passed: false, issues: [] },
    semantic: { passed: false, issues: [] },
  };

  const validationStart = Date.now();

  // Pass 1: RLS (programmatic)
  const rlsStart = Date.now();
  const rlsResult = validateRls(sql, rlsContext);
  passes.rls = {
    passed: rlsResult.valid,
    issues: rlsResult.issues,
  };
  logger.info(`  validate:rls (${Date.now() - rlsStart}ms)`, { passed: passes.rls.passed });
  onProgress?.('rls', passes.rls);

  if (!passes.rls.passed) {
    logger.info(`  validate:total (${Date.now() - validationStart}ms)`, { result: 'RLS_FAIL' });
    return {
      overall_valid: false,
      passes,
    };
  }

  // Pass 2: Syntax (SET PARSEONLY ON) — skipped if agent already dry-ran
  const syntaxStart = Date.now();
  if (skipSyntax) {
    passes.syntax = { passed: true, issues: [] };
    logger.info(`  validate:syntax (skipped)`);
  } else {
    const syntaxResult = await validateSyntax(sql);
    passes.syntax = {
      passed: syntaxResult.valid,
      issues: syntaxResult.issues,
    };
    logger.info(`  validate:syntax (${Date.now() - syntaxStart}ms)`, { passed: passes.syntax.passed });
  }
  onProgress?.('syntax', passes.syntax);

  if (!passes.syntax.passed) {
    logger.info(`  validate:total (${Date.now() - validationStart}ms)`, { result: 'SYNTAX_FAIL' });
    return {
      overall_valid: false,
      passes,
    };
  }

  // Pass 2b: Schema (column/table names vs schema-knowledge) — deterministic
  const schemaStart = Date.now();
  const schemaResult = validateSchema(sql);
  passes.schema = {
    passed: schemaResult.valid,
    issues: schemaResult.issues,
  };
  logger.info(`  validate:schema (${Date.now() - schemaStart}ms)`, { passed: passes.schema.passed });
  onProgress?.('schema', passes.schema);

  if (!passes.schema.passed) {
    logger.info(`  validate:total (${Date.now() - validationStart}ms)`, { result: 'SCHEMA_FAIL' });
    return {
      overall_valid: false,
      passes,
    };
  }

  // Pass 3: Semantic (LLM) — only if Pass 1, 2, and schema pass
  if (question) {
    const semanticStart = Date.now();
    logger.info('  validate:semantic — LLM call starting...');
    const semanticResult = await validateSemantics({
      sql,
      question,
      detectedEntities,
      multiQueryContext,
      nodeModelOverrides,
    });
    passes.semantic = {
      passed: semanticResult.valid,
      issues: semanticResult.issues,
      meta: semanticResult.meta || null,
    };
    const issuesSummary = passes.semantic.issues.map((i) => (typeof i === 'string' ? i : i.description || '')).join('; ');
    logger.info(`  validate:semantic (${Date.now() - semanticStart}ms)`, {
      passed: passes.semantic.passed,
      issues: issuesSummary || 'none',
    });
    onProgress?.('semantic', passes.semantic);

    if (!passes.semantic.passed) {
      logger.info(`  validate:total (${Date.now() - validationStart}ms)`, { result: 'SEMANTIC_FAIL' });
      return {
        overall_valid: false,
        passes,
      };
    }
  } else {
    passes.semantic = { passed: true, issues: [], meta: null };
    logger.info('  validate:semantic (skipped — no question)');
    onProgress?.('semantic', passes.semantic);
  }

  logger.info(`  validate:total (${Date.now() - validationStart}ms)`, { result: 'PASS' });

  return {
    overall_valid: true,
    passes,
  };
}

module.exports = { validate };
