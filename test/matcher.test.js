import assert from "node:assert/strict";
import test from "node:test";
import { levenshtein, matchAnswer, normalize, tolerance } from "../js/matcher.js";

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

test("normalize of punctuation-only input is empty", () => {
  assert.equal(normalize("?!..."), "");
});

test("levenshtein counts edits", () => {
  assert.equal(levenshtein("", ""), 0);
  assert.equal(levenshtein("abc", ""), 3);
  assert.equal(levenshtein("kitten", "sitting"), 3);
  assert.equal(levenshtein("bender", "bendr"), 1);
});

test("tolerance steps at 5 and 10 characters", () => {
  assert.equal(tolerance(4), 0);
  assert.equal(tolerance(5), 1);
  assert.equal(tolerance(9), 1);
  assert.equal(tolerance(10), 2);
});

test("matchAnswer matches canonical answer ignoring case and article", () => {
  assert.deepEqual(matchAnswer("terminator", answers), { status: "matched", entry: answers[0] });
});

test("matchAnswer matches an alias", () => {
  assert.deepEqual(matchAnswer("T-800", answers), { status: "matched", entry: answers[0] });
});

test("matchAnswer tolerates one typo on strings of five or more characters", () => {
  assert.equal(matchAnswer("bendr", answers).entry, answers[1]);
});

test("matchAnswer tolerates two typos on strings of ten or more characters", () => {
  assert.equal(matchAnswer("bender rodrigz", answers).entry, answers[1]);
});

test("matchAnswer requires an exact match under five characters", () => {
  assert.deepEqual(matchAnswer("avq", answers), { status: "unverified", entry: null });
});

test("matchAnswer reports unmatched non-empty input as unverified", () => {
  assert.deepEqual(matchAnswer("Roomba", answers), { status: "unverified", entry: null });
});

test("matchAnswer reports empty, whitespace, and punctuation-only input as empty", () => {
  for (const input of ["", "   ", "?!"]) {
    assert.deepEqual(matchAnswer(input, answers), { status: "empty", entry: null });
  }
});

test("an exact match beats a fuzzy match listed earlier", () => {
  const plays = [
    { answer: "Richard II", aliases: [], tier: 60 },
    { answer: "Richard III", aliases: [], tier: 30 },
  ];
  assert.equal(matchAnswer("Richard III", plays).entry, plays[1]);
  assert.equal(matchAnswer("Richard II", plays).entry, plays[0]);
});

test("the closest fuzzy match wins over an earlier farther one", () => {
  const heroes = [
    { answer: "Batman", aliases: ["bruce wayne"], tier: 10 },
    { answer: "Hulk", aliases: ["bruce banner"], tier: 30 },
  ];
  assert.equal(matchAnswer("bruce wanner", heroes).entry, heroes[1]);
});

test("an equidistant tie goes to the commoner tier regardless of order", () => {
  const rivers = [
    { answer: "Rhine", aliases: [], tier: 10 },
    { answer: "Rhone", aliases: [], tier: 60 },
  ];
  assert.equal(matchAnswer("Rhune", rivers).entry, rivers[0]);
  assert.equal(matchAnswer("Rhune", [...rivers].reverse()).entry, rivers[0]);
});

const rejected = [
  {
    answer: "Chicken",
    aliases: ["hen"],
    reason: "Chickens fly. Badly, briefly, over a fence. Still flying.",
  },
  {
    answer: "Iron Man",
    aliases: ["tony stark"],
    reason: "Iron Man is a man in a suit. The suit does not vote.",
  },
];

test("a considered rejection is reported with its entry", () => {
  assert.deepEqual(matchAnswer("Hen", answers, rejected), {
    status: "rejected",
    entry: rejected[0],
  });
});

test("an exact rejection beats a fuzzy answer", () => {
  const spiders = [{ answer: "Sun spider", aliases: [], tier: 85 }];
  const seaSpider = [{ answer: "Sea spider", aliases: [], reason: "Not a spider. Not deep." }];
  assert.equal(matchAnswer("sea spider", spiders, seaSpider).status, "rejected");
  assert.equal(
    matchAnswer("sea spider", spiders).entry,
    spiders[0],
    "without the rejection it fuzzes",
  );
});

test("a rejection is matched with the same typo tolerance", () => {
  assert.deepEqual(matchAnswer("chiken", answers, rejected), {
    status: "rejected",
    entry: rejected[0],
  });
});

test("a fuzzy answer beats a fuzzy rejection at the same distance", () => {
  const rivers = [{ answer: "Rhine", aliases: [], tier: 10 }];
  const rhone = [{ answer: "Rhone", aliases: [], reason: "Wrong river." }];
  assert.equal(matchAnswer("Rhune", rivers, rhone).entry, rivers[0]);
});

test("an equidistant tie between rejections goes to the one listed first", () => {
  const rivers = [
    { answer: "Rhone", aliases: [], reason: "First." },
    { answer: "Rhine", aliases: [], reason: "Second." },
  ];
  assert.equal(matchAnswer("Rhune", [], rivers).entry, rivers[0]);
  assert.equal(matchAnswer("Rhune", [], [...rivers].reverse()).entry, rivers[1]);
});

test("with no rejections given, unknown input is unverified as before", () => {
  assert.deepEqual(matchAnswer("Roomba", answers), { status: "unverified", entry: null });
});
