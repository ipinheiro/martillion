// @ts-check
import { matchAnswer } from "./matcher.js";
import { NO_ANSWER, stageForScore, TOP_TIER, tierForAuthored, UTOPIAN } from "./scorer.js";
import { TOPICS } from "./topics.js";

export const ROUNDS = 7;
export const MAX_PER_TOPIC = 2;
export const RECENT_LIMIT = 40;
/** Distinct topics a bank needs before the per-topic cap can still fill a game. */
export const MIN_TOPICS = Math.ceil(ROUNDS / MAX_PER_TOPIC);
export const PERFECT_SCORE = ROUNDS * TOP_TIER.points;

/**
 * @typedef {object} Question
 * @property {string} id
 * @property {string} topic
 * @property {string} prompt
 * @property {import("./matcher.js").AnswerEntry[]} answers
 */

/**
 * @typedef {object} RoundResult
 * @property {string} questionId
 * @property {string} prompt
 * @property {string} input
 * @property {string | null} matchedAnswer
 * @property {string | null} remark
 * @property {import("./scorer.js").Tier} tier
 */

/**
 * @typedef {object} Summary
 * @property {number} total
 * @property {RoundResult[]} rounds
 * @property {import("./scorer.js").Stage} stage
 */

/**
 * @param {unknown} value
 * @returns {value is Question}
 */
function isQuestion(value) {
  if (typeof value !== "object" || value === null) return false;
  const q = /** @type {Record<string, unknown>} */ (value);
  return (
    typeof q.id === "string" &&
    typeof q.topic === "string" &&
    TOPICS.includes(q.topic) &&
    typeof q.prompt === "string" &&
    Array.isArray(q.answers)
  );
}

/**
 * Shape-checks a freshly loaded bank. Throws a descriptive error rather than letting a
 * malformed file surface as a TypeError mid-game.
 * @param {unknown} value
 * @returns {Question[]}
 */
export function validateBank(value) {
  if (!Array.isArray(value)) throw new Error("Bank is not an array");
  for (const question of value) {
    if (!isQuestion(question)) {
      throw new Error(`Malformed question: ${JSON.stringify(question).slice(0, 80)}`);
    }
  }
  const topics = new Set(value.map((question) => question.topic));
  if (value.length < ROUNDS || topics.size < MIN_TOPICS) {
    throw new Error(
      `Bank cannot fill a game: ${value.length} questions across ${topics.size} topics`,
    );
  }
  return value;
}

/**
 * @template T
 * @param {T[]} items
 * @param {() => number} rng returns a number in [0, 1)
 */
function shuffle(items, rng) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Seven questions, at most two per topic, avoiding recent ids. When too few unseen
 * questions remain the exclusion list resets, as the original design says.
 * @param {Question[]} bank
 * @param {string[]} recentIds
 * @param {() => number} rng
 */
export function sampleQuestions(bank, recentIds, rng) {
  let pool = bank.filter((question) => !recentIds.includes(question.id));
  if (pool.length < ROUNDS) pool = [...bank];
  /** @type {Question[]} */
  const picked = [];
  const perTopic = new Map();

  /** @param {Question[]} candidates */
  function take(candidates) {
    for (const question of candidates) {
      if (picked.some((p) => p.id === question.id)) continue;
      const count = perTopic.get(question.topic) ?? 0;
      if (count >= MAX_PER_TOPIC) continue;
      picked.push(question);
      perTopic.set(question.topic, count + 1);
      if (picked.length === ROUNDS) return;
    }
  }

  take(shuffle(pool, rng));
  if (picked.length < ROUNDS) take(shuffle(bank, rng));
  if (picked.length < ROUNDS) {
    throw new Error(`Bank cannot fill a game: picked ${picked.length} of ${ROUNDS}`);
  }
  return picked;
}

/**
 * @param {string[]} recentIds
 * @param {string[]} playedIds
 */
export function updateRecent(recentIds, playedIds) {
  return [...recentIds, ...playedIds].slice(-RECENT_LIMIT);
}

/** @param {import("./matcher.js").MatchResult} match */
function tierFor(match) {
  if (match.status === "empty") return NO_ANSWER;
  if (match.entry === null) return UTOPIAN;
  return tierForAuthored(match.entry.tier);
}

/** @param {Question[]} questions */
export function createUprising(questions) {
  /** @type {RoundResult[]} */
  const rounds = [];

  function current() {
    if (rounds.length >= questions.length) throw new Error("The uprising is over");
    return questions[rounds.length];
  }

  return {
    get round() {
      return rounds.length;
    },
    isOver: () => rounds.length >= questions.length,
    current,
    /** @param {string} input */
    submit(input) {
      const question = current();
      const match = matchAnswer(input, question.answers);
      /** @type {RoundResult} */
      const result = {
        questionId: question.id,
        prompt: question.prompt,
        input,
        matchedAnswer: match.entry?.answer ?? null,
        remark: match.entry?.remark ?? null,
        tier: tierFor(match),
      };
      rounds.push(result);
      return result;
    },
    /** @returns {Summary} */
    summary() {
      const total = rounds.reduce((sum, result) => sum + result.tier.points, 0);
      return {
        total,
        rounds: rounds.map((result) => ({ ...result })),
        stage: stageForScore(total),
      };
    },
  };
}
