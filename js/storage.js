// @ts-check
import { normalize } from "./matcher.js";

export const KEY = "martillion.v1";
/** Newest unknown answers kept. */
export const UNVERIFIED_LIMIT = 200;

/**
 * An answer the bank did not know, kept so the bank can be widened from real play.
 * @typedef {object} Unverified
 * @property {string} questionId
 * @property {string} input
 */

/**
 * @typedef {object} SavedState
 * @property {number} bestScore
 * @property {number} totalPoints
 * @property {number} gamesPlayed
 * @property {string[]} recentQuestionIds
 * @property {Unverified[]} unverified
 */

/** @typedef {Pick<Storage, "getItem" | "setItem">} Backend */

/** @returns {SavedState} */
export function defaultState() {
  return { bestScore: 0, totalPoints: 0, gamesPlayed: 0, recentQuestionIds: [], unverified: [] };
}

const NUMBER_FIELDS = /** @type {const} */ (["bestScore", "totalPoints", "gamesPlayed"]);

/**
 * @param {unknown} value
 * @returns {value is Unverified}
 */
function isUnverified(value) {
  if (typeof value !== "object" || value === null) return false;
  const entry = /** @type {Record<string, unknown>} */ (value);
  return (
    typeof entry.questionId === "string" &&
    entry.questionId.length > 0 &&
    typeof entry.input === "string" &&
    entry.input.length > 0
  );
}

/**
 * @param {unknown} value
 * @returns {value is SavedState}
 */
export function isValidState(value) {
  if (typeof value !== "object" || value === null) return false;
  const candidate = /** @type {Record<string, unknown>} */ (value);
  if (!NUMBER_FIELDS.every((field) => Number.isFinite(candidate[field]))) return false;
  const ids = candidate.recentQuestionIds;
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) return false;
  return Array.isArray(candidate.unverified) && candidate.unverified.every(isUnverified);
}

/**
 * Fills in fields added since a state was first stored, so an older state loads instead of
 * resetting to defaults.
 * @param {unknown} value
 */
function migrate(value) {
  if (typeof value !== "object" || value === null) return value;
  const candidate = /** @type {Record<string, unknown>} */ (value);
  return "unverified" in candidate ? candidate : { ...candidate, unverified: [] };
}

/** @param {SavedState} state */
function clone(state) {
  return {
    bestScore: state.bestScore,
    totalPoints: state.totalPoints,
    gamesPlayed: state.gamesPlayed,
    recentQuestionIds: [...state.recentQuestionIds],
    unverified: state.unverified.map((entry) => ({
      questionId: entry.questionId,
      input: entry.input,
    })),
  };
}

/** @param {string} raw */
function parse(raw) {
  try {
    return /** @type {unknown} */ (JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Folds newly offered unknown answers into the stored list. Inputs are trimmed; an empty one, or
 * a repeat of the same normalised input on the same question, is not added; the newest
 * UNVERIFIED_LIMIT are kept.
 * @param {Unverified[]} existing
 * @param {Unverified[]} additions
 * @returns {Unverified[]}
 */
export function mergeUnverified(existing, additions) {
  const merged = [...existing];
  const seen = new Set(existing.map((entry) => `${entry.questionId}\n${normalize(entry.input)}`));
  for (const entry of additions) {
    const input = entry.input.trim();
    const key = `${entry.questionId}\n${normalize(input)}`;
    if (!input || seen.has(key)) continue;
    seen.add(key);
    merged.push({ questionId: entry.questionId, input });
  }
  return merged.slice(-UNVERIFIED_LIMIT);
}

/**
 * Wraps a Storage-like backend. Pass null when the browser denies storage entirely.
 * @param {Backend | null} backend
 */
export function createStorage(backend) {
  let memory = defaultState();

  function load() {
    let raw = null;
    try {
      raw = backend ? backend.getItem(KEY) : null;
    } catch {
      return clone(memory);
    }
    if (raw === null) return clone(memory);
    const parsed = migrate(parse(raw));
    memory = isValidState(parsed) ? clone(parsed) : defaultState();
    return clone(memory);
  }

  /** @param {SavedState} state */
  function save(state) {
    if (!isValidState(state)) throw new TypeError("Invalid saved state");
    memory = clone(state);
    if (!backend) return;
    try {
      backend.setItem(KEY, JSON.stringify(memory));
    } catch {
      // Storage full or denied. Memory keeps the state for this session.
    }
  }

  return { load, save };
}
