# Second uprising implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unverified answers score zero, the bank is wider and split by topic, the matcher picks the closest answer, the Bible is a novel, and a pixel-art Marx reacts to every tier, on a codebase hardened and tooled for a JavaScript newcomer.

**Architecture:** Vanilla ES modules with no build step. Pure modules (`topics`, `scorer`, `matcher`, `game`, `storage`, `share`, `messages`, `pixel`, `sprites`) are unit tested with `node --test`; `main.js` exports `init(document, options)` and `bootstrap.js` calls it. The bank lives in `data/questions/<topic>.json`, one file per topic, fetched in parallel at boot.

**Tech Stack:** HTML, CSS, JavaScript (ES modules), Node 24 built-in test runner, Biome 2.5 as the only dev dependency.

**Spec:** `docs/superpowers/specs/2026-09-02-second-uprising-design.md`. Read it first. The original design, `docs/superpowers/specs/2026-09-01-martillion-design.md`, still applies where the new spec is silent.

## Global constraints

- No build step, no runtime dependencies. One dev dependency: `@biomejs/biome`.
- Run tests with `npm test` from the repo root `/home/coder/repos/martillion`. Run lint and format checks with `npm run check`.
- Every git commit MUST be run with the identity overrides removed, exactly like this: `env -u GIT_AUTHOR_NAME -u GIT_AUTHOR_EMAIL -u GIT_COMMITTER_NAME -u GIT_COMMITTER_EMAIL git commit -m "..."`. Never include any Claude signature or `Co-Authored-By` line. Where a step says `git commit`, it means this wrapped form. Never `git add .`; add files by name.
- Commit subjects: `type(scope): Subject`, imperative, capitalised after the colon, 50 characters or fewer.
- Tier vocabulary is fixed: `full-marx` Full Marx 100 ⭐, `vanguard` Vanguard 85 🚩, `comrade` Comrade 60 ✊, `masses` The Masses 30 👥, `false-consciousness` False Consciousness 10 🐑, `utopian` Utopian 0 💭, `no-answer` No answer 0 ⬛.
- Authored tiers in the bank stay the numbers 100, 85, 60, 30, 10.
- Stage thresholds are fixed: 0-199 Feudalism, 200-349 Capitalism, 350-499 Revolution brewing, 500-649 Socialism, 650-700 Full communism.
- Topic slugs are fixed: `animals-nature`, `films-tv`, `books-stories`, `the-world`, `psychology`, `theory-revolution`.
- Timer: 30 seconds per round. Rounds per game: 7. localStorage key: `martillion.v1`. Five-year plan target: 2,000 points. Perfect score: 700.
- Every JS module starts with `// @ts-check` and uses JSDoc for types. Imports at the top, grouped standard library, third party, local.
- UI copy uses sentence case and no em dashes (use ` - ` instead).
- No `innerHTML`, `outerHTML`, `insertAdjacentHTML`, or `document.write` anywhere. Build DOM with `createElement`/`createElementNS` and `textContent`.
- Palette tokens for sprites: `red`, `ink`, `cream`, `cream-dim`, `star`, `skin`. Hex values: red `#C8102E`, ink `#1B1712`, cream `#F3E9D2`, cream-dim `#E4D5B5`, star `#E8B923`, skin `#E9C9A0`.

## File structure

| File | Responsibility |
|---|---|
| `js/topics.js` | Topic slugs in order, display labels |
| `js/scorer.js` | Tier vocabulary by id, authored-tier mapping, stages, five-year plans |
| `js/matcher.js` | Normalisation, Levenshtein, closest-match lookup returning a status and entry |
| `js/game.js` | Bank validation, sampling, round sequencing, perfect score |
| `js/storage.js` | localStorage wrapper with validation and in-memory fallback |
| `js/share.js` | Share text from a summary, clipboard copy with injectable clipboard |
| `js/messages.js` | Pure on-screen copy decisions |
| `js/pixel.js` | Sprite grid to rectangles, SVG string, SVG DOM element; overlay composition |
| `js/sprites.js` | The art as data: Marx, overlays per tier, hammer and sickle, star |
| `js/main.js` | `init(document, options)`: screens, boot, timer, wiring |
| `js/bootstrap.js` | Calls `init(document)` |
| `data/questions/<topic>.json` | One array of questions per topic |
| `scripts/preview-sprites.mjs` | Dev tool: renders every sprite to PNG for eyeballing |
| `test/*.test.js` | One test file per module plus `questions.test.js` and `dom-contract.test.js` |

---

### Task 1: Tooling

**Files:**
- Create: `.gitignore`, `biome.json`, `jsconfig.json`
- Modify: `package.json`, `README.md`

**Interfaces:**
- Produces: `npm run check` (Biome lint and format check), `npm run format` (write), `npm test` unchanged.

- [ ] **Step 1: Create `.gitignore`**

```
node_modules/
.claude/
.superpowers/
.DS_Store
*.log
```

- [ ] **Step 2: Add Biome as the one dev dependency**

Run: `npm install --save-dev --save-exact @biomejs/biome@2.5.11`
Expected: `package.json` gains `devDependencies` and `package-lock.json` appears.

- [ ] **Step 3: Write `package.json` scripts**

```json
{
  "name": "martillion",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24" },
  "scripts": {
    "test": "node --test",
    "check": "biome check .",
    "format": "biome check --write ."
  },
  "devDependencies": {
    "@biomejs/biome": "2.5.11"
  }
}
```

- [ ] **Step 4: Write `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/2.5.11/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": { "includes": ["**", "!data/**", "!docs/**", "!css/fonts/**"] },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "javascript": { "formatter": { "quoteStyle": "double", "semicolons": "always", "trailingCommas": "all" } },
  "linter": { "enabled": true, "rules": { "preset": "recommended" } }
}
```

If `npx biome check .` reports an unknown configuration key, run `npx biome migrate --write` and keep what it produces.

- [ ] **Step 5: Write `jsconfig.json`**

```json
{
  "compilerOptions": {
    "checkJs": true,
    "strict": true,
    "target": "es2022",
    "module": "esnext",
    "moduleResolution": "bundler",
    "lib": ["es2023", "dom", "dom.iterable"],
    "noEmit": true,
    "types": []
  },
  "include": ["js"]
}
```

- [ ] **Step 6: Format the existing code and confirm the suite still passes**

Run: `npm run format && npm run check && npm test`
Expected: Biome rewrites some files (mostly line wrapping), `check` exits 0, 180 tests pass.

- [ ] **Step 7: Add a tooling section to `README.md`**

Replace the Develop section with:

```markdown
## Develop

No build step and no runtime dependencies. Serve the folder and open it:

    uv run python -m http.server 8123

Install the one dev tool (Biome, for lint and format) and run the checks (Node 24+):

    npm install
    npm test          # unit and data tests
    npm run check     # lint and format check
    npm run format    # rewrite files to the house format

Every module starts with `// @ts-check`, so an editor with TypeScript support (VS Code out of the box) type-checks the JSDoc comments as you type.
```

- [ ] **Step 8: Commit**

```bash
git add .gitignore biome.json jsconfig.json package.json package-lock.json README.md js test
git commit -m "chore(tooling): Add Biome, jsconfig, and gitignore"
```

---

### Task 2: Topic vocabulary

**Files:**
- Create: `js/topics.js`, `test/topics.test.js`

**Interfaces:**
- Produces: `TOPICS: readonly string[]` (ordered slugs), `TOPIC_LABELS: Map<string, string>`, `topicLabel(slug: string): string` (throws on unknown).

- [ ] **Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { TOPICS, TOPIC_LABELS, topicLabel } from "../js/topics.js";

test("TOPICS lists the six slugs in display order", () => {
  assert.deepEqual([...TOPICS], [
    "animals-nature", "films-tv", "books-stories", "the-world", "psychology", "theory-revolution",
  ]);
});

test("every topic has a label and the labels are unique", () => {
  assert.deepEqual([...TOPIC_LABELS.keys()], [...TOPICS]);
  assert.equal(new Set(TOPIC_LABELS.values()).size, TOPICS.length);
});

test("topicLabel returns the label and throws on an unknown slug", () => {
  assert.equal(topicLabel("films-tv"), "Films & TV");
  assert.throws(() => topicLabel("constructor"), /Unknown topic/);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/topics.test.js`
Expected: FAIL, cannot find module `../js/topics.js`.

- [ ] **Step 3: Write `js/topics.js`**

```js
// @ts-check

/** Topic slugs in display order. The bank has one file per slug under data/questions/. */
export const TOPICS = Object.freeze([
  "animals-nature",
  "films-tv",
  "books-stories",
  "the-world",
  "psychology",
  "theory-revolution",
]);

/** @type {Map<string, string>} */
export const TOPIC_LABELS = new Map([
  ["animals-nature", "Animals & nature"],
  ["films-tv", "Films & TV"],
  ["books-stories", "Books & stories"],
  ["the-world", "The world"],
  ["psychology", "Psychology"],
  ["theory-revolution", "Theory & revolution"],
]);

/**
 * @param {string} slug
 * @returns {string}
 */
export function topicLabel(slug) {
  const label = TOPIC_LABELS.get(slug);
  if (label === undefined) throw new Error(`Unknown topic: ${slug}`);
  return label;
}
```

- [ ] **Step 4: Run the test and the checks**

Run: `node --test test/topics.test.js && npm run check`
Expected: 3 pass, check clean.

- [ ] **Step 5: Commit**

```bash
git add js/topics.js test/topics.test.js
git commit -m "feat(topics): Own the topic vocabulary in one module"
```

---

### Task 3: Tier vocabulary in the scorer

**Files:**
- Modify: `js/scorer.js`
- Modify: `test/scorer.test.js`

**Interfaces:**
- Produces: `Tier` typedef `{ id, name, points, emoji }`; `TIERS: readonly Tier[]` highest first; `AUTHORED_POINTS: readonly number[]` (`[100, 85, 60, 30, 10]`); `TOP_TIER`, `UTOPIAN`, `NO_ANSWER` tier constants; `tierById(id)`; `tierForAuthored(points)`; `Stage` typedef `{ min, name, verdict, flavour }`; `stageForScore(total)`; `PLAN_TARGET`; `fiveYearPlans(totalPoints)`. `tierInfo` is removed.

- [ ] **Step 1: Replace `test/scorer.test.js`**

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTHORED_POINTS,
  NO_ANSWER,
  TIERS,
  TOP_TIER,
  UTOPIAN,
  fiveYearPlans,
  stageForScore,
  tierById,
  tierForAuthored,
} from "../js/scorer.js";

test("TIERS carries the full vocabulary, highest first", () => {
  assert.deepEqual(
    TIERS.map((tier) => [tier.id, tier.name, tier.points, tier.emoji]),
    [
      ["full-marx", "Full Marx", 100, "⭐"],
      ["vanguard", "Vanguard", 85, "🚩"],
      ["comrade", "Comrade", 60, "✊"],
      ["masses", "The Masses", 30, "👥"],
      ["false-consciousness", "False Consciousness", 10, "🐑"],
      ["utopian", "Utopian", 0, "💭"],
      ["no-answer", "No answer", 0, "⬛"],
    ],
  );
});

test("the vocabulary is frozen", () => {
  assert.throws(() => {
    // @ts-expect-error deliberate mutation
    TIERS[0].name = "Mutated";
  }, TypeError);
  assert.throws(() => {
    // @ts-expect-error deliberate mutation
    TIERS.push(TIERS[0]);
  }, TypeError);
});

test("named tiers point into the vocabulary", () => {
  assert.equal(TOP_TIER, TIERS[0]);
  assert.equal(UTOPIAN.id, "utopian");
  assert.equal(NO_ANSWER.id, "no-answer");
  assert.equal(UTOPIAN.points, 0);
  assert.equal(NO_ANSWER.points, 0);
});

test("tierById finds every tier and throws otherwise", () => {
  for (const tier of TIERS) assert.equal(tierById(tier.id), tier);
  assert.throws(() => tierById("constructor"), /Unknown tier id/);
});

