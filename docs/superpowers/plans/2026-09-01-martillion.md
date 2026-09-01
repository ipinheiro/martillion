# Martillion implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Martillion, an unlimited-play Marx-themed Krillion clone, as a static site deployed on GitHub Pages.

**Architecture:** Vanilla ES modules with no build step: pure logic modules (matcher, scorer, game, storage, share) unit-tested with `node --test`, a curated JSON question bank validated by a data test, and a single-page UI (`index.html` + `css/style.css` + `js/main.js`) verified manually in a browser.

**Tech Stack:** HTML, CSS, JavaScript (ES modules), Node built-in test runner. Zero dependencies.

**Spec:** `docs/superpowers/specs/2026-09-01-martillion-design.md` - read it before starting any task.

## Global constraints

- No build step, no runtime dependencies, no dev dependencies. `package.json` exists only for `"type": "module"` and the test script.
- Run tests with `npm test` (which runs `node --test`) from the repo root `/home/coder/repos/martillion`.
- Every git commit MUST be run with the identity overrides removed, exactly like this: `env -u GIT_AUTHOR_NAME -u GIT_AUTHOR_EMAIL -u GIT_COMMITTER_NAME -u GIT_COMMITTER_EMAIL git commit -m "..."`. Never include any Claude signature or `Co-Authored-By` line. Where a step below says `git commit`, it means this wrapped form.
- Tier names, points, and emoji are fixed: Full Marx 100 ⭐, Vanguard 85 🚩, Comrade 60 ✊, The Masses 30 👥, Utopian 15 💭, False Consciousness 10 🐑, no answer 0 ⬛.
- Stage thresholds are fixed: 0-199 Feudalism, 200-349 Capitalism, 350-499 Revolution brewing, 500-649 Socialism, 650-700 Full communism.
- Topic slugs are fixed: `animals-nature`, `films-tv`, `books-stories`, `the-world`, `psychology`, `theory-revolution`.
- Timer: 30 seconds per round. Rounds per game: 7. localStorage key: `martillion.v1`. Five-year plan target: 2,000 points.
- UI copy uses sentence case and no em dashes (use ` - ` instead).

## Question authoring rules (apply to every content task)

Each question object:

```json
{
  "id": "<topic-slug>-<2-digit-number>",
  "topic": "<topic-slug>",
  "prompt": "Name a ...",
  "answers": [{ "answer": "Canonical Name", "aliases": ["variant"], "tier": 10 }]
}
```

- 15 to 40 answers per question; at least 2 answers in each tier 10, 30, 60, 85, 100.
- Tier = how common the answer is for the general public, not how good it is. 10 = the first things anyone says; 100 = a delighted "how did you even know that".
- **Cover the common tiers exhaustively.** A popular answer missing from the bank falls to Utopian (15 points), which beats False Consciousness (10). The failure mode to avoid is a top-of-mind answer scoring as rare, so list every answer a normal person is likely to blurt out in tiers 10 and 30.
- Aliases: alternate names, common spellings, and shorter forms people actually type ("wall e", "artoo", "freud" for "Sigmund Freud"). Punctuation, case, accents, and leading articles are handled by normalisation - do not add aliases that differ only in those.
- No two entries in one question may share a normalised form (the validation test enforces this).
- Pitch difficulty at a sharp 21-year-old; UK frame of reference.

---

### Task 1: Scaffolding and matcher module

**Files:**
- Create: `package.json`
- Create: `js/matcher.js`
- Test: `test/matcher.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `normalize(text: string): string`; `matchAnswer(input: string, answers: Array<{answer, aliases, tier}>): {points: number, answer: string|null}`. `points` is 0 for empty input, an authored tier for a match, 15 for unmatched non-empty input. `answer` is the canonical answer matched, or null.

- [ ] **Step 1: Create package.json**

```json
{
  "name": "martillion",
  "private": true,
  "type": "module",
  "scripts": { "test": "node --test" }
}
```

- [ ] **Step 2: Write the failing tests**

Create `test/matcher.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { normalize, matchAnswer } from "../js/matcher.js";

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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL - cannot find module `../js/matcher.js`.

- [ ] **Step 4: Implement matcher.js**

