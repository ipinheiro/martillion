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

export function createStorage(backend) {
  let memory = { ...DEFAULTS };

  function load() {
    let raw;
    try {
      raw = backend.getItem(KEY);
    } catch {
      return { ...memory };
    }
    if (raw === null) return { ...memory };
    try {
      const parsed = JSON.parse(raw);
      if (!isValid(parsed)) return { ...DEFAULTS };
      memory = parsed;
      return { ...parsed };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function save(state) {
    memory = { ...state };
    try {
      backend.setItem(KEY, JSON.stringify(state));
    } catch {
      // storage unavailable - keep state in memory for this session
    }
  }

  return { load, save };
}
