# Third uprising implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per-question rejections with reasons, a harvest of the answers the bank does not know (stored locally and on a share line), a fuzzy tie that goes to the commoner tier, three-digit question ids, and a repeat memory derived from the bank size.

**Architecture:** Vanilla ES modules with no build step. Pure modules (`matcher`, `game`, `storage`, `share`, `messages`) are unit tested with `node --test`; `main.js` exports `init(document, options)` and wires the DOM. The bank is `data/questions/<topic>.json`, one array of questions per topic. The matcher gains a second pool of entries (rejections) and a four-stage match order; the game records failed attempts with their reasons; storage and share carry the unknown answers out of the game.

**Tech Stack:** HTML, CSS, JavaScript (ES modules), Node 24 built-in test runner, Biome 2.5.11 as the only dev dependency.

**Spec:** `docs/superpowers/specs/2026-09-03-third-uprising-design.md`. Read it first. It builds on `2026-09-02-second-uprising-design.md`, which still applies where the new spec is silent.

## Global constraints

- Work on the branch `third-uprising`, already created from `main`. Never commit to `main`.
- No build step, no runtime dependencies. One dev dependency: `@biomejs/biome`.
- Run tests with `npm test` from the repo root `/home/coder/repos/martillion`. Run `npm run format` (rewrites files to the house format) and then `npm run check` (lint and format check) before every commit; both must be clean.
- Every git commit MUST be run with the identity overrides removed, exactly like this: `env -u GIT_AUTHOR_NAME -u GIT_AUTHOR_EMAIL -u GIT_COMMITTER_NAME -u GIT_COMMITTER_EMAIL git commit -m "..."`. The shell exports those four variables set to the author's work identity, which must never reach a commit. After each commit run `git log --format='%an <%ae>' -1` and confirm it reads `Inês <45789180+ipinheiro@users.noreply.github.com>`. Never include any Claude signature or `Co-Authored-By` line. Never `git add .`; add files by name.
- Commit subjects: `type(scope): Subject`, imperative, capitalised after the colon, 50 characters or fewer. A PreToolUse hook rejects anything else.
- The shell has `noclobber` set: use `>|` to overwrite a file. `rm` prompts: use `rm -f`. Commands starting with `python` are blocked: use `node`.
- Tier vocabulary is fixed: `full-marx` Full Marx 100 ⭐, `vanguard` Vanguard 85 🚩, `comrade` Comrade 60 ✊, `masses` The Masses 30 👥, `false-consciousness` False Consciousness 10 🐑, `utopian` Utopian 0 💭, `no-answer` No answer 0 ⬛. Authored tiers in the bank stay the numbers 100, 85, 60, 30, 10.
- Topic slugs are fixed: `animals-nature`, `films-tv`, `books-stories`, `the-world`, `psychology`, `theory-revolution`. Rounds per game: 7. At most 2 per topic. localStorage key: `martillion.v1`.
- Every JS module starts with `// @ts-check` and uses JSDoc for types. Imports at the top, grouped standard library, third party, local. Biome enforces double quotes, semicolons, trailing commas, 100-column lines.
- UI copy uses sentence case and no em dashes (use ` - ` instead). The new copy, verbatim from the spec:
  - Round screen, considered rejection: `The committee has considered "chicken". <reason> Try another.`
  - Reveal, timeout after a considered rejection: `Time's up. The committee has considered "chicken". <reason> Zero points, comrade.`
  - Share, third line: `The committee could not verify: chicken, smoothie`
- No `innerHTML`, `outerHTML`, `insertAdjacentHTML`, or `document.write`. Build DOM with `createElement` and `textContent`.
- `data/` and `docs/` are excluded from Biome. The bank files are pretty-printed JSON with two-space indentation and a trailing newline; `JSON.stringify(data, null, 2) + "\n"` reproduces them byte for byte (verified on all six), so scripts may load, edit, and re-serialise them.

## File structure

| File | Responsibility | Change |
|---|---|---|
| `js/matcher.js` | Normalisation, Levenshtein, tolerance, `matchAnswer` over answers and rejections | Task 3, 4 |
| `js/game.js` | Bank validation, sampling, repeat memory, round sequencing, attempts with reasons | Task 2, 5 |
| `js/messages.js` | Pure on-screen copy | Task 6 |
| `js/main.js` | `init(document, options)`: wiring | Task 2, 6, 7 |
| `js/storage.js` | localStorage wrapper, validation, migration, the unverified merge | Task 7 |
| `js/share.js` | Share text with the committee line | Task 8 |
| `data/questions/<topic>.json` | The bank: three-digit ids, seed rejections | Task 1, 9 |
| `test/questions.test.js` | Data rules over the whole bank | Task 1, 2, 9 |
| `test/*.test.js` | One test file per module | each task |
| `README.md`, the spec | Docs | Task 10 |

---

### Task 1: Ids to three digits

**Files:**
- Modify: `data/questions/*.json` (all six)
- Modify: `test/questions.test.js:52-56` (the id pattern), `test/questions.test.js:104-105` (the Bible id)

**Interfaces:**
- Produces: every question id has the form `<topic>-<three digits>`, e.g. `animals-nature-001`, `books-stories-007`.

- [ ] **Step 1: Change the data test to expect three digits**

In `test/questions.test.js`, the well-formed test currently reads:

```js
    assert.match(
      question.id,
      new RegExp(`^${question.topic}-\\d{2}$`),
      "id is <topic>-<two digits>",
    );
```

Change it to:

```js
    assert.match(
      question.id,
      new RegExp(`^${question.topic}-\\d{3}$`),
      "id is <topic>-<three digits>",
    );
```

And the Bible test currently reads:

```js
  const question = bank.find((q) => q.id === "books-stories-07");
```

Change it to:

```js
  const question = bank.find((q) => q.id === "books-stories-007");
```

- [ ] **Step 2: Run the data test to see it fail**

Run: `node --test test/questions.test.js 2>&1 | tail -5`
Expected: failures; the well-formed tests report `id is <topic>-<three digits>` and the Bible test throws on `undefined`.

- [ ] **Step 3: Renumber the bank**

Run from the repo root:

```bash
node -e '
const fs = require("node:fs");
let count = 0;
for (const file of fs.readdirSync("data/questions")) {
  const path = `data/questions/${file}`;
  const text = fs.readFileSync(path, "utf8");
  const renumbered = text.replace(/"id": "([a-z-]+)-(\d{2})"/g, (_, topic, n) => {
    count++;
    return `"id": "${topic}-0${n}"`;
  });
  fs.writeFileSync(path, renumbered);
}
console.log("renumbered", count);
'
```

Expected output: `renumbered 150`.

- [ ] **Step 4: Run the whole suite**

Run: `npm test 2>&1 | tail -8 && npm run check`
Expected: `pass 252`, `fail 0`, check clean. (The fixture ids in `test/game.test.js` and `test/main.test.js` stay two-digit; they are not the bank and the pattern is only asserted over the bank.)

- [ ] **Step 5: Commit**

```bash
git add data/questions/animals-nature.json data/questions/books-stories.json data/questions/films-tv.json data/questions/psychology.json data/questions/the-world.json data/questions/theory-revolution.json test/questions.test.js
env -u GIT_AUTHOR_NAME -u GIT_AUTHOR_EMAIL -u GIT_COMMITTER_NAME -u GIT_COMMITTER_EMAIL git commit -m "chore(bank): Number questions with three digits"
git log --format='%an <%ae>' -1
```

---

### Task 2: Repeat memory derived from the bank

**Files:**
- Modify: `js/game.js:6-11` (constants), `js/game.js:124-130` (`updateRecent`)
- Modify: `js/main.js:2-9` (imports), `js/main.js:259-272` (`finishGame`)
- Modify: `test/game.test.js`, `test/questions.test.js:4,42`, `test/main.test.js`

