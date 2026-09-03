// @ts-check
import { matchAnswer } from "./matcher.js";
import { NO_ANSWER, stageForScore, TOP_TIER, tierForAuthored, UTOPIAN } from "./scorer.js";
import { TOPICS } from "./topics.js";

export const ROUNDS = 7;
export const MAX_PER_TOPIC = 2;
/** Distinct topics a bank needs before the per-topic cap can still fill a game. */
export const MIN_TOPICS = Math.ceil(ROUNDS / MAX_PER_TOPIC);
export const PERFECT_SCORE = ROUNDS * TOP_TIER.points;

/**
 * How many played ids to remember: everything but one game's worth, so the whole bank is seen
 * before anything repeats, and never below zero.
 * @param {number} bankSize
 */
export function recentLimit(bankSize) {
  return Math.max(0, bankSize - ROUNDS);
}

/**
 * @typedef {object} Question
 * @property {string} id
 * @property {string} topic
 * @property {string} prompt
 * @property {import("./matcher.js").AnswerEntry[]} answers
 * @property {import("./matcher.js").RejectedEntry[]} [rejected]
 */

/** A failed attempt in the round in progress. @typedef {{ input: string, reason: string | null }} Attempt */

/**
 * @typedef {object} RoundResult
 * @property {string} questionId
 * @property {string} prompt
 * @property {string} input
 * @property {string | null} matchedAnswer
 * @property {string | null} remark
 * @property {string | null} reason the committee's reason, when the final attempt was a considered rejection
 * @property {string[]} unverified unknown answers offered during the round, trimmed, in order
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
    Array.isArray(q.answers) &&
    (q.rejected === undefined || Array.isArray(q.rejected))
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
 * @param {number} limit ids to keep; `slice(-0)` would keep everything, hence the guard
 */
export function updateRecent(recentIds, playedIds, limit) {
  if (limit <= 0) return [];
  return [...recentIds, ...playedIds].slice(-limit);
}

/**
 * @typedef {object} SubmitOutcome
 * @property {"matched" | "rejected" | "unverified" | "empty"} status
 * @property {RoundResult | null} result set only when the answer was recognised
 * @property {string | null} reason set only when the committee has considered and rejected it
 */

/** @param {Question[]} questions */
export function createUprising(questions) {
  /** @type {RoundResult[]} */
  const rounds = [];
  /** @type {Attempt[]} */
  let attempts = [];

  function current() {
    if (rounds.length >= questions.length) throw new Error("The uprising is over");
    return questions[rounds.length];
  }

  /**
   * Runs the input past the question. A considered rejection or an unknown answer is remembered
   * as an attempt; a match is left for the caller to close the round with.
   * @param {string} input
   */
  function offer(input) {
    const question = current();
    const match = matchAnswer(input, question.answers, question.rejected ?? []);
    if (match.status === "rejected") attempts.push({ input, reason: match.entry.reason });
    if (match.status === "unverified") attempts.push({ input, reason: null });
    return { question, match };
  }

  /**
   * @param {Question} question
   * @param {string} input
   * @param {import("./matcher.js").AnswerEntry | null} entry
   * @param {import("./scorer.js").Tier} tier
   * @param {string | null} reason
   */
  function close(question, input, entry, tier, reason) {
    /** @type {RoundResult} */
    const result = {
      questionId: question.id,
      prompt: question.prompt,
      input,
      matchedAnswer: entry?.answer ?? null,
      remark: entry?.remark ?? null,
      reason,
      unverified: attempts
        .filter((attempt) => attempt.reason === null)
        .map((attempt) => attempt.input.trim()),
      tier,
    };
    rounds.push(result);
    attempts = [];
    return result;
  }

  return {
    get round() {
      return rounds.length;
    },
    /** Failed attempts so far in the round in progress, each with the committee's reason or null. */
    get attempts() {
      return attempts.map((attempt) => ({ ...attempt }));
    },
    isOver: () => rounds.length >= questions.length,
    current,
    /**
     * Offer an answer. Only a recognised answer closes the round; a considered rejection carries
     * its reason back, and either kind of failure lets the player try again.
     * @param {string} input
     * @returns {SubmitOutcome}
     */
    submit(input) {
      const { question, match } = offer(input);
      if (match.status === "matched") {
        const tier = tierForAuthored(match.entry.tier);
        return {
          status: "matched",
          result: close(question, input, match.entry, tier, null),
          reason: null,
        };
      }
      const reason = match.status === "rejected" ? match.entry.reason : null;
      return { status: match.status, result: null, reason };
    },
    /**
     * Time is up. Whatever is in the box gets one last try; otherwise the round scores zero,
     * as Utopian when anything was offered and as no answer when nothing was. The last attempt
     * of either kind is the round's input, with the committee's reason if it had one.
     * @param {string} input
     */
    timeout(input) {
      const { question, match } = offer(input);
      if (match.status === "matched") {
        return close(question, input, match.entry, tierForAuthored(match.entry.tier), null);
      }
      const last = attempts.at(-1);
      if (last === undefined) return close(question, "", null, NO_ANSWER, null);
      return close(question, last.input, null, UTOPIAN, last.reason);
    },
    /** @returns {Summary} */
    summary() {
      const total = rounds.reduce((sum, result) => sum + result.tier.points, 0);
      return {
        total,
        rounds: rounds.map((result) => ({ ...result, unverified: [...result.unverified] })),
        stage: stageForScore(total),
      };
    },
  };
}

/**
 * Every unknown answer offered in the game, with the question it was offered for.
 * @param {Summary} summary
 * @returns {{ questionId: string, input: string }[]}
 */
export function unverifiedAttempts(summary) {
  return summary.rounds.flatMap((round) =>
    round.unverified.map((input) => ({ questionId: round.questionId, input })),
  );
}
