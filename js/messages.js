// @ts-check
import { NO_ANSWER } from "./scorer.js";

/** @typedef {import("./game.js").RoundResult} RoundResult */
/** @typedef {ReturnType<import("./scorer.js").fiveYearPlans>} Plans */

/** @param {RoundResult} result */
export function revealDetail(result) {
  if (result.tier.id === NO_ANSWER.id) return "Time's up. Silence. The revolution needs answers.";
  if (result.matchedAnswer === null) {
    return `Time's up. The committee could not verify "${result.input.trim()}". Zero points, comrade.`;
  }
  const line = `The committee recognises "${result.matchedAnswer}".`;
  return result.remark ? `${line} ${result.remark}` : line;
}

/**
 * Shown on the round screen when an answer is not recognised; the round carries on.
 * @param {string} input
 */
export function rejectionMessage(input) {
  return `"${input.trim()}" is not a recognised answer. Try another.`;
}

/**
 * @param {number} total this game's score
 * @param {number} previousBest the best before this game was counted
 */
export function recordsMessage(total, previousBest) {
  if (total > previousBest) return "A new personal best. The politburo is pleased.";
  return `Personal best: ${previousBest}.`;
}

/** @param {Plans} plans */
export function planLabel(plans) {
  return `${plans.progress} / ${plans.target} points toward the next plan`;
}

/** @param {Plans} plans */
export function planMessage(plans) {
  const progress = `${plans.progress} / ${plans.target}`;
  if (plans.completed === 0) return `${progress} points toward your first five-year plan`;
  return `Five-year plans completed: ${plans.completed} - ${progress} toward the next`;
}

/**
 * What the results list shows for a round: the recognised answer, else what was typed, else
 * "no answer".
 * @param {RoundResult} result
 */
export function roundAnswer(result) {
  return result.matchedAnswer ?? (result.input.trim() || "no answer");
}

/** @param {RoundResult} result */
export function roundLine(result) {
  return `${result.tier.emoji} ${result.prompt} - ${roundAnswer(result)} (+${result.tier.points})`;
}

/**
 * @param {number} round 1-based
 * @param {number} total
 */
export function roundCounter(round, total) {
  return `Round ${round} of ${total}`;
}