**Interfaces:**
- Consumes: `ROUNDS` from `js/game.js`.
- Produces: `recentLimit(bankSize: number): number` exported from `js/game.js`, equal to `Math.max(0, bankSize - ROUNDS)`. `updateRecent(recentIds: string[], playedIds: string[], limit: number): string[]` keeps the newest `limit` ids and returns `[]` when `limit` is 0. `RECENT_LIMIT` no longer exists.

- [ ] **Step 1: Rewrite the game tests that touch the memory**

In `test/game.test.js`, change the import block to drop `RECENT_LIMIT` and add `recentLimit`:

```js
import {
  createUprising,
  MAX_PER_TOPIC,
  MIN_TOPICS,
  PERFECT_SCORE,
  recentLimit,
  ROUNDS,
  sampleQuestions,
  updateRecent,
  validateBank,
} from "../js/game.js";
```

In the `constants agree with the spec` test delete the line `assert.equal(RECENT_LIMIT, 40);`.

Replace the `updateRecent appends and caps at the limit` test with these two:

```js
test("updateRecent appends and caps at the given limit", () => {
  const recent = Array.from({ length: 40 }, (_, i) => `old-${i}`);
  const next = updateRecent(recent, ["new-1", "new-2"], 40);
  assert.equal(next.length, 40);
  assert.deepEqual(next.slice(-2), ["new-1", "new-2"]);
  assert.ok(!next.includes("old-0"));
  assert.deepEqual(updateRecent(["old"], ["new"], 0), []);
});

test("recentLimit remembers everything but one game's worth, never below zero", () => {
  assert.equal(recentLimit(150), 143);
  assert.equal(recentLimit(ROUNDS), 0);
  assert.equal(recentLimit(3), 0);
});
```

In the last test, `played questions are excluded from the next game end to end`, change the final line of the loop body from `recent = updateRecent(recent, ids);` to:

```js
    recent = updateRecent(recent, ids, recentLimit(bank.length));
```

- [ ] **Step 2: Drop the memory assertion from the data test**

In `test/questions.test.js`, in the test `the bank passes runtime validation and can feed the sampler`, delete the line:

```js
  assert.ok(bank.length - RECENT_LIMIT >= ROUNDS, "enough questions to avoid repeats");
```

That was the only use of `RECENT_LIMIT` and of `ROUNDS` in the file, so the import from `../js/game.js` becomes:

```js
import { MIN_TOPICS, validateBank } from "../js/game.js";
```

- [ ] **Step 3: Fix the main test's expectation**

The main test's fixture bank has 12 questions, so the memory is `recentLimit(12)`, which is 5. In `test/main.test.js`, in `a full game scores, saves, and reports a new personal best only when earned`, change:

```js
  assert.equal(saved.recentQuestionIds.length, 7);
```

to:

```js
  assert.equal(saved.recentQuestionIds.length, 5, "the bank has 12 questions, so 12 - 7 are kept");
```

- [ ] **Step 4: Run the tests to see them fail**

Run: `node --test test/game.test.js test/main.test.js 2>&1 | grep -E "^(not ok|ok)" | head -30`
Expected: `recentLimit` is not exported (SyntaxError at import), so the game file fails to load; the main test's full-game assertion fails with `7 !== 5`.

- [ ] **Step 5: Implement `recentLimit` and the limit argument**

In `js/game.js`, replace the constants block at the top:

```js
export const ROUNDS = 7;
export const MAX_PER_TOPIC = 2;
/** Distinct topics a bank needs before the per-topic cap can still fill a game. */
export const MIN_TOPICS = Math.ceil(ROUNDS / MAX_PER_TOPIC);
export const PERFECT_SCORE = ROUNDS * TOP_TIER.points;

/**
 * How many played ids to remember: everything but one game's worth, so the whole bank is seen
 * before anything repeats, and never below zero.
 * @param {number} bankSize
 */
export function recentLimit(bankSize) {
  return Math.max(0, bankSize - ROUNDS);
}
```

Replace `updateRecent`:

```js
/**
 * @param {string[]} recentIds
 * @param {string[]} playedIds
 * @param {number} limit ids to keep; `slice(-0)` would keep everything, hence the guard
 */
export function updateRecent(recentIds, playedIds, limit) {
  if (limit <= 0) return [];
  return [...recentIds, ...playedIds].slice(-limit);
}
```

In `js/main.js`, add `recentLimit` to the import from `./game.js` (keep the list alphabetical as Biome sorts it):

```js
import {
  createUprising,
  PERFECT_SCORE,
  recentLimit,
  ROUNDS,
  sampleQuestions,
  updateRecent,
  validateBank,
} from "./game.js";
```

and in `finishGame` change the `recentQuestionIds` entry to:

```js
      recentQuestionIds: updateRecent(
        state.recentQuestionIds,
        summary.rounds.map((round) => round.questionId),
        recentLimit(bank.length),
      ),
```

- [ ] **Step 6: Run everything**

Run: `npm run format && npm test 2>&1 | tail -8 && npm run check`
Expected: `pass 253`, `fail 0`, check clean.

- [ ] **Step 7: Commit**

```bash
git add js/game.js js/main.js test/game.test.js test/questions.test.js test/main.test.js
env -u GIT_AUTHOR_NAME -u GIT_AUTHOR_EMAIL -u GIT_COMMITTER_NAME -u GIT_COMMITTER_EMAIL git commit -m "feat(game): Derive the repeat memory from the bank size"
git log --format='%an <%ae>' -1
```

---

### Task 3: Tie-break to the commoner tier

**Files:**
- Modify: `js/matcher.js:83-89`
- Modify: `test/matcher.test.js:88-95`

**Interfaces:**
- Produces: `matchAnswer` sends an equidistant fuzzy tie between two answers to the lower `tier`.

- [ ] **Step 1: Flip the test**

In `test/matcher.test.js` replace the test `an equidistant tie goes to the higher tier regardless of order` with:

```js
test("an equidistant tie goes to the commoner tier regardless of order", () => {
  const rivers = [
    { answer: "Rhine", aliases: [], tier: 10 },
    { answer: "Rhone", aliases: [], tier: 60 },
  ];
  assert.equal(matchAnswer("Rhune", rivers).entry, rivers[0]);
  assert.equal(matchAnswer("Rhune", [...rivers].reverse()).entry, rivers[0]);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test test/matcher.test.js 2>&1 | grep -E "^not ok"`
Expected: `not ok ... an equidistant tie goes to the commoner tier regardless of order`.

- [ ] **Step 3: Flip the comparison**

In `js/matcher.js`, the doc comment on `matchAnswer` says `ties to the rarer tier`; change it to `ties to the commoner tier`. In the loop, replace:

```js
      const rarerTie = best !== null && distance === best.distance && entry.tier > best.entry.tier;
      if (closer || rarerTie) best = { entry, distance };
```

with:

```js
      const commonerTie =
        best !== null && distance === best.distance && entry.tier < best.entry.tier;
      if (closer || commonerTie) best = { entry, distance };
```

- [ ] **Step 4: Run everything**

Run: `npm run format && npm test 2>&1 | tail -8 && npm run check`
Expected: `pass 253`, `fail 0`, check clean. The data test's `every authored form, typed exactly, scores its own entry` still passes because exact matches never reach the tie.

- [ ] **Step 5: Commit**

```bash
git add js/matcher.js test/matcher.test.js
env -u GIT_AUTHOR_NAME -u GIT_AUTHOR_EMAIL -u GIT_COMMITTER_NAME -u GIT_COMMITTER_EMAIL git commit -m "fix(matcher): Send an equidistant tie to the commoner tier"
git log --format='%an <%ae>' -1
```

---

### Task 4: Matcher rejections

