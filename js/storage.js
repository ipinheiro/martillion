// @ts-check

export const KEY = "martillion.v1";

/**
 * @typedef {object} SavedState
 * @property {number} bestScore
 * @property {number} totalPoints
 * @property {number} gamesPlayed
 * @property {string[]} recentQuestionIds
 */

/** @typedef {Pick<Storage, "getItem" | "setItem">} Backend */

/** @returns {SavedState} */
export function defaultState() {
  return { bestScore: 0, totalPoints: 0, gamesPlayed: 0, recentQuestionIds: [] };
}

const NUMBER_FIELDS = /** @type {const} */ (["bestScore", "totalPoints", "gamesPlayed"]);

/**
 * @param {unknown} value
 * @returns {value is SavedState}
 */
export function isValidState(value) {
  if (typeof value !== "object" || value === null) return false;
  const candidate = /** @type {Record<string, unknown>} */ (value);
  if (!NUMBER_FIELDS.every((field) => Number.isFinite(candidate[field]))) return false;
  const ids = candidate.recentQuestionIds;
  return Array.isArray(ids) && ids.every((id) => typeof id === "string");
}

/** @param {SavedState} state */
function clone(state) {
  return {
    bestScore: state.bestScore,
    totalPoints: state.totalPoints,
    gamesPlayed: state.gamesPlayed,
    recentQuestionIds: [...state.recentQuestionIds],
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
    const parsed = parse(raw);
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
