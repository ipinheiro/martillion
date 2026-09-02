# Martillion second uprising

Date: 2026-09-02
Status: implemented (2026-09-02)
Builds on: `2026-09-01-martillion-design.md` (the original design, still authoritative where this document is silent)

## Overview

Four changes, agreed with the author on 2026-09-02:

1. Answers the committee cannot verify score zero instead of 15.
2. The question bank grows to cover the answers real people give, and the typo matcher picks the closest answer instead of the first one.
3. "The Bible" is a novel over 500 pages and scores Full Marx.
4. A pixel-art Marx reacts to every tier, in the manner of Krillion's tier creatures.

Alongside these, the JavaScript is hardened: the one untested module gains structure and tests, two verified bugs are fixed, and the project gets the tooling a newcomer to JavaScript needs.

The constraints from the original design stand: a static site with no build step and no runtime dependencies, deployed to GitHub Pages from `main`, played mostly on a phone.

## Scoring

### Tiers are identified by name, not by points

Today a tier is looked up by its point value, so no two tiers can share a score and an unknown tier crashes the render. From now on the scorer owns a frozen vocabulary of tier records, each with an `id`, `name`, `points`, and `emoji`:

| id | Name | Points | Emoji | Meaning |
|---|---|---|---|---|
| `full-marx` | Full Marx | 100 | ⭐ | The rarest answers |
| `vanguard` | Vanguard | 85 | 🚩 | Genuinely obscure |
| `comrade` | Comrade | 60 | ✊ | Uncommon |
| `masses` | The Masses | 30 | 👥 | Common |
| `false-consciousness` | False Consciousness | 10 | 🐑 | The obvious answer everyone gives |
| `utopian` | Utopian | 0 | 💭 | Time ran out after one or more answers the bank does not recognise |
| `no-answer` | No answer | 0 | ⬛ | Time ran out with nothing offered |

### An unrecognised answer does not end the round

Submitting an answer the bank does not recognise is a rejection, not a score. The round screen says `"Roomba" is not a recognised answer. Try another.`, clears the box, keeps focus in it, and the clock keeps running. Empty or punctuation-only input is ignored. Only a recognised answer or the clock ends a round.

When the clock runs out, whatever is in the box gets one last try. If it is recognised, it scores as normal. Otherwise the round scores zero: Utopian when the player offered anything unverified during the round (the results list shows their last attempt), No answer when they offered nothing.

The bank keeps authoring tiers as the numbers 10, 30, 60, 85, and 100, because that is the vocabulary the authoring rules use and 4,578 answers already carry it. The scorer maps an authored number to its tier record and throws on any other value. The data test asserts against the scorer's exported list of authored values rather than its own copy.

Utopian keeps its name and emoji so that "typed nothing" and "typed something the committee cannot verify" stay distinguishable on the reveal, in the results list, and in the share row. Both score zero. The maximum score stays 700.

Reveal copy:

- Matched: `The committee recognises "Bender".` If the answer carries a remark, it follows as its own sentence.
- Utopian: `Time's up. The committee could not verify "roomba". Zero points, comrade.`
- No answer: `Time's up. Silence. The revolution needs answers.`

### Personal best

A game is a new personal best only when its total is strictly greater than the best before it. A tie is not a record, and a first game scoring zero is not a record. The check runs against the previous best, captured before the new score is folded in.

### Perfect game

The perfect score is derived from the round count and the top tier's points, exported from the game module, and used by the results screen. It is no longer a literal.

## Answer matching

Normalisation is unchanged. The match result no longer carries points; the matcher knows nothing about scoring. It returns a status and, when matched, the bank entry:

- `matched` with the entry, when an exact or fuzzy match is found.
- `unverified` with no entry, when the input is non-empty and nothing matches.
- `empty` with no entry, when the input normalises to the empty string.

Match order:

1. Exact match of the normalised input against any canonical answer or alias. Exact always beats fuzzy.
2. Closest fuzzy match. Every form of every entry is scored by Levenshtein distance. The winner is the entry with the smallest distance that is within tolerance. Ties between different entries go to the higher tier. Tolerance is computed from the candidate's normalised length as today: 0 edits under 5 characters, 1 edit from 5, 2 edits from 10.
3. Otherwise unverified or empty.

The Levenshtein and tolerance functions are exported so the data test can use them.

## Question bank

### Layout

The bank splits into one file per topic under `data/questions/`, named by topic slug (`films-tv.json` and so on). Each file is an array of question objects in the existing schema. The game fetches all six in parallel at boot. This keeps each topic small enough to author and review on its own, matches the topic vocabulary, and lets the six topics be widened independently.

