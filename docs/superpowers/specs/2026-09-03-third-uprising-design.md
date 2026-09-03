# Martillion third uprising

Date: 2026-09-03
Status: implemented (2026-09-03)
Builds on: `2026-09-02-second-uprising-design.md` and, through it, the original design. Both stay authoritative where this document is silent.

## Overview

Five changes, agreed with the author on 2026-09-03:

1. The bank gains, per question, a list of answers the committee has considered and rules out, each with a reason. Typing one gets the reason instead of a bare "not recognised".
2. The answers the bank does not know at all are kept - locally, and on a line in the share text - so the bank can be widened from what real players type rather than from guesswork.
3. A fuzzy tie between two answers goes to the commoner tier, not the rarer.
4. Question ids gain a third digit.
5. The repeat-avoidance memory is derived from the bank size instead of being a constant.

The context is the research filed at `docs/research/2026-09-03-krillion-mechanics.md`. Krillion never repeats a prompt because it has about 1,700 of them, not because of any trick. Martillion has 150, and with a memory of 40 a repeat arrives around the eighth game; with the memory derived from the bank it arrives around the twenty-second. Growing the bank is the real answer, and changes 1 and 2 are the loop that makes growing it cheap: every answer a player offers that the committee cannot place is either worth admitting, worth rejecting with a reason, or worth ignoring, and the game now records which.

The constraints stand: a static site with no build step and no runtime dependencies, deployed to GitHub Pages from `main`, played mostly on a phone.

## Rejections

### Why a separate list

The second uprising made an unrecognised answer score zero. That was right for "pigeon" on the flightless birds and wrong in feel for "chicken", which a lot of people type and which the game currently dismisses with the same line it uses for nonsense. The player cannot tell a considered rejection from an unknown, and neither can the author.

A rejection is a different kind of thing from an answer: it has a reason where an answer has a tier. It gets its own array, and the scorer never sees it. The alternative - a zero-point tier inside `answers` - would put a special case into the scorer's vocabulary, the data test's two-per-tier rule, and every reader of `remark`.

### Schema

A question may carry an optional `rejected` array. Each entry has a canonical `answer`, an `aliases` array in the same sense as an answer's, and a `reason`: one or two sentences in the committee's voice, ending in a full stop. No tier, no remark.

```json
"rejected": [
  { "answer": "Chicken", "aliases": ["hen", "cockerel", "rooster"], "reason": "Chickens fly. Badly, briefly, over a fence. Still flying." }
]
```

### Matching

Normalisation, edit distance, and tolerance are unchanged. `matchAnswer(input, answers, rejected)` takes the rejections as an optional third argument and returns a status and an entry:

- `matched` with the answer entry.
- `rejected` with the rejection entry.
- `unverified` with no entry, when the input is non-empty and nothing matches.
- `empty` with no entry.

The order is exact answer, exact rejection, fuzzy answer, fuzzy rejection. Exact beats fuzzy across both pools. This is not decoration: the bank already has "sun spider" at Vanguard, and if the committee rejected "sea spider" on the same question then a rejection matched only after the fuzzy pass would let "sea spider", typed perfectly, score 100 as a typo of "sun spider". A tie between two rejections at equal distance goes to the one listed first; rejections have no tier to prefer.

### Round loop

`submit` treats a `rejected` outcome like an `unverified` one: the round does not close, the input is remembered, and the player tries again. The outcome carries the reason so the round screen can show it:

- Unknown, as today: `"Roomba" is not a recognised answer. Try another.`
- Considered: `The committee has considered "chicken". Chickens fly. Badly, briefly, over a fence. Still flying. Try another.`

The typed text is shown, not the canonical form, as today.

The uprising remembers each failed attempt in the round as its input and its reason, or null when it was unknown. `timeout` gives whatever is in the box one last try, as today; if that fails, the box content counts as an attempt, and the last attempt of either kind is the round's `input`. `RoundResult` gains `reason`, a string when the final attempt was a considered rejection and null otherwise, and `unverified`, the list of unknown inputs offered during the round, trimmed, in order, including the final one when it was unknown. `reason` is null on a matched round. `unverified` is kept whichever way the round closes: an unknown offered before the recognised answer is exactly what the harvest is for.

Reveal copy on timeout:

- Unknown, as today: `Time's up. The committee could not verify "roomba". Zero points, comrade.`
- Considered: `Time's up. The committee has considered "chicken". Chickens fly. Badly, briefly, over a fence. Still flying. Zero points, comrade.`

Both are Utopian. The tier, the sprite, the results list, and the share emoji do not change.

### Authoring rules

Enforced by the data test:

- `rejected`, when present, is an array. Each entry has an `answer` string, an `aliases` array, and a non-empty `reason` string.
- No two forms in a question, across `answers` and `rejected`, normalise to the same string.
- Every rejected form, typed exactly, returns its own entry at status `rejected`. This runs over the whole bank and pins the match order against real data: with exact rejections checked before fuzzy answers it holds by construction, and a regression in that order would fail here first.

Not enforced, but the rule: the list is for answers real players give that the committee genuinely rules out, and for franchise names where the player should name a member instead. It is not a place to enumerate wrong answers nobody would type.

### Seed

This uprising seeds rejections only where the author's probe of the bank found answers a real player would type. Everything after comes from the harvest below.