**Files:**
- Modify: `js/matcher.js` (typedefs, helpers, `matchAnswer`)
- Modify: `test/matcher.test.js`

**Interfaces:**
- Produces, exported from `js/matcher.js`:
  - typedef `RejectedEntry`: `{ answer: string, aliases: string[], reason: string }`.
  - typedef `MatchResult`: `{ status: "matched", entry: AnswerEntry } | { status: "rejected", entry: RejectedEntry } | { status: "unverified" | "empty", entry: null }`.
  - `matchAnswer(input: string, answers: AnswerEntry[], rejected?: RejectedEntry[]): MatchResult`. Order: exact answer, exact rejection, fuzzy answer, fuzzy rejection. Ties between answers go to the commoner tier; between rejections to the one listed first. `rejected` defaults to `[]`.
  - `normalize`, `levenshtein`, `tolerance` unchanged.

- [ ] **Step 1: Add the rejection tests**

Append to `test/matcher.test.js`:

```js
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
  assert.equal(matchAnswer("sea spider", spiders).entry, spiders[0], "without the rejection it fuzzes");
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
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test test/matcher.test.js 2>&1 | grep -E "^not ok"`
Expected: the five rejection tests fail (status `unverified` or entry `null`); the last one passes.

- [ ] **Step 3: Replace the matcher's entry types and `matchAnswer`**

In `js/matcher.js`, replace everything from the `AnswerEntry` typedef down to (and including) the `MatchResult` typedef with:

```js
/**
 * One answer in the bank. `tier` is the authored point value; a higher number is rarer.
 * @typedef {object} AnswerEntry
 * @property {string} answer
 * @property {string[]} aliases
 * @property {number} tier
 * @property {string} [remark]
 */

/**
 * An answer the committee has considered and rules out, with the reason it gives.
 * @typedef {object} RejectedEntry
 * @property {string} answer
 * @property {string[]} aliases
 * @property {string} reason
 */

/** Anything with a canonical answer and its aliases. @typedef {Pick<AnswerEntry, "answer" | "aliases">} Entry */

/**
 * @typedef {{ status: "matched", entry: AnswerEntry }
 *   | { status: "rejected", entry: RejectedEntry }
 *   | { status: "unverified" | "empty", entry: null }} MatchResult
 */
```

Then replace everything from `/** @param {AnswerEntry} entry */ function forms` to the end of the file with:

```js
/** @param {Entry} entry */
function forms(entry) {
  return [entry.answer, ...entry.aliases].map(normalize);
}

/**
 * @template {Entry} T
 * @param {string} norm
 * @param {T[]} entries
 * @returns {T | null}
 */
function exact(norm, entries) {
  return entries.find((entry) => forms(entry).includes(norm)) ?? null;
}

/**
 * The closest entry within tolerance. `prefer(candidate, best)` breaks an equidistant tie.
 * @template {Entry} T
 * @param {string} norm
 * @param {T[]} entries
 * @param {(candidate: T, best: T) => boolean} prefer
 * @returns {T | null}
 */
function closest(norm, entries, prefer) {
  /** @type {{ entry: T, distance: number } | null} */
  let best = null;
  for (const entry of entries) {
    for (const form of forms(entry)) {
      const distance = levenshtein(norm, form);
      if (distance > tolerance(form.length)) continue;
      const closer = best === null || distance < best.distance;
      const tie = best !== null && distance === best.distance && prefer(entry, best.entry);
      if (closer || tie) best = { entry, distance };
    }
  }
  return best ? best.entry : null;
}

/** @type {(candidate: AnswerEntry, best: AnswerEntry) => boolean} */
const commoner = (candidate, best) => candidate.tier < best.tier;
const first = () => false;

/**
 * Exact answer, exact rejection, fuzzy answer, fuzzy rejection. Exact beats fuzzy across both
 * pools, so a rejection typed perfectly can never score as a typo of an answer. A tie between
 * answers goes to the commoner tier; between rejections, to the one listed first.
 * @param {string} input
 * @param {AnswerEntry[]} answers
 * @param {RejectedEntry[]} [rejected]
 * @returns {MatchResult}
 */
export function matchAnswer(input, answers, rejected = []) {
  const norm = normalize(input);
  if (!norm) return { status: "empty", entry: null };

  const exactAnswer = exact(norm, answers);
  if (exactAnswer) return { status: "matched", entry: exactAnswer };
  const exactRejection = exact(norm, rejected);
  if (exactRejection) return { status: "rejected", entry: exactRejection };

  const fuzzyAnswer = closest(norm, answers, commoner);
  if (fuzzyAnswer) return { status: "matched", entry: fuzzyAnswer };
  const fuzzyRejection = closest(norm, rejected, first);
  if (fuzzyRejection) return { status: "rejected", entry: fuzzyRejection };
  return { status: "unverified", entry: null };
}
```

- [ ] **Step 4: Run everything**

Run: `npm run format && npm test 2>&1 | tail -8 && npm run check`
Expected: `pass 259`, `fail 0`, check clean. Every earlier matcher test still passes with two arguments.

- [ ] **Step 5: Commit**

```bash
git add js/matcher.js test/matcher.test.js
env -u GIT_AUTHOR_NAME -u GIT_AUTHOR_EMAIL -u GIT_COMMITTER_NAME -u GIT_COMMITTER_EMAIL git commit -m "feat(matcher): Match considered rejections after answers"
git log --format='%an <%ae>' -1
```

---

### Task 5: Game attempts, reasons, and the unverified list

**Files:**
- Modify: `js/game.js` (typedefs, `isQuestion`, `createUprising`, new `unverifiedAttempts`)
- Modify: `test/game.test.js`

