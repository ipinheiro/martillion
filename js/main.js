// @ts-check
import {
  createUprising,
  PERFECT_SCORE,
  ROUNDS,
  sampleQuestions,
  updateRecent,
  validateBank,
} from "./game.js";
import {
  planLabel,
  planMessage,
  recordsMessage,
  rejectionMessage,
  revealDetail,
  roundAnswer,
  roundCounter,
} from "./messages.js";
import { paintSprite, spriteToSvgString } from "./pixel.js";
import { fiveYearPlans, PLAN_TARGET, TOP_TIER } from "./scorer.js";
import { copyShare, shareText } from "./share.js";
import { HAMMER_SICKLE, MARX_HERO, reactionFor, SPRITE_COLOURS, STAR } from "./sprites.js";
import { createStorage } from "./storage.js";
import { TOPICS, topicLabel } from "./topics.js";

export const ROUND_SECONDS = 30;
const ROUND_MS = ROUND_SECONDS * 1000;
const TICK_MS = 100;
const FETCH_TIMEOUT_MS = 10_000;
const SHARE_FEEDBACK_MS = 2000;

/**
 * @typedef {object} InitOptions
 * @property {Pick<Storage, "getItem" | "setItem"> | null} [storageBackend] null means memory only
 * @property {typeof fetch} [fetchImpl]
 * @property {() => number} [random]
 * @property {() => number} [now] monotonic milliseconds
 */

function readLocalStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Wires the whole game to a document. Called once by bootstrap.js.
 * @param {Document} doc
 * @param {InitOptions} [options]
 */
