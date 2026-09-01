const KEY = "martillion.v1";

const DEFAULTS = { bestScore: 0, totalPoints: 0, gamesPlayed: 0, recentQuestionIds: [] };

function isValid(state) {
  return (
    typeof state === "object" && state !== null &&
    typeof state.bestScore === "number" &&
    typeof state.totalPoints === "number" &&
    typeof state.gamesPlayed === "number" &&
    Array.isArray(state.recentQuestionIds)
  );
}

function clone(state) {
  return { ...state, recentQuestionIds: [...state.recentQuestionIds] };
}

export function createStorage(backend) {
  let memory = clone(DEFAULTS);

  function load() {
    let raw;
    try {
      raw = backend.getItem(KEY);
    } catch {
      return clone(memory);
    }
    if (raw === null) return clone(memory);
    try {
      const parsed = JSON.parse(raw);
      if (!isValid(parsed)) return clone(DEFAULTS);
      memory = clone(parsed);
      return clone(parsed);
    } catch {
      return clone(DEFAULTS);
    }
  }

  function save(state) {
    memory = clone(state);
    try {
      backend.setItem(KEY, JSON.stringify(state));
    } catch {
      // storage unavailable - keep state in memory for this session
    }
  }

  return { load, save };
}