**Interfaces:**
- Consumes: `matchAnswer(input, answers, rejected)` and `RejectedEntry` from Task 4.
- Produces, exported from `js/game.js`:
  - `Question` gains optional `rejected?: RejectedEntry[]`; `validateBank` rejects a non-array `rejected`.
  - `RoundResult` gains `reason: string | null` (the committee's reason when the final attempt was a considered rejection) and `unverified: string[]` (unknown inputs offered during the round, trimmed, in order, including a final unknown left in the box; kept whichever way the round closes).
  - `SubmitOutcome` is `{ status: "matched" | "rejected" | "unverified" | "empty", result: RoundResult | null, reason: string | null }`.
  - `createUprising(questions)` exposes `attempts` (getter, `{ input: string, reason: string | null }[]` for the round in progress) in place of the old `rejected` getter; `submit(input)` returns a `SubmitOutcome`; `timeout(input)` returns a `RoundResult`.
  - `unverifiedAttempts(summary: Summary): { questionId: string, input: string }[]` flattens every round's `unverified`.

- [ ] **Step 1: Update the game test fixture and the existing tests**

In `test/game.test.js` add `unverifiedAttempts` to the import list (alphabetical, after `updateRecent`). Give the fixture a rejection: in `makeBank`, after the `answers` array of each question add:

```js
      rejected: [
        {
          answer: "Chicken",
          aliases: ["hen"],
          reason: "Chickens fly. Badly, briefly, over a fence. Still flying.",
        },
      ],
```

In `validateBank returns a well-formed bank and rejects everything else`, append:

```js
  assert.throws(() => validateBank([{ ...bank[0], rejected: "no" }]), /Malformed/);
```

In `a recognised answer closes the round with the full round object`, the expected object gains two fields; replace the `deepEqual` with:

```js
  assert.deepEqual(outcome.result, {
    questionId: question.id,
    prompt: question.prompt,
    input: "rarest",
    matchedAnswer: "Rare thing",
    remark: "The committee is impressed.",
    reason: null,
    unverified: [],
    tier: { id: "full-marx", name: "Full Marx", points: 100, emoji: "⭐" },
  });
```

Replace `an unrecognised answer is rejected, remembered, and the round carries on` with:

```js
test("an unknown answer is remembered as an attempt and the round carries on", () => {
  const [question] = makeBank();
  const uprising = createUprising([question]);
  assert.deepEqual(uprising.submit("roomba"), { status: "unverified", result: null, reason: null });
  assert.deepEqual(uprising.submit("hoover"), { status: "unverified", result: null, reason: null });
  assert.equal(uprising.round, 0);
  assert.deepEqual(uprising.attempts, [
    { input: "roomba", reason: null },
    { input: "hoover", reason: null },
  ]);
  assert.equal(uprising.submit("Anything").status, "matched");
  assert.deepEqual(uprising.attempts, []);
});
```

Replace `empty input is neither accepted nor remembered` with:

```js
test("empty input is neither accepted nor remembered", () => {
  const uprising = createUprising(makeBank().slice(0, 1));
  assert.deepEqual(uprising.submit("   "), { status: "empty", result: null, reason: null });
  assert.deepEqual(uprising.attempts, []);
  assert.equal(uprising.round, 0);
});
```

- [ ] **Step 2: Add the new game tests**

Append to `test/game.test.js`:

```js
const CHICKEN = "Chickens fly. Badly, briefly, over a fence. Still flying.";

test("a considered rejection is reported with its reason and the round carries on", () => {
  const [question] = makeBank();
  const uprising = createUprising([question]);
  assert.deepEqual(uprising.submit("hen"), { status: "rejected", result: null, reason: CHICKEN });
  assert.equal(uprising.round, 0);
  assert.deepEqual(uprising.attempts, [{ input: "hen", reason: CHICKEN }]);
});

test("timeout after a considered rejection carries the reason, submitted or left in the box", () => {
  const [question] = makeBank();
  const submitted = createUprising([question]);
  submitted.submit("chicken");
  const afterSubmit = submitted.timeout("");
  assert.equal(afterSubmit.tier, UTOPIAN);
  assert.equal(afterSubmit.input, "chicken");
  assert.equal(afterSubmit.reason, CHICKEN);
  assert.deepEqual(afterSubmit.unverified, []);

  const inBox = createUprising([question]).timeout("chicken");
  assert.equal(inBox.tier, UTOPIAN);
  assert.equal(inBox.input, "chicken");
  assert.equal(inBox.reason, CHICKEN);
});

test("timeout lists every unknown attempt, including the one left in the box", () => {
  const uprising = createUprising(makeBank().slice(0, 1));
  uprising.submit(" roomba ");
  uprising.submit("hoover");
  const result = uprising.timeout("dyson");
  assert.equal(result.tier, UTOPIAN);
  assert.equal(result.input, "dyson");
  assert.equal(result.reason, null);
  assert.deepEqual(result.unverified, ["roomba", "hoover", "dyson"]);
});

test("a matched round after an unknown attempt has no reason and lists the attempt", () => {
  const uprising = createUprising(makeBank().slice(0, 1));
  uprising.submit(" roomba ");
  uprising.submit("hen");
  const outcome = uprising.submit("Anything");
  assert.equal(outcome.result?.reason, null);
  assert.deepEqual(outcome.result?.unverified, ["roomba"]);
});

test("unverifiedAttempts flattens the game's unknown answers with their question ids", () => {
  const [first, second] = makeBank();
  const uprising = createUprising([first, second]);
  uprising.submit("roomba");
  uprising.submit("Anything");
  uprising.submit("hen");
  uprising.timeout("dyson");
  assert.deepEqual(unverifiedAttempts(uprising.summary()), [
    { questionId: first.id, input: "roomba" },
    { questionId: second.id, input: "dyson" },
  ]);
});
```

- [ ] **Step 3: Run the game tests to see them fail**

Run: `node --test test/game.test.js 2>&1 | grep -E "^not ok" | head`
Expected: the file fails to load (`unverifiedAttempts` is not exported) or, once that resolves, the new tests and the three updated ones fail.

- [ ] **Step 4: Implement the typedefs and validation**

In `js/game.js`, replace the `Question` and `RoundResult` typedefs and add `Attempt`:

```js
/**
 * @typedef {object} Question
 * @property {string} id
 * @property {string} topic
 * @property {string} prompt
 * @property {import("./matcher.js").AnswerEntry[]} answers
 * @property {import("./matcher.js").RejectedEntry[]} [rejected]
 */

/** A failed attempt in the round in progress. @typedef {{ input: string, reason: string | null }} Attempt */

/**
 * @typedef {object} RoundResult
 * @property {string} questionId
 * @property {string} prompt
 * @property {string} input
 * @property {string | null} matchedAnswer
 * @property {string | null} remark
 * @property {string | null} reason the committee's reason, when the final attempt was a considered rejection
 * @property {string[]} unverified unknown answers offered during the round, trimmed, in order
 * @property {import("./scorer.js").Tier} tier
 */
```

In `isQuestion`, extend the returned condition so the last two lines read:

```js
    typeof q.prompt === "string" &&
    Array.isArray(q.answers) &&
    (q.rejected === undefined || Array.isArray(q.rejected))
  );
```

- [ ] **Step 5: Implement the attempts in `createUprising`**

Replace the `SubmitOutcome` typedef:

```js
/**
 * @typedef {object} SubmitOutcome
 * @property {"matched" | "rejected" | "unverified" | "empty"} status
 * @property {RoundResult | null} result set only when the answer was recognised
 * @property {string | null} reason set only when the committee has considered and rejected it
 */
```

Replace the whole of `createUprising` with:

```js
/** @param {Question[]} questions */
export function createUprising(questions) {
  /** @type {RoundResult[]} */
  const rounds = [];
  /** @type {Attempt[]} */
  let attempts = [];

  function current() {
    if (rounds.length >= questions.length) throw new Error("The uprising is over");
    return questions[rounds.length];
  }

  /**
   * Runs the input past the question. A considered rejection or an unknown answer is remembered
   * as an attempt; a match is left for the caller to close the round with.
   * @param {string} input
   */
  function offer(input) {
    const question = current();
    const match = matchAnswer(input, question.answers, question.rejected ?? []);
    if (match.status === "rejected") attempts.push({ input, reason: match.entry.reason });
    if (match.status === "unverified") attempts.push({ input, reason: null });
    return { question, match };
  }

  /**
   * @param {Question} question
   * @param {string} input
   * @param {import("./matcher.js").AnswerEntry | null} entry
   * @param {import("./scorer.js").Tier} tier
   * @param {string | null} reason
   */
  function close(question, input, entry, tier, reason) {
    /** @type {RoundResult} */
    const result = {
      questionId: question.id,
      prompt: question.prompt,
      input,
      matchedAnswer: entry?.answer ?? null,
      remark: entry?.remark ?? null,
      reason,
      unverified: attempts
        .filter((attempt) => attempt.reason === null)
        .map((attempt) => attempt.input.trim()),
      tier,
    };
    rounds.push(result);
    attempts = [];
    return result;
  }

  return {
    get round() {
      return rounds.length;
    },
    /** Failed attempts so far in the round in progress, each with the committee's reason or null. */
    get attempts() {
      return attempts.map((attempt) => ({ ...attempt }));
    },
    isOver: () => rounds.length >= questions.length,
    current,
    /**
     * Offer an answer. Only a recognised answer closes the round; a considered rejection carries
     * its reason back, and either kind of failure lets the player try again.
     * @param {string} input
     * @returns {SubmitOutcome}
     */
    submit(input) {
      const { question, match } = offer(input);
      if (match.status === "matched") {
        const tier = tierForAuthored(match.entry.tier);
        return { status: "matched", result: close(question, input, match.entry, tier, null), reason: null };
      }
      const reason = match.status === "rejected" ? match.entry.reason : null;
      return { status: match.status, result: null, reason };
    },
    /**
     * Time is up. Whatever is in the box gets one last try; otherwise the round scores zero,
     * as Utopian when anything was offered and as no answer when nothing was. The last attempt
     * of either kind is the round's input, with the committee's reason if it had one.
     * @param {string} input
     */
    timeout(input) {
      const { question, match } = offer(input);
      if (match.status === "matched") {
        return close(question, input, match.entry, tierForAuthored(match.entry.tier), null);
      }
      const last = attempts.at(-1);
      if (last === undefined) return close(question, "", null, NO_ANSWER, null);
      return close(question, last.input, null, UTOPIAN, last.reason);
    },
    /** @returns {Summary} */
    summary() {
      const total = rounds.reduce((sum, result) => sum + result.tier.points, 0);
      return {
        total,
        rounds: rounds.map((result) => ({ ...result, unverified: [...result.unverified] })),
        stage: stageForScore(total),
      };
    },
  };
}

/**
 * Every unknown answer offered in the game, with the question it was offered for.
 * @param {Summary} summary
 * @returns {{ questionId: string, input: string }[]}
 */
export function unverifiedAttempts(summary) {
  return summary.rounds.flatMap((round) =>
    round.unverified.map((input) => ({ questionId: round.questionId, input })),
  );
}
```

- [ ] **Step 6: Update the other tests' round fixtures**

Two other test files build `RoundResult` objects by hand and must gain the new fields or `@ts-check` and later tasks will trip on them.

In `test/messages.test.js`, the `round` helper becomes:

```js
const round = (overrides) => ({
  questionId: "q-1",
  prompt: "Name a fictional robot",
  input: "bender",
  matchedAnswer: "Bender",
  remark: null,
  reason: null,
  unverified: [],
  tier: tierById("masses"),
  ...overrides,
});
```

In `test/share.test.js`, the `summaryOf` helper becomes:

```js
function summaryOf(tierIds, unverified = []) {
  const rounds = tierIds.map((id, i) => ({
    questionId: `q-${i}`,
    prompt: "Name a thing",
    input: "thing",
    matchedAnswer: null,
    remark: null,
    reason: null,
    unverified: unverified[i] ?? [],
    tier: tierById(id),
  }));
  const total = rounds.reduce((sum, round) => sum + round.tier.points, 0);
  return { total, rounds, stage: stageForScore(total) };
}
```

- [ ] **Step 7: Run everything**

Run: `npm run format && npm test 2>&1 | tail -8 && npm run check`
Expected: `pass 264`, `fail 0`, check clean.

- [ ] **Step 8: Commit**

```bash
git add js/game.js test/game.test.js test/messages.test.js test/share.test.js
env -u GIT_AUTHOR_NAME -u GIT_AUTHOR_EMAIL -u GIT_COMMITTER_NAME -u GIT_COMMITTER_EMAIL git commit -m "feat(game): Remember attempts with the committee's reasons"
git log --format='%an <%ae>' -1
```

---

### Task 6: Messages and the round screen

**Files:**
- Modify: `js/messages.js:7-24`
- Modify: `js/main.js:213-227` (`tryAnswer`)
- Modify: `test/messages.test.js`, `test/main.test.js`

**Interfaces:**
- Consumes: `SubmitOutcome.reason` and `RoundResult.reason` from Task 5.
- Produces: `rejectionMessage(input: string, reason?: string | null): string` and `revealDetail(result: RoundResult): string` with the considered-rejection lines.

- [ ] **Step 1: Add the messages tests**

Append to `test/messages.test.js`:

```js
const CHICKEN = "Chickens fly. Badly, briefly, over a fence. Still flying.";

test("revealDetail repeats the committee's reason after a considered rejection", () => {
  const result = round({
    input: " chicken ",
    matchedAnswer: null,
    reason: CHICKEN,
    tier: tierById("utopian"),
  });
  assert.equal(
    revealDetail(result),
    `Time's up. The committee has considered "chicken". ${CHICKEN} Zero points, comrade.`,
  );
});

