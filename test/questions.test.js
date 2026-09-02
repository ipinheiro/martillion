import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalize } from "../js/matcher.js";

const TOPICS = [
  "animals-nature",
  "films-tv",
  "books-stories",
  "the-world",
  "psychology",
  "theory-revolution",
];
const AUTHORED_TIERS = [10, 30, 60, 85, 100];

const bank = JSON.parse(await readFile(new URL("../data/questions.json", import.meta.url), "utf8"));

test("bank is a non-empty array with unique ids", () => {
  assert.ok(Array.isArray(bank) && bank.length > 0);
  assert.equal(new Set(bank.map((q) => q.id)).size, bank.length);
});

for (const question of bank) {
  test(`question ${question.id} is well formed`, () => {
    assert.ok(TOPICS.includes(question.topic), "valid topic");
    assert.ok(typeof question.prompt === "string" && question.prompt.length > 0, "prompt");
    assert.ok(question.answers.length >= 15 && question.answers.length <= 40, "15-40 answers");
    for (const tier of AUTHORED_TIERS) {
      const count = question.answers.filter((a) => a.tier === tier).length;
      assert.ok(count >= 2, `at least 2 answers in tier ${tier}, got ${count}`);
    }
    const forms = [];
    for (const entry of question.answers) {
      assert.ok(AUTHORED_TIERS.includes(entry.tier), `valid tier on ${entry.answer}`);
      assert.ok(Array.isArray(entry.aliases), `aliases array on ${entry.answer}`);
      for (const form of [entry.answer, ...entry.aliases].map(normalize)) {
        assert.ok(form.length > 0, `non-empty normalised form on ${entry.answer}`);
        assert.ok(!forms.includes(form), `duplicate normalised form "${form}"`);
        forms.push(form);
      }
    }
  });
}

test("every topic has at least 18 questions", () => {
  for (const topic of TOPICS) {
    const count = bank.filter((q) => q.topic === topic).length;
    assert.ok(count >= 18, `${topic} has ${count} questions`);
  }
});
