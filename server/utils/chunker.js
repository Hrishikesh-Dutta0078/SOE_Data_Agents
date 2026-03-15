/**
 * Document chunker — splits a text document into overlapping chunks
 * suitable for embedding and vector-database storage.
 *
 * Strategy:
 *   1. Split by section headers (## / ### in markdown) first.
 *   2. If a section is still too long, split by paragraphs.
 *   3. Add configurable character overlap between consecutive chunks
 *      to preserve context at boundaries.
 *
 * Usage:
 *   const { chunkDocument } = require('./utils/chunker');
 *   const chunks = chunkDocument(markdownText, { chunkSize: 500, overlap: 100 });
 */

// Default chunking parameters (previously from RAG constants, now hardcoded
// since the general RAG pipeline has been replaced by targeted indexers).
const DEFAULT_CHUNK_SIZE = 500;
const DEFAULT_CHUNK_OVERLAP = 100;

/**
 * Rough token estimate — ~4 characters per token on average for English.
 * @param {string} text
 * @returns {number}
 */
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

/**
 * Split a markdown document into overlapping chunks.
 *
 * @param {string} text — full document text
 * @param {object} [opts]
 * @param {number} [opts.chunkSize] — target chunk size in approximate tokens
 * @param {number} [opts.overlap]   — character overlap between chunks
 * @returns {{ id: string, text: string, metadata: { section: string, index: number } }[]}
 */
function chunkDocument(text, opts = {}) {
  const chunkSize = opts.chunkSize || DEFAULT_CHUNK_SIZE;
  const overlap = opts.overlap || DEFAULT_CHUNK_OVERLAP;

  // --- Step 1: Split by markdown sections ---
  const sectionRegex = /^(#{1,3})\s+(.+)$/gm;
  const sections = [];
  let lastIndex = 0;
  let lastHeading = 'Introduction';
  let match;

  while ((match = sectionRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const body = text.slice(lastIndex, match.index).trim();
      if (body.length > 0) {
        sections.push({ heading: lastHeading, body });
      }
    }
    lastHeading = match[2].trim();
    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last heading
  const remaining = text.slice(lastIndex).trim();
  if (remaining.length > 0) {
    sections.push({ heading: lastHeading, body: remaining });
  }

  // --- Step 2: For each section, split into chunks ---
  const chunks = [];
  let globalIndex = 0;

  for (const section of sections) {
    const sectionChunks = splitIntoChunks(section.body, chunkSize, overlap);

    for (const chunkText of sectionChunks) {
      chunks.push({
        id: `chunk_${globalIndex}`,
        text: chunkText.trim(),
        metadata: {
          section: section.heading,
          index: globalIndex,
        },
      });
      globalIndex++;
    }
  }

  return chunks;
}

/**
 * Split a block of text into chunks of approximately `chunkSize` tokens.
 * Paragraphs are kept intact where possible.
 *
 * @param {string} text
 * @param {number} chunkSize — target tokens per chunk
 * @param {number} overlap   — character overlap between chunks
 * @returns {string[]}
 */
function splitIntoChunks(text, chunkSize, overlap) {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);

  const chunks = [];
  let current = '';

  for (const para of paragraphs) {
    const combined = current ? `${current}\n\n${para}` : para;

    if (estimateTokens(combined) > chunkSize && current.length > 0) {
      // Current chunk is full — push it
      chunks.push(current);

      // Start new chunk with overlap from end of previous
      const overlapText = current.slice(-overlap);
      current = overlapText ? `${overlapText}\n\n${para}` : para;
    } else {
      current = combined;
    }
  }

  // Push final chunk
  if (current.trim().length > 0) {
    chunks.push(current);
  }

  return chunks;
}

module.exports = { chunkDocument, estimateTokens };
