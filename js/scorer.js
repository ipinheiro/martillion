// @ts-check

/**
 * @typedef {object} Tier
 * @property {string} id
 * @property {string} name
 * @property {number} points
 * @property {string} emoji
 */

/**
 * @typedef {object} Stage
 * @property {number} min
 * @property {string} name
 * @property {string} verdict
 * @property {string} flavour
 */

/** @param {Tier} tier */
const tier = (tier) => Object.freeze(tier);

/** The whole tier vocabulary, rarest first. @type {readonly Tier[]} */
export const TIERS = Object.freeze([
  tier({ id: "full-marx", name: "Full Marx", points: 100, emoji: "⭐" }),
  tier({ id: "vanguard", name: "Vanguard", points: 85, emoji: "🚩" }),
  tier({ id: "comrade", name: "Comrade", points: 60, emoji: "✊" }),
  tier({ id: "masses", name: "The Masses", points: 30, emoji: "👥" }),
  tier({ id: "false-consciousness", name: "False Consciousness", points: 10, emoji: "🐑" }),
  tier({ id: "utopian", name: "Utopian", points: 0, emoji: "💭" }),
  tier({ id: "no-answer", name: "No answer", points: 0, emoji: "⬛" }),
]);

const byId = new Map(TIERS.map((entry) => [entry.id, entry]));
const authored = TIERS.filter((entry) => entry.points > 0);
const byAuthoredPoints = new Map(authored.map((entry) => [entry.points, entry]));

/** The tier values an author may write in the bank, rarest first. */
export const AUTHORED_POINTS = Object.freeze(authored.map((entry) => entry.points));

/** @param {string} id */
export function tierById(id) {
  const found = byId.get(id);
  if (!found) throw new Error(`Unknown tier id: ${id}`);
  return found;
}

/** @param {number} points an authored tier value from the bank */
export function tierForAuthored(points) {
  const found = byAuthoredPoints.get(points);
  if (!found) throw new Error(`Unknown authored tier: ${points}`);
  return found;
}

export const TOP_TIER = TIERS[0];
export const UTOPIAN = tierById("utopian");
export const NO_ANSWER = tierById("no-answer");

/** @type {readonly Stage[]} highest first */
const STAGES = Object.freeze(
  [
    {
      min: 650,
      name: "Full communism",
      verdict: "Full communism achieved",
      flavour: "The state has withered away. Utopia, scientifically.",
    },
    {
      min: 500,
      name: "Socialism",
      verdict: "Socialism achieved",
      flavour: "From each according to their ability. Ability detected.",
    },
    {
      min: 350,
      name: "Revolution brewing",
      verdict: "Revolution brewing",
      flavour: "A spectre is haunting this quiz.",
    },
    {
      min: 200,
      name: "Capitalism",
      verdict: "Stuck in capitalism",
      flavour: "You have nothing to lose but your chains.",
    },
    {
      min: 0,
      name: "Feudalism",
      verdict: "Stuck in feudalism",
      flavour: "The material conditions were not yet ripe.",
    },
  ].map((stage) => Object.freeze(stage)),
);

export const PLAN_TARGET = 2000;

/** @param {number} total */
export function stageForScore(total) {
  const stage = STAGES.find((candidate) => total >= candidate.min);
  if (!Number.isFinite(total) || stage === undefined) throw new Error(`Invalid score: ${total}`);
  return stage;
}

/** @param {number} totalPoints */
export function fiveYearPlans(totalPoints) {
  return {
    completed: Math.floor(totalPoints / PLAN_TARGET),
    progress: totalPoints % PLAN_TARGET,
    target: PLAN_TARGET,
  };
}