```js
const ARTICLE = /^(the|a|an)\s+/;

export function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(ARTICLE, "");
}

function levenshtein(a, b) {
  if (a === b) return 0;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const previous = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = previous;
    }
  }
  return row[b.length];
}

function tolerance(length) {
  if (length >= 10) return 2;
  if (length >= 5) return 1;
  return 0;
}

function candidatesFor(entry) {
  return [entry.answer, ...entry.aliases].map(normalize);
}

export function matchAnswer(input, answers) {
  const norm = normalize(input ?? "");
  if (!norm) return { points: 0, answer: null };
  for (const entry of answers) {
    if (candidatesFor(entry).includes(norm)) return { points: entry.tier, answer: entry.answer };
  }
  for (const entry of answers) {
    for (const candidate of candidatesFor(entry)) {
      if (levenshtein(norm, candidate) <= tolerance(candidate.length)) {
        return { points: entry.tier, answer: entry.answer };
      }
    }
  }
  return { points: 15, answer: null };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS, 10 tests.

- [ ] **Step 6: Commit**

```bash
git add package.json js/matcher.js test/matcher.test.js
git commit -m "feat(matcher): Add answer normalisation and matching"
```

---

### Task 2: Scorer module

**Files:**
- Create: `js/scorer.js`
- Test: `test/scorer.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `TIERS` (object keyed by points: `{name, emoji}`); `tierInfo(points): {name, emoji}`; `stageForScore(total): {min, name, verdict, flavour}`; `PLAN_TARGET = 2000`; `fiveYearPlans(totalPoints): {completed, progress, target}`.

- [ ] **Step 1: Write the failing tests**

Create `test/scorer.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { tierInfo, stageForScore, fiveYearPlans } from "../js/scorer.js";

test("tierInfo returns name and emoji for every tier", () => {
  assert.deepEqual(tierInfo(100), { name: "Full Marx", emoji: "⭐" });
  assert.deepEqual(tierInfo(85), { name: "Vanguard", emoji: "🚩" });
  assert.deepEqual(tierInfo(60), { name: "Comrade", emoji: "✊" });
  assert.deepEqual(tierInfo(30), { name: "The Masses", emoji: "👥" });
  assert.deepEqual(tierInfo(15), { name: "Utopian", emoji: "💭" });
  assert.deepEqual(tierInfo(10), { name: "False Consciousness", emoji: "🐑" });
  assert.deepEqual(tierInfo(0), { name: "No answer", emoji: "⬛" });
});

test("stageForScore maps boundary scores to stages", () => {
  assert.equal(stageForScore(0).name, "Feudalism");
  assert.equal(stageForScore(199).name, "Feudalism");
  assert.equal(stageForScore(200).name, "Capitalism");
  assert.equal(stageForScore(349).name, "Capitalism");
  assert.equal(stageForScore(350).name, "Revolution brewing");
  assert.equal(stageForScore(499).name, "Revolution brewing");
  assert.equal(stageForScore(500).name, "Socialism");
  assert.equal(stageForScore(649).name, "Socialism");
  assert.equal(stageForScore(650).name, "Full communism");
  assert.equal(stageForScore(700).name, "Full communism");
});

test("stages carry verdict and flavour text", () => {
  assert.equal(stageForScore(630).verdict, "Socialism achieved");
  assert.equal(stageForScore(100).flavour, "The material conditions were not yet ripe.");
});

test("fiveYearPlans counts completed plans and progress", () => {
  assert.deepEqual(fiveYearPlans(0), { completed: 0, progress: 0, target: 2000 });
  assert.deepEqual(fiveYearPlans(1999), { completed: 0, progress: 1999, target: 2000 });
  assert.deepEqual(fiveYearPlans(2000), { completed: 1, progress: 0, target: 2000 });
  assert.deepEqual(fiveYearPlans(4001), { completed: 2, progress: 1, target: 2000 });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL - cannot find module `../js/scorer.js`. Matcher tests still pass.

- [ ] **Step 3: Implement scorer.js**

```js
export const TIERS = {
  100: { name: "Full Marx", emoji: "⭐" },
  85: { name: "Vanguard", emoji: "🚩" },
  60: { name: "Comrade", emoji: "✊" },
  30: { name: "The Masses", emoji: "👥" },
  15: { name: "Utopian", emoji: "💭" },
  10: { name: "False Consciousness", emoji: "🐑" },
  0: { name: "No answer", emoji: "⬛" },
};

const STAGES = [
  { min: 650, name: "Full communism", verdict: "Full communism achieved", flavour: "The state has withered away. Utopia, scientifically." },
  { min: 500, name: "Socialism", verdict: "Socialism achieved", flavour: "From each according to their ability. Ability detected." },
  { min: 350, name: "Revolution brewing", verdict: "Revolution brewing", flavour: "A spectre is haunting this quiz." },
  { min: 200, name: "Capitalism", verdict: "Stuck in capitalism", flavour: "You have nothing to lose but your chains." },
  { min: 0, name: "Feudalism", verdict: "Stuck in feudalism", flavour: "The material conditions were not yet ripe." },
];

export const PLAN_TARGET = 2000;

export function tierInfo(points) {
  return TIERS[points];
}

export function stageForScore(total) {
  return STAGES.find((stage) => total >= stage.min);
}