test("AUTHORED_POINTS are the positive tiers and tierForAuthored maps each one", () => {
  assert.deepEqual([...AUTHORED_POINTS], [100, 85, 60, 30, 10]);
  for (const points of AUTHORED_POINTS) assert.equal(tierForAuthored(points).points, points);
  assert.throws(() => tierForAuthored(15), /Unknown authored tier/);
  assert.throws(() => tierForAuthored(0), /Unknown authored tier/);
  assert.throws(() => tierForAuthored(Number.NaN), /Unknown authored tier/);
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

test("stageForScore throws on scores that are not a non-negative finite number", () => {
  assert.throws(() => stageForScore(-1), /Invalid score/);
  assert.throws(() => stageForScore(Number.NaN), /Invalid score/);
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

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/scorer.test.js`
Expected: FAIL, named exports missing.

- [ ] **Step 3: Rewrite `js/scorer.js`**

```js
// @ts-check

/**
 * @typedef {object} Tier
 * @property {string} id
 * @property {string} name
 * @property {number} points
 * @property {string} emoji
 */

/**
 * @typedef {object} Stage
 * @property {number} min
 * @property {string} name
 * @property {string} verdict
 * @property {string} flavour
 */

/** @param {Tier} tier */
const tier = (tier) => Object.freeze(tier);

/** The whole tier vocabulary, rarest first. @type {readonly Tier[]} */
export const TIERS = Object.freeze([
  tier({ id: "full-marx", name: "Full Marx", points: 100, emoji: "⭐" }),
  tier({ id: "vanguard", name: "Vanguard", points: 85, emoji: "🚩" }),
  tier({ id: "comrade", name: "Comrade", points: 60, emoji: "✊" }),
  tier({ id: "masses", name: "The Masses", points: 30, emoji: "👥" }),
  tier({ id: "false-consciousness", name: "False Consciousness", points: 10, emoji: "🐑" }),
  tier({ id: "utopian", name: "Utopian", points: 0, emoji: "💭" }),
  tier({ id: "no-answer", name: "No answer", points: 0, emoji: "⬛" }),
]);

const byId = new Map(TIERS.map((entry) => [entry.id, entry]));
const authored = TIERS.filter((entry) => entry.points > 0);
const byAuthoredPoints = new Map(authored.map((entry) => [entry.points, entry]));

/** The tier values an author may write in the bank, rarest first. */
export const AUTHORED_POINTS = Object.freeze(authored.map((entry) => entry.points));

/** @param {string} id */
export function tierById(id) {
  const found = byId.get(id);
  if (!found) throw new Error(`Unknown tier id: ${id}`);
  return found;
}

/** @param {number} points an authored tier value from the bank */
export function tierForAuthored(points) {
  const found = byAuthoredPoints.get(points);
  if (!found) throw new Error(`Unknown authored tier: ${points}`);
  return found;
}

export const TOP_TIER = TIERS[0];
export const UTOPIAN = tierById("utopian");
export const NO_ANSWER = tierById("no-answer");

/** @type {readonly Stage[]} highest first */
const STAGES = Object.freeze([
  { min: 650, name: "Full communism", verdict: "Full communism achieved", flavour: "The state has withered away. Utopia, scientifically." },
  { min: 500, name: "Socialism", verdict: "Socialism achieved", flavour: "From each according to their ability. Ability detected." },
  { min: 350, name: "Revolution brewing", verdict: "Revolution brewing", flavour: "A spectre is haunting this quiz." },
  { min: 200, name: "Capitalism", verdict: "Stuck in capitalism", flavour: "You have nothing to lose but your chains." },
  { min: 0, name: "Feudalism", verdict: "Stuck in feudalism", flavour: "The material conditions were not yet ripe." },
].map((stage) => Object.freeze(stage)));

export const PLAN_TARGET = 2000;

/** @param {number} total */
export function stageForScore(total) {
  const stage = STAGES.find((candidate) => total >= candidate.min);
  if (!Number.isFinite(total) || stage === undefined) throw new Error(`Invalid score: ${total}`);
  return stage;
}

/** @param {number} totalPoints */
export function fiveYearPlans(totalPoints) {
  return {
    completed: Math.floor(totalPoints / PLAN_TARGET),
    progress: totalPoints % PLAN_TARGET,
    target: PLAN_TARGET,
  };
}
```

- [ ] **Step 4: Run the scorer test**

Run: `node --test test/scorer.test.js && npm run check`
Expected: all pass. Other suites (`game`, `share`) now fail because `tierInfo` is gone; Tasks 6 and 7 fix them. Do not run the whole suite as a gate until Task 8.

- [ ] **Step 5: Commit**

```bash
git add js/scorer.js test/scorer.test.js
git commit -m "feat(scorer): Key tiers by id and add utopian at zero"
```

---

### Task 4: Closest-match matcher

**Files:**
- Modify: `js/matcher.js`
- Modify: `test/matcher.test.js`

**Interfaces:**
- Produces: `AnswerEntry` typedef `{ answer, aliases, tier, remark? }`; `MatchResult` typedef `{ status: "matched" | "unverified" | "empty", entry: AnswerEntry | null }`; `normalize(text)`; `levenshtein(a, b)`; `tolerance(length)`; `matchAnswer(input, answers): MatchResult`.

- [ ] **Step 1: Replace `test/matcher.test.js`**

```js
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

test("an equidistant tie goes to the higher tier regardless of order", () => {
  const rivers = [
    { answer: "Rhine", aliases: [], tier: 10 },
    { answer: "Rhone", aliases: [], tier: 60 },
  ];
  assert.equal(matchAnswer("Rhime", rivers).entry, rivers[1]);
  assert.equal(matchAnswer("Rhime", [...rivers].reverse()).entry, rivers[1]);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/matcher.test.js`
Expected: FAIL, `levenshtein` and `tolerance` not exported; results carry `points`.

- [ ] **Step 3: Rewrite `js/matcher.js`**

```js
// @ts-check

/**
 * One answer in the bank. `tier` is the authored point value; a higher number is rarer.
 * @typedef {object} AnswerEntry
 * @property {string} answer
 * @property {string[]} aliases
 * @property {number} tier
 * @property {string} [remark]
 */

/**
 * @typedef {object} MatchResult
 * @property {"matched" | "unverified" | "empty"} status
 * @property {AnswerEntry | null} entry
 */

const ARTICLE = /^(the|a|an)\s+/;

/** @param {string} text */
export function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(ARTICLE, "");
}

/**
 * Edit distance, single-row implementation.
 * @param {string} a
 * @param {string} b
 */
export function levenshtein(a, b) {
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

/**
 * Edits allowed against a bank form of this normalised length.
 * @param {number} length
 */
export function tolerance(length) {
  if (length >= 10) return 2;
  if (length >= 5) return 1;
  return 0;
}

/** @param {AnswerEntry} entry */
function forms(entry) {
  return [entry.answer, ...entry.aliases].map(normalize);
}

/**
 * Exact match first. Otherwise the closest form within tolerance, ties to the rarer tier.
 * @param {string} input
 * @param {AnswerEntry[]} answers
 * @returns {MatchResult}
 */
export function matchAnswer(input, answers) {
  const norm = normalize(input);
  if (!norm) return { status: "empty", entry: null };

  const candidates = answers.map((entry) => ({ entry, forms: forms(entry) }));
  const exact = candidates.find((candidate) => candidate.forms.includes(norm));
  if (exact) return { status: "matched", entry: exact.entry };

  /** @type {{ entry: AnswerEntry, distance: number } | null} */
  let best = null;
  for (const { entry, forms: entryForms } of candidates) {
    for (const form of entryForms) {
      const distance = levenshtein(norm, form);
      if (distance > tolerance(form.length)) continue;
      const closer = best === null || distance < best.distance;
      const rarerTie = best !== null && distance === best.distance && entry.tier > best.entry.tier;
      if (closer || rarerTie) best = { entry, distance };
    }
  }
  return best ? { status: "matched", entry: best.entry } : { status: "unverified", entry: null };
}
```

- [ ] **Step 4: Run the matcher test**

Run: `node --test test/matcher.test.js && npm run check`
Expected: all pass, check clean.

- [ ] **Step 5: Commit**

```bash
git add js/matcher.js test/matcher.test.js
git commit -m "feat(matcher): Pick the closest answer and report a status"
```

---

### Task 5: Storage validation

**Files:**
- Modify: `js/storage.js`
- Modify: `test/storage.test.js`

**Interfaces:**
- Produces: `KEY` (`"martillion.v1"`), `SavedState` typedef `{ bestScore, totalPoints, gamesPlayed, recentQuestionIds }`, `defaultState(): SavedState`, `isValidState(value): boolean`, `createStorage(backend: Storage | null): { load(): SavedState, save(state: SavedState): void }`.

- [ ] **Step 1: Replace `test/storage.test.js`**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { KEY, createStorage, defaultState, isValidState } from "../js/storage.js";

function fakeBackend(initial = {}) {
  const data = Object.assign(Object.create(null), initial);
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
    data,
  };
}

const played = { bestScore: 630, totalPoints: 4100, gamesPlayed: 9, recentQuestionIds: ["films-tv-01"] };

test("KEY is the versioned storage key", () => {
  assert.equal(KEY, "martillion.v1");
});

test("defaultState returns a fresh object each call", () => {
  assert.deepEqual(defaultState(), { bestScore: 0, totalPoints: 0, gamesPlayed: 0, recentQuestionIds: [] });
  assert.notEqual(defaultState().recentQuestionIds, defaultState().recentQuestionIds);
});

test("isValidState accepts the shape and rejects non-finite numbers and bad ids", () => {
  assert.equal(isValidState(defaultState()), true);
  assert.equal(isValidState(played), true);
  assert.equal(isValidState(null), false);
  assert.equal(isValidState({ ...played, bestScore: "high" }), false);
  assert.equal(isValidState({ ...played, totalPoints: Number.NaN }), false);
  assert.equal(isValidState({ ...played, totalPoints: Number.POSITIVE_INFINITY }), false);
  assert.equal(isValidState({ ...played, recentQuestionIds: [1] }), false);
});

test("load returns defaults when nothing is stored", () => {
  assert.deepEqual(createStorage(fakeBackend()).load(), defaultState());
});

test("save then load round-trips state under KEY", () => {
  const backend = fakeBackend();
  const storage = createStorage(backend);
  storage.save(played);
  assert.deepEqual(storage.load(), played);
  assert.deepEqual(JSON.parse(backend.data[KEY]), played);
});

test("save rejects invalid state before touching the backend", () => {
  const backend = fakeBackend();
  const storage = createStorage(backend);
  assert.throws(() => storage.save({ ...played, bestScore: Number.NaN }), TypeError);
  assert.equal(backend.data[KEY], undefined);
});

test("corrupt JSON loads as defaults, and a second load agrees", () => {
  const storage = createStorage(fakeBackend({ [KEY]: "{not json" }));
  assert.deepEqual(storage.load(), defaultState());
  assert.deepEqual(storage.load(), defaultState());
});

test("wrong shape loads as defaults", () => {
  const storage = createStorage(fakeBackend({ [KEY]: JSON.stringify({ bestScore: "high" }) }));
  assert.deepEqual(storage.load(), defaultState());
});

test("a __proto__ key in stored JSON cannot pollute the loaded state", () => {
  const raw = `{"bestScore":1,"totalPoints":1,"gamesPlayed":1,"recentQuestionIds":[],"__proto__":{"polluted":true}}`;
  const loaded = createStorage(fakeBackend({ [KEY]: raw })).load();
  assert.equal(Object.keys(loaded).length, 4);
  assert.equal(Object.getPrototypeOf(loaded), Object.prototype);
  assert.equal("polluted" in loaded, false);
});

test("throwing backend degrades to in-memory state", () => {
  const storage = createStorage({
    getItem: () => {
      throw new Error("denied");
    },
    setItem: () => {
      throw new Error("denied");
    },
  });
  assert.deepEqual(storage.load(), defaultState());
  storage.save(played);
  assert.deepEqual(storage.load(), played);
});

test("a null backend keeps state in memory for the session", () => {
  const storage = createStorage(null);
  assert.deepEqual(storage.load(), defaultState());
  storage.save(played);
  assert.deepEqual(storage.load(), played);
});

test("load returns distinct array objects (no shared reference)", () => {
  const storage = createStorage(fakeBackend());
  const first = storage.load();
  const second = storage.load();
  assert.notEqual(first.recentQuestionIds, second.recentQuestionIds);
  first.recentQuestionIds.push("x");
  assert.deepEqual(storage.load().recentQuestionIds, []);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/storage.test.js`
Expected: FAIL, `KEY`, `defaultState`, `isValidState` not exported.

- [ ] **Step 3: Rewrite `js/storage.js`**

```js
// @ts-check

export const KEY = "martillion.v1";

/**
 * @typedef {object} SavedState
 * @property {number} bestScore
 * @property {number} totalPoints
 * @property {number} gamesPlayed
 * @property {string[]} recentQuestionIds
 */

/** @typedef {Pick<Storage, "getItem" | "setItem">} Backend */

/** @returns {SavedState} */
export function defaultState() {
  return { bestScore: 0, totalPoints: 0, gamesPlayed: 0, recentQuestionIds: [] };
}

const NUMBER_FIELDS = /** @type {const} */ (["bestScore", "totalPoints", "gamesPlayed"]);

/**
 * @param {unknown} value
 * @returns {value is SavedState}
 */
export function isValidState(value) {
  if (typeof value !== "object" || value === null) return false;
  const candidate = /** @type {Record<string, unknown>} */ (value);
  if (!NUMBER_FIELDS.every((field) => Number.isFinite(candidate[field]))) return false;
  const ids = candidate.recentQuestionIds;
  return Array.isArray(ids) && ids.every((id) => typeof id === "string");
}

/** @param {SavedState} state */
function clone(state) {
  return {
    bestScore: state.bestScore,
    totalPoints: state.totalPoints,
    gamesPlayed: state.gamesPlayed,
    recentQuestionIds: [...state.recentQuestionIds],
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
    const parsed = parse(raw);
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

- [ ] **Step 4: Run the storage test**

Run: `node --test test/storage.test.js && npm run check`
Expected: all pass, check clean.

- [ ] **Step 5: Commit**

```bash
git add js/storage.js test/storage.test.js
git commit -m "fix(storage): Validate on save and reset corrupt state once"
```

---

### Task 6: Game contracts

**Files:**
- Modify: `js/game.js`
- Modify: `test/game.test.js`

**Interfaces:**
- Consumes: `matchAnswer` (Task 4), `tierForAuthored`, `UTOPIAN`, `NO_ANSWER`, `TOP_TIER`, `stageForScore` (Task 3), `TOPICS` (Task 2).
- Produces: `ROUNDS`, `MAX_PER_TOPIC`, `RECENT_LIMIT`, `MIN_TOPICS`, `PERFECT_SCORE` (700); `Question` typedef `{ id, topic, prompt, answers }`; `RoundResult` typedef `{ questionId, prompt, input, matchedAnswer, remark, tier }`; `Summary` typedef `{ total, rounds, stage }`; `validateBank(value): Question[]` (throws); `sampleQuestions(bank, recentIds, rng)` (throws when it cannot fill a game); `updateRecent(recentIds, playedIds)`; `createUprising(questions)` with `round`, `isOver()`, `current()`, `submit(input)`, `summary()`.

- [ ] **Step 1: Replace `test/game.test.js`**

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_PER_TOPIC,
  MIN_TOPICS,
  PERFECT_SCORE,
  RECENT_LIMIT,
  ROUNDS,
  createUprising,
  sampleQuestions,
  updateRecent,
  validateBank,
} from "../js/game.js";
import { NO_ANSWER, UTOPIAN } from "../js/scorer.js";
import { TOPICS } from "../js/topics.js";

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
        { answer: "Rare thing", aliases: ["rarest"], tier: 100, remark: "The committee is impressed." },
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
  assert.throws(() => validateBank(makeBank(TOPICS.slice(0, 3), 10)), /cannot fill a game/);
  assert.throws(() => validateBank([{ id: "x", topic: "films-tv", prompt: "p" }]), /Malformed question/);
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
  assert.throws(() => sampleQuestions(makeBank(TOPIC_SLICE, 10), [], seededRng(5)), /cannot fill a game/);
});
const TOPIC_SLICE = TOPICS.slice(0, 3);

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
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/game.test.js`
Expected: FAIL, `validateBank`, `MIN_TOPICS`, `PERFECT_SCORE` not exported.

- [ ] **Step 3: Rewrite `js/game.js`**

```js
// @ts-check
import { matchAnswer } from "./matcher.js";
import { NO_ANSWER, TOP_TIER, UTOPIAN, stageForScore, tierForAuthored } from "./scorer.js";
import { TOPICS } from "./topics.js";

export const ROUNDS = 7;
export const MAX_PER_TOPIC = 2;
export const RECENT_LIMIT = 40;
/** Distinct topics a bank needs before the per-topic cap can still fill a game. */
export const MIN_TOPICS = Math.ceil(ROUNDS / MAX_PER_TOPIC);
export const PERFECT_SCORE = ROUNDS * TOP_TIER.points;

/**
 * @typedef {object} Question
 * @property {string} id
 * @property {string} topic
 * @property {string} prompt
 * @property {import("./matcher.js").AnswerEntry[]} answers
 */

/**
 * @typedef {object} RoundResult
 * @property {string} questionId
 * @property {string} prompt
 * @property {string} input
 * @property {string | null} matchedAnswer
 * @property {string | null} remark
 * @property {import("./scorer.js").Tier} tier
 */

/**
 * @typedef {object} Summary
 * @property {number} total
 * @property {RoundResult[]} rounds
 * @property {import("./scorer.js").Stage} stage
 */

/**
 * @param {unknown} value
 * @returns {value is Question}
 */
function isQuestion(value) {
  if (typeof value !== "object" || value === null) return false;
  const q = /** @type {Record<string, unknown>} */ (value);
  return (
    typeof q.id === "string" &&
    typeof q.topic === "string" &&
    TOPICS.includes(q.topic) &&
    typeof q.prompt === "string" &&
    Array.isArray(q.answers)
  );
}

/**
 * Shape-checks a freshly loaded bank. Throws a descriptive error rather than letting a
 * malformed file surface as a TypeError mid-game.
 * @param {unknown} value
 * @returns {Question[]}
 */
export function validateBank(value) {
  if (!Array.isArray(value)) throw new Error("Bank is not an array");
  for (const question of value) {
    if (!isQuestion(question)) {
      throw new Error(`Malformed question: ${JSON.stringify(question).slice(0, 80)}`);
    }
  }
  const topics = new Set(value.map((question) => question.topic));
  if (value.length < ROUNDS || topics.size < MIN_TOPICS) {
    throw new Error(`Bank cannot fill a game: ${value.length} questions across ${topics.size} topics`);
  }
  return value;
}

/**
 * @template T
 * @param {T[]} items
 * @param {() => number} rng returns a number in [0, 1)
 */
function shuffle(items, rng) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Seven questions, at most two per topic, avoiding recent ids. When too few unseen
 * questions remain the exclusion list resets, as the original design says.
 * @param {Question[]} bank
 * @param {string[]} recentIds
 * @param {() => number} rng
 */
export function sampleQuestions(bank, recentIds, rng) {
  let pool = bank.filter((question) => !recentIds.includes(question.id));
  if (pool.length < ROUNDS) pool = [...bank];
  /** @type {Question[]} */
  const picked = [];
  const perTopic = new Map();

  /** @param {Question[]} candidates */
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
  if (picked.length < ROUNDS) {
    throw new Error(`Bank cannot fill a game: picked ${picked.length} of ${ROUNDS}`);
  }
  return picked;
}

/**
 * @param {string[]} recentIds
 * @param {string[]} playedIds
 */
export function updateRecent(recentIds, playedIds) {
  return [...recentIds, ...playedIds].slice(-RECENT_LIMIT);
}

/** @param {import("./matcher.js").MatchResult} match */
function tierFor(match) {
  if (match.status === "empty") return NO_ANSWER;
  if (match.entry === null) return UTOPIAN;
  return tierForAuthored(match.entry.tier);
}

/** @param {Question[]} questions */
export function createUprising(questions) {
  /** @type {RoundResult[]} */
  const rounds = [];

  function current() {
    if (rounds.length >= questions.length) throw new Error("The uprising is over");
    return questions[rounds.length];
  }

  return {
    get round() {
      return rounds.length;
    },
    isOver: () => rounds.length >= questions.length,
    current,
    /** @param {string} input */
    submit(input) {
      const question = current();
      const match = matchAnswer(input, question.answers);
      /** @type {RoundResult} */
      const result = {
        questionId: question.id,
        prompt: question.prompt,
        input,
        matchedAnswer: match.entry?.answer ?? null,
        remark: match.entry?.remark ?? null,
        tier: tierFor(match),
      };
      rounds.push(result);
      return result;
    },
    /** @returns {Summary} */
    summary() {
      const total = rounds.reduce((sum, result) => sum + result.tier.points, 0);
      return { total, rounds: rounds.map((result) => ({ ...result })), stage: stageForScore(total) };
    },
  };
}
```

- [ ] **Step 4: Run the game test**

Run: `node --test test/game.test.js && npm run check`
Expected: all pass, check clean.

- [ ] **Step 5: Commit**

```bash
git add js/game.js test/game.test.js
git commit -m "feat(game): Carry tier records and guard the bank"
```

---

### Task 7: Share from the summary

**Files:**
- Modify: `js/share.js`
- Modify: `test/share.test.js`

**Interfaces:**
- Consumes: `Summary` (Task 6), tier records (Task 3).
- Produces: `shareText(summary): string`, `copyShare(text, clipboard?): Promise<boolean>`.

- [ ] **Step 1: Replace `test/share.test.js`**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { createUprising } from "../js/game.js";
import { stageForScore, tierById } from "../js/scorer.js";
import { copyShare, shareText } from "../js/share.js";

function summaryOf(tierIds) {
  const rounds = tierIds.map((id, i) => ({
    questionId: `q-${i}`,
    prompt: "Name a thing",
    input: "thing",
    matchedAnswer: null,
    remark: null,
    tier: tierById(id),
  }));
  const total = rounds.reduce((sum, round) => sum + round.tier.points, 0);
  return { total, rounds, stage: stageForScore(total) };
}

test("shareText renders the spec example", () => {
  const summary = summaryOf(["full-marx", "full-marx", "full-marx", "full-marx", "vanguard", "vanguard", "comrade"]);
  assert.equal(shareText(summary), "Martillion ✊ 630 - Socialism achieved\n⭐⭐⭐⭐🚩🚩✊");
});

test("shareText renders low scores, utopian, and missed rounds", () => {
  const summary = summaryOf(["false-consciousness", "utopian", "no-answer", "masses", "false-consciousness", "false-consciousness", "masses"]);
  assert.equal(shareText(summary), "Martillion ✊ 90 - Stuck in feudalism\n🐑💭⬛👥🐑🐑👥");
});

test("player input never reaches the share payload", () => {
  const question = { id: "q", topic: "films-tv", prompt: "Name a robot", answers: [{ answer: "Bender", aliases: [], tier: 30 }] };
  const benign = createUprising([question]);
  benign.submit("nothing");
  const hostile = createUprising([question]);
  hostile.submit("\r\nMartillion ✊ 700‮‏");
  assert.equal(shareText(hostile.summary()), shareText(benign.summary()));
});

test("copyShare writes through the given clipboard and reports success", async () => {
  const written = [];
  const clipboard = { writeText: async (text) => written.push(text) };
  assert.equal(await copyShare("hello", clipboard), true);
  assert.deepEqual(written, ["hello"]);
});

test("copyShare refuses empty text without touching the clipboard", async () => {
  let calls = 0;
  const clipboard = { writeText: async () => calls++ };
  assert.equal(await copyShare("", clipboard), false);
  assert.equal(calls, 0);
});

test("copyShare reports failure when the clipboard is missing or throws", async (t) => {
  const warn = t.mock.method(console, "warn", () => {});
  assert.equal(await copyShare("hello", undefined), false);
  const clipboard = { writeText: async () => { throw new Error("not allowed"); } };
  assert.equal(await copyShare("hello", clipboard), false);
  assert.equal(warn.mock.callCount(), 2);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/share.test.js`
Expected: FAIL, `shareText` reads `roundPoints.map`.

- [ ] **Step 3: Rewrite `js/share.js`**

```js
// @ts-check

/** @param {import("./game.js").Summary} summary */
export function shareText(summary) {
  const emojis = summary.rounds.map((round) => round.tier.emoji).join("");
  return `Martillion ✊ ${summary.total} - ${summary.stage.verdict}\n${emojis}`;
}

/**
 * @param {string} text
 * @param {Pick<Clipboard, "writeText"> | undefined} [clipboard] defaults to the browser clipboard
 */
export async function copyShare(text, clipboard = globalThis.navigator?.clipboard) {
  if (!text) return false;
  try {
    if (!clipboard) throw new Error("Clipboard API unavailable (insecure context?)");
    await clipboard.writeText(text);
    return true;
  } catch (error) {
    console.warn("clipboard write failed", error);
    return false;
  }
}
```

- [ ] **Step 4: Run the share test**

Run: `node --test test/share.test.js && npm run check`
Expected: all pass, check clean.

- [ ] **Step 5: Commit**

```bash
git add js/share.js test/share.test.js
git commit -m "feat(share): Derive share text from the summary"
```

---

### Task 8: Messages module

**Files:**
- Create: `js/messages.js`, `test/messages.test.js`

**Interfaces:**
- Consumes: `RoundResult` (Task 6), `NO_ANSWER` (Task 3), `fiveYearPlans` result shape (Task 3).
- Produces: `revealDetail(result)`, `recordsMessage(total, previousBest)`, `planLabel(plans)`, `planMessage(plans)`, `roundLine(result)`, `roundCounter(round, total)`.

- [ ] **Step 1: Write `test/messages.test.js`**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { planLabel, planMessage, recordsMessage, revealDetail, roundCounter, roundLine } from "../js/messages.js";
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
  const result = round({ matchedAnswer: "The Bible", remark: "Filed under fiction by order of the committee.", tier: tierById("full-marx") });
  assert.equal(revealDetail(result), 'The committee recognises "The Bible". Filed under fiction by order of the committee.');
});

test("revealDetail explains utopian and silence", () => {
  assert.equal(revealDetail(round({ matchedAnswer: null, tier: tierById("utopian") })), "The committee cannot verify this. Zero points, comrade.");
  assert.equal(revealDetail(round({ input: "", matchedAnswer: null, tier: tierById("no-answer") })), "Silence. The revolution needs answers.");
});

test("recordsMessage announces a record only when the total beats the previous best", () => {
  assert.equal(recordsMessage(400, 300), "A new personal best. The politburo is pleased.");
  assert.equal(recordsMessage(300, 300), "Personal best: 300.");
  assert.equal(recordsMessage(0, 0), "Personal best: 0.");
  assert.equal(recordsMessage(100, 300), "Personal best: 300.");
});

test("planLabel and planMessage describe five-year plan progress", () => {
  assert.equal(planLabel({ completed: 0, progress: 150, target: 2000 }), "150 / 2000 points toward the next plan");
  assert.equal(planMessage({ completed: 0, progress: 150, target: 2000 }), "150 / 2000 points toward your first five-year plan");
  assert.equal(planMessage({ completed: 2, progress: 1, target: 2000 }), "Five-year plans completed: 2 - 1 / 2000 toward the next");
});

test("roundLine shows the recognised answer, else the input, else no answer", () => {
  assert.equal(roundLine(round({})), "👥 Name a fictional robot - Bender (+30)");
  assert.equal(roundLine(round({ input: " roomba ", matchedAnswer: null, tier: tierById("utopian") })), "💭 Name a fictional robot - roomba (+0)");
  assert.equal(roundLine(round({ input: "  ", matchedAnswer: null, tier: tierById("no-answer") })), "⬛ Name a fictional robot - no answer (+0)");
});

test("roundCounter formats the round header", () => {
  assert.equal(roundCounter(1, 7), "Round 1 of 7");
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/messages.test.js`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Write `js/messages.js`**

```js
// @ts-check
import { NO_ANSWER } from "./scorer.js";

/** @typedef {import("./game.js").RoundResult} RoundResult */
/** @typedef {ReturnType<import("./scorer.js").fiveYearPlans>} Plans */

/** @param {RoundResult} result */
export function revealDetail(result) {
  if (result.tier.id === NO_ANSWER.id) return "Silence. The revolution needs answers.";
  if (result.matchedAnswer === null) return "The committee cannot verify this. Zero points, comrade.";
  const line = `The committee recognises "${result.matchedAnswer}".`;
  return result.remark ? `${line} ${result.remark}` : line;
}

/**
 * @param {number} total this game's score
 * @param {number} previousBest the best before this game was counted
 */
export function recordsMessage(total, previousBest) {
  if (total > previousBest) return "A new personal best. The politburo is pleased.";
  return `Personal best: ${previousBest}.`;
}

/** @param {Plans} plans */
export function planLabel(plans) {
  return `${plans.progress} / ${plans.target} points toward the next plan`;
}

/** @param {Plans} plans */
export function planMessage(plans) {
  const progress = `${plans.progress} / ${plans.target}`;
  if (plans.completed === 0) return `${progress} points toward your first five-year plan`;
  return `Five-year plans completed: ${plans.completed} - ${progress} toward the next`;
}

/** @param {RoundResult} result */
export function roundLine(result) {
  const shown = result.matchedAnswer ?? (result.input.trim() || "no answer");
  return `${result.tier.emoji} ${result.prompt} - ${shown} (+${result.tier.points})`;
}

/**
 * @param {number} round 1-based
 * @param {number} total
 */
export function roundCounter(round, total) {
  return `Round ${round} of ${total}`;
}
```

- [ ] **Step 4: Run the whole suite**

Run: `npm test && npm run check`
Expected: every suite passes (questions.test.js still reads `data/questions.json` at this point and still passes).

- [ ] **Step 5: Commit**

```bash
git add js/messages.js test/messages.test.js
git commit -m "feat(messages): Extract on-screen copy into a pure module"
```

---

### Task 9: Bank split by topic, remarks, and the Bible

**Files:**
- Create: `data/questions/animals-nature.json`, `data/questions/films-tv.json`, `data/questions/books-stories.json`, `data/questions/the-world.json`, `data/questions/psychology.json`, `data/questions/theory-revolution.json`
- Delete: `data/questions.json`
- Modify: `test/questions.test.js`

**Interfaces:**
- Consumes: `TOPICS` (Task 2), `AUTHORED_POINTS`, `tierForAuthored` (Task 3), `matchAnswer`, `normalize` (Task 4), `validateBank` (Task 6).
- Produces: `data/questions/<slug>.json`, each an array of questions sorted by id.

- [ ] **Step 1: Split the bank with a one-off node command (do not keep the script)**

```bash
node --input-type=module -e '
import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { TOPICS } from "./js/topics.js";
const bank = JSON.parse(readFileSync("data/questions.json", "utf8"));
mkdirSync("data/questions", { recursive: true });
for (const topic of TOPICS) {
  const questions = bank.filter((q) => q.topic === topic).sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(`data/questions/${topic}.json`, `${JSON.stringify(questions, null, 2)}\n`);
  console.log(topic, questions.length);
}
unlinkSync("data/questions.json");
'
```

Expected: six files, 25 questions each, and `data/questions.json` gone.

- [ ] **Step 2: Add the Bible to `books-stories-07` in `data/questions/books-stories.json`**

Find the question with `"id": "books-stories-07"` and append this entry to its `answers` array (after the last tier-100 entry):

```json
{
  "answer": "The Bible",
  "aliases": ["holy bible", "the good book"],
  "tier": 100,
  "remark": "Filed under fiction by order of the committee."
}
```

- [ ] **Step 3: Replace `test/questions.test.js`**

```js
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";
import { MIN_TOPICS, RECENT_LIMIT, ROUNDS, validateBank } from "../js/game.js";
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

const files = new Map(await Promise.all(TOPICS.map(async (topic) => [topic, await loadTopic(topic)])));
const bank = [...files.values()].flat();

test("every topic file is an array of questions for that topic, sorted by id", () => {
  for (const [topic, questions] of files) {
    assert.ok(Array.isArray(questions) && questions.length > 0, `${topic} is a non-empty array`);
    assert.ok(questions.every((q) => q.topic === topic), `${topic} only holds its own questions`);
    const ids = questions.map((q) => q.id);
    assert.deepEqual(ids, [...ids].sort((a, b) => a.localeCompare(b)), `${topic} sorted by id`);
  }
});

test("the bank passes runtime validation and can feed the sampler", () => {
  validateBank(bank);
  assert.ok(new Set(bank.map((q) => q.topic)).size >= MIN_TOPICS);
  assert.ok(bank.length - RECENT_LIMIT >= ROUNDS, "enough questions to avoid repeats");
});

test("ids and prompts are unique across the bank", () => {
  assert.equal(new Set(bank.map((q) => q.id)).size, bank.length);
  assert.equal(new Set(bank.map((q) => normalize(q.prompt))).size, bank.length);
});

for (const question of bank) {
  test(`question ${question.id} is well formed`, () => {
    assert.match(question.id, new RegExp(`^${question.topic}-\\d{2}$`), "id is <topic>-<two digits>");
    assert.ok(typeof question.prompt === "string" && question.prompt.length > 0, "prompt");
    const count = question.answers.length;
    assert.ok(count >= MIN_ANSWERS && count <= MAX_ANSWERS, `${MIN_ANSWERS}-${MAX_ANSWERS} answers, got ${count}`);
    for (const tier of AUTHORED_POINTS) {
      const inTier = question.answers.filter((a) => a.tier === tier).length;
      assert.ok(inTier >= MIN_PER_TIER, `at least ${MIN_PER_TIER} answers in tier ${tier}, got ${inTier}`);
    }
    const forms = new Set();
    for (const entry of question.answers) {
      assert.ok(AUTHORED_POINTS.includes(entry.tier), `valid tier on ${entry.answer}`);
      assert.ok(Array.isArray(entry.aliases), `aliases array on ${entry.answer}`);
      if ("remark" in entry) {
        assert.ok(typeof entry.remark === "string" && entry.remark.length > 0, `remark on ${entry.answer}`);
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
        assert.equal(match.entry, entry, `${question.id}: "${form}" should match "${entry.answer}"`);
      }
    }
  }
});

test("the Bible is a novel over 500 pages and scores Full Marx", () => {
  const question = bank.find((q) => q.id === "books-stories-07");
  assert.equal(question.prompt, "Name a novel over 500 pages");
  const match = matchAnswer("the bible", question.answers);
  assert.equal(match.entry?.answer, "The Bible");
  assert.equal(match.entry?.tier, 100);
  assert.ok(match.entry?.remark);
});
```

- [ ] **Step 4: Run the suite**

Run: `npm test && npm run check`
Expected: all pass. If the exact round-trip test fails for a pair of answers, the two forms normalise to the same string or an alias belongs to a different entry; fix the data, not the test.

- [ ] **Step 5: Commit in two pieces**

```bash
git add data/questions test/questions.test.js
git rm -q data/questions.json
git commit -m "refactor(bank): Split the bank into one file per topic"
```

Then edit nothing else and check `git status` is clean. The Bible entry went in with the split; that is fine because the split commit is the first commit that reads the new files.

---

### Task 10: `init()`, boot, timer, and the HTML shell

**Files:**
- Modify: `js/main.js` (full rewrite), `index.html`, `css/style.css`
- Create: `js/bootstrap.js`, `test/dom-contract.test.js`

**Interfaces:**
- Consumes: everything from Tasks 2 to 8.
- Produces: `init(doc, options)` where `options` is `{ storageBackend?, fetchImpl?, random?, now? }`; `ROUND_SECONDS`. The sprite containers `#title-hero`, `#reveal-sprite`, `.sigil` are created here and filled in Task 14.

- [ ] **Step 1: Write `test/dom-contract.test.js`**

```js
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";

const main = await readFile(new URL("../js/main.js", import.meta.url), "utf8");
const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("every element id main.js looks up is declared in index.html", () => {
  const wanted = new Set([...main.matchAll(/\$\("([^"]+)"\)/g)].map((m) => m[1]));
  const declared = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  assert.ok(wanted.size > 10, "main.js looks up ids through $()");
  const missing = [...wanted].filter((id) => !declared.has(id));
  assert.deepEqual(missing, []);
});

test("index.html loads only the bootstrap module and no third-party resources", () => {
  assert.match(html, /<script type="module" src="js\/bootstrap\.js"><\/script>/);
  assert.doesNotMatch(html, /https?:\/\//);
});

test("main.js has no side effects at import", () => {
  assert.doesNotMatch(main, /^(boot|init)\(/m);
  assert.doesNotMatch(main, /^document\./m);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/dom-contract.test.js`
Expected: FAIL on the bootstrap script and the third-party URLs.

- [ ] **Step 3: Rewrite `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'">
  <title>Martillion</title>
  <link rel="icon" id="favicon" href="data:,">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <noscript><p class="noscript">Martillion needs JavaScript. Enable it and reload.</p></noscript>
  <main id="app">
    <section id="screen-title" class="screen">
      <div id="title-hero" class="hero"></div>
      <p class="kicker"><span class="sigil"></span>The unlimited daily trivia game</p>
      <h1>Martillion</h1>
      <p class="tagline">Rare answers of the world, unite!</p>
      <dl class="stats">
        <div><dt>Best uprising</dt><dd id="best-score">0</dd></div>
        <div><dt>Five-year plans</dt><dd id="plans-completed">0</dd></div>
      </dl>
      <div id="plan-progress" class="plan-progress" role="progressbar" aria-label="Progress toward the next five-year plan" aria-valuemin="0" aria-valuemax="2000" aria-valuenow="0"><div id="plan-bar"></div></div>
      <p id="plan-label" class="plan-label"></p>
      <button id="start-button" class="primary" disabled>Start the uprising</button>
    </section>

    <section id="screen-round" class="screen" hidden>
      <header class="round-header">
        <span id="round-topic"></span>
        <span id="round-count"></span>
      </header>
      <div id="timer" class="timer" role="progressbar" aria-label="Time remaining" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><div id="timer-bar"></div></div>
      <h2 id="round-prompt"></h2>
      <form id="answer-form">
        <input id="answer-input" type="text" maxlength="120" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type your answer, comrade" aria-label="Your answer">
        <button type="submit" class="primary">Submit</button>
      </form>
    </section>

    <section id="screen-reveal" class="screen" hidden>
      <div id="reveal-sprite" class="reaction"></div>
      <h2 id="reveal-tier"></h2>
      <p id="reveal-points" class="reveal-points"></p>
      <p id="reveal-detail"></p>
      <button id="next-button" class="primary">Onward</button>
    </section>

    <section id="screen-results" class="screen" hidden>
      <p class="kicker"><span class="sigil"></span>The uprising is over</p>
      <h2 id="results-score"></h2>
      <h3 id="results-stage"></h3>
      <p id="results-flavour"></p>
      <ol id="results-rounds"></ol>
      <p id="results-records"></p>
      <p id="results-plan"></p>
      <div class="results-actions">
        <button id="share-button" class="primary">Share the struggle</button>
        <button id="again-button">Rise again</button>
      </div>
    </section>

    <section id="screen-error" class="screen" hidden>
      <h2>The struggle hit a snag</h2>
      <p id="error-detail"></p>
      <button id="retry-button" class="primary">Try again</button>
    </section>
  </main>
  <script type="module" src="js/bootstrap.js"></script>
</body>
</html>
```

The Google Fonts links are gone; Task 11 self-hosts Oswald. Until then the fallback face renders, which is fine.

- [ ] **Step 4: Write `js/bootstrap.js`**

```js
// @ts-check
import { init } from "./main.js";

init(document);
```

- [ ] **Step 5: Rewrite `js/main.js`**

```js
// @ts-check
import { PERFECT_SCORE, ROUNDS, createUprising, sampleQuestions, updateRecent, validateBank } from "./game.js";
import { planLabel, planMessage, recordsMessage, revealDetail, roundCounter, roundLine } from "./messages.js";
import { PLAN_TARGET, fiveYearPlans } from "./scorer.js";
import { copyShare, shareText } from "./share.js";
import { createStorage } from "./storage.js";
import { TOPICS, topicLabel } from "./topics.js";

export const ROUND_SECONDS = 30;
const ROUND_MS = ROUND_SECONDS * 1000;
const TICK_MS = 100;
const FETCH_TIMEOUT_MS = 10_000;
const SHARE_FEEDBACK_MS = 2000;

/**
 * @typedef {object} InitOptions
 * @property {Pick<Storage, "getItem" | "setItem"> | null} [storageBackend] null means memory only
 * @property {typeof fetch} [fetchImpl]
 * @property {() => number} [random]
 * @property {() => number} [now] monotonic milliseconds
 */

function readLocalStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Wires the whole game to a document. Called once by bootstrap.js.
 * @param {Document} doc
 * @param {InitOptions} [options]
 */
export function init(doc, options = {}) {
  const storage = createStorage("storageBackend" in options ? (options.storageBackend ?? null) : readLocalStorage());
  const fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const random = options.random ?? Math.random;
  const now = options.now ?? (() => performance.now());

  let state = storage.load();
  /** @type {import("./game.js").Question[]} */
  let bank = [];
  /** @type {ReturnType<typeof createUprising> | null} */
  let uprising = null;
  /** @type {ReturnType<typeof setInterval> | null} */
  let timerId = null;
  /** @type {AbortController | null} */
  let bootController = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let shareTimer = null;
  let lastShare = "";

  /** @param {string} id */
  function $(id) {
    const element = doc.getElementById(id);
    if (!element) throw new Error(`Missing element #${id}`);
    return element;
  }

  /** @param {string} id */
  function showScreen(id) {
    $(id);
    for (const screen of doc.querySelectorAll(".screen")) {
      screen.hidden = screen.id !== id;
    }
  }

  /** @param {string} detail */
  function showError(detail) {
    stopTimer();
    $("error-detail").textContent = detail;
    showScreen("screen-error");
  }

  // Title -----------------------------------------------------------------

  function renderStats() {
    const plans = fiveYearPlans(state.totalPoints);
    $("best-score").textContent = String(state.bestScore);
    $("plans-completed").textContent = String(plans.completed);
    const percent = clamp((plans.progress / plans.target) * 100, 0, 100);
    $("plan-bar").style.width = `${percent}%`;
    $("plan-progress").setAttribute("aria-valuemax", String(PLAN_TARGET));
    $("plan-progress").setAttribute("aria-valuenow", String(plans.progress));
    $("plan-label").textContent = planLabel(plans);
  }

  /**
   * @param {string} url
   * @param {AbortSignal} signal
   */
  async function fetchJson(url, signal) {
    const response = await fetchImpl(url, { signal });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
  }

  async function boot() {
    bootController?.abort();
    const controller = new AbortController();
    bootController = controller;
    const retry = /** @type {HTMLButtonElement} */ ($("retry-button"));
    retry.disabled = true;
    try {
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(FETCH_TIMEOUT_MS)]);
      const files = await Promise.all(TOPICS.map((topic) => fetchJson(`data/questions/${topic}.json`, signal)));
      if (controller !== bootController) return;
      bank = validateBank(files.flat());
      /** @type {HTMLButtonElement} */ ($("start-button")).disabled = false;
      showScreen("screen-title");
    } catch (error) {
      if (controller !== bootController) return;
      console.error("bank failed to load", error);
      showError("The questions failed to load. Check the connection and try again.");
    } finally {
      if (controller === bootController) retry.disabled = false;
    }
  }

  // Round -----------------------------------------------------------------

  function startGame() {
    const questions = sampleQuestions(bank, state.recentQuestionIds, random);
    uprising = createUprising(questions);
    playRound();
  }

  function playRound() {
    if (!uprising) throw new Error("No uprising in progress");
    const question = uprising.current();
    const input = /** @type {HTMLInputElement} */ ($("answer-input"));
    $("round-topic").textContent = topicLabel(question.topic);
    $("round-count").textContent = roundCounter(uprising.round + 1, ROUNDS);
    $("round-prompt").textContent = question.prompt;
    input.value = "";
    showScreen("screen-round");
    input.focus();
    startTimer();
  }

  function stopTimer() {
    if (timerId !== null) clearInterval(timerId);
    timerId = null;
  }

  function startTimer() {
    stopTimer();
    const startedAt = now();
    $("timer-bar").style.width = "100%";
    $("timer").setAttribute("aria-valuenow", "100");
    const id = setInterval(() => {
      if (id !== timerId) {
        clearInterval(id);
        return;
      }
      const remaining = ROUND_MS - (now() - startedAt);
      const percent = clamp((remaining / ROUND_MS) * 100, 0, 100);
      $("timer-bar").style.width = `${percent}%`;
      $("timer").setAttribute("aria-valuenow", String(Math.round(percent)));
      if (remaining <= 0) submitAnswer();
    }, TICK_MS);
    timerId = id;
  }

  function submitAnswer() {
    if (timerId === null || !uprising) return;
    stopTimer();
    const input = /** @type {HTMLInputElement} */ ($("answer-input"));
    renderReveal(uprising.submit(input.value));
  }

  /** @param {import("./game.js").RoundResult} result */
  function renderReveal(result) {
    $("reveal-tier").textContent = result.tier.name;
    $("reveal-points").textContent = `+${result.tier.points}`;
    $("reveal-detail").textContent = revealDetail(result);
    showScreen("screen-reveal");
    $("next-button").focus();
  }

  function nextRound() {
    if (!uprising) throw new Error("No uprising in progress");
    if (uprising.isOver()) finishGame(uprising.summary());
    else playRound();
  }

  // Results ---------------------------------------------------------------

  /** @param {import("./game.js").Summary} summary */
  function finishGame(summary) {
    const previousBest = state.bestScore;
    state = {
      bestScore: Math.max(previousBest, summary.total),
      totalPoints: state.totalPoints + summary.total,
      gamesPlayed: state.gamesPlayed + 1,
      recentQuestionIds: updateRecent(state.recentQuestionIds, summary.rounds.map((round) => round.questionId)),
    };
    storage.save(state);
    lastShare = shareText(summary);
    renderStats();
    renderResults(summary, previousBest);
  }

  /**
   * @param {import("./game.js").Summary} summary
   * @param {number} previousBest
   */
  function renderResults(summary, previousBest) {
    $("results-score").textContent = `${summary.total} points`;
    $("results-stage").textContent = summary.stage.name;
    $("results-flavour").textContent = summary.stage.flavour;
    $("results-rounds").replaceChildren(
      ...summary.rounds.map((round) => {
        const item = doc.createElement("li");
        item.textContent = roundLine(round);
        return item;
      }),
    );
    $("results-records").textContent = recordsMessage(summary.total, previousBest);
    $("results-plan").textContent = planMessage(fiveYearPlans(state.totalPoints));
    $("screen-results").classList.toggle("perfect", summary.total === PERFECT_SCORE);
    showScreen("screen-results");
  }

  // Wiring ----------------------------------------------------------------

  const shareButton = $("share-button");
  const shareLabel = shareButton.textContent ?? "";

  async function share() {
    const copied = await copyShare(lastShare);
    shareButton.textContent = copied ? "Copied to clipboard" : "Copy failed, comrade";
    if (shareTimer !== null) clearTimeout(shareTimer);
    shareTimer = setTimeout(() => {
      shareButton.textContent = shareLabel;
    }, SHARE_FEEDBACK_MS);
  }

  /** @param {KeyboardEvent} event */
  function ignoreHeldEnter(event) {
    if (event.key === "Enter" && event.repeat) event.preventDefault();
  }

  $("retry-button").addEventListener("click", () => {
    boot();
  });
  $("start-button").addEventListener("click", startGame);
  $("again-button").addEventListener("click", startGame);
  $("next-button").addEventListener("click", nextRound);
  $("next-button").addEventListener("keydown", ignoreHeldEnter);
  $("answer-input").addEventListener("keydown", ignoreHeldEnter);
  $("answer-form").addEventListener("submit", (event) => {
    event.preventDefault();
    submitAnswer();
  });
  shareButton.addEventListener("click", () => {
    share();
  });
  globalThis.addEventListener("error", (event) => {
    console.error(event.error ?? event.message);
    showError("Something went wrong. Try again to reload the questions.");
  });
  globalThis.addEventListener("unhandledrejection", (event) => {
    console.error(event.reason);
    showError("Something went wrong. Try again to reload the questions.");
  });

  renderStats();
  showScreen("screen-title");
  boot();
}
```

- [ ] **Step 6: Update `css/style.css` for the new elements**

Replace the `.kicker::before` rule with:

```css
.sigil {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  margin-right: 0.55rem;
  vertical-align: -0.2em;
}

.sigil:empty {
  background: var(--red);
  width: 0.5rem;
  height: 0.5rem;
  vertical-align: 0;
}
```

Add after the `.timer` rule so the bar cannot escape its track:

```css
.timer {
  overflow: hidden;
}
```

Add a `.noscript` rule and the empty sprite containers near the "Screens" section:

```css
.noscript {
  position: relative;
  z-index: 2;
  margin: 1rem var(--gutter);
  padding: 0.75rem 1rem;
  border: var(--rule);
  background: var(--cream-dim);
  font-family: var(--display);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.hero,
.reaction {
  display: block;
}
```

Update the `prefers-reduced-motion` block to also stop animations:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 7: Run the suite and try it in a browser**

Run: `npm test && npm run check`
Expected: all pass.

Then: `uv run python -m http.server 8123` and open `http://localhost:8123`. Check: stats show immediately, Start enables once the bank loads, a full game plays through, an unverified answer shows "Utopian +0" with the committee line, results list shows `+0` for it, share copies, the personal-best line is correct on a first game scoring zero. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add index.html js/main.js js/bootstrap.js css/style.css test/dom-contract.test.js
git commit -m "refactor(ui): Export init and harden boot and timer"
```

---

### Task 11: Self-host Oswald

**Files:**
- Create: `css/fonts/oswald-500.woff2`, `css/fonts/oswald-700.woff2`, `css/fonts/OFL.txt`
- Modify: `css/style.css`

- [ ] **Step 1: Download the latin woff2 files**

```bash
mkdir -p css/fonts
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"
curl -sA "$UA" "https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&display=swap" -o /tmp/oswald.css
grep -B3 -A6 "latin;" /tmp/oswald.css | grep -E "font-weight|url\(" 
```

From the output, take the `url(...)` under the `/* latin */` block for weight 500 and for weight 700 and download each:

```bash
curl -s "<latin 500 url>" -o css/fonts/oswald-500.woff2
curl -s "<latin 700 url>" -o css/fonts/oswald-700.woff2
curl -s https://raw.githubusercontent.com/googlefonts/OswaldFont/main/OFL.txt -o css/fonts/OFL.txt
file css/fonts/*.woff2
```

Expected: both files report `Web Open Font Format (Version 2)`.

- [ ] **Step 2: Declare the faces at the top of `css/style.css`, before `:root`**

```css
@font-face {
  font-family: "Oswald";
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url("fonts/oswald-500.woff2") format("woff2");
}

@font-face {
  font-family: "Oswald";
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("fonts/oswald-700.woff2") format("woff2");
}
```

- [ ] **Step 3: Check in the browser that headings render in Oswald, then commit**

```bash
git add css/fonts css/style.css
git commit -m "chore(fonts): Self-host Oswald"
```

---

### Task 12: Pixel module

**Files:**
- Create: `js/pixel.js`, `test/pixel.test.js`, `scripts/preview-sprites.mjs`

**Interfaces:**
- Produces: `Sprite` typedef `{ palette: Record<string, string>, rows: string[] }`; `Rect` typedef `{ x, y, w, h, colour }`; `TRANSPARENT` (`"."`); `spriteSize(sprite)`; `spriteToRects(sprite)`; `compose(base, overlay, offset)`; `spriteToSvgString(sprite, colours)`; `paintSprite(doc, sprite, label)`.

- [ ] **Step 1: Write `test/pixel.test.js`**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { TRANSPARENT, compose, paintSprite, spriteSize, spriteToRects, spriteToSvgString } from "../js/pixel.js";

const palette = { "#": "ink", r: "red" };
const square = { palette, rows: ["##", "#r"] };

test("TRANSPARENT is the dot", () => {
  assert.equal(TRANSPARENT, ".");
});

test("spriteSize reads width and height and rejects ragged rows", () => {
  assert.deepEqual(spriteSize(square), { width: 2, height: 2 });
  assert.deepEqual(spriteSize({ palette, rows: [] }), { width: 0, height: 0 });
  assert.throws(() => spriteSize({ palette, rows: ["##", "#"] }), /Ragged/);
});

test("spriteToRects merges horizontal runs and skips transparent pixels", () => {
  const sprite = { palette, rows: ["##r.", ".rr#"] };
  assert.deepEqual(spriteToRects(sprite), [
    { x: 0, y: 0, w: 2, h: 1, colour: "ink" },
    { x: 2, y: 0, w: 1, h: 1, colour: "red" },
    { x: 1, y: 1, w: 2, h: 1, colour: "red" },
    { x: 3, y: 1, w: 1, h: 1, colour: "ink" },
  ]);
});

test("spriteToRects rejects an unknown palette character", () => {
  assert.throws(() => spriteToRects({ palette, rows: ["#x"] }), /Unknown palette key "x" at 1,0/);
});

test("compose overlays non-transparent pixels at an offset and merges palettes", () => {
  const base = { palette: { "#": "ink" }, rows: ["####", "####", "####"] };
  const overlay = { palette: { y: "star" }, rows: ["y.", ".y"] };
  assert.deepEqual(compose(base, overlay, { x: 2, y: 1 }), {
    palette: { "#": "ink", y: "star" },
    rows: ["####", "##y#", "###y"],
  });
});

test("compose clips an overlay that runs past the base edge", () => {
  const base = { palette: { "#": "ink" }, rows: ["##", "##"] };
  const overlay = { palette: { y: "star" }, rows: ["yyy", "yyy", "yyy"] };
  assert.deepEqual(compose(base, overlay, { x: 1, y: 1 }).rows, ["##", "#y"]);
});

test("compose rejects a palette character that means different colours", () => {
  const base = { palette: { "#": "ink" }, rows: ["#"] };
  const overlay = { palette: { "#": "red" }, rows: ["#"] };
  assert.throws(() => compose(base, overlay, { x: 0, y: 0 }), /Palette conflict/);
});

test("spriteToSvgString emits crisp rects with resolved colours", () => {
  const svg = spriteToSvgString(square, { ink: "#1B1712", red: "#C8102E" });
  assert.equal(
    svg,
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 2" shape-rendering="crispEdges">' +
      '<rect x="0" y="0" width="2" height="1" fill="#1B1712"/>' +
      '<rect x="0" y="1" width="1" height="1" fill="#1B1712"/>' +
      '<rect x="1" y="1" width="1" height="1" fill="#C8102E"/>' +
      "</svg>",
  );
  assert.throws(() => spriteToSvgString(square, { ink: "#000" }), /No colour for token "red"/);
});

function fakeDocument() {
  const make = (ns, tag) => {
    const attrs = new Map();
    const children = [];
    const classes = new Set();
    return {
      ns,
      tag,
      attrs,
      children,
      classList: { add: (c) => classes.add(c), has: (c) => classes.has(c) },
      setAttribute: (k, v) => attrs.set(k, v),
      append: (...nodes) => children.push(...nodes),
    };
  };
  return { createElementNS: make };
}

test("paintSprite builds an svg element with rect children and CSS variable fills", () => {
  const svg = paintSprite(fakeDocument(), square, "a square");
  assert.equal(svg.ns, "http://www.w3.org/2000/svg");
  assert.equal(svg.tag, "svg");
  assert.equal(svg.attrs.get("viewBox"), "0 0 2 2");
  assert.equal(svg.attrs.get("shape-rendering"), "crispEdges");
  assert.equal(svg.attrs.get("role"), "img");
  assert.equal(svg.attrs.get("aria-label"), "a square");
  assert.ok(svg.classList.has("sprite"));
  assert.equal(svg.children.length, 3);
  assert.equal(svg.children[2].attrs.get("fill"), "var(--red)");
  assert.equal(svg.children[2].attrs.get("x"), "1");
});

test("paintSprite with an empty label is decorative", () => {
  const svg = paintSprite(fakeDocument(), square, "");
  assert.equal(svg.attrs.get("aria-hidden"), "true");
  assert.equal(svg.attrs.has("role"), false);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/pixel.test.js`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Write `js/pixel.js`**

```js
// @ts-check

/**
 * A sprite is a palette from single characters to colour tokens, plus rows of equal length.
 * "." is transparent. Colour tokens name CSS custom properties without the leading dashes.
 * @typedef {object} Sprite
 * @property {Record<string, string>} palette
 * @property {string[]} rows
 */

/** @typedef {{ x: number, y: number, w: number, h: number, colour: string }} Rect */

export const TRANSPARENT = ".";
const SVG_NS = "http://www.w3.org/2000/svg";

/** @param {Sprite} sprite */
export function spriteSize(sprite) {
  const height = sprite.rows.length;
  const width = sprite.rows[0]?.length ?? 0;
  for (const row of sprite.rows) {
    if (row.length !== width) throw new Error(`Ragged sprite row: "${row}"`);
  }
  return { width, height };
}

/**
 * Horizontal runs of one colour become one rect each.
 * @param {Sprite} sprite
 * @returns {Rect[]}
 */
export function spriteToRects(sprite) {
  const { width, height } = spriteSize(sprite);
  /** @type {Rect[]} */
  const rects = [];
  for (let y = 0; y < height; y++) {
    const row = sprite.rows[y];
    let x = 0;
    while (x < width) {
      const key = row[x];
      if (key === TRANSPARENT) {
        x++;
        continue;
      }
      if (!Object.hasOwn(sprite.palette, key)) throw new Error(`Unknown palette key "${key}" at ${x},${y}`);
      let run = 1;
      while (x + run < width && row[x + run] === key) run++;
      rects.push({ x, y, w: run, h: 1, colour: sprite.palette[key] });
      x += run;
    }
  }
  return rects;
}

/**
 * Paints the overlay onto a copy of the base at the given offset. Overlay pixels past the base
 * edge are clipped.
 * @param {Sprite} base
 * @param {Sprite} overlay
 * @param {{ x: number, y: number }} offset
 * @returns {Sprite}
 */
export function compose(base, overlay, offset) {
  const { width } = spriteSize(base);
  const overlaySize = spriteSize(overlay);
  for (const [key, colour] of Object.entries(overlay.palette)) {
    if (Object.hasOwn(base.palette, key) && base.palette[key] !== colour) {
      throw new Error(`Palette conflict on "${key}": ${base.palette[key]} vs ${colour}`);
    }
  }
  const rows = base.rows.map((row, y) => {
    const oy = y - offset.y;
    if (oy < 0 || oy >= overlaySize.height) return row;
    let out = "";
    for (let x = 0; x < width; x++) {
      const ox = x - offset.x;
      const key = ox >= 0 && ox < overlaySize.width ? overlay.rows[oy][ox] : TRANSPARENT;
      out += key === TRANSPARENT ? row[x] : key;
    }
    return out;
  });
  return { palette: { ...base.palette, ...overlay.palette }, rows };
}

/**
 * @param {Record<string, string>} colours token to concrete colour
 * @param {string} token
 */
function resolve(colours, token) {
  if (!Object.hasOwn(colours, token)) throw new Error(`No colour for token "${token}"`);
  return colours[token];
}

/**
 * Standalone SVG markup with concrete colours, for the favicon and for tests.
 * @param {Sprite} sprite
 * @param {Record<string, string>} colours
 */
export function spriteToSvgString(sprite, colours) {
  const { width, height } = spriteSize(sprite);
  const body = spriteToRects(sprite)
    .map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${resolve(colours, r.colour)}"/>`)
    .join("");
  return `<svg xmlns="${SVG_NS}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">${body}</svg>`;
}

/**
 * An <svg> element whose rect fills are CSS custom properties, so the stylesheet owns the palette.
 * An empty label marks the sprite decorative.
 * @param {Pick<Document, "createElementNS">} doc
 * @param {Sprite} sprite
 * @param {string} label
 */
export function paintSprite(doc, sprite, label) {
  const { width, height } = spriteSize(sprite);
  const svg = doc.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.classList.add("sprite");
  if (label) {
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", label);
  } else {
    svg.setAttribute("aria-hidden", "true");
  }
  for (const r of spriteToRects(sprite)) {
    const rect = doc.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", String(r.x));
    rect.setAttribute("y", String(r.y));
    rect.setAttribute("width", String(r.w));
    rect.setAttribute("height", String(r.h));
    rect.setAttribute("fill", `var(--${r.colour})`);
    svg.append(rect);
  }
  return svg;
}
```

- [ ] **Step 4: Run the pixel test**

Run: `node --test test/pixel.test.js && npm run check`
Expected: all pass, check clean.

- [ ] **Step 5: Write `scripts/preview-sprites.mjs`**

A dev-only tool: renders every exported sprite from `js/sprites.js` to a PNG at 8x scale on cream, into `/tmp/martillion-sprites/`. Uses only Node core (zlib for deflate). It imports `js/sprites.js`, which Task 13 creates; until then it fails to import, which is expected.

```js
// @ts-check
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { spriteSize, spriteToRects } from "../js/pixel.js";
import { SPRITE_COLOURS, previewSprites } from "../js/sprites.js";

const SCALE = 8;
const OUT = "/tmp/martillion-sprites";

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

/** @param {Uint8Array} bytes */
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * @param {string} type
 * @param {Uint8Array} data
 */
function chunk(type, data) {
  const typed = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
}

/**
 * @param {number} width
 * @param {number} height
 * @param {Buffer} rgb width * height * 3 bytes
 */
function encodePng(width, height, rgb) {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** @param {string} hex like #C8102E */
function rgbOf(hex) {
  return [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
}

/**
 * @param {import("../js/pixel.js").Sprite} sprite
 */
function render(sprite) {
  const { width, height } = spriteSize(sprite);
  const w = width * SCALE;
  const h = height * SCALE;
  const rgb = Buffer.alloc(w * h * 3);
  const paper = rgbOf(SPRITE_COLOURS.cream);
  for (let i = 0; i < w * h; i++) rgb.set(paper, i * 3);
  for (const rect of spriteToRects(sprite)) {
    const colour = rgbOf(SPRITE_COLOURS[rect.colour]);
    for (let y = rect.y * SCALE; y < (rect.y + rect.h) * SCALE; y++) {
      for (let x = rect.x * SCALE; x < (rect.x + rect.w) * SCALE; x++) rgb.set(colour, (y * w + x) * 3);
    }
  }
  return encodePng(w, h, rgb);
}

mkdirSync(OUT, { recursive: true });
for (const [name, sprite] of previewSprites()) {
  writeFileSync(`${OUT}/${name}.png`, render(sprite));
  console.log(`${OUT}/${name}.png`);
}
```

- [ ] **Step 6: Commit**

```bash
git add js/pixel.js test/pixel.test.js scripts/preview-sprites.mjs
git commit -m "feat(pixel): Render sprite grids to crisp SVG"
```

---

### Task 13: The art

**Files:**
- Create: `js/sprites.js`, `test/sprites.test.js`

**Interfaces:**
- Consumes: `compose`, `spriteSize`, `spriteToRects` (Task 12), `TIERS` (Task 3).
- Produces: `SPRITE_COLOURS` (token to hex), `MARX`, `MARX_HERO`, `HAMMER_SICKLE`, `STAR`, `reactionFor(tierId): { sprite, label }`, `previewSprites(): Map<string, Sprite>`.

- [ ] **Step 1: Write `test/sprites.test.js`**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { spriteSize, spriteToRects } from "../js/pixel.js";
import { TIERS } from "../js/scorer.js";
import { HAMMER_SICKLE, MARX, MARX_HERO, SPRITE_COLOURS, STAR, previewSprites, reactionFor } from "../js/sprites.js";

test("SPRITE_COLOURS covers the six palette tokens with hex values", () => {
  assert.deepEqual(Object.keys(SPRITE_COLOURS).sort(), ["cream", "cream-dim", "ink", "red", "skin", "star"]);
  for (const hex of Object.values(SPRITE_COLOURS)) assert.match(hex, /^#[0-9A-F]{6}$/);
});

test("every sprite is rectangular, uses known palette keys, and known colour tokens", () => {
  for (const [name, sprite] of previewSprites()) {
    const size = spriteSize(sprite);
    assert.ok(size.width > 0 && size.height > 0, `${name} has size`);
    for (const rect of spriteToRects(sprite)) {
      assert.ok(rect.colour in SPRITE_COLOURS, `${name} uses colour token ${rect.colour}`);
    }
  }
});

test("Marx is 32 by 32 and the hero wears sunglasses", () => {
  assert.deepEqual(spriteSize(MARX), { width: 32, height: 32 });
  assert.deepEqual(spriteSize(MARX_HERO), { width: 32, height: 32 });
  assert.notDeepEqual(MARX_HERO.rows, MARX.rows);
});

test("hammer and sickle and star are small glyphs", () => {
  assert.deepEqual(spriteSize(HAMMER_SICKLE), { width: 16, height: 16 });
  assert.deepEqual(spriteSize(STAR), { width: 5, height: 5 });
});

test("every tier has a reaction with a label, and reactions differ from each other", () => {
  const seen = new Set();
  for (const tier of TIERS) {
    const { sprite, label } = reactionFor(tier.id);
    assert.deepEqual(spriteSize(sprite), { width: 32, height: 32 });
    assert.ok(label.startsWith("Marx"), `${tier.id} label names Marx`);
    const key = sprite.rows.join("\n");
    assert.ok(!seen.has(key), `${tier.id} reaction is distinct`);
    seen.add(key);
  }
  assert.throws(() => reactionFor("constructor"), /No reaction/);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/sprites.test.js`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Write `js/sprites.js`**

The grids below are the starting draft. Step 4 renders them to PNG; look at every one and adjust pixels until Marx reads as Marx (big hair, big beard, sunglasses on the hero). Keep every row exactly the stated width; the test enforces it.

```js
// @ts-check
import { compose } from "./pixel.js";

/** @typedef {import("./pixel.js").Sprite} Sprite */

/** Concrete colours for contexts without CSS (favicon, previews). Tokens match style.css. */
export const SPRITE_COLOURS = Object.freeze({
  red: "#C8102E",
  ink: "#1B1712",
  cream: "#F3E9D2",
  "cream-dim": "#E4D5B5",
  star: "#E8B923",
  skin: "#E9C9A0",
});

const PALETTE = Object.freeze({
  "#": "ink",
  r: "red",
  c: "cream",
  d: "cream-dim",
  y: "star",
  s: "skin",
});

/** @param {string[]} rows */
const sprite = (rows) => ({ palette: PALETTE, rows });

/** Marx, level gaze. 32 x 32. Hair and beard in ink, jacket in red, shirt in cream. */
export const MARX = sprite([
  "..........############..........",
  ".......##################.......",
  ".....######################.....",
  "....########################....",
  "...##########################...",
  "...##########################...",
  "..############################..",
  "..######ssssssssssssssss######..",
  "..#####ssssssssssssssssss#####..",
  "..####ssssssssssssssssssss####..",
  "..####ss####ssssssss####ss####..",
  "..###sssss##ssssssss##sssss###..",
  "..###sssss##ssssssss##sssss###..",
  "..###ssssssssss##ssssssssss###..",
  "..###sssssssss#ss#sssssssss###..",
  "..###sss################sss###..",
  "..#############ss#############..",
  "..############ssss############..",
  "..#############ss#############..",
  "...##########################...",
  "...##########################...",
  "....########################....",
  ".....######################.....",
  "......####################......",
  ".......##################.......",
  "........################........",
  "....rrrrr##############rrrrr....",
  "...rrrrrrr############rrrrrrr...",
  "..rrrrrrrrr##########rrrrrrrrr..",
  "..rrrrrrrrrrccccccccrrrrrrrrrr..",
  "..rrrrrrrrrrrccccccrrrrrrrrrrr..",
  "..rrryrrrrrrrrccccrrrrrrrrrrrr..",
]);

/** Sunglasses, 20 x 4, placed at (6, 10). */
const SUNGLASSES = sprite([
  "#########..#########",
  "#y################y#",
  "#########..#########",
  ".#######....#######.",
]);

/** A five-point star, 5 x 5. */
export const STAR = sprite(["..y..", ".yyy.", "yyyyy", ".yyy.", "..y.."]);

/** Closed eyes, 12 x 2, placed at (10, 11). */
const EYES_CLOSED = sprite(["ss........ss", "##........##"]);

/** Happy closed eyes, 14 x 2, placed at (9, 11). */
const EYES_HAPPY = sprite(["s#s.......s#s.", "#s#.......#s#."]);

/** One raised eyebrow, 4 x 2, placed at (20, 9). */
const BROW_RAISED = sprite(["####", "ssss"]);

/** Question mark, 5 x 7, placed at (26, 0). */
const QUERY = sprite([".yyy.", "y...y", "....y", "...y.", "..y..", ".....", "..y.."]);

/** Big Z, 5 x 5, placed at (26, 0). */
const BIG_Z = sprite(["yyyyy", "...y.", "..y..", ".y...", "yyyyy"]);

/** Small z, 3 x 3, placed at (23, 5). */
const SMALL_Z = sprite(["yyy", ".y.", "yyy"]);

/** Raised fist with sleeve, 8 x 10, placed at (24, 14). */
const FIST = sprite([
  "..#####.",
  ".#sssss#",
  ".#s#s#s#",
  ".#sssss#",
  ".#s#s#s#",
  ".#sssss#",
  "..##sss#",
  "..#cccc#",
  "..#rrrr#",
  "..#rrrr#",
]);

/** Hand over the face, 13 x 10, placed at (4, 8). */
const PALM = sprite([
  ".##.##.##.##.",
  ".ss.ss.ss.ss.",
  "#ss#ss#ss#ss#",
  "#ss#ss#ss#ss#",
  "#ss#ss#ss#ss#",
  "#ssssssssss#.",
  "#ssssssssss#.",
  "#ssssssssss#.",
  ".#sssssssss#.",
  "..#########..",
]);

/** Hammer and sickle, 16 x 16, ink. */
export const HAMMER_SICKLE = sprite([
  ".....######.....",
  "...##......##...",
  "..#..........#..",
  ".#............#.",
  ".#..........###.",
  ".#.........#####",
  ".#........#####.",
  ".#.......####..#",
  "..#.....##.....#",
  "..#....##......#",
  "...#..##......#.",
  "....####.....#..",
  "...###.....##...",
  "..##.....###....",
  ".##.............",
  "................",
]);

/**
 * @typedef {object} Layer
 * @property {Sprite} sprite
 * @property {number} x
 * @property {number} y
 */

/** @type {(sprite: Sprite, x: number, y: number) => Layer} */
const at = (sprite, x, y) => ({ sprite, x, y });

/** @type {Map<string, { layers: Layer[], label: string }>} */
const REACTIONS = new Map([
  ["full-marx", { layers: [at(SUNGLASSES, 6, 10), at(STAR, 27, 0)], label: "Marx, delighted, in sunglasses" }],
  ["vanguard", { layers: [at(FIST, 24, 14)], label: "Marx, fist raised" }],
  ["comrade", { layers: [at(EYES_HAPPY, 9, 11)], label: "Marx, content" }],
  ["masses", { layers: [], label: "Marx, unmoved" }],
  ["utopian", { layers: [at(BROW_RAISED, 20, 9), at(QUERY, 26, 0)], label: "Marx, doubtful" }],
  ["false-consciousness", { layers: [at(PALM, 4, 8)], label: "Marx, hand over his face" }],
  ["no-answer", { layers: [at(EYES_CLOSED, 10, 11), at(BIG_Z, 26, 0), at(SMALL_Z, 23, 5)], label: "Marx, asleep" }],
]);

/** @param {Layer[]} layers */
function build(layers) {
  return layers.reduce((base, layer) => compose(base, layer.sprite, { x: layer.x, y: layer.y }), MARX);
}

/** Marx in sunglasses, for the title screen. */
export const MARX_HERO = build([at(SUNGLASSES, 6, 10)]);

/** @param {string} tierId */
export function reactionFor(tierId) {
  const reaction = REACTIONS.get(tierId);
  if (!reaction) throw new Error(`No reaction for tier ${tierId}`);
  return { sprite: build(reaction.layers), label: reaction.label };
}

/** Every sprite worth looking at, for the preview script and the well-formedness test. */
export function previewSprites() {
  /** @type {Map<string, Sprite>} */
  const all = new Map([
    ["marx", MARX],
    ["marx-hero", MARX_HERO],
    ["hammer-sickle", HAMMER_SICKLE],
    ["star", STAR],
  ]);
  for (const tierId of REACTIONS.keys()) all.set(`reaction-${tierId}`, reactionFor(tierId).sprite);
  return all;
}
```

- [ ] **Step 4: Run the tests, render the previews, and look at them**

Run: `node --test test/sprites.test.js && node scripts/preview-sprites.mjs`
Expected: tests pass, eleven PNG paths printed.

Open each PNG (the Read tool renders images). Check: Marx has a wide hair mass, a beard that comes to a point, a red jacket with a cream shirt; the hero's sunglasses sit over the eyes with a glint; each reaction is recognisable at a glance; the hammer and sickle reads as ☭. Adjust rows and re-run until they do. Every row must stay the stated width.

- [ ] **Step 5: Run the checks and commit**

```bash
npm run check
git add js/sprites.js test/sprites.test.js
git commit -m "feat(sprites): Draw pixel Marx, his reactions, and the sigil"
```

---

### Task 14: Put the art on screen

**Files:**
- Modify: `js/main.js`, `css/style.css`

**Interfaces:**
- Consumes: `paintSprite`, `spriteToSvgString` (Task 12), `MARX_HERO`, `HAMMER_SICKLE`, `SPRITE_COLOURS`, `reactionFor` (Task 13).

- [ ] **Step 1: Add the imports to `js/main.js`**

```js
import { paintSprite, spriteToSvgString } from "./pixel.js";
import { HAMMER_SICKLE, MARX_HERO, SPRITE_COLOURS, reactionFor } from "./sprites.js";
```

- [ ] **Step 2: Paint the static sprites at the end of `init`, before `renderStats()`**

```js
  $("title-hero").replaceChildren(paintSprite(doc, MARX_HERO, "Karl Marx in sunglasses"));
  for (const sigil of doc.querySelectorAll(".sigil")) {
    sigil.replaceChildren(paintSprite(doc, HAMMER_SICKLE, ""));
  }
  const favicon = /** @type {HTMLLinkElement} */ ($("favicon"));
  favicon.href = `data:image/svg+xml,${encodeURIComponent(spriteToSvgString(HAMMER_SICKLE, SPRITE_COLOURS))}`;
```

- [ ] **Step 3: Paint the reaction in `renderReveal`**

Add as the first line of `renderReveal`:

```js
    const reaction = reactionFor(result.tier.id);
    $("reveal-sprite").replaceChildren(paintSprite(doc, reaction.sprite, reaction.label));
```

- [ ] **Step 4: Style the sprites in `css/style.css`**

Add a `--skin` token to `:root`:

```css
  --skin: #E9C9A0;
```

Replace the `.hero, .reaction { display: block; }` rule from Task 10 with:

```css
/* Sprites --------------------------------------------------------------- */

.sprite {
  display: block;
  width: 100%;
  height: auto;
}

.hero {
  align-self: flex-end;
  width: clamp(6rem, 30vw, 9rem);
  margin-bottom: -0.75rem;
  filter: drop-shadow(var(--offset) var(--offset) 0 var(--ink-18));
}

.reaction {
  width: clamp(6rem, 32vw, 8rem);
  margin-bottom: 1rem;
}

.reaction .sprite {
  transform-origin: 50% 80%;
  animation: stamp 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
}

@keyframes stamp {
  from {
    opacity: 0;
    transform: scale(1.5) rotate(-8deg);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.sigil .sprite {
  width: 1rem;
  height: 1rem;
}
```

Delete the `.reveal-emoji` rule; nothing uses it now.

- [ ] **Step 5: Run everything and check in the browser**

Run: `npm test && npm run check`
Then serve and open the page. Check: pixel Marx on the title screen at a sensible size on a narrow viewport (use the browser's device toolbar at 360px wide), the hammer and sickle before each kicker and in the tab icon, a different Marx on every reveal tier with the stamp animation, and no console errors.

- [ ] **Step 6: Commit**

```bash
git add js/main.js css/style.css
git commit -m "feat(ui): Put pixel Marx on the title and reveal screens"
```

---

### Task 15: Widen the bank, one topic per agent

**Files:**
- Modify: `data/questions/<topic>.json`, one file per agent

This task runs six times, once per topic, in parallel agents with `isolation: "worktree"`. Each agent gets the brief below with `<topic>` filled in, commits on its own branch, and the coordinator merges the six branches into the feature branch afterwards (`git merge --no-ff <branch>`; the files never overlap, so merges are clean).

**Brief for each agent:**

> You are widening the Martillion question bank for one topic: `data/questions/<topic>.json`. Read `docs/superpowers/specs/2026-09-02-second-uprising-design.md` (Question bank section) and the authoring rules below before editing. Work only in that one file. Run `npm test` after every few questions; the data test tells you exactly what is wrong. When every question is done and `npm test` passes, commit with:
> `env -u GIT_AUTHOR_NAME -u GIT_AUTHOR_EMAIL -u GIT_COMMITTER_NAME -u GIT_COMMITTER_EMAIL git commit -m "feat(bank): Widen the <topic> pack"` after `git add data/questions/<topic>.json`. No other files. No Claude signature.
>
> Authoring rules:
> - Target 50 to 60 answers for every open-ended question. Closed sets (former Soviet republics, flightless birds, carnivorous plants, languages with over 100 million speakers, Studio Ghibli films and the like) are exhaustive instead: list every member a reasonable person could name, and stop. Hard cap 80.
> - An unrecognised answer now scores zero, so the failure mode to avoid is a top-of-mind answer missing from the bank. Cover tiers 10 and 30 exhaustively: everything a sharp 21-year-old in the UK might blurt out in 30 seconds.
> - Tier is how common the answer is, not how good: 10 = the first things anyone says, 30 = common, 60 = uncommon, 85 = genuinely obscure, 100 = a delighted "how did you even know that". Keep at least 2 answers in every tier. Do not change existing tiers unless one is plainly wrong; if you change one, be sure.
> - Every answer must actually satisfy the prompt. Check facts you are not sure of (a novel over 500 pages must be over 500 pages; a landlocked country must be landlocked).
> - Aliases are the forms people actually type: alternate names, common spellings, shorter forms, character-for-title where people conflate them ("frankenstein" for the monster). Case, punctuation, accents, and leading articles are handled by normalisation; never add aliases that differ only in those.
> - No two forms in one question may normalise to the same string, and every form typed exactly must match its own entry; `npm test` enforces both. When two legitimate answers are near-duplicates (Richard II and Richard III), keep both; the matcher handles it.
> - Keep answers sorted by tier ascending (10 first) within each question, and the file's questions sorted by id. Two-space JSON indentation, arrays of aliases on one line when short. Keep the existing `remark` fields; do not add new ones.
> - The frame is UK, the player is 21 and sharp, the tone is Krillion: full difficulty.

- [ ] **Step 1: Dispatch six agents with the brief, one per topic slug from `js/topics.js`**

- [ ] **Step 2: When each returns, merge its branch and run the suite**

```bash
git merge --no-ff <agent-branch>
npm test
```

Expected: every merge clean, suite green. If a merge conflicts, the agent touched a file outside its topic; inspect and resolve by keeping the feature branch's version of everything except its topic file.

- [ ] **Step 3: Report the new shape of the bank**

```bash
node --input-type=module -e '
import { readFileSync } from "node:fs";
import { TOPICS } from "./js/topics.js";
let answers = 0, questions = 0;
for (const t of TOPICS) { const qs = JSON.parse(readFileSync(`data/questions/${t}.json`, "utf8")); questions += qs.length; const n = qs.reduce((s, q) => s + q.answers.length, 0); answers += n; console.log(t, qs.length, "questions", n, "answers", (n / qs.length).toFixed(1), "avg"); }
console.log("total", questions, answers, (answers / questions).toFixed(1));
'
```

---

### Task 16: Documentation

**Files:**
- Modify: `README.md`, `docs/superpowers/specs/2026-09-02-second-uprising-design.md`, `docs/superpowers/specs/2026-09-01-martillion-design.md`

- [ ] **Step 1: Update the README "Add questions" section**

```markdown
## Add questions

The bank lives in `data/questions/`, one file per topic. Edit the topic's file following the
schema and authoring rules in `docs/superpowers/specs/2026-09-02-second-uprising-design.md`,
then run `npm test` - the data test enforces the rules. An answer the bank does not recognise
scores zero, so cover the common answers exhaustively.

## Sprites

The pixel art lives in `js/sprites.js` as character grids. Render every sprite to PNG for a
look with `node scripts/preview-sprites.mjs`; the files land in `/tmp/martillion-sprites/`.
```

- [ ] **Step 2: Mark the specs**

In the new spec, change `Status: approved in conversation, implementing` to `Status: implemented (YYYY-MM-DD)` with the date. In the original spec, add under its status line: `Superseded in part by 2026-09-02-second-uprising-design.md (scoring, matching, bank layout, tooling).`

- [ ] **Step 3: Run the full suite one last time and commit**

```bash
npm test && npm run check
git add README.md docs/superpowers/specs/2026-09-02-second-uprising-design.md docs/superpowers/specs/2026-09-01-martillion-design.md
git commit -m "docs: Describe the widened bank and sprite tooling"
```

---

## Self-review notes

- Spec coverage: scoring (Tasks 3, 6, 8), matching (Task 4), bank layout and rules (Task 9), widening (Task 15), the Bible (Task 9), pixel art (Tasks 12 to 14), structure and boot and timer (Task 10), storage (Task 5), share (Task 7), tooling and fonts and CSP (Tasks 1, 10, 11), testing (every task), docs (Task 16).
- Between Task 3 and Task 10 the browser app is broken (main.js still uses the old tier API) while every tested module is green. This is a feature branch; the sequence is chosen so each commit's tests pass.
- Names used across tasks: `matchAnswer` returns `{ status, entry }`; round results carry `tier` (a record) and `remark`; `shareText(summary)`; `reactionFor(tierId)` returns `{ sprite, label }`; `paintSprite(doc, sprite, label)`.