| Question | Rejected | Reason |
|---|---|---|
| Name a bird that cannot fly | Chicken (hen, cockerel, rooster) | Chickens fly. Badly, briefly, over a fence. Still flying. |
| Name a bird that cannot fly | Turkey | Wild turkeys fly, and roost in trees to prove it. |
| Name a bird that cannot fly | Peacock (peafowl, peahen) | Peacocks fly. Ungracefully, but the committee has seen it. |
| Name a fictional robot | Transformers (transformer) | Transformers is a franchise. Name one of them. |
| Name a fictional robot | Iron Man (tony stark) | Iron Man is a man in a suit. The suit does not vote. |
| Name a breakfast food from somewhere in the world | Smoothie | A smoothie is a drink. The committee does not drink its breakfast. |
| Name a cognitive bias | Imposter syndrome (impostor syndrome) | Imposter syndrome is a feeling, not a bias. The committee sympathises. |

## Harvesting the unknown

### Storage

`SavedState` gains `unverified`, an array of `{ questionId, input }`. It records only status-`unverified` attempts; a considered rejection is already known. A repeat of the same normalised input on the same question is not added again, the newest 200 entries are kept, and `input` is stored trimmed. The game is folded into the state at its end, from the summary's rounds, at the same point the recent ids are updated.

A stored state from before this uprising has no `unverified` field. Loading treats the missing field as an empty array rather than as corruption, so nobody's best score resets. The storage key stays `martillion.v1`. Saving validates the field: an array whose every entry has two non-empty strings.

The README documents how to read it: `JSON.parse(localStorage.getItem("martillion.v1")).unverified` in the browser console.

### Share text

When any round in the game had unknown attempts, the share gains a third line:

```
Martillion ✊ 400 - Revolution brewing
⭐🚩✊🐑💭✊🚩
The committee could not verify: chicken, smoothie
```

The attempts are deduplicated across the game, in the order first offered, and each is rendered through the matcher's `normalize`, so the line holds lowercase letters, digits, and single spaces and nothing else. That is the sanitisation: player input reaches the share payload now, by design, and it cannot carry a line break, a bidi override, or punctuation that would let it forge a score line. The share test pins that a hostile input leaves the first two lines identical to a benign game's and confines itself to the committee line in that character set.

## Hygiene

### Tie-break

The bank has 257 pairs of different answers inside one question that sit within fuzzy tolerance of each other: "tiger" (10) and "liger" (60), "red kangaroo" (10) and "rat kangaroo" (100), "fir tree" (30) and "fig tree" (60). Exact matches still win, so the pairs only bite on a typo equidistant from both, and today that typo is awarded the rarer answer. The density rises with every answer added. From now on an equidistant tie goes to the lower tier. The matcher test that pins "Rhune" to Rhone flips to Rhine.

### Ids

Ids become `<topic>-<three digits>`. All 150 questions renumber (`animals-nature-01` becomes `animals-nature-001`), the data test's pattern becomes `\d{3}`, and the Bible test looks for `books-stories-007`. Two digits capped a topic at 99 and the bank at 594; three lifts that past the roughly 700 questions that 100 repeat-free games need. Stored recent ids from before this uprising match nothing, so the first game after deploying samples from the whole bank once. That is invisible.

### Recent memory

`RECENT_LIMIT` goes. The game module exports `recentLimit(bankSize)`, which is the bank size minus the round count and never below zero, and `updateRecent` takes the limit as its third argument. The UI passes `recentLimit(bank.length)` when it folds a game into state. The memory then tracks the bank as it grows, and cannot break the data test if a question is removed, which the constant could. The data test's "enough questions to avoid repeats" assertion goes with it; `validateBank` already requires a full game's worth.

## Testing

Everything pure is unit tested with `node --test`, as before:

- matcher: the four-stage order; an exact rejection beats a fuzzy answer; a fuzzy rejection loses to a fuzzy answer at the same distance; a tie between rejections goes to the first listed; the flipped tie between answers; the third argument defaults to empty.
- game: `submit` returns `rejected` with the reason and does not close the round; `timeout` after a considered rejection carries the reason and the input; `timeout` after unknowns lists them all on the result including a final unknown in the box; a matched round after an unknown attempt has a null reason and lists the attempt; `recentLimit` at zero, at the round count, and above it.
- storage: a v1 state without the field loads with an empty array and the same scores; dedupe on normalised input; the newest 200 survive; save rejects an entry missing either string.
- messages: the considered line for the round screen and for the reveal.
- share: the third line appears only when something was unknown, deduplicated in order; the hostile-input test as described above.
- data: the three rejection rules across the bank; the seed rejections resolve to `rejected` at their own entries; the Bible at `books-stories-007`.
- main: the feedback line shows the reason on a considered rejection and the unknown line otherwise.

The UI is checked by hand in a browser before deploying.

## Order of work

1. Ids to three digits.
2. Recent memory derived from the bank.
3. Tie-break to the commoner tier.
4. Matcher: the rejected pool and the four-stage order.
5. Game: the `rejected` outcome, attempts with reasons, `reason` and `unverified` on the result.
6. Messages and the round screen.
7. Storage: `unverified` with the migration.
8. Share: the committee line.
9. Data test rules and the seed rejections.
10. README and this document's status.

## Out of scope

Re-tiering Full Marx to one or two gems per question in Krillion's manner - a content decision over 1,653 answers that waits for the research on familiarity signals. A tier of its own for rejections, with a Marx reaction. A screen for the harvested list. Everything the earlier designs excluded.