The topic vocabulary moves into `js/topics.js`: the ordered list of slugs and their display labels. The data test, the game, and the UI all import it.

### Schema additions

An answer entry may carry an optional `remark`, a single sentence shown on the reveal after the recognition line. Only a handful of answers will have one.

```json
{ "answer": "The Bible", "aliases": ["holy bible"], "tier": 100, "remark": "Filed under fiction by order of the committee." }
```

### Authoring rules

Enforced by the data test unless marked otherwise:

- Every question has an id of the form `<topic>-<two digits>`, a topic from the vocabulary, a non-empty prompt, and 15 to 80 answers.
- At least 2 answers in each authored tier.
- No two forms in a question normalise to the same string.
- Every authored form, matched exactly, returns its own entry at its own tier. This runs over the whole bank.
- Remarks, when present, are non-empty strings.
- Prompts are unique across the bank.
- Not enforced, but the target: open-ended questions carry 50 to 60 answers. Closed sets, such as former Soviet republics or flightless birds, are exhaustive instead. The common tiers are covered exhaustively, because a popular answer missing from the bank now scores zero.
- Not enforced: aliases are the forms people actually type. Punctuation, case, accents, and leading articles are handled by normalisation and need no aliases.

### Widening

All 150 questions are widened, topic by topic, keeping existing tiers unless one is plainly wrong. Each topic is a separate commit that passes the full test suite.

### The Bible

On `books-stories-07`, "Name a novel over 500 pages", "The Bible" is added at tier 100 with a remark. It stays at Comrade on the banned-books question in the theory topic, where it already sits.

## Pixel art

### What appears where

- Title screen: a large pixel Marx in sunglasses beside the title, and a hammer and sickle in place of the red square before each kicker.
- Reveal screen: Marx reacts to the tier, replacing the emoji. One reaction per tier id: sunglasses and a star for Full Marx, a raised fist for Vanguard, a nod for Comrade, a level look for The Masses, a shrug for Utopian, a facepalm for False Consciousness, asleep for no answer. The sprite stamps in with a short scale animation, which `prefers-reduced-motion` disables through the existing global rule.
- Results list and share text keep the emoji: they need to be compact and to survive a paste.
- Favicon: the hammer and sickle, as an SVG data URI set at boot.

The constructivist poster stays. The sprites use the poster's palette (red, ink, cream, cream-dim, star) plus one skin tone, so pixel Marx reads as a character printed on the same paper.

### How it is built

`js/pixel.js` is a pure module. A sprite is a palette map from single characters to colour tokens, plus an array of equal-length row strings, with `.` for transparent. The module:

- converts a sprite to a list of rectangles, merging horizontal runs of the same colour, and throws on ragged rows or unknown palette characters;
- composes an overlay sprite onto a base sprite, so each reaction is the shared Marx head plus a small face overlay;
- renders a sprite to an SVG string with `shape-rendering="crispEdges"` for the favicon and for tests;
- paints a sprite into a document as an SVG element built with `createElementNS`, keeping the repo's rule that no markup string is ever injected. Colour tokens become CSS custom properties so the CSS owns the palette.

`js/sprites.js` holds the art as data: the Marx base, one overlay per tier id, the hammer and sickle, and the star. A test asserts every tier id has a reaction and every sprite is well-formed.

Every painted sprite carries `role="img"` and an `aria-label`. The tier name stays in the heading, so the sprite is decoration that screen readers can skip.

### Design pass, later on 2026-09-02

After the first implementation, the author had Claude Design draw the screens from a brief of the poster ground. Its canvas is filed at `docs/design/2026-09-02-martillion.dc.html` (open it in a browser; `support.js` beside it renders the artboards). The site now follows that canvas for everything except two choices the author kept: the system body font instead of IBM Plex Mono, and the tier emoji above.

What the canvas changed:

- The sprite set is the canvas's redraw: Marx with grey hair and beard strands, a red jacket and cream shirt, the same seven reactions, a hammer and sickle that reads as ☭ at 16 pixels, and a 16 by 16 star. The palette gains `grey` and `grey-light`. The grids are transcribed into `js/sprites.js` as a base sprite plus patches, exactly as the canvas built them.
- Phone layouts: Marx centred between the tagline and boxed stats on the title; the tier name and its points slab on one line with a rule above the detail on the reveal, under a topic and round header; the score with its stage slab, the rounds list as a grid (number, emoji, prompt and answer, points), then records, plan bar, and stacked buttons on results; a hint line under the answer form.
- Desktop layouts from the 1440 boards, behind a `64rem` breakpoint: Marx in a column of his own beside the content on the title and reveal, the rounds list beside the summary on results, and the answer box beside its Submit button.
- Details: sentence-case buttons with an ink border, a barber-pole timer fill, a paper-white answer box, sentence-case prompts and tier names, and the watermark star on every screen.

