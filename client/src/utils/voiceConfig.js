/** Max recording duration in ms — hard cap to prevent runaway sessions */
export const MAX_RECORDING_MS = 60_000;

/** Default recognition language */
export const RECOGNITION_LANGUAGE = 'en-US';

/**
 * Normalizes a voice transcript for the Text-to-SQL pipeline.
 * Intentionally minimal — the LangGraph classify/research nodes handle
 * most NL interpretation. This only converts spoken forms that would
 * confuse the pipeline (operators, current year).
 */
const NORMALIZATIONS = [
  [/\bnot equal to\b/gi, '!='],
  [/\bgreater than\b/gi, '>'],
  [/\bmore than\b/gi, '>'],
  [/\bless than\b/gi, '<'],
  [/\bequal to\b/gi, '='],
  [/\bequals\b/gi, '='],
  [/\btwenty twenty five\b/gi, '2025'],
  [/\btwenty twenty six\b/gi, '2026'],
  [/\bper cent\b/gi, '%'],
  [/\bpercent\b/gi, '%'],
  [/\btop ten\b/gi, 'top 10'],
];

export function normalizeTranscript(text) {
  if (!text) return '';
  let result = text;
  for (const [pattern, replacement] of NORMALIZATIONS) {
    result = result.replace(pattern, replacement);
  }
  return result.trim();
}
