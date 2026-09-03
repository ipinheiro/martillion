import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { MIN_TOPICS, validateBank } from "../js/game.js";
import { matchAnswer, normalize } from "../js/matcher.js";
import { AUTHORED_POINTS } from "../js/scorer.js";
import { TOPICS } from "../js/topics.js";

const MIN_ANSWERS = 15;
const MAX_ANSWERS = 80;
const MIN_PER_TIER = 2;

async function loadTopic(topic) {
  const url = new URL(`../data/questions/${topic}.json`, import.meta.url);
  return JSON.parse(await readFile(url, "utf8"));
}

const files = new Map(
  await Promise.all(TOPICS.map(async (topic) => [topic, await loadTopic(topic)])),
);
const bank = [...files.values()].flat();

test("every topic file is an array of questions for that topic, sorted by id", () => {
  for (const [topic, questions] of files) {
    assert.ok(Array.isArray(questions) && questions.length > 0, `${topic} is a non-empty array`);
    assert.ok(
      questions.every((q) => q.topic === topic),
      `${topic} only holds its own questions`,
    );
    const ids = questions.map((q) => q.id);
    assert.deepEqual(
      ids,
      [...ids].sort((a, b) => a.localeCompare(b)),
      `${topic} sorted by id`,
    );
  }
});

test("the bank passes runtime validation and can feed the sampler", () => {
  validateBank(bank);
  assert.ok(new Set(bank.map((q) => q.topic)).size >= MIN_TOPICS);
});

test("ids and prompts are unique across the bank", () => {
  assert.equal(new Set(bank.map((q) => q.id)).size, bank.length);
  assert.equal(new Set(bank.map((q) => normalize(q.prompt))).size, bank.length);
});

for (const question of bank) {
  test(`question ${question.id} is well formed`, () => {
    assert.match(
      question.id,
      new RegExp(`^${question.topic}-\\d{3}$`),
      "id is <topic>-<three digits>",
    );
    assert.ok(typeof question.prompt === "string" && question.prompt.length > 0, "prompt");
    const count = question.answers.length;
    assert.ok(
      count >= MIN_ANSWERS && count <= MAX_ANSWERS,
      `${MIN_ANSWERS}-${MAX_ANSWERS} answers, got ${count}`,
    );
    for (const tier of AUTHORED_POINTS) {
      const inTier = question.answers.filter((a) => a.tier === tier).length;
      assert.ok(
        inTier >= MIN_PER_TIER,
        `at least ${MIN_PER_TIER} answers in tier ${tier}, got ${inTier}`,
      );
    }
    const forms = new Set();
    for (const entry of question.answers) {
      assert.ok(AUTHORED_POINTS.includes(entry.tier), `valid tier on ${entry.answer}`);
      assert.ok(Array.isArray(entry.aliases), `aliases array on ${entry.answer}`);
      if ("remark" in entry) {
        assert.ok(
          typeof entry.remark === "string" && entry.remark.length > 0,
          `remark on ${entry.answer}`,
        );
      }
      for (const form of [entry.answer, ...entry.aliases].map(normalize)) {
        assert.ok(form.length > 0, `non-empty normalised form on ${entry.answer}`);
        assert.ok(!forms.has(form), `duplicate normalised form "${form}"`);
        forms.add(form);
      }
    }
  });
}

test("every authored form, typed exactly, scores its own entry", () => {
  for (const question of bank) {
    for (const entry of question.answers) {
      for (const form of [entry.answer, ...entry.aliases]) {
        const match = matchAnswer(form, question.answers);
        assert.equal(
          match.entry,
          entry,
          `${question.id}: "${form}" should match "${entry.answer}"`,
        );
      }
    }
  }
});

test("the Bible is a novel over 500 pages and scores Full Marx", () => {
  const question = bank.find((q) => q.id === "books-stories-007");
  assert.equal(question.prompt, "Name a novel over 500 pages");
  const match = matchAnswer("the bible", question.answers);
  assert.equal(match.entry?.answer, "The Bible");
  assert.equal(match.entry?.tier, 100);
  assert.ok(match.entry?.remark);
});
