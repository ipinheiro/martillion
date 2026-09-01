import { createStorage } from "./storage.js";
import { fiveYearPlans } from "./scorer.js";

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

$("retry-button").addEventListener("click", boot);
$("start-button").addEventListener("click", () => {
  console.log("start pressed - round flow arrives in the next task");
});

boot();