## JavaScript hardening

### Structure

`js/main.js` exports `init(document, options)` and has no side effects at import. A three-line `js/bootstrap.js`, the only script `index.html` loads, calls it. Reading `localStorage` happens inside `init` behind a try/catch, so a browser that denies storage gets in-memory state instead of a dead page.

The text decisions currently made inline in the UI move to a pure `js/messages.js`: the reveal detail, the personal-best line, the five-year-plan line, and the results-list line. Each takes plain values and returns a string.

### Boot

Boot loads all topic files with one `AbortController`, a ten-second timeout, and a single-flight guard: a retry while a load is in flight aborts the old one, and a stale response never writes state. The loaded bank is validated before use (an array of well-formed questions, enough of them, enough distinct topics for the sampler) and a failure shows the error screen with the real cause logged. The retry button disables itself while a load is in flight. Stored stats render immediately from storage; only the start button waits for the bank.

The error screen becomes generic (a heading, a detail line set by the UI, a retry button), and an `error` listener on `window` routes uncaught errors to it, so a fault mid-game is not a frozen page.

### Round loop

The timer is owned by one idempotent `stopTimer`, which `startTimer` calls first, and the interval checks it is still the current timer before acting. Time is read from `performance.now()`. Held Enter is handled at the root: a keydown with `repeat` set is ignored on the answer input and on the next button, and the 300ms guard goes away.

The game module exposes `submit(input)`, which returns a status and closes the round only on a match, and `timeout(input)`, which closes it either way. Both throw after the last round, and `sampleQuestions` throws when the bank cannot yield a full game, so the invariant lives with its owner.

### Storage

The storage module exports its key and a `defaultState()` factory, validates on save as well as load, and rejects non-finite numbers. A backend that throws falls back to the in-memory copy for the session, as today. Corrupt or invalid stored data resets to defaults and updates the in-memory copy, so a second load agrees with the first.

### Share

`shareText` takes the game summary and derives everything from it. `copyShare` takes the clipboard as an injectable argument, refuses empty text, and logs the reason when the write fails. A test pins that adversarial round input never reaches the share payload. The share button's label is captured from the HTML at wiring time and its reset timer is cleared before a new one is set.

### Tooling for a JavaScript newcomer

- `jsconfig.json` with `checkJs` and strict settings, plus `// @ts-check` and JSDoc type comments on every module. The editor then type-checks the code the way it checks Python type hints, with no build step.
- Biome (`@biomejs/biome`, the one dev dependency) for formatting and linting, with `npm run check` and `npm run format`. `npm test` stays plain `node --test`.
- A `.gitignore` for `node_modules/`, `.claude/`, and editor droppings.
- Oswald self-hosted from `css/fonts/` instead of Google Fonts, which removes the third-party request and a render delay. A Content Security Policy meta tag restricting everything to same origin.
- `index.html` gains a `noscript` message, `role="progressbar"` on the two bars, and a `maxlength` on the answer input.

## Testing

Everything pure is unit tested with `node --test`:

- matcher: tolerance boundaries at 4, 5, 9, and 10 characters; exact beats fuzzy; closest beats first; tie goes to the higher tier; punctuation-only input is empty.
- scorer: the vocabulary is frozen, every authored value maps to a tier, unknown values throw.
- game: the full round object, the perfect score, submit past the end throws, the repeat-avoidance loop end to end, sampling throws on a bank that cannot fill a game.
- storage, share, messages, topics, pixel, sprites: as described above.
- data: the authoring rules over all six topic files, and the Bible pinned at tier 100 on `books-stories-07`.
- A DOM contract test asserts every element id `main.js` looks up exists in `index.html`.

The UI is checked by hand in a browser before deploying.

## Order of work

1. Tooling and hardening of the pure modules, with the tier model change.
2. `main.js` restructure, boot, timer, and error handling.
3. Bank split into topic files, remark support, the Bible.
4. Pixel module, sprites, and their integration.
5. Bank widening, one topic at a time.
6. README and spec updates.

## Out of scope

Showing the accepted answers after a round, a pixel font, animation beyond the reveal stamp, sound, and everything the original design excluded.
