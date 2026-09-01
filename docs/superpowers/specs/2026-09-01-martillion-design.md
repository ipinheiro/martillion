# Martillion design

Date: 2026-09-01
Status: awaiting review

## Overview

Martillion is an unlimited-play trivia game in the style of [Krillion](https://krillion.io), built as a personal gift for a niece who enjoys a challenge and likes communism. Krillion locks players to one round a day because it scores answers against that day's crowd; Martillion replaces the crowd with a curated answer bank so she can play whenever she wants.

The game is a static site - plain HTML, CSS, and JavaScript with no build step - deployed on GitHub Pages from the `ipinheiro/martillion` repo.

## Gameplay

One game session is an **uprising**: seven prompts, 30 seconds each. Prompts are category requests in the Krillion mould, such as "Name a fictional robot" or "Name a cognitive bias". The player types a free-text answer and submits with enter; the timer submits whatever is in the box when it runs out.

After each answer the game reveals the tier it landed in and its points, then moves to the next prompt. After round seven, a results screen shows the total score, the stage of history it reached, per-round tiers, personal best, five-year plan progress, and a share button.

Each uprising samples 7 questions from the bank: at most 2 per topic, excluding the 40 most recently seen question ids (tracked in localStorage). When too few unseen questions remain, the exclusion list resets.

## Scoring

Rarity is editorial: each answer in the bank carries a tier reflecting how common that answer is among the general public. Rare answers score high.

| Tier | Points | Meaning |
|---|---|---|
| False Consciousness | 10 | The obvious answer everyone gives |
| The Masses | 30 | Common |
| Comrade | 60 | Uncommon |
| Vanguard | 85 | Genuinely obscure |
| Full Marx | 100 | The rarest tier |
| Utopian | 15 | Plausible but not in the answer list, so unverifiable |
| No answer | 0 | Empty submission or timeout |

Maximum score is 700.

## Stages of history

The total score maps to a stage, shown with deadpan flavour text on the results screen.

| Score | Stage |
|---|---|
| 0 - 199 | Feudalism |
| 200 - 349 | Capitalism |
| 350 - 499 | Revolution brewing |
| 500 - 649 | Socialism |
| 650 - 700 | Full communism |

## Lifetime progression

Two numbers persist across games:

- **Personal best** - the highest single-uprising score.
- **Cumulative score** - every point ever earned. Each 2,000 points completes a five-year plan (ahead of schedule, naturally), shown as a running count with progress toward the next.

## Answer matching

Matching lives in a pure module with no DOM dependencies.

Normalisation, applied to both the typed answer and every bank entry: lowercase, Unicode NFD with diacritics stripped, punctuation stripped, whitespace collapsed, leading article (the/a/an) removed.

Match order:

1. Exact match against a question's canonical answers and aliases.
2. Edit-distance match: Levenshtein distance of at most 1 for normalised strings of 5 or more characters, at most 2 for 10 or more. Strings under 5 characters must match exactly.
3. No match, non-empty input: **Utopian**, 15 points.
4. Empty input, input that normalises to empty (punctuation only), or timeout: 0 points.

## Question bank

`data/questions.json` holds roughly 120 questions, about 20 per topic:

- animals & nature
- films & TV
- books & stories
- the world
- psychology
- theory & revolution

Schema per question:

```json
{
  "id": "robots-01",
  "topic": "films-tv",
  "prompt": "Name a fictional robot",
  "answers": [
    { "answer": "WALL-E", "aliases": ["wall e", "walle"], "tier": 10 },
    { "answer": "Marvin", "aliases": ["marvin the paranoid android"], "tier": 85 }
  ]
}
```

Authoring rules, enforced by a validation test:

- every question has at least 2 answers in each of the five authored tiers (10, 30, 60, 85, 100)
- 15 to 40 answers per question
- no two answers in a question normalise to the same string
- tiers pitched at a sharp 21-year-old: full Krillion difficulty

## Architecture

```
martillion/
  index.html
  css/style.css
  js/main.js        screen state machine and DOM wiring
  js/game.js        question sampling and round sequencing
  js/matcher.js     pure: normalisation and matching
  js/scorer.js      pure: tiers, stages, five-year plan maths
  js/storage.js     localStorage wrapper with in-memory fallback
  js/share.js       share-text builder and clipboard copy
  data/questions.json
  test/matcher.test.js
  test/scorer.test.js
  test/questions.test.js
  docs/superpowers/specs/
  README.md
```

`main.js` owns the screens (title, round, reveal, results) and calls into `game.js`, which uses `matcher.js` and `scorer.js`. `storage.js` is read once at boot and written after each game. Question data loads by `fetch` at startup.

## Visual design

Constructivist propaganda poster: deep red, black, and aged cream; bold condensed type (Oswald from Google Fonts for headings, with a condensed system-sans fallback stack); strong diagonal accents; a red star for a perfect round. Mobile-first and responsive - she will mostly play on her phone.

## Share format

One line plus an emoji row, copied to the clipboard:

```
Martillion ✊ 630 - Socialism achieved
⭐⭐⭐⭐🚩🚩✊
```

Emoji per tier: ⭐ Full Marx, 🚩 Vanguard, ✊ Comrade, 👥 The Masses, 🐑 False Consciousness, 💭 Utopian, ⬛ no answer.

## Persistence

A single localStorage key, `martillion.v1`, holds `{ bestScore, totalPoints, gamesPlayed, recentQuestionIds }`. Reads and writes are wrapped in try/catch; failures fall back to in-memory state for the session, and corrupt data resets to defaults.

## Error handling

- If `questions.json` fails to load, show a friendly error screen with a retry button.
- Storage failures degrade silently to in-memory state.
- The game makes no other network calls.

## Testing

- `node --test` unit tests over `matcher.js` and `scorer.js` - both are pure ES modules, so no tooling beyond Node is needed.
- A data validation test over `questions.json` enforcing the authoring rules above.
- UI is checked manually in a browser before deploying.

## Deployment

- Repo: `ipinheiro/martillion` on the personal GitHub account.
- GitHub Pages serves the repo root from `main`; pushing to `main` deploys.
- Commits use the personal noreply identity, never the work email.

## Out of scope

Accounts, servers, analytics, a daily mode, multiplayer, sound, and difficulty settings. The bank can grow later by editing `questions.json`; the validation test keeps additions honest.
