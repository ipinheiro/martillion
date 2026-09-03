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
 * An answer the committee has considered and rules out, with the reason it gives.
 * @typedef {object} RejectedEntry
 * @property {string} answer
 * @property {string[]} aliases
 * @property {string} reason
 */

/** Anything with a canonical answer and its aliases. @typedef {Pick<AnswerEntry, "answer" | "aliases">} Entry */

/**
 * @typedef {{ status: "matched", entry: AnswerEntry }
 *   | { status: "rejected", entry: RejectedEntry }
 *   | { status: "unverified" | "empty", entry: null }} MatchResult
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

/** @param {Entry} entry */
function forms(entry) {
  return [entry.answer, ...entry.aliases].map(normalize);
}

/**
 * @template {Entry} T
 * @param {string} norm
 * @param {T[]} entries
 * @returns {T | null}
 */
function exact(norm, entries) {
  return entries.find((entry) => forms(entry).includes(norm)) ?? null;
}

/**
 * The closest entry within tolerance. `prefer(candidate, best)` breaks an equidistant tie.
 * @template {Entry} T
 * @param {string} norm
 * @param {T[]} entries
 * @param {(candidate: T, best: T) => boolean} prefer
 * @returns {T | null}
 */
function closest(norm, entries, prefer) {
  /** @type {{ entry: T, distance: number } | null} */
  let best = null;
  for (const entry of entries) {
    for (const form of forms(entry)) {
      const distance = levenshtein(norm, form);
      if (distance > tolerance(form.length)) continue;
      const closer = best === null || distance < best.distance;
      const tie = best !== null && distance === best.distance && prefer(entry, best.entry);
      if (closer || tie) best = { entry, distance };
    }
  }
  return best ? best.entry : null;
}

/** @type {(candidate: AnswerEntry, best: AnswerEntry) => boolean} */
const commoner = (candidate, best) => candidate.tier < best.tier;
const first = () => false;

/**
 * Exact answer, exact rejection, fuzzy answer, fuzzy rejection. Exact beats fuzzy across both
 * pools, so a rejection typed perfectly can never score as a typo of an answer. A tie between
 * answers goes to the commoner tier; between rejections, to the one listed first.
 * @param {string} input
 * @param {AnswerEntry[]} answers
 * @param {RejectedEntry[]} [rejected]
 * @returns {MatchResult}
 */
export function matchAnswer(input, answers, rejected = []) {
  const norm = normalize(input);
  if (!norm) return { status: "empty", entry: null };

  const exactAnswer = exact(norm, answers);
  if (exactAnswer) return { status: "matched", entry: exactAnswer };
  const exactRejection = exact(norm, rejected);
  if (exactRejection) return { status: "rejected", entry: exactRejection };

  const fuzzyAnswer = closest(norm, answers, commoner);
  if (fuzzyAnswer) return { status: "matched", entry: fuzzyAnswer };
  const fuzzyRejection = closest(norm, rejected, first);
  if (fuzzyRejection) return { status: "rejected", entry: fuzzyRejection };
  return { status: "unverified", entry: null };
}
