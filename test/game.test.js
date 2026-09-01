import test from "node:test";
import assert from "node:assert/strict";
import { sampleQuestions, updateRecent, createUprising, ROUNDS, RECENT_LIMIT } from "../js/game.js";

function seededRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function makeBank() {
  const topics = ["animals-nature", "films-tv", "books-stories", "the-world", "psychology", "theory-revolution"];
  return topics.flatMap((topic) =>
    [1, 2, 3, 4].map((n) => ({
      id: `${topic}-0${n}`,
      topic,
      prompt: `Name something (${topic} ${n})`,
      answers: [{ answer: "Anything", aliases: [], tier: 60 }],
    }))
  );
}

test("sampleQuestions returns seven distinct questions", () => {
  const picked = sampleQuestions(makeBank(), [], seededRng(1));
  assert.equal(picked.length, ROUNDS);
  assert.equal(new Set(picked.map((q) => q.id)).size, ROUNDS);
});

test("sampleQuestions never picks more than two per topic", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const picked = sampleQuestions(makeBank(), [], seededRng(seed));
    const counts = {};
    for (const q of picked) counts[q.topic] = (counts[q.topic] ?? 0) + 1;
    assert.ok(Object.values(counts).every((count) => count <= 2));
  }
});

test("sampleQuestions excludes recently seen questions", () => {
  const bank = makeBank();
  const recent = bank.slice(0, 10).map((q) => q.id);
  const picked = sampleQuestions(bank, recent, seededRng(3));
  assert.ok(picked.every((q) => !recent.includes(q.id)));
});

test("sampleQuestions falls back to the full bank when too few remain", () => {
  const bank = makeBank();
  const recent = bank.slice(0, bank.length - 3).map((q) => q.id);
  const picked = sampleQuestions(bank, recent, seededRng(4));
  assert.equal(picked.length, ROUNDS);
});

test("updateRecent appends and caps at the limit", () => {
  const recent = Array.from({ length: RECENT_LIMIT }, (_, i) => `old-${i}`);
  const next = updateRecent(recent, ["new-1", "new-2"]);
  assert.equal(next.length, RECENT_LIMIT);
  assert.deepEqual(next.slice(-2), ["new-1", "new-2"]);
  assert.ok(!next.includes("old-0"));
});

test("createUprising plays seven rounds and summarises", () => {
  const questions = sampleQuestions(makeBank(), [], seededRng(5));
  const uprising = createUprising(questions);
  assert.equal(uprising.isOver(), false);
  for (let i = 0; i < ROUNDS; i++) {
    assert.equal(uprising.current().id, questions[i].id);
    const result = uprising.submit(i === 0 ? "" : "Anything");
    assert.equal(result.points, i === 0 ? 0 : 60);
  }
  assert.equal(uprising.isOver(), true);
  const summary = uprising.summary();
  assert.equal(summary.total, 360);
  assert.equal(summary.stage.name, "Revolution brewing");
  assert.equal(summary.rounds.length, ROUNDS);
  assert.deepEqual(summary.rounds[1].tier, { name: "Comrade", emoji: "✊" });
});
