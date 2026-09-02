import assert from "node:assert/strict";
import test from "node:test";
import { matchAnswer, normalize } from "../js/matcher.js";

const answers = [
  { answer: "The Terminator", aliases: ["t-800"], tier: 10 },
  { answer: "Bender", aliases: ["bender rodriguez"], tier: 30 },
  { answer: "Ava", aliases: [], tier: 100 },
];

test("normalize lowercases and strips accents", () => {
  assert.equal(normalize("Émile ZOLA"), "emile zola");
});

test("normalize replaces punctuation and collapses whitespace", () => {
  assert.equal(normalize("R2-D2!  "), "r2 d2");
});

test("normalize strips a leading article", () => {
  assert.equal(normalize("The Communist Manifesto"), "communist manifesto");
});

test("matchAnswer matches canonical answer ignoring case and article", () => {
  assert.deepEqual(matchAnswer("terminator", answers), { points: 10, answer: "The Terminator" });
});

test("matchAnswer matches an alias", () => {
  assert.deepEqual(matchAnswer("T-800", answers), { points: 10, answer: "The Terminator" });
});

test("matchAnswer tolerates one typo on strings of five or more characters", () => {
  assert.deepEqual(matchAnswer("bendr", answers), { points: 30, answer: "Bender" });
});

test("matchAnswer tolerates two typos on strings of ten or more characters", () => {
  assert.deepEqual(matchAnswer("bender rodrigz", answers), { points: 30, answer: "Bender" });
});

test("matchAnswer requires exact match under five characters", () => {
  assert.deepEqual(matchAnswer("avq", answers), { points: 15, answer: null });
});

test("matchAnswer scores unmatched non-empty input as Utopian", () => {
  assert.deepEqual(matchAnswer("Roomba", answers), { points: 15, answer: null });
});

test("matchAnswer scores empty and whitespace input as zero", () => {
  assert.deepEqual(matchAnswer("", answers), { points: 0, answer: null });
  assert.deepEqual(matchAnswer("   ", answers), { points: 0, answer: null });
});
