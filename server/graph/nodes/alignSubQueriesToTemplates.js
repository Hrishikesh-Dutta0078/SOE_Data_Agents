/**
 * AlignSubQueriesToTemplates Node
 *
 * Runs after Decompose. For each sub-query in the plan, attempts to resolve a
 * gold template match (programmatic first, then LLM fallback). When a match is
 * found the sub-question is rewritten to the template's canonical wording so
 * downstream matching is deterministic. Sub-queries with no template match are
 * kept in the plan and sent to research so the multi-sub-query path remains
 * open to discovery when gold examples don't apply.
 */

const { loadGoldIndex } = require('./classify');
const { findSubQueryMatch, findSubQueryMatchLLMFallback } = require('./subQueryMatch');
const logger = require('../../utils/logger');

async function alignSubQueriesToTemplatesNode(state) {
  const start = Date.now();
  const plan = state.queryPlan || [];
  if (plan.length === 0) {
    return {
      queryPlan: plan,
      trace: [{ node: 'alignSubQueries', timestamp: start, duration: 0, templateAligned: 0, forResearch: 0 }],
    };
  }

  // When a blueprint has user params (e.g., "for EMEA"), append them to each
  // sub-question after canonical rewriting so the writer can apply the filters.
  const userParams = state.blueprintMeta?.userParams || '';

  const { examplesMap } = loadGoldIndex();
  const aligned = [];
  const sentToResearch = [];

  for (const item of plan) {
    const sub = item.subQuestion || '';

    if (item.templateId) {
      const example = examplesMap.get(item.templateId);
      if (example) {
        const rewritten = userParams
          ? `${example.question} ${userParams}`
          : example.question;
        aligned.push({
          ...item,
          subQuestion: rewritten,
          templateId: item.templateId,
        });
        logger.info(`[AlignSubQueries] "${sub.substring(0, 60)}" → direct templateId hit: ${item.templateId}${userParams ? ` (+params: ${userParams})` : ''}`);
        continue;
      }
    }

    let match = findSubQueryMatch(sub);
    if (!match) match = await findSubQueryMatchLLMFallback(sub);

    if (match) {
      const example = examplesMap.get(match.id);
      const canonicalQuestion = example ? example.question : sub;
      const rewritten = userParams
        ? `${canonicalQuestion} ${userParams}`
        : canonicalQuestion;
      aligned.push({
        ...item,
        subQuestion: rewritten,
        templateId: match.id,
      });
      logger.info(
        `[AlignSubQueries] "${sub.substring(0, 60)}" → aligned to ${match.id} ("${canonicalQuestion.substring(0, 50)}")${userParams ? ` (+params: ${userParams})` : ''}`,
      );
    } else {
      // For non-template sub-queries, params are already in the sub-question from expandBlueprintPlan
      aligned.push({ ...item, subQuestion: sub, templateId: undefined });
      sentToResearch.push(item);
      logger.info(`[AlignSubQueries] "${sub.substring(0, 60)}" → no template match, keeping for research`);
    }
  }

  const finalPlan = aligned.map((q, i) => ({ ...q, id: `q${i + 1}` }));

  const templateCount = aligned.filter((a) => a.templateId).length;
  const researchCount = sentToResearch.length;
  const duration = Date.now() - start;
  logger.info(`[AlignSubQueries] Completed in ${duration}ms: ${templateCount} template-aligned, ${researchCount} for research`);

  return {
    queryPlan: finalPlan,
    currentQueryIndex: 0,
    trace: [{
      node: 'alignSubQueries',
      timestamp: start,
      duration,
      templateAligned: templateCount,
      forResearch: researchCount,
      researchQuestions: sentToResearch.map((d) => d.subQuestion?.substring(0, 60)),
    }],
  };
}

module.exports = { alignSubQueriesToTemplatesNode };
