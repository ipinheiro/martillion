import { createStorage } from "./storage.js";
import { fiveYearPlans } from "./scorer.js";
import { sampleQuestions, createUprising, ROUNDS } from "./game.js";

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

function finishGame(finished) {
  console.log("results screen arrives in the next task", finished.summary());
  renderTitle();
}

$("retry-button").addEventListener("click", boot);
$("start-button").addEventListener("click", startGame);
$("next-button").addEventListener("click", nextRound);
$("answer-form").addEventListener("submit", (event) => {
  event.preventDefault();
  submitAnswer();
});

boot();
