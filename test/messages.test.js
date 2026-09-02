import assert from "node:assert/strict";
import test from "node:test";
import {
  planLabel,
  planMessage,
  recordsMessage,
  rejectionMessage,
  revealDetail,
  roundCounter,
  roundLine,
} from "../js/messages.js";
import { tierById } from "../js/scorer.js";

const round = (overrides) => ({
  questionId: "q-1",
  prompt: "Name a fictional robot",
  input: "bender",
  matchedAnswer: "Bender",
  remark: null,
  tier: tierById("masses"),
  ...overrides,
});

test("revealDetail recognises a matched answer", () => {
  assert.equal(revealDetail(round({})), 'The committee recognises "Bender".');
});

test("revealDetail appends a remark when the answer carries one", () => {
  const result = round({
    matchedAnswer: "The Bible",
    remark: "Filed under fiction by order of the committee.",
    tier: tierById("full-marx"),
  });
  assert.equal(
    revealDetail(result),
    'The committee recognises "The Bible". Filed under fiction by order of the committee.',
  );
});

test("revealDetail explains a timeout after unverified attempts, and silence", () => {
  assert.equal(
    revealDetail(round({ input: " roomba ", matchedAnswer: null, tier: tierById("utopian") })),
    'Time\'s up. The committee could not verify "roomba". Zero points, comrade.',
  );
  assert.equal(
    revealDetail(round({ input: "", matchedAnswer: null, tier: tierById("no-answer") })),
    "Time's up. Silence. The revolution needs answers.",
  );
});

test("rejectionMessage names the attempt and invites another", () => {
  assert.equal(rejectionMessage(" Roomba "), '"Roomba" is not a recognised answer. Try another.');
});

test("recordsMessage announces a record only when the total beats the previous best", () => {
  assert.equal(recordsMessage(400, 300), "A new personal best. The politburo is pleased.");
  assert.equal(recordsMessage(300, 300), "Personal best: 300.");
  assert.equal(recordsMessage(0, 0), "Personal best: 0.");
  assert.equal(recordsMessage(100, 300), "Personal best: 300.");
});

test("planLabel and planMessage describe five-year plan progress", () => {
  const first = { completed: 0, progress: 150, target: 2000 };
  assert.equal(planLabel(first), "150 / 2000 points toward the next plan");
  assert.equal(planMessage(first), "150 / 2000 points toward your first five-year plan");
  assert.equal(
    planMessage({ completed: 2, progress: 1, target: 2000 }),
    "Five-year plans completed: 2 - 1 / 2000 toward the next",
  );
});

test("roundLine shows the recognised answer, else the input, else no answer", () => {
  assert.equal(roundLine(round({})), "👥 Name a fictional robot - Bender (+30)");
  assert.equal(
    roundLine(round({ input: " roomba ", matchedAnswer: null, tier: tierById("utopian") })),
    "💭 Name a fictional robot - roomba (+0)",
  );
  assert.equal(
    roundLine(round({ input: "  ", matchedAnswer: null, tier: tierById("no-answer") })),
    "⬛ Name a fictional robot - no answer (+0)",
  );
});

test("roundCounter formats the round header", () => {
  assert.equal(roundCounter(1, 7), "Round 1 of 7");
});