export function init(doc, options = {}) {
  const backend =
    "storageBackend" in options ? (options.storageBackend ?? null) : readLocalStorage();
  const storage = createStorage(backend);
  const fetchImpl = options.fetchImpl ?? ((url, opts) => fetch(url, opts));
  const random = options.random ?? Math.random;
  const now = options.now ?? (() => performance.now());

  let state = storage.load();
  /** @type {import("./game.js").Question[]} */
  let bank = [];
  /** @type {ReturnType<typeof createUprising> | null} */
  let uprising = null;
  /** @type {ReturnType<typeof setInterval> | null} */
  let timerId = null;
  /** @type {AbortController | null} */
  let bootController = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let shareTimer = null;
  let lastShare = "";
  let roundHeader = { topic: "", count: "" };

  /** @param {string} id */
  function $(id) {
    const element = doc.getElementById(id);
    if (!element) throw new Error(`Missing element #${id}`);
    return element;
  }

  /** @param {string} id */
  function showScreen(id) {
    $(id);
    const screens = /** @type {NodeListOf<HTMLElement>} */ (doc.querySelectorAll(".screen"));
    for (const screen of screens) {
      screen.hidden = screen.id !== id;
    }
  }

  /** @param {string} detail */
  function showError(detail) {
    stopTimer();
    $("error-detail").textContent = detail;
    showScreen("screen-error");
  }

  // Title -----------------------------------------------------------------

  /**
   * @param {string} barId
   * @param {string} progressId
   * @param {ReturnType<typeof fiveYearPlans>} plans
   */
  function renderPlanBar(barId, progressId, plans) {
    const percent = clamp((plans.progress / plans.target) * 100, 0, 100);
    $(barId).style.width = `${percent}%`;
    $(progressId).setAttribute("aria-valuemax", String(PLAN_TARGET));
    $(progressId).setAttribute("aria-valuenow", String(plans.progress));
  }

  function renderStats() {
    const plans = fiveYearPlans(state.totalPoints);
    $("best-score").textContent = String(state.bestScore);
    $("plans-completed").textContent = String(plans.completed);
    renderPlanBar("plan-bar", "plan-progress", plans);
    $("plan-label").textContent = planLabel(plans);
  }

  /**
   * @param {string} url
   * @param {AbortSignal} signal
   */
  async function fetchJson(url, signal) {
    const response = await fetchImpl(url, { signal });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
  }

  async function boot() {
    bootController?.abort();
    const controller = new AbortController();
    bootController = controller;
    const retry = /** @type {HTMLButtonElement} */ ($("retry-button"));
    retry.disabled = true;
    try {
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(FETCH_TIMEOUT_MS)]);
      const files = await Promise.all(
        TOPICS.map((topic) => fetchJson(`data/questions/${topic}.json`, signal)),
      );
      if (controller !== bootController) return;
      bank = validateBank(files.flat());
      /** @type {HTMLButtonElement} */ ($("start-button")).disabled = false;
      showScreen("screen-title");
    } catch (error) {
      if (controller !== bootController) return;
      console.error("bank failed to load", error);
      showError("The questions failed to load. Check the connection and try again.");
    } finally {
      if (controller === bootController) retry.disabled = false;
    }
  }

  // Round -----------------------------------------------------------------

  function startGame() {
    const questions = sampleQuestions(bank, state.recentQuestionIds, random);
    uprising = createUprising(questions);
    playRound();
  }

  function playRound() {
    if (!uprising) throw new Error("No uprising in progress");
    const question = uprising.current();
    const input = /** @type {HTMLInputElement} */ ($("answer-input"));
    roundHeader = {
      topic: topicLabel(question.topic),
      count: roundCounter(uprising.round + 1, ROUNDS),
    };
    $("round-topic").textContent = roundHeader.topic;
    $("round-count").textContent = roundHeader.count;
    $("round-prompt").textContent = question.prompt;
    $("round-feedback").textContent = "";
    input.value = "";
    showScreen("screen-round");
    input.focus();
    startTimer();
  }

  function stopTimer() {
    if (timerId !== null) clearInterval(timerId);
    timerId = null;
  }

  function startTimer() {
    stopTimer();
    const startedAt = now();
    $("timer-bar").style.width = "100%";
    $("timer").setAttribute("aria-valuenow", "100");
    const id = setInterval(() => {
      if (id !== timerId) {
        clearInterval(id);
        return;
      }
      const remaining = ROUND_MS - (now() - startedAt);
      const percent = clamp((remaining / ROUND_MS) * 100, 0, 100);
      $("timer-bar").style.width = `${percent}%`;
      $("timer").setAttribute("aria-valuenow", String(Math.round(percent)));
      if (remaining <= 0) expireRound();
    }, TICK_MS);
    timerId = id;
  }

  /** The player offers an answer. Only a recognised one ends the round. */
  function tryAnswer() {
    if (timerId === null || !uprising) return;
    const input = /** @type {HTMLInputElement} */ ($("answer-input"));
    const outcome = uprising.submit(input.value);
    if (outcome.status === "matched" && outcome.result) {
      stopTimer();
      renderReveal(outcome.result);
      return;
    }
    if (outcome.status === "unverified") {
      $("round-feedback").textContent = rejectionMessage(input.value);
      input.value = "";
    }
    input.focus();
  }

  /** The clock ran out. Whatever is in the box gets one last try. */
  function expireRound() {
    if (timerId === null || !uprising) return;
    stopTimer();
    const input = /** @type {HTMLInputElement} */ ($("answer-input"));
    renderReveal(uprising.timeout(input.value));
  }

  /** @param {import("./game.js").RoundResult} result */
  function renderReveal(result) {
    const reaction = reactionFor(result.tier.id);
    $("reveal-topic").textContent = roundHeader.topic;
    $("reveal-count").textContent = roundHeader.count;
    $("reveal-sprite").replaceChildren(paintSprite(doc, reaction.sprite, reaction.label));
    $("reveal-star").hidden = result.tier.id !== TOP_TIER.id;
    $("reveal-tier").textContent = result.tier.name;
    $("reveal-points").textContent = `+${result.tier.points}`;
    $("reveal-detail").textContent = revealDetail(result);
    showScreen("screen-reveal");
    $("next-button").focus();
  }

  function nextRound() {
    if (!uprising) throw new Error("No uprising in progress");
    if (uprising.isOver()) finishGame(uprising.summary());
    else playRound();
  }

  // Results ---------------------------------------------------------------

  /** @param {import("./game.js").Summary} summary */
  function finishGame(summary) {
    const previousBest = state.bestScore;
    state = {
      bestScore: Math.max(previousBest, summary.total),
      totalPoints: state.totalPoints + summary.total,
      gamesPlayed: state.gamesPlayed + 1,
      recentQuestionIds: updateRecent(
        state.recentQuestionIds,
        summary.rounds.map((round) => round.questionId),
      ),
    };
    storage.save(state);
    lastShare = shareText(summary);
    renderStats();
    renderResults(summary, previousBest);
  }

  /**
   * @param {import("./game.js").Summary} summary
   * @param {number} previousBest
   */
  function renderResults(summary, previousBest) {
    $("results-score").textContent = `${summary.total} points`;
    $("results-stage").textContent = summary.stage.name;
    $("results-flavour").textContent = summary.stage.flavour;
    $("results-rounds").replaceChildren(
      ...summary.rounds.map((round) => {
        const item = doc.createElement("li");
        const emoji = doc.createElement("span");
        emoji.className = "round-emoji";
        emoji.textContent = round.tier.emoji;
        const text = doc.createElement("span");
        text.className = "round-text";
        text.textContent = `${round.prompt} - `;
        const answer = doc.createElement("strong");
        answer.textContent = roundAnswer(round);
        text.append(answer);
        const points = doc.createElement("span");
        points.className = "round-points";
        points.textContent = `+${round.tier.points}`;
        item.append(emoji, text, points);
        return item;
      }),
    );
    $("results-records").textContent = recordsMessage(summary.total, previousBest);
    const plans = fiveYearPlans(state.totalPoints);
    renderPlanBar("results-bar", "results-progress", plans);
    $("results-plan").textContent = planMessage(plans);
    $("screen-results").classList.toggle("perfect", summary.total === PERFECT_SCORE);
    showScreen("screen-results");
  }

  // Wiring ----------------------------------------------------------------

  const shareButton = $("share-button");
  const shareLabel = shareButton.textContent ?? "";

  async function share() {
    const copied = await copyShare(lastShare);
    shareButton.textContent = copied ? "Copied to clipboard" : "Copy failed, comrade";
    if (shareTimer !== null) clearTimeout(shareTimer);
    shareTimer = setTimeout(() => {
      shareButton.textContent = shareLabel;
    }, SHARE_FEEDBACK_MS);
  }

  /** @param {KeyboardEvent} event */
  function ignoreHeldEnter(event) {
    if (event.key === "Enter" && event.repeat) event.preventDefault();
  }

  $("retry-button").addEventListener("click", () => {
    boot();
  });
  $("start-button").addEventListener("click", startGame);
  $("again-button").addEventListener("click", startGame);
  $("next-button").addEventListener("click", nextRound);
  $("next-button").addEventListener("keydown", ignoreHeldEnter);
  $("answer-input").addEventListener("keydown", ignoreHeldEnter);
  $("answer-form").addEventListener("submit", (event) => {
    event.preventDefault();
    tryAnswer();
  });
  shareButton.addEventListener("click", () => {
    share();
  });
  globalThis.addEventListener("error", (event) => {
    console.error(event.error ?? event.message);
    showError("Something went wrong. Try again to reload the questions.");
  });
  globalThis.addEventListener("unhandledrejection", (event) => {
    console.error(event.reason);
    showError("Something went wrong. Try again to reload the questions.");
  });

  $("title-hero").replaceChildren(paintSprite(doc, MARX_HERO, "Karl Marx in sunglasses"));
  $("title-star").replaceChildren(paintSprite(doc, STAR, ""));
  $("reveal-star").replaceChildren(paintSprite(doc, STAR, ""));
  for (const sigil of doc.querySelectorAll(".sigil")) {
    sigil.replaceChildren(paintSprite(doc, HAMMER_SICKLE, ""));
  }
  const favicon = /** @type {HTMLLinkElement} */ ($("favicon"));
  const faviconSvg = spriteToSvgString(HAMMER_SICKLE, SPRITE_COLOURS);
  favicon.href = `data:image/svg+xml,${encodeURIComponent(faviconSvg)}`;

  renderStats();
  showScreen("screen-title");
  boot();
}