test("rejectionMessage gives the committee's reason when it has one", () => {
  assert.equal(
    rejectionMessage(" Chicken ", CHICKEN),
    `The committee has considered "Chicken". ${CHICKEN} Try another.`,
  );
  assert.equal(rejectionMessage("Roomba", null), '"Roomba" is not a recognised answer. Try another.');
});
```

- [ ] **Step 2: Add the main tests**

In `test/main.test.js`, give the fixture a rejection: in `makeBank`, after the `answers` array add:

```js
      rejected: [
        {
          answer: "Chicken",
          aliases: ["hen"],
          reason: "Chickens fly. Badly, briefly, over a fence. Still flying.",
        },
      ],
```

Append these tests:

```js
test("a considered rejection shows the committee's reason and the round carries on", async () => {
  const { $, visible, type } = await boot();
  $("start-button").dispatch("click");
  type("hen");
  assert.deepEqual(visible(), ["screen-round"]);
  assert.equal(
    $("round-feedback").textContent,
    'The committee has considered "hen". Chickens fly. Badly, briefly, over a fence. Still flying. Try another.',
  );
  assert.equal($("answer-input").value, "", "the box is cleared for the next try");
  type("Anything");
  assert.deepEqual(visible(), ["screen-reveal"]);
});

test("running out of time after a considered rejection repeats the reason at zero", async () => {
  const { $, type, runOutTheClock } = await boot();
  $("start-button").dispatch("click");
  type("chicken");
  await runOutTheClock();
  assert.equal($("reveal-tier").textContent, "Utopian");
  assert.equal($("reveal-points").textContent, "+0");
  assert.equal(
    $("reveal-detail").textContent,
    'Time\'s up. The committee has considered "chicken". Chickens fly. Badly, briefly, over a fence. Still flying. Zero points, comrade.',
  );
});
```

- [ ] **Step 3: Run them to see them fail**

Run: `node --test test/messages.test.js test/main.test.js 2>&1 | grep -E "^not ok"`
Expected: the two messages tests and the two main tests fail on the copy (the old "is not a recognised answer" and "could not verify" lines).

- [ ] **Step 4: Implement the copy**

In `js/messages.js`, replace `revealDetail` and `rejectionMessage`:

```js
/** @param {RoundResult} result */
export function revealDetail(result) {
  if (result.tier.id === NO_ANSWER.id) return "Time's up. Silence. The revolution needs answers.";
  const typed = result.input.trim();
  if (result.matchedAnswer === null) {
    if (result.reason) {
      return `Time's up. The committee has considered "${typed}". ${result.reason} Zero points, comrade.`;
    }
    return `Time's up. The committee could not verify "${typed}". Zero points, comrade.`;
  }
  const line = `The committee recognises "${result.matchedAnswer}".`;
  return result.remark ? `${line} ${result.remark}` : line;
}

/**
 * Shown on the round screen when an answer does not score; the round carries on. With a reason,
 * the committee has considered the answer and rules it out.
 * @param {string} input
 * @param {string | null} [reason]
 */
export function rejectionMessage(input, reason = null) {
  const typed = input.trim();
  if (reason) return `The committee has considered "${typed}". ${reason} Try another.`;
  return `"${typed}" is not a recognised answer. Try another.`;
}
```

In `js/main.js`, in `tryAnswer`, replace:

```js
    if (outcome.status === "unverified") {
      $("round-feedback").textContent = rejectionMessage(input.value);
      input.value = "";
    }
```

with:

```js
    if (outcome.status === "unverified" || outcome.status === "rejected") {
      $("round-feedback").textContent = rejectionMessage(input.value, outcome.reason);
      input.value = "";
    }