export function fiveYearPlans(totalPoints) {
  return {
    completed: Math.floor(totalPoints / PLAN_TARGET),
    progress: totalPoints % PLAN_TARGET,
    target: PLAN_TARGET,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/scorer.js test/scorer.test.js
git commit -m "feat(scorer): Add tiers, stages of history, and five-year plans"
```

---

### Task 3: Storage module

**Files:**
- Create: `js/storage.js`
- Test: `test/storage.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `createStorage(backend): {load(): State, save(state): void}` where `State = {bestScore: number, totalPoints: number, gamesPlayed: number, recentQuestionIds: string[]}` and `backend` is any object with `getItem(key)` / `setItem(key, value)` (the browser passes `window.localStorage`). Missing, corrupt, or invalid data loads as defaults; a throwing backend degrades to in-memory state.

- [ ] **Step 1: Write the failing tests**

Create `test/storage.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createStorage } from "../js/storage.js";

const DEFAULTS = { bestScore: 0, totalPoints: 0, gamesPlayed: 0, recentQuestionIds: [] };

function fakeBackend(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = value; },
    data,
  };
}

test("load returns defaults when nothing is stored", () => {
  const storage = createStorage(fakeBackend());
  assert.deepEqual(storage.load(), DEFAULTS);
});

test("save then load round-trips state", () => {
  const backend = fakeBackend();
  const storage = createStorage(backend);
  const state = { bestScore: 630, totalPoints: 4100, gamesPlayed: 9, recentQuestionIds: ["films-tv-01"] };
  storage.save(state);
  assert.deepEqual(storage.load(), state);
  assert.ok(backend.data["martillion.v1"].includes("630"));
});

test("corrupt JSON loads as defaults", () => {
  const storage = createStorage(fakeBackend({ "martillion.v1": "{not json" }));
  assert.deepEqual(storage.load(), DEFAULTS);
});

test("wrong shape loads as defaults", () => {
  const storage = createStorage(fakeBackend({ "martillion.v1": JSON.stringify({ bestScore: "high" }) }));
  assert.deepEqual(storage.load(), DEFAULTS);
});

test("throwing backend degrades to in-memory state", () => {
  const storage = createStorage({
    getItem: () => { throw new Error("denied"); },
    setItem: () => { throw new Error("denied"); },
  });
  assert.deepEqual(storage.load(), DEFAULTS);
  const state = { bestScore: 100, totalPoints: 100, gamesPlayed: 1, recentQuestionIds: [] };
  storage.save(state);
  assert.deepEqual(storage.load(), state);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL - cannot find module `../js/storage.js`.

- [ ] **Step 3: Implement storage.js**

```js
const KEY = "martillion.v1";

const DEFAULTS = { bestScore: 0, totalPoints: 0, gamesPlayed: 0, recentQuestionIds: [] };

function isValid(state) {
  return (
    typeof state === "object" && state !== null &&
    typeof state.bestScore === "number" &&
    typeof state.totalPoints === "number" &&
    typeof state.gamesPlayed === "number" &&
    Array.isArray(state.recentQuestionIds)
  );
}

export function createStorage(backend) {
  let memory = { ...DEFAULTS };

  function load() {
    let raw;
    try {
      raw = backend.getItem(KEY);
    } catch {
      return { ...memory };
    }
    if (raw === null) return { ...memory };
    try {
      const parsed = JSON.parse(raw);
      if (!isValid(parsed)) return { ...DEFAULTS };
      memory = parsed;
      return { ...parsed };
    } catch {
      return { ...DEFAULTS };
    }
  }

  function save(state) {
    memory = { ...state };
    try {
      backend.setItem(KEY, JSON.stringify(state));
    } catch {
      // storage unavailable - keep state in memory for this session
    }
  }

  return { load, save };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/storage.js test/storage.test.js
git commit -m "feat(storage): Add persistent state with in-memory fallback"
```

---

### Task 4: Share module

**Files:**
- Create: `js/share.js`
- Test: `test/share.test.js`

**Interfaces:**
- Consumes: `tierInfo`, `stageForScore` from `js/scorer.js`.
- Produces: `shareText(roundPoints: number[], total: number): string`; `copyShare(text): Promise<boolean>` (browser-only, uses `navigator.clipboard`, not unit-tested).

- [ ] **Step 1: Write the failing tests**

Create `test/share.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { shareText } from "../js/share.js";

test("shareText renders the spec example", () => {
  const rounds = [100, 100, 100, 100, 85, 85, 60];
  assert.equal(shareText(rounds, 630), "Martillion ✊ 630 - Socialism achieved\n⭐⭐⭐⭐🚩🚩✊");
});

test("shareText renders low scores and missed rounds", () => {
  const rounds = [10, 15, 0, 30, 10, 10, 30];
  assert.equal(shareText(rounds, 105), "Martillion ✊ 105 - Stuck in feudalism\n🐑💭⬛👥🐑🐑👥");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL - cannot find module `../js/share.js`.

- [ ] **Step 3: Implement share.js**

```js
import { tierInfo, stageForScore } from "./scorer.js";

export function shareText(roundPoints, total) {
  const stage = stageForScore(total);
  const emojis = roundPoints.map((points) => tierInfo(points).emoji).join("");
  return `Martillion ✊ ${total} - ${stage.verdict}\n${emojis}`;
}

export async function copyShare(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/share.js test/share.test.js
git commit -m "feat(share): Add shareable result text"
```

---

### Task 5: Game module - sampling and uprising flow

**Files:**
- Create: `js/game.js`
- Test: `test/game.test.js`

**Interfaces:**
- Consumes: `matchAnswer` from `js/matcher.js`; `tierInfo`, `stageForScore` from `js/scorer.js`.
- Produces: `ROUNDS = 7`; `RECENT_LIMIT = 40`; `sampleQuestions(bank, recentIds, rng): Question[]`; `updateRecent(recentIds, playedIds): string[]`; `createUprising(questions)` returning `{round, isOver(), current(), submit(input): RoundResult, summary(): {total, rounds, stage}}` where `RoundResult = {questionId, prompt, input, matchedAnswer, points, tier: {name, emoji}}`. `rng` is a `() => number` in [0, 1).

- [ ] **Step 1: Write the failing tests**

Create `test/game.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL - cannot find module `../js/game.js`.

- [ ] **Step 3: Implement game.js**

```js
import { matchAnswer } from "./matcher.js";
import { tierInfo, stageForScore } from "./scorer.js";

export const ROUNDS = 7;
export const MAX_PER_TOPIC = 2;
export const RECENT_LIMIT = 40;

function shuffle(items, rng) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function sampleQuestions(bank, recentIds, rng) {
  let pool = bank.filter((question) => !recentIds.includes(question.id));
  if (pool.length < ROUNDS) pool = [...bank];
  const picked = [];
  const perTopic = new Map();

  function take(candidates) {
    for (const question of candidates) {
      if (picked.some((p) => p.id === question.id)) continue;
      const count = perTopic.get(question.topic) ?? 0;
      if (count >= MAX_PER_TOPIC) continue;
      picked.push(question);
      perTopic.set(question.topic, count + 1);
      if (picked.length === ROUNDS) return;
    }
  }

  take(shuffle(pool, rng));
  if (picked.length < ROUNDS) take(shuffle(bank, rng));
  return picked;
}

export function updateRecent(recentIds, playedIds) {
  return [...recentIds, ...playedIds].slice(-RECENT_LIMIT);
}

export function createUprising(questions) {
  const rounds = [];
  return {
    get round() { return rounds.length; },
    isOver: () => rounds.length >= questions.length,
    current: () => questions[rounds.length],
    submit(input) {
      const question = questions[rounds.length];
      const { points, answer } = matchAnswer(input, question.answers);
      const result = {
        questionId: question.id,
        prompt: question.prompt,
        input,
        matchedAnswer: answer,
        points,
        tier: tierInfo(points),
      };
      rounds.push(result);
      return result;
    },
    summary() {
      const total = rounds.reduce((sum, result) => sum + result.points, 0);
      return { total, rounds: [...rounds], stage: stageForScore(total) };
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/game.js test/game.test.js
git commit -m "feat(game): Add question sampling and uprising flow"
```

---

### Task 6: Question bank validation and films & TV pack

**Files:**
- Create: `data/questions.json`
- Test: `test/questions.test.js`

**Interfaces:**
- Consumes: `normalize` from `js/matcher.js`.
- Produces: `data/questions.json` as a JSON array of question objects (schema in "Question authoring rules" above). Later content tasks append to this array; the validation test guards every addition.

- [ ] **Step 1: Write the validation test**

Create `test/questions.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalize } from "../js/matcher.js";

const TOPICS = ["animals-nature", "films-tv", "books-stories", "the-world", "psychology", "theory-revolution"];
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
```

- [ ] **Step 2: Author the films & TV pack**

Create `data/questions.json` as an array of 20 questions with ids `films-tv-01` through `films-tv-20`, topic `films-tv`, one per prompt below, following the question authoring rules:

1. Name a fictional robot
2. Name a film that won the Best Picture Oscar
3. Name a fictional villain
4. Name an animated film
5. Name a long-running TV series
6. Name a film director
7. Name a fictional world or planet
8. Name a horror film
9. Name a film based on a true story
10. Name a fictional spy or detective
11. Name a movie monster
12. Name a film with a famous twist ending
13. Name a sitcom
14. Name a superhero
15. Name a film not in the English language
16. Name a fictional artificial intelligence
17. Name a Studio Ghibli film
18. Name a documentary
19. Name a film franchise with four or more films
20. Name a movie musical

`films-tv-01` must be exactly this, as the worked example for all packs:

```json
{
  "id": "films-tv-01",
  "topic": "films-tv",
  "prompt": "Name a fictional robot",
  "answers": [
    { "answer": "WALL-E", "aliases": ["wall e"], "tier": 10 },
    { "answer": "R2-D2", "aliases": ["artoo"], "tier": 10 },
    { "answer": "The Terminator", "aliases": ["t-800"], "tier": 10 },
    { "answer": "C-3PO", "aliases": ["threepio"], "tier": 30 },
    { "answer": "Optimus Prime", "aliases": [], "tier": 30 },
    { "answer": "Bender", "aliases": ["bender rodriguez"], "tier": 30 },
    { "answer": "RoboCop", "aliases": [], "tier": 30 },
    { "answer": "Baymax", "aliases": [], "tier": 60 },
    { "answer": "Ultron", "aliases": [], "tier": 60 },
    { "answer": "Data", "aliases": ["commander data"], "tier": 60 },
    { "answer": "T-1000", "aliases": [], "tier": 60 },
    { "answer": "Marvin", "aliases": ["marvin the paranoid android"], "tier": 85 },
    { "answer": "HAL 9000", "aliases": ["hal"], "tier": 85 },
    { "answer": "Johnny 5", "aliases": ["johnny five", "number 5"], "tier": 85 },
    { "answer": "K-2SO", "aliases": [], "tier": 85 },
    { "answer": "Maria", "aliases": ["maschinenmensch", "false maria"], "tier": 100 },
    { "answer": "GLaDOS", "aliases": [], "tier": 100 },
    { "answer": "Roy Batty", "aliases": [], "tier": 100 },
    { "answer": "Ava", "aliases": [], "tier": 100 }
  ]
}
```

- [ ] **Step 3: Run tests to verify the pack validates**

Run: `npm test`
Expected: PASS - 1 structural test plus 20 per-question tests, and all earlier module tests.

- [ ] **Step 4: Commit**

```bash
git add data/questions.json test/questions.test.js
git commit -m "feat(bank): Add validation test and films & TV pack"
```

---

### Task 7: Theory & revolution pack

**Files:**
- Modify: `data/questions.json` (append 20 questions)

**Interfaces:**
- Consumes: the JSON array in `data/questions.json` and the validation test from Task 6.
- Produces: questions `theory-revolution-01` through `theory-revolution-20`.

- [ ] **Step 1: Author the pack**

Append 20 questions with topic `theory-revolution`, one per prompt below, following the question authoring rules and the worked example in Task 6:

1. Name a work by Karl Marx or Friedrich Engels
2. Name a revolution
3. Name a country that has called itself socialist or communist
4. Name a famous communist who was not Marx
5. Name a concept from Marxist theory
6. Name a monarch or ruler overthrown by a revolution
7. Name a protest song or workers' anthem
8. Name a philosopher who influenced Marx or responded to him
9. Name something you might see on a Soviet propaganda poster
10. Name a Soviet-era project or achievement
11. Name a revolutionary whose face has been on a t-shirt
12. Name a form of collective living or ownership
13. Name a banned or censored book
14. Name a wall, curtain, or border from Cold War history
15. Name a famous strike or labour movement
16. Name a utopia from fiction or philosophy
17. Name a dystopian novel
18. Name a political ideology
19. Name a country that changed its name in the 20th or 21st century
20. Name a symbol used by a political movement

- [ ] **Step 2: Run tests to verify the pack validates**

Run: `npm test`
Expected: PASS - 40 per-question tests now.

- [ ] **Step 3: Commit**

```bash
git add data/questions.json
git commit -m "feat(bank): Add theory & revolution pack"
```

---

### Task 8: Psychology pack

**Files:**
- Modify: `data/questions.json` (append 20 questions)

**Interfaces:**
- Consumes: the JSON array in `data/questions.json` and the validation test from Task 6.
- Produces: questions `psychology-01` through `psychology-20`.

- [ ] **Step 1: Author the pack**

Append 20 questions with topic `psychology`, one per prompt below, following the question authoring rules and the worked example in Task 6:

1. Name a cognitive bias
2. Name a famous psychology experiment
3. Name a psychological disorder
4. Name a famous psychologist
5. Name a defence mechanism
6. Name a Freudian concept
7. Name a phobia
8. Name an emotion
9. Name a part of the brain
10. Name a neurotransmitter or hormone
11. Name a school of psychotherapy
12. Name a logical fallacy
13. Name a memory phenomenon
14. Name a concept from child development
15. Name a personality trait or personality type
16. Name a psychological effect named after a person or place
17. Name a sleep phenomenon
18. Name an optical or sensory illusion
19. Name a persuasion technique
20. Name a concept from behavioural economics

- [ ] **Step 2: Run tests to verify the pack validates**

Run: `npm test`
Expected: PASS - 60 per-question tests now.

- [ ] **Step 3: Commit**

```bash
git add data/questions.json
git commit -m "feat(bank): Add psychology pack"
```

---

### Task 9: Animals & nature pack

**Files:**
- Modify: `data/questions.json` (append 20 questions)

**Interfaces:**
- Consumes: the JSON array in `data/questions.json` and the validation test from Task 6.
- Produces: questions `animals-nature-01` through `animals-nature-20`.

- [ ] **Step 1: Author the pack**

Append 20 questions with topic `animals-nature`, one per prompt below, following the question authoring rules and the worked example in Task 6:

1. Name a deep-sea creature
2. Name an extinct animal
3. Name a venomous animal
4. Name an animal that migrates
5. Name a bird that cannot fly
6. Name a carnivorous plant
7. Name an animal with a misleading name
8. Name a creature that lives in a colony
9. Name an animal famous for its intelligence
10. Name a parasite
11. Name a natural phenomenon
12. Name a big cat
13. Name an animal that hibernates
14. Name a tree
15. Name a creature with more than four legs
16. Name an animal that changes colour or shape
17. Name a dinosaur
18. Name an endangered species
19. Name a fungus
20. Name an animal that mates for life

- [ ] **Step 2: Run tests to verify the pack validates**

Run: `npm test`
Expected: PASS - 80 per-question tests now.

- [ ] **Step 3: Commit**

```bash
git add data/questions.json
git commit -m "feat(bank): Add animals & nature pack"
```

---

### Task 10: Books & stories pack

**Files:**
- Modify: `data/questions.json` (append 20 questions)

**Interfaces:**
- Consumes: the JSON array in `data/questions.json` and the validation test from Task 6.
- Produces: questions `books-stories-01` through `books-stories-20`.

- [ ] **Step 1: Author the pack**

Append 20 questions with topic `books-stories`, one per prompt below, following the question authoring rules and the worked example in Task 6:

1. Name a fictional witch or wizard
2. Name a book people are made to read at school
3. Name an author who wrote under a pen name
4. Name a fictional place
5. Name a figure from Greek myth
6. Name a fairy tale
7. Name a novel over 500 pages
8. Name a poet
9. Name a book that was banned somewhere
10. Name a fictional animal
11. Name a Shakespeare play
12. Name a detective from fiction
13. Name a book with a one-word title
14. Name a ghost or monster from folklore
15. Name a winner of the Nobel Prize in Literature
16. Name a dragon from fiction or myth
17. Name a love story from literature
18. Name a children's book character
19. Name an epic poem or saga
20. Name a literary sidekick

- [ ] **Step 2: Run tests to verify the pack validates**

Run: `npm test`
Expected: PASS - 100 per-question tests now.

- [ ] **Step 3: Commit**

```bash
git add data/questions.json
git commit -m "feat(bank): Add books & stories pack"
```

---

### Task 11: The world pack and bank completeness test

**Files:**
- Modify: `data/questions.json` (append 20 questions)
- Modify: `test/questions.test.js` (add completeness test)

**Interfaces:**
- Consumes: the JSON array in `data/questions.json` and the validation test from Task 6.
- Produces: questions `the-world-01` through `the-world-20`, and a test asserting every topic has at least 18 questions.

- [ ] **Step 1: Author the pack**

Append 20 questions with topic `the-world`, one per prompt below, following the question authoring rules and the worked example in Task 6:

1. Name a national capital that is not its country's largest city
2. Name a country whose flag has no red, white, or blue
3. Name a landlocked country
4. Name a river that flows through more than one country
5. Name a breakfast food from somewhere in the world
6. Name a UNESCO World Heritage site
7. Name an island nation
8. Name a mountain range
9. Name a language with more than 100 million speakers
10. Name a currency
11. Name a city more than 2,000 years old
12. Name a desert
13. Name a country smaller than London
14. Name a festival or holiday from outside Europe
15. Name a national dish
16. Name a strait, canal, or channel
17. Name a former capital city
18. Name a country that drives on the left
19. Name a micronation or disputed territory
20. Name a famous train or railway line

- [ ] **Step 2: Add the completeness test**

Append to `test/questions.test.js`:

```js
test("every topic has at least 18 questions", () => {
  for (const topic of TOPICS) {
    const count = bank.filter((q) => q.topic === topic).length;
    assert.ok(count >= 18, `${topic} has ${count} questions`);
  }
});
```

- [ ] **Step 3: Run tests to verify the full bank validates**

Run: `npm test`
Expected: PASS - 120 per-question tests plus the completeness test.

- [ ] **Step 4: Commit**

```bash
git add data/questions.json test/questions.test.js
git commit -m "feat(bank): Add the world pack and completeness test"
```

---

### Task 12: UI shell - page, styles, and title screen

**Files:**
- Create: `index.html`
- Create: `css/style.css`
- Create: `js/main.js`

**Interfaces:**
- Consumes: `createStorage` from `js/storage.js`; `fiveYearPlans` from `js/scorer.js`; `data/questions.json` via `fetch`.
- Produces: the page skeleton with five screens (`#screen-title`, `#screen-round`, `#screen-reveal`, `#screen-results`, `#screen-error`), a `showScreen(id)` helper, and a working title screen. Later tasks fill in the round, reveal, and results screens.

- [ ] **Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Martillion</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <main id="app">
    <section id="screen-title" class="screen">
      <p class="kicker">The unlimited daily trivia game</p>
      <h1>Martillion</h1>
      <p class="tagline">Rare answers of the world, unite!</p>
      <dl class="stats">
        <div><dt>Best uprising</dt><dd id="best-score">0</dd></div>
        <div><dt>Five-year plans</dt><dd id="plans-completed">0</dd></div>
      </dl>
      <div class="plan-progress"><div id="plan-bar"></div></div>
      <p id="plan-label" class="plan-label"></p>
      <button id="start-button" class="primary">Start the uprising</button>
    </section>

    <section id="screen-round" class="screen" hidden>
      <header class="round-header">
        <span id="round-topic"></span>
        <span id="round-count"></span>
      </header>
      <div class="timer"><div id="timer-bar"></div></div>
      <h2 id="round-prompt"></h2>
      <form id="answer-form">
        <input id="answer-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type your answer, comrade">
        <button type="submit" class="primary">Submit</button>
      </form>
    </section>

    <section id="screen-reveal" class="screen" hidden>
      <p id="reveal-emoji" class="reveal-emoji"></p>
      <h2 id="reveal-tier"></h2>
      <p id="reveal-points" class="reveal-points"></p>
      <p id="reveal-detail"></p>
      <button id="next-button" class="primary">Onward</button>
    </section>

    <section id="screen-results" class="screen" hidden>
      <p class="kicker">The uprising is over</p>
      <h2 id="results-score"></h2>
      <h3 id="results-stage"></h3>
      <p id="results-flavour"></p>
      <ol id="results-rounds"></ol>
      <p id="results-records"></p>
      <div class="results-actions">
        <button id="share-button" class="primary">Share the struggle</button>
        <button id="again-button">Rise again</button>
      </div>
    </section>

    <section id="screen-error" class="screen" hidden>
      <h2>The questions failed to load</h2>
      <p>The struggle continues. Check the connection and try again.</p>
      <button id="retry-button" class="primary">Try again</button>
    </section>
  </main>
  <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create css/style.css**

Write the full stylesheet against these fixed design tokens and rules; layout and flourish details are the implementer's judgment, exercised within them:

```css
:root {
  --red: #C8102E;
  --red-deep: #8F0A1E;
  --ink: #1B1712;
  --cream: #F3E9D2;
  --cream-dim: #E4D5B5;
  --star: #E8B923;
}
```

- Constructivist poster look: cream background, ink text, heavy use of `--red` for headings, buttons, and diagonal accent bars (`clip-path` or skewed pseudo-elements).
- Headings in `"Oswald", "Arial Narrow", sans-serif`, uppercase, `letter-spacing: 0.05em`. Body in the system sans stack.
- Mobile-first: single column, `max-width: 32rem` centred, generous touch targets (buttons at least 3rem tall), `font-size` on the prompt at least 1.5rem.
- `.screen` sections fill the viewport height and centre content vertically; `[hidden]` must stay `display: none`.
- `.timer` is a full-width track with `#timer-bar` as a red fill whose `width` main.js sets from 100% to 0%; add `transition: width 0.1s linear`.
- `.plan-progress` is a thin track with `#plan-bar` as a red fill, width set by main.js.
- A `.perfect` class on the results screen shows a large `--star` coloured ★ (CSS `::before` on `#results-score`) for a 700 score.
- No horizontal page scroll at 360px width.

- [ ] **Step 3: Create js/main.js with boot and title screen**

```js
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
```

- [ ] **Step 4: Verify in a browser**

Run: `python3 -m http.server 8123 --directory /home/coder/repos/martillion` (background it), open `http://localhost:8123`.
Check: title screen renders with 0 best score and 0 plans, constructivist styling applied, no console errors, no horizontal scroll at mobile width. Temporarily rename `data/questions.json` to confirm the error screen and retry button appear, then rename it back.

- [ ] **Step 5: Commit**

```bash
git add index.html css/style.css js/main.js
git commit -m "feat(ui): Add page shell, styles, and title screen"
```

---

### Task 13: UI round flow - timer, input, reveal

**Files:**
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `sampleQuestions`, `createUprising`, `ROUNDS` from `js/game.js`.
- Produces: a playable 7-round loop from the start button to a `finishGame(uprising)` stub that the next task replaces with the results screen.

- [ ] **Step 1: Add the round flow to main.js**

Add imports at the top:

```js
import { sampleQuestions, createUprising, ROUNDS } from "./game.js";
```

Add below the existing helpers:

```js
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
  clearInterval(timerId);
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
```

Replace the start button listener and wire the new controls:

```js
$("start-button").addEventListener("click", startGame);
$("next-button").addEventListener("click", nextRound);
$("answer-form").addEventListener("submit", (event) => {
  event.preventDefault();
  submitAnswer();
});
```

Remove the `console.log` placeholder listener from Task 12.

- [ ] **Step 2: Run the module tests**

Run: `npm test`
Expected: PASS - main.js is not under test, but this catches any accidental breakage of imports.

- [ ] **Step 3: Verify in a browser**

With the local server from Task 12 running, play through all 7 rounds and check: topic label and round counter update; timer bar drains over 30 seconds and auto-submits when it empties (wait one round out to confirm the ⬛ reveal); enter key submits; a correct common answer reveals its tier and canonical answer; gibberish reveals Utopian; after round 7, "Onward" returns to the title screen and the console logs a summary with a plausible total. No console errors.

- [ ] **Step 4: Commit**

```bash
git add js/main.js
git commit -m "feat(ui): Add round loop with timer and tier reveal"
```

---

### Task 14: UI results, share, and persistence

**Files:**
- Modify: `js/main.js`

**Interfaces:**
- Consumes: `updateRecent` from `js/game.js`; `shareText`, `copyShare` from `js/share.js`.
- Produces: the finished game: results screen, share button, and storage updates after every game.

- [ ] **Step 1: Replace the finishGame stub**

Add imports:

```js
import { updateRecent } from "./game.js";
import { shareText, copyShare } from "./share.js";
```

(Merge the `updateRecent` import into the existing `./game.js` import statement.)

Replace `finishGame` with:

```js
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
```

Wire the results buttons (alongside the other listeners):

```js
$("share-button").addEventListener("click", async () => {
  const copied = await copyShare(lastShare);
  $("share-button").textContent = copied ? "Copied to clipboard" : "Copy failed, comrade";
  setTimeout(() => { $("share-button").textContent = "Share the struggle"; }, 2000);
});
$("again-button").addEventListener("click", startGame);
```

- [ ] **Step 2: Run the module tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 3: Verify in a browser**

Play two full games and check: results screen shows total, stage name, flavour text, and all 7 rounds with emoji and points; share button copies text matching the spec format (paste it somewhere to check); "Rise again" starts a new game with different questions; back on the title screen, best score, plan count, and plan progress reflect the games just played; reload the page and confirm the numbers persist. In devtools, set `localStorage["martillion.v1"] = "{broken"` and reload to confirm the game still boots with defaults.

- [ ] **Step 4: Commit**

```bash
git add js/main.js
git commit -m "feat(ui): Add results screen, share, and persistence"
```

---

### Task 15: README and GitHub Pages deployment

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: the finished site.
- Produces: a live URL at `https://ipinheiro.github.io/martillion/`.

- [ ] **Step 1: Write README.md**

```markdown
# Martillion

An unlimited-play trivia game in the spirit of [Krillion](https://krillion.io), re-themed
around Marx. Seven prompts per uprising, 30 seconds each; the rarer the answer, the more
it scores. A gift, made with love and historical materialism.

## Play

https://ipinheiro.github.io/martillion/

## Develop

No build step, no dependencies. Serve the folder and open it:

    python3 -m http.server 8123

Run the tests (Node 20+):

    npm test

## Add questions

Edit `data/questions.json` following the schema in
`docs/superpowers/specs/2026-09-01-martillion-design.md`, then run `npm test` -
the validation suite enforces the authoring rules.
```

- [ ] **Step 2: Commit and push everything**

```bash
git add README.md
git commit -m "docs: Add README"
git push origin main
```

- [ ] **Step 3: Enable GitHub Pages**

Try on the current (private) repo first:

```bash
gh api -X POST repos/ipinheiro/martillion/pages -f "source[branch]=main" -f "source[path]=/"
```

If this fails because the plan does not allow Pages on private repos, STOP and confirm with Inês before flipping visibility (the spec anticipates this). On her approval:

```bash
gh repo edit ipinheiro/martillion --visibility public --accept-visibility-change-consequences
gh api -X POST repos/ipinheiro/martillion/pages -f "source[branch]=main" -f "source[path]=/"
```

- [ ] **Step 4: Verify the live site**

Run: `curl -sI https://ipinheiro.github.io/martillion/ | head -1` until it returns `HTTP/2 200` (Pages builds take a minute or two), then open the URL and play one round to confirm questions load over HTTPS.

- [ ] **Step 5: Report**

Tell Inês the live URL and remind her the game link is shareable as-is.

---

## Self-review notes

- Spec coverage: gameplay loop (Tasks 12-14), scoring and stages (Task 2), matching (Task 1), sampling and recency (Task 5), bank and validation (Tasks 6-11), persistence (Tasks 3, 14), share (Tasks 4, 14), error handling (Tasks 3, 12), visual design (Task 12), testing (every module task), deployment (Task 15). The spec's "no other network calls" holds: the only fetch is `data/questions.json`; Google Fonts load via `<link>`.
- Type consistency: `matchAnswer` returns `{points, answer}` consumed only inside `game.js`; `RoundResult.tier` is the `{name, emoji}` object from `tierInfo` and is used that way in Tasks 13-14; `stageForScore` returns `verdict` used by `share.js` and `name`/`flavour` used by the results screen.
- Deliberate scope choices: `copyShare` and `main.js` are exercised manually, as the spec assigns UI verification to the browser.
