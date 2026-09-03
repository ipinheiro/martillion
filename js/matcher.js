// @ts-check

/**
 * One answer in the bank. `tier` is the authored point value; a higher number is rarer.
 * @typedef {object} AnswerEntry
 * @property {string} answer
 * @property {string[]} aliases
 * @property {number} tier
 * @property {string} [remark]
 */

/**
 * @typedef {object} MatchResult
 * @property {"matched" | "unverified" | "empty"} status
 * @property {AnswerEntry | null} entry
 */

const ARTICLE = /^(the|a|an)\s+/;

/** @param {string} text */
export function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(ARTICLE, "");
}

/**
 * Edit distance, single-row implementation.
 * @param {string} a
 * @param {string} b
 */
export function levenshtein(a, b) {
  if (a === b) return 0;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const previous = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = previous;
    }
  }
  return row[b.length];
}

/**
 * Edits allowed against a bank form of this normalised length.
 * @param {number} length
 */
export function tolerance(length) {
  if (length >= 10) return 2;
  if (length >= 5) return 1;
  return 0;
}

/** @param {AnswerEntry} entry */
function forms(entry) {
  return [entry.answer, ...entry.aliases].map(normalize);
}

/**
 * Exact match first. Otherwise the closest form within tolerance, ties to the commoner tier.
 * @param {string} input
 * @param {AnswerEntry[]} answers
 * @returns {MatchResult}
 */
export function matchAnswer(input, answers) {
  const norm = normalize(input);
  if (!norm) return { status: "empty", entry: null };

  const candidates = answers.map((entry) => ({ entry, forms: forms(entry) }));
  const exact = candidates.find((candidate) => candidate.forms.includes(norm));
  if (exact) return { status: "matched", entry: exact.entry };

  /** @type {{ entry: AnswerEntry, distance: number } | null} */
  let best = null;
  for (const { entry, forms: entryForms } of candidates) {
    for (const form of entryForms) {
      const distance = levenshtein(norm, form);
      if (distance > tolerance(form.length)) continue;
      const closer = best === null || distance < best.distance;
      const commonerTie =
        best !== null && distance === best.distance && entry.tier < best.entry.tier;
      if (closer || commonerTie) best = { entry, distance };
    }
  }
  return best ? { status: "matched", entry: best.entry } : { status: "unverified", entry: null };
}