```

- [ ] **Step 5: Run everything**

Run: `npm run format && npm test 2>&1 | tail -8 && npm run check`
Expected: `pass 268`, `fail 0`, check clean.

- [ ] **Step 6: Commit**

```bash
git add js/messages.js js/main.js test/messages.test.js test/main.test.js
env -u GIT_AUTHOR_NAME -u GIT_AUTHOR_EMAIL -u GIT_COMMITTER_NAME -u GIT_COMMITTER_EMAIL git commit -m "feat(ui): Give the committee's reason for a rejection"
git log --format='%an <%ae>' -1
```

---

### Task 7: Storing the unknown answers

**Files:**
- Modify: `js/storage.js`
- Modify: `js/main.js:2-9,23` (imports), `js/main.js` `finishGame`
- Modify: `test/storage.test.js`, `test/main.test.js`

**Interfaces:**
- Consumes: `unverifiedAttempts(summary)` from Task 5; `normalize` from `js/matcher.js`.
- Produces, exported from `js/storage.js`:
  - `UNVERIFIED_LIMIT` = 200.
  - typedef `Unverified`: `{ questionId: string, input: string }`.
  - `SavedState` gains `unverified: Unverified[]`; `defaultState()` includes `unverified: []`; `isValidState` requires it to be an array of entries with two non-empty strings.
  - `createStorage(backend).load()` treats a stored state with no `unverified` field as having `[]` (migration), instead of resetting to defaults.
  - `mergeUnverified(existing: Unverified[], additions: Unverified[]): Unverified[]`: trims each addition, skips an empty input and any repeat of the same `normalize`d input on the same question, keeps the newest `UNVERIFIED_LIMIT`.

- [ ] **Step 1: Update the storage tests**

In `test/storage.test.js`, change the import to:

```js
import {
  createStorage,
  defaultState,
  isValidState,
  KEY,
  mergeUnverified,
  UNVERIFIED_LIMIT,
} from "../js/storage.js";
```

Replace the `played` fixture:

```js
const played = {
  bestScore: 630,
  totalPoints: 4100,
  gamesPlayed: 9,
  recentQuestionIds: ["films-tv-001"],
  unverified: [{ questionId: "films-tv-001", input: "roomba" }],
};
```

In `defaultState returns a fresh object each call`, the expected object gains `unverified: []`:

```js
  assert.deepEqual(defaultState(), {
    bestScore: 0,
    totalPoints: 0,
    gamesPlayed: 0,
    recentQuestionIds: [],
    unverified: [],
  });
```

In `a __proto__ key in stored JSON cannot pollute the loaded state`, the stored blob has no `unverified`, so the migration adds one; change `assert.equal(Object.keys(loaded).length, 4);` to `assert.equal(Object.keys(loaded).length, 5);`.

Append:

```js
test("isValidState requires every unverified entry to carry a question id and an input", () => {
  assert.equal(isValidState({ ...played, unverified: "roomba" }), false);
  assert.equal(isValidState({ ...played, unverified: [{ questionId: "q" }] }), false);
  assert.equal(isValidState({ ...played, unverified: [{ questionId: "q", input: "" }] }), false);
  assert.equal(isValidState({ ...played, unverified: [{ questionId: "", input: "roomba" }] }), false);
});

test("a state stored before the harvest loads with an empty list and its scores intact", () => {
  const older = {
    bestScore: 630,
    totalPoints: 4100,
    gamesPlayed: 9,
    recentQuestionIds: ["films-tv-001"],
  };
  const storage = createStorage(fakeBackend({ [KEY]: JSON.stringify(older) }));
  assert.deepEqual(storage.load(), { ...older, unverified: [] });
});

test("mergeUnverified trims, skips repeats per question, and keeps the newest", () => {
  const existing = [{ questionId: "q1", input: "roomba" }];
  const merged = mergeUnverified(existing, [
    { questionId: "q1", input: " Roomba! " },
    { questionId: "q2", input: "Roomba" },
    { questionId: "q2", input: " smoothie " },
    { questionId: "q2", input: "   " },
  ]);
  assert.deepEqual(merged, [
    { questionId: "q1", input: "roomba" },
    { questionId: "q2", input: "Roomba" },
    { questionId: "q2", input: "smoothie" },
  ]);
  const many = Array.from({ length: UNVERIFIED_LIMIT + 5 }, (_, i) => ({
    questionId: "q",
    input: `miss ${i}`,
  }));
  const capped = mergeUnverified([], many);
  assert.equal(capped.length, UNVERIFIED_LIMIT);
  assert.equal(capped[0].input, "miss 5");
  assert.equal(capped.at(-1)?.input, `miss ${UNVERIFIED_LIMIT + 4}`);
});
```

- [ ] **Step 2: Add the main test**

Append to `test/main.test.js`:

```js
test("a finished game stores the answers the bank did not know, and only those", async () => {
  const { $, storage, type, runOutTheClock } = await boot();
  $("start-button").dispatch("click");
  const next = () => $("next-button").dispatch("click");
  type(" roomba ");
  type("hen");
  type("Anything");
  next();
  for (let i = 0; i < 6; i++) {
    await runOutTheClock();
    next();
  }
  const saved = JSON.parse(storage.data.get(KEY));
  assert.equal(saved.unverified.length, 1, "the known rejection is not stored");
  assert.equal(saved.unverified[0].input, "roomba");
  assert.match(saved.unverified[0].questionId, /^[a-z-]+-0[12]$/);
});
```

- [ ] **Step 3: Run them to see them fail**

Run: `node --test test/storage.test.js test/main.test.js 2>&1 | grep -E "^not ok" | head`
Expected: storage fails to load (`mergeUnverified` and `UNVERIFIED_LIMIT` not exported); the main test fails on `saved.unverified` being undefined.

- [ ] **Step 4: Implement storage**

Replace the whole of `js/storage.js` with:

```js
// @ts-check
import { normalize } from "./matcher.js";

export const KEY = "martillion.v1";
/** Newest unknown answers kept. */
export const UNVERIFIED_LIMIT = 200;

/**
 * An answer the bank did not know, kept so the bank can be widened from real play.
 * @typedef {object} Unverified
 * @property {string} questionId
 * @property {string} input
 */

/**
 * @typedef {object} SavedState
 * @property {number} bestScore
 * @property {number} totalPoints
 * @property {number} gamesPlayed
 * @property {string[]} recentQuestionIds
 * @property {Unverified[]} unverified
 */

/** @typedef {Pick<Storage, "getItem" | "setItem">} Backend */

/** @returns {SavedState} */
export function defaultState() {
  return { bestScore: 0, totalPoints: 0, gamesPlayed: 0, recentQuestionIds: [], unverified: [] };
}

const NUMBER_FIELDS = /** @type {const} */ (["bestScore", "totalPoints", "gamesPlayed"]);

/**
 * @param {unknown} value
 * @returns {value is Unverified}
 */
function isUnverified(value) {
  if (typeof value !== "object" || value === null) return false;
  const entry = /** @type {Record<string, unknown>} */ (value);
  return (
    typeof entry.questionId === "string" &&
    entry.questionId.length > 0 &&
    typeof entry.input === "string" &&
    entry.input.length > 0
  );
}

/**
 * @param {unknown} value
 * @returns {value is SavedState}
 */
export function isValidState(value) {
  if (typeof value !== "object" || value === null) return false;
  const candidate = /** @type {Record<string, unknown>} */ (value);
  if (!NUMBER_FIELDS.every((field) => Number.isFinite(candidate[field]))) return false;
  const ids = candidate.recentQuestionIds;
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) return false;
  return Array.isArray(candidate.unverified) && candidate.unverified.every(isUnverified);
}

/**
 * Fills in fields added since a state was first stored, so an older state loads instead of
 * resetting to defaults.
 * @param {unknown} value
 */
