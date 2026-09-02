import assert from "node:assert/strict";
import test from "node:test";
import {
  createUprising,
  MAX_PER_TOPIC,
  MIN_TOPICS,
  PERFECT_SCORE,
  RECENT_LIMIT,
  ROUNDS,
  sampleQuestions,
  updateRecent,
  validateBank,
} from "../js/game.js";
import { NO_ANSWER, UTOPIAN } from "../js/scorer.js";
import { TOPICS } from "../js/topics.js";

const THREE_TOPICS = TOPICS.slice(0, 3);

function seededRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function makeBank(topics = TOPICS, perTopic = 4) {
  return topics.flatMap((topic) =>
    Array.from({ length: perTopic }, (_, i) => ({
      id: `${topic}-${String(i + 1).padStart(2, "0")}`,
      topic,
      prompt: `Name something (${topic} ${i + 1})`,
      answers: [
        { answer: "Anything", aliases: [], tier: 60 },
        {
          answer: "Rare thing",
          aliases: ["rarest"],
          tier: 100,
          remark: "The committee is impressed.",
        },
      ],
    })),
  );
}

test("constants agree with the spec", () => {
  assert.equal(ROUNDS, 7);
  assert.equal(MAX_PER_TOPIC, 2);
  assert.equal(RECENT_LIMIT, 40);
  assert.equal(MIN_TOPICS, 4);
  assert.equal(PERFECT_SCORE, 700);
});

test("validateBank returns a well-formed bank and rejects everything else", () => {
  const bank = makeBank();
  assert.equal(validateBank(bank), bank);
  assert.throws(() => validateBank({}), /not an array/);
  assert.throws(() => validateBank([]), /cannot fill a game/);
  assert.throws(() => validateBank(makeBank(THREE_TOPICS, 10)), /cannot fill a game/);
  assert.throws(() => validateBank([{ id: "x", topic: "films-tv", prompt: "p" }]), /Malformed/);
  assert.throws(() => validateBank([{ ...bank[0], topic: "sports" }]), /Malformed question/);
});

test("sampleQuestions returns seven distinct questions", () => {
  const picked = sampleQuestions(makeBank(), [], seededRng(1));
  assert.equal(picked.length, ROUNDS);
  assert.equal(new Set(picked.map((q) => q.id)).size, ROUNDS);
});

test("sampleQuestions never picks more than MAX_PER_TOPIC per topic", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const picked = sampleQuestions(makeBank(), [], seededRng(seed));
    const counts = new Map();
    for (const q of picked) counts.set(q.topic, (counts.get(q.topic) ?? 0) + 1);
    assert.ok([...counts.values()].every((count) => count <= MAX_PER_TOPIC));
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
  assert.equal(sampleQuestions(bank, recent, seededRng(4)).length, ROUNDS);
});

test("sampleQuestions throws when the topic cap cannot fill a game", () => {
  assert.throws(
    () => sampleQuestions(makeBank(THREE_TOPICS, 10), [], seededRng(5)),
    /cannot fill a game/,
  );
});

test("updateRecent appends and caps at the limit", () => {
  const recent = Array.from({ length: RECENT_LIMIT }, (_, i) => `old-${i}`);
  const next = updateRecent(recent, ["new-1", "new-2"]);
  assert.equal(next.length, RECENT_LIMIT);
  assert.deepEqual(next.slice(-2), ["new-1", "new-2"]);
  assert.ok(!next.includes("old-0"));
});

test("submit returns the full round object for a matched answer", () => {
  const [question] = makeBank();
  const uprising = createUprising([question]);
  const result = uprising.submit("rarest");
  assert.deepEqual(result, {
    questionId: question.id,
    prompt: question.prompt,
    input: "rarest",
    matchedAnswer: "Rare thing",
    remark: "The committee is impressed.",
    tier: { id: "full-marx", name: "Full Marx", points: 100, emoji: "⭐" },
  });
});

test("submit scores unverified input as utopian and empty input as no answer", () => {
  const [question] = makeBank();
  const uprising = createUprising([question, question]);
  assert.equal(uprising.submit("something else").tier, UTOPIAN);
  assert.equal(uprising.submit("   ").tier, NO_ANSWER);
  assert.equal(uprising.summary().total, 0);
});

test("createUprising plays seven rounds and summarises", () => {
  const questions = sampleQuestions(makeBank(), [], seededRng(5));
  const uprising = createUprising(questions);
  assert.equal(uprising.isOver(), false);
  for (let i = 0; i < ROUNDS; i++) {
    assert.equal(uprising.round, i);
    assert.equal(uprising.current().id, questions[i].id);
    uprising.submit(i === 0 ? "" : "Anything");
  }
  assert.equal(uprising.isOver(), true);
  const summary = uprising.summary();
  assert.equal(summary.total, 360);
  assert.equal(summary.stage.name, "Revolution brewing");
  assert.equal(summary.rounds.length, ROUNDS);
  assert.equal(summary.rounds[0].tier, NO_ANSWER);
  assert.equal(summary.rounds[1].tier.id, "comrade");
});

test("submit and current throw once the uprising is over", () => {
  const uprising = createUprising(makeBank().slice(0, 1));
  uprising.submit("Anything");
  assert.throws(() => uprising.current(), /over/);
  assert.throws(() => uprising.submit("Anything"), /over/);
});

test("summary returns a snapshot the caller cannot mutate", () => {
  const uprising = createUprising(makeBank().slice(0, 1));
  uprising.submit("Anything");
  const summary = uprising.summary();
  summary.rounds[0].input = "tampered";
  summary.rounds.pop();
  assert.equal(uprising.summary().rounds[0].input, "Anything");
  assert.equal(uprising.summary().rounds.length, 1);
});

test("played questions are excluded from the next game end to end", () => {
  const bank = makeBank(TOPICS, 3);
  let recent = [];
  const seen = new Set();
  for (let game = 0; game < 2; game++) {
    const questions = sampleQuestions(bank, recent, seededRng(10 + game));
    const uprising = createUprising(questions);
    for (const _ of questions) uprising.submit("Anything");
    const ids = uprising.summary().rounds.map((round) => round.questionId);
    for (const id of ids) {
      assert.ok(!seen.has(id), `question ${id} repeated across games`);
      seen.add(id);
    }
    recent = updateRecent(recent, ids);
  }
});
