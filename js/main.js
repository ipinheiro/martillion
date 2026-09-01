import { createStorage } from "./storage.js";
import { fiveYearPlans } from "./scorer.js";
import { sampleQuestions, createUprising, updateRecent, ROUNDS } from "./game.js";
import { shareText, copyShare } from "./share.js";

const storage = createStorage(window.localStorage);
let state = storage.load();
let bank = [];

const $ = (id) => document.getElementById(id);

function showScreen(id) {
  for (const screen of document.querySelectorAll(".screen")) {
    screen.hidden = screen.id !== id;
  }
}

function renderTitle() {
  const plans = fiveYearPlans(state.totalPoints);
  $("best-score").textContent = state.bestScore;
  $("plans-completed").textContent = plans.completed;
  $("plan-bar").style.width = `${(plans.progress / plans.target) * 100}%`;
  $("plan-label").textContent = `${plans.progress} / ${plans.target} points toward the next plan`;
  $("start-button").disabled = false;
  showScreen("screen-title");
}

async function boot() {
  try {
    const response = await fetch("data/questions.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    bank = await response.json();
    renderTitle();
  } catch {
    showScreen("screen-error");
  }
}

const ROUND_SECONDS = 30;
const TOPIC_LABELS = {
  "animals-nature": "Animals & nature",
  "films-tv": "Films & TV",
  "books-stories": "Books & stories",
  "the-world": "The world",
  "psychology": "Psychology",
  "theory-revolution": "Theory & revolution",
};

let uprising = null;
let timerId = null;

function startGame() {
  const questions = sampleQuestions(bank, state.recentQuestionIds, Math.random);
  uprising = createUprising(questions);
  playRound();
}

function playRound() {
  const question = uprising.current();
  $("round-topic").textContent = TOPIC_LABELS[question.topic];
  $("round-count").textContent = `Round ${uprising.round + 1} of ${ROUNDS}`;
  $("round-prompt").textContent = question.prompt;
  $("answer-input").value = "";
  showScreen("screen-round");
  $("answer-input").focus();
  startTimer();
}

function startTimer() {
  const startedAt = Date.now();
  $("timer-bar").style.width = "100%";
  timerId = setInterval(() => {
    const remaining = ROUND_SECONDS * 1000 - (Date.now() - startedAt);
    $("timer-bar").style.width = `${Math.max(0, (remaining / (ROUND_SECONDS * 1000)) * 100)}%`;
    if (remaining <= 0) submitAnswer();
  }, 100);
}

function submitAnswer() {
  if (timerId === null) return;
  clearInterval(timerId);
  timerId = null;
  const result = uprising.submit($("answer-input").value);
  renderReveal(result);
}

function renderReveal(result) {
  $("reveal-emoji").textContent = result.tier.emoji;
  $("reveal-tier").textContent = result.tier.name;
  $("reveal-points").textContent = `+${result.points}`;
  if (result.matchedAnswer) {
    $("reveal-detail").textContent = `The committee recognises "${result.matchedAnswer}".`;
  } else if (result.points === 15) {
    $("reveal-detail").textContent = "The committee cannot verify this. Admirably unscientific.";
  } else {
    $("reveal-detail").textContent = "Silence. The revolution needs answers.";
  }
  showScreen("screen-reveal");
  $("next-button").focus();
}

function nextRound() {
  if (uprising.isOver()) {
    finishGame(uprising);
  } else {
    playRound();
  }
}

let lastShare = "";

function finishGame(finished) {
  const summary = finished.summary();
  state = {
    bestScore: Math.max(state.bestScore, summary.total),
    totalPoints: state.totalPoints + summary.total,
    gamesPlayed: state.gamesPlayed + 1,
    recentQuestionIds: updateRecent(state.recentQuestionIds, summary.rounds.map((r) => r.questionId)),
  };
  storage.save(state);
  lastShare = shareText(summary.rounds.map((r) => r.points), summary.total);
  renderResults(summary);
}

function renderResults(summary) {
  $("results-score").textContent = `${summary.total} points`;
  $("results-stage").textContent = summary.stage.name;
  $("results-flavour").textContent = summary.stage.flavour;
  const list = $("results-rounds");
  list.replaceChildren(
    ...summary.rounds.map((round) => {
      const item = document.createElement("li");
      const shown = round.matchedAnswer ?? (round.input.trim() || "no answer");
      item.textContent = `${round.tier.emoji} ${round.prompt} - ${shown} (+${round.points})`;
      return item;
    })
  );
  $("results-records").textContent =
    summary.total >= state.bestScore
      ? "A new personal best. The politburo is pleased."
      : `Personal best: ${state.bestScore}.`;
  $("screen-results").classList.toggle("perfect", summary.total === 700);
  showScreen("screen-results");
}

$("retry-button").addEventListener("click", boot);
$("start-button").addEventListener("click", startGame);
$("next-button").addEventListener("click", nextRound);
$("answer-form").addEventListener("submit", (event) => {
  event.preventDefault();
  submitAnswer();
});
$("share-button").addEventListener("click", async () => {
  const copied = await copyShare(lastShare);
  $("share-button").textContent = copied ? "Copied to clipboard" : "Copy failed, comrade";
  setTimeout(() => { $("share-button").textContent = "Share the struggle"; }, 2000);
});
$("again-button").addEventListener("click", startGame);

boot();