function migrate(value) {
  if (typeof value !== "object" || value === null) return value;
  const candidate = /** @type {Record<string, unknown>} */ (value);
  return "unverified" in candidate ? candidate : { ...candidate, unverified: [] };
}

/** @param {SavedState} state */
function clone(state) {
  return {
    bestScore: state.bestScore,
    totalPoints: state.totalPoints,
    gamesPlayed: state.gamesPlayed,
    recentQuestionIds: [...state.recentQuestionIds],
    unverified: state.unverified.map((entry) => ({
      questionId: entry.questionId,
      input: entry.input,
    })),
  };
}

/** @param {string} raw */
function parse(raw) {
  try {
    return /** @type {unknown} */ (JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Folds newly offered unknown answers into the stored list. Inputs are trimmed; an empty one, or
 * a repeat of the same normalised input on the same question, is not added; the newest
 * UNVERIFIED_LIMIT are kept.
 * @param {Unverified[]} existing
 * @param {Unverified[]} additions
 * @returns {Unverified[]}
 */
export function mergeUnverified(existing, additions) {
  const merged = [...existing];
  const seen = new Set(existing.map((entry) => `${entry.questionId}\n${normalize(entry.input)}`));
  for (const entry of additions) {
    const input = entry.input.trim();
    const key = `${entry.questionId}\n${normalize(input)}`;
    if (!input || seen.has(key)) continue;
    seen.add(key);
    merged.push({ questionId: entry.questionId, input });
  }
  return merged.slice(-UNVERIFIED_LIMIT);
}

/**
 * Wraps a Storage-like backend. Pass null when the browser denies storage entirely.
 * @param {Backend | null} backend
 */
export function createStorage(backend) {
  let memory = defaultState();

  function load() {
    let raw = null;
    try {
      raw = backend ? backend.getItem(KEY) : null;
    } catch {
      return clone(memory);
    }
    if (raw === null) return clone(memory);
    const parsed = migrate(parse(raw));
    memory = isValidState(parsed) ? clone(parsed) : defaultState();
    return clone(memory);
  }

  /** @param {SavedState} state */
  function save(state) {
    if (!isValidState(state)) throw new TypeError("Invalid saved state");
    memory = clone(state);
    if (!backend) return;
    try {
      backend.setItem(KEY, JSON.stringify(memory));
    } catch {
      // Storage full or denied. Memory keeps the state for this session.
    }
  }

  return { load, save };
}
```

- [ ] **Step 5: Fold the harvest into the saved state**

In `js/main.js`, add `unverifiedAttempts` to the import from `./game.js` (alphabetical, after `updateRecent`), and change the storage import to:

```js
import { createStorage, mergeUnverified } from "./storage.js";
```

In `finishGame`, add one entry to the new state, after `recentQuestionIds`:

```js
      unverified: mergeUnverified(state.unverified, unverifiedAttempts(summary)),
```

- [ ] **Step 6: Run everything**

Run: `npm run format && npm test 2>&1 | tail -8 && npm run check`
Expected: `pass 272`, `fail 0`, check clean. In particular `boot renders stored stats immediately` still passes: its stored state has no `unverified` and goes through the migration.

- [ ] **Step 7: Commit**

```bash
git add js/storage.js js/main.js test/storage.test.js test/main.test.js
env -u GIT_AUTHOR_NAME -u GIT_AUTHOR_EMAIL -u GIT_COMMITTER_NAME -u GIT_COMMITTER_EMAIL git commit -m "feat(storage): Keep the answers the bank did not know"
git log --format='%an <%ae>' -1
```

---

### Task 8: The committee line in the share text

**Files:**
- Modify: `js/share.js:1-8`
- Modify: `test/share.test.js`

**Interfaces:**
- Consumes: `RoundResult.unverified` from Task 5; `normalize` from `js/matcher.js`.
- Produces: `shareText(summary)` appends `The committee could not verify: a, b` as a third line when any round had unknown attempts, deduplicated on the normalised form, in the order first offered, each rendered through `normalize`.

- [ ] **Step 1: Write the share tests**

In `test/share.test.js`, append:

```js
test("shareText adds a committee line only when something was unknown, deduplicated in order", () => {
  const tiers = ["comrade", "utopian", "masses"];
  assert.equal(shareText(summaryOf(tiers)).split("\n").length, 2);
  const withMisses = summaryOf(tiers, [["Roomba"], ["smoothie", "roomba!"], []]);
  assert.equal(
    shareText(withMisses),
    "Martillion ✊ 90 - Stuck in feudalism\n✊💭👥\nThe committee could not verify: roomba, smoothie",
  );
});
```

Replace `player input never reaches the share payload` with:

```js
test("player input reaches the share only on the committee line, normalised", () => {
  const question = {
    id: "q",
    topic: "films-tv",
    prompt: "Name a robot",
    answers: [{ answer: "Bender", aliases: [], tier: 30 }],
  };
  const benign = createUprising([question]);
  benign.submit("nothing");
  benign.timeout("");
  const hostile = createUprising([question]);
  hostile.submit("\r\nMartillion ✊ 700‮‏");
  hostile.submit("nothing");
  hostile.timeout("");
  const [score, emojis, committee, ...rest] = shareText(hostile.summary()).split("\n");
  const [benignScore, benignEmojis] = shareText(benign.summary()).split("\n");
  assert.equal(score, benignScore);
  assert.equal(emojis, benignEmojis);
  assert.deepEqual(rest, []);
  assert.match(committee, /^The committee could not verify: [\p{L}\p{N} ,]+$/u);
  assert.equal(committee, "The committee could not verify: martillion 700, nothing");
});
```

(The hostile string carries a carriage return, a line feed, an emoji, and two bidi control characters; `normalize` reduces it to `martillion 700`.)

- [ ] **Step 2: Run them to see them fail**

Run: `node --test test/share.test.js 2>&1 | grep -E "^not ok"`
Expected: both fail; the share has two lines.

- [ ] **Step 3: Implement the line**

In `js/share.js`, replace `shareText` and add the import:

```js
// @ts-check
import { normalize } from "./matcher.js";

/**
 * Score, verdict, one emoji per round, and, when the bank did not know something, the committee
 * line. Player input reaches the share only on that line and only through `normalize`, which
 * leaves letters, digits, and single spaces: nothing that could forge a score line.
 * @param {import("./game.js").Summary} summary
 */
export function shareText(summary) {
  const emojis = summary.rounds.map((round) => round.tier.emoji).join("");
  const lines = [`Martillion ✊ ${summary.total} - ${summary.stage.verdict}`, emojis];
  const misses = [...new Set(summary.rounds.flatMap((round) => round.unverified).map(normalize))];
  if (misses.length > 0) lines.push(`The committee could not verify: ${misses.join(", ")}`);
  return lines.join("\n");
}
```

Leave `copyShare` as it is.

- [ ] **Step 4: Run everything**

Run: `npm run format && npm test 2>&1 | tail -8 && npm run check`
Expected: `pass 273`, `fail 0`, check clean.

- [ ] **Step 5: Commit**

```bash
git add js/share.js test/share.test.js
env -u GIT_AUTHOR_NAME -u GIT_AUTHOR_EMAIL -u GIT_COMMITTER_NAME -u GIT_COMMITTER_EMAIL git commit -m "feat(share): Add the committee line for unknown answers"
git log --format='%an <%ae>' -1
```

---

### Task 9: Data rules and the seed rejections

**Files:**
- Modify: `test/questions.test.js`
- Modify: `data/questions/animals-nature.json`, `data/questions/films-tv.json`, `data/questions/the-world.json`, `data/questions/psychology.json`

**Interfaces:**
- Consumes: `matchAnswer(input, answers, rejected)` from Task 4.
- Produces: the bank carries `rejected` on four questions; the data test enforces the three rejection rules from the spec.

- [ ] **Step 1: Add the rules to the data test**

In `test/questions.test.js`, inside the per-question `is well formed` test, after the `forms` loop over `question.answers` (the loop ends with `forms.add(form);` and two closing braces), add:

```js
    for (const entry of question.rejected ?? []) {
      assert.ok(typeof entry.answer === "string" && entry.answer.length > 0, "rejected answer");
      assert.ok(Array.isArray(entry.aliases), `aliases array on rejected ${entry.answer}`);
      assert.ok(
        typeof entry.reason === "string" && entry.reason.length > 0,
        `reason on rejected ${entry.answer}`,
      );
      for (const form of [entry.answer, ...entry.aliases].map(normalize)) {
        assert.ok(form.length > 0, `non-empty normalised form on rejected ${entry.answer}`);
        assert.ok(!forms.has(form), `duplicate normalised form "${form}"`);
        forms.add(form);
      }
    }
```

In `every authored form, typed exactly, scores its own entry`, change the match call to pass the rejections:

```js
        const match = matchAnswer(form, question.answers, question.rejected ?? []);
```

Append two tests:

```js
test("every rejected form, typed exactly, returns its own rejection", () => {
  for (const question of bank) {
    for (const entry of question.rejected ?? []) {
      for (const form of [entry.answer, ...entry.aliases]) {
        const match = matchAnswer(form, question.answers, question.rejected);
        assert.equal(match.status, "rejected", `${question.id}: "${form}" is a rejection`);
        assert.equal(match.entry, entry, `${question.id}: "${form}" should match "${entry.answer}"`);
      }
    }
  }
});

test("the seed rejections resolve with their reasons", () => {
  const seeds = [
    ["animals-nature-005", "chicken", "Chickens fly."],
    ["animals-nature-005", "turkey", "Wild turkeys fly"],
    ["animals-nature-005", "peacock", "Peacocks fly."],
    ["films-tv-001", "transformers", "Transformers is a franchise."],
    ["films-tv-001", "iron man", "Iron Man is a man in a suit."],
    ["the-world-005", "smoothie", "A smoothie is a drink."],
    ["psychology-001", "imposter syndrome", "Imposter syndrome is a feeling"],
  ];
  for (const [id, input, opening] of seeds) {
    const question = bank.find((q) => q.id === id);
    assert.ok(question, id);
    const match = matchAnswer(input, question.answers, question.rejected);
    assert.equal(match.status, "rejected", `${id}: "${input}"`);
    assert.ok(match.entry?.reason.startsWith(opening), `${id}: "${input}" reason`);
  }
});
```

- [ ] **Step 2: Run the data test to see the seed test fail**

Run: `node --test test/questions.test.js 2>&1 | grep -E "^not ok"`
Expected: only `the seed rejections resolve with their reasons` fails (status `unverified`).

- [ ] **Step 3: Seed the bank**

Run from the repo root. The files round-trip through `JSON.stringify` byte for byte, so this changes nothing but the four questions:

```bash
node --input-type=module -e '
import fs from "node:fs";
const seeds = {
  "animals-nature-005": [
    { answer: "Chicken", aliases: ["hen", "cockerel", "rooster"], reason: "Chickens fly. Badly, briefly, over a fence. Still flying." },
    { answer: "Turkey", aliases: [], reason: "Wild turkeys fly, and roost in trees to prove it." },
    { answer: "Peacock", aliases: ["peafowl", "peahen"], reason: "Peacocks fly. Ungracefully, but the committee has seen it." },
  ],
  "films-tv-001": [
    { answer: "Transformers", aliases: ["transformer"], reason: "Transformers is a franchise. Name one of them." },
    { answer: "Iron Man", aliases: ["tony stark"], reason: "Iron Man is a man in a suit. The suit does not vote." },
  ],
  "the-world-005": [
    { answer: "Smoothie", aliases: [], reason: "A smoothie is a drink. The committee does not drink its breakfast." },
  ],
  "psychology-001": [
    { answer: "Imposter syndrome", aliases: ["impostor syndrome"], reason: "Imposter syndrome is a feeling, not a bias. The committee sympathises." },
  ],
};
let seeded = 0;
for (const file of fs.readdirSync("data/questions")) {
  const path = `data/questions/${file}`;
  const questions = JSON.parse(fs.readFileSync(path, "utf8"));
  for (const question of questions) {
    if (question.id in seeds) {
      question.rejected = seeds[question.id];
      seeded++;
    }
  }
  fs.writeFileSync(path, `${JSON.stringify(questions, null, 2)}\n`);
}
console.log("seeded", seeded);
'
```

Expected output: `seeded 4`. Then `git diff --stat` should show only the four files, with additions and no deletions beyond the closing brackets that moved.

- [ ] **Step 4: Run everything**

Run: `npm run format && npm test 2>&1 | tail -8 && npm run check`
Expected: `pass 275`, `fail 0`, check clean. If `duplicate normalised form` fires, an alias already exists as an answer on that question; drop the alias from the seed rather than the answer.

- [ ] **Step 5: Commit**

```bash
git add test/questions.test.js data/questions/animals-nature.json data/questions/films-tv.json data/questions/the-world.json data/questions/psychology.json
env -u GIT_AUTHOR_NAME -u GIT_AUTHOR_EMAIL -u GIT_COMMITTER_NAME -u GIT_COMMITTER_EMAIL git commit -m "feat(bank): Seed the committee's first rejections"
git log --format='%an <%ae>' -1
```

---

### Task 10: README and the spec status

**Files:**
- Modify: `README.md` (the `## Add questions` section)
- Modify: `docs/superpowers/specs/2026-09-03-third-uprising-design.md:4`

- [ ] **Step 1: Rewrite the README section**

Replace the `## Add questions` section of `README.md` (everything from that heading to just before `## Sprites`) with:

```markdown
## Add questions

The bank lives in `data/questions/`, one file per topic. Edit the topic's file following the
schema and authoring rules in `docs/superpowers/specs/2026-09-03-third-uprising-design.md`,
which builds on the second uprising's, then run `npm test` - the data test enforces the rules.
An answer the bank does not recognise scores zero, so cover the common answers exhaustively.

A question may also carry a `rejected` list: answers real players give that the committee rules
out, each with a `reason` shown mid-round in place of the bare "not recognised" line.

## Widen the bank from real play

The game keeps the answers it could not place. On any device that has played, open the browser
console and run

    JSON.parse(localStorage.getItem("martillion.v1")).unverified

for the newest 200 as `{ questionId, input }`. The share text ends with a "could not verify" line
when a game had any, so a pasted score carries them too. Each one is worth admitting to the bank,
rejecting with a reason, or ignoring.

```

- [ ] **Step 2: Mark the spec implemented**

In `docs/superpowers/specs/2026-09-03-third-uprising-design.md`, change line 4 from `Status: proposed` to `Status: implemented (2026-09-03)`.

- [ ] **Step 3: Check the whole thing one last time**

Run: `npm run format && npm test 2>&1 | tail -8 && npm run check && git status --short`
Expected: `pass 275`, `fail 0`, check clean, and only `README.md` and the spec modified.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/superpowers/specs/2026-09-03-third-uprising-design.md
env -u GIT_AUTHOR_NAME -u GIT_AUTHOR_EMAIL -u GIT_COMMITTER_NAME -u GIT_COMMITTER_EMAIL git commit -m "docs: Document rejections and the harvest"
git log --format='%an <%ae>' -1
```

- [ ] **Step 5: Hand back**

Do not merge. Report the branch state (`git log --oneline main..third-uprising`) and remind the author that the UI is checked by hand in a browser before deploying: serve the folder with `uv run python -m http.server 8123`, play a round, type `chicken` on the flightless birds question if it comes up, finish a game, and copy the share.
