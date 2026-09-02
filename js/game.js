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

/**
 * @typedef {object} SubmitOutcome
 * @property {"matched" | "unverified" | "empty"} status
 * @property {RoundResult | null} result set only when the answer was recognised
 */

/** @param {Question[]} questions */
export function createUprising(questions) {
  /** @type {RoundResult[]} */
  const rounds = [];
  /** @type {string[]} unverified attempts in the round in progress */
  let rejected = [];

  function current() {
    if (rounds.length >= questions.length) throw new Error("The uprising is over");
    return questions[rounds.length];
  }

  /**
   * @param {Question} question
   * @param {string} input
   * @param {import("./matcher.js").AnswerEntry | null} entry
   * @param {import("./scorer.js").Tier} tier
   */
  function close(question, input, entry, tier) {
    /** @type {RoundResult} */
    const result = {
      questionId: question.id,
      prompt: question.prompt,
      input,
      matchedAnswer: entry?.answer ?? null,
      remark: entry?.remark ?? null,
      tier,
    };
    rounds.push(result);
    rejected = [];
    return result;
  }

  return {
    get round() {
      return rounds.length;
    },
    /** Unverified attempts offered so far in the round in progress. */
    get rejected() {
      return [...rejected];
    },
    isOver: () => rounds.length >= questions.length,
    current,
    /**
     * Offer an answer. Only a recognised answer closes the round; an unverified one is
     * remembered and the player may try again.
     * @param {string} input
     * @returns {SubmitOutcome}
     */
    submit(input) {
      const question = current();
      const match = matchAnswer(input, question.answers);
      if (match.status === "matched" && match.entry) {
        const result = close(question, input, match.entry, tierForAuthored(match.entry.tier));
        return { status: "matched", result };
      }
      if (match.status === "unverified") rejected.push(input);
      return { status: match.status, result: null };
    },
    /**
     * Time is up. Whatever is in the box gets one last try; otherwise the round scores zero,
     * as Utopian when something unverified was offered and as no answer when nothing was.
     * @param {string} input
     */
    timeout(input) {
      const question = current();
      const match = matchAnswer(input, question.answers);
      if (match.status === "matched" && match.entry) {
        return close(question, input, match.entry, tierForAuthored(match.entry.tier));
      }
      const lastTry = match.status === "unverified" ? input : (rejected.at(-1) ?? "");
      return close(question, lastTry, null, lastTry ? UTOPIAN : NO_ANSWER);
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
