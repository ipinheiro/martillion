# How Krillion works

Date: 2026-09-03
Status: research notes, primary sources
Scope: how krillion.io sources prompts and scores answers by rarity, and what Martillion should take from it

## Summary

Krillion is a Next.js app on Vercel. The question bank is **not** shipped to the browser. The client gets seven prompt strings a day and nothing else; every answer is POSTed to the server, matched there, and comes back with a tier. The full answer sheet is released only after you finish the day, through a separate endpoint.

Rarity is **not** measured from what players type. It is authored ahead of time - partly computed from a word-frequency corpus, partly LLM-assisted, partly by hand. The developer says so directly ([krillion.io/faq](https://krillion.io/faq)), and the privacy policy confirms the data does not exist to do otherwise: daily answers are "checked and discarded, not stored" ([krillion.io/privacy](https://krillion.io/privacy)).

The "they never repeat the questions" impression is not a trick. It is a large pre-authored bank consumed at seven prompts a day, plus separate pools for the endless modes. There is no procedural generation and no seeded shuffle of a small set.

Everything below was fetched on 2026-09-03. Where I could not verify something I say so.

## How the site is built

`https://krillion.io/` served 13,605 bytes of HTML, `server: Vercel`, `x-nextjs-prerender: 1`. The whole client bundle across the ten chunks the homepage loads is about 640 KB, which on its own rules out a client-side bank of any size.

The `<meta name="description">` states the format: "Seven prompts a day, same for everyone. Rare answers sink you deeper. Obvious ones barely count. One in a krillion." ([krillion.io](https://krillion.io/))

Endpoints referenced in the bundles:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/today` | GET | The day's seven prompts, no answers |
| `/api/submit` | POST | Check one answer, return its tier |
| `/api/today/complete` | POST | Record the finished game, return percentile |
| `/api/reveal?date=` | GET | The full answer sheet, after completion |
| `/api/archive/{day}` and `/api/archive/{day}/reveal` | GET | Past dailies, paid |
| `/api/packs/{pack}/{n}` and `.../reveal` | GET | Themed pack chapters |
| `/api/unlimited/{n}` | GET | Endless mode, paid |
| `/api/suggest` | POST | Player-submitted prompt ideas |
| `/api/announcements/current` | GET | In-game notices, `null` when I checked |

Verified by grepping the downloaded chunks `2917o8chwly0y.js`, `39livh8qvga0b.js`, `3xzibff6j2f0a.js` and `03uwgz2l_wz61.js` from `https://krillion.io/_next/static/chunks/`.

## The question bank is server-side

`GET https://krillion.io/api/today` returned 518 bytes:

```json
{"date":"2026-09-03","dayNumber":50,"resetsAt":"2026-09-04T04:00:00.000Z",
 "prompts":[{"id":"p1","text":"Name a capital city in the Americas"}, ...]}
```

Seven prompt strings, an id each, a day number and a reset time. **No answers, no counts, no hints.** The client cannot score anything on its own.

Scoring happens in `/api/submit`. From `2917o8chwly0y.js`:

```js
let s = await fetch("/api/submit", {
  method: "POST",
  headers: {"Content-Type":"application/json"},
  body: JSON.stringify({date: e.date, promptId: B.id, answer: t, playerId: L.current})
});
...
if (l.accepted && l.tier) Z({
  promptId: B.id, promptText: B.text, rawAnswer: t,
  answer: l.answer ?? t, tier: l.tier,
  score: l.score ?? n.TIERS[l.tier].score, quip: l.quip
});
```

So the response is `{accepted, answer, tier, score, quip}`. Note `answer: l.answer ?? t` - the server returns a canonical spelling distinct from what you typed, which means alias and typo resolution is server-side. **Aliases never reach the client**, not even in the post-game reveal. I did not POST to `/api/submit`, so I have not seen a live response body; the shape above is read off the code that consumes it.

`resetsAt` was `2026-09-04T04:00:00.000Z`, so the day flips at 04:00 UTC. `dayNumber` 50 on 2026-09-03 puts day 1 at **2026-07-16**.

## The reveal: real answer-sheet data

`GET https://krillion.io/api/reveal?date=2026-09-03` returned **116,528 bytes** and HTTP 200. The same call with `date=2026-09-02` returned HTTP 403 and `{"error":"That answer sheet is not publicly available."}` - past sheets are gated behind the paid archive.

Shape, exactly:

```json
{"date":"2026-09-03","prompts":[{"id":"p1","text":"Name a capital city in the Americas",
  "answers":[
    {"answer":"Belmopan","tier":"krillion","score":100,
     "quip":"Belize built it inland after a hurricane flattened Belize City."},
    {"answer":"Basseterre","tier":"deepcut","score":85}, ...]}]}
```

Four fields per answer, and `quip` is optional. **There is no percentage, no player count, no frequency number anywhere in the payload.** The rarity signal is entirely the discrete `tier` string.

Today's seven prompts held **1,923 answers** between them:

| Prompt | Answers | plankton | schooler | rare | deepcut | krillion |
|---|---|---|---|---|---|---|
| Name a capital city in the Americas | 59 | 4 | 9 | 15 | 30 | 1 |
| Name an animal known for camouflage | 166 | 2 | 12 | 31 | 120 | 1 |
| Name a country that fought in World War II | 77 | 8 | 17 | 11 | 39 | 2 |
| Name a language that is an official language of a European country | 149 | 5 | 15 | 25 | 103 | 1 |
| Name an astronaut or cosmonaut | 982 | 2 | 11 | 63 | 905 | 1 |
| Name a block in Minecraft | 428 | 12 | 42 | 135 | 237 | 2 |
| Name a country smaller than Belgium (by area) | 62 | 3 | 7 | 13 | 38 | 1 |

Quip coverage ranges from 0% ("Name a block in Minecraft", 4 of 428) to 46% ("Name a country that fought in World War II", 36 of 77). Quips are clearly written where they earn their place, not generated for every row.

## The tier table

From the shared chunk `3xzibff6j2f0a.js`, module 86062, verbatim:

| id | Name | Score | Emoji | Blurb | depth |
|---|---|---|---|---|---|
| `plankton` | Plankton | 10 | 🫧 | "The answer everyone blurts out." | 0.08 |
| `tooclever` | Too Clever | 15 | 🤡 | "A famously "obscure" pick. Everyone reaches for it." | 0.18 |
| `schooler` | Schooler | 30 | 🐟 | "Solid — swims with the school." | 0.36 |
| `rare` | Rare | 60 | 🦑 | "Genuinely uncommon. Nice pull." | 0.6 |
| `deepcut` | Deep Cut | 85 | 🏮 | "True obscurity. Few go this deep." | 0.82 |
| `krillion` | One in a Krillion | 100 | 🌟 | "The designated gem. Trench floor." | 0.97 |

Also exported from that module: `ROUNDS_PER_DAY = 7`, `MAX_DAY_SCORE = 700`, `MISS_EMOJI = "⬛"`, `PREVIEW_MS = 3000`, `ANSWER_MS = 25000`. So three seconds to read the prompt, twenty-five to answer.

`depth` is a 0-1 position used to place the diving animation, not a probability. It is a presentation value.

End-of-game bands, same module:

| Score | Band | Verdict |
|---|---|---|
| 0-150 | Plankton | "Plankton. Plenty of ocean left down there." |
| 151-250 | Schooler | "Schooler. Swimming with the school." |
| 251-350 | Rare | "Rare. Below the thermocline. Nice." |
| 351-449 | Deep cut | "Deep cut. Seriously deep dive." |
| 450+ | Krillion | "One in a krillion. Trench dweller. Absurd." |

The share string is built as `Krillion #${day} 🦐 ${score}  ${emoji per round}` (`buildShareText` in `2917o8chwly0y.js`).

## How rarity is actually determined

This is answered directly by the developer on [krillion.io/faq](https://krillion.io/faq). Quoting in full:

> **how are answer sets curated?**
> By aggregating datasets (dictionaries, wiki pages, encyclopedias, whatever sources the question calls for), then merging and cleaning the result into one answer set.

> **how is rarity determined?**
> Depends on the question. Some prompts can be scored entirely mechanically against a familiarity database of how often a word or name actually turns up in what people read and write. Others can't be reduced to a number like that, and those get a combination of LLM assistance and a manual pass.

> **why is the krillion sometimes less rare than some deep cuts?**
> Because the Krillion isn't chosen on rarity alone. Past a certain depth, rarity gets hard to disambiguate, so the gem is also picked for fun factor: the answer that's most satisfying to land on. That might sound like it defeats the point, but some of the answers collected are so obscure that maybe one of you would ever type them. The gem should be something at least a few of you actually get.

> **what is "too clever"?**
> The go-to "obscure" pick that isn't actually that obscure.

> **why was my answer not listed?**
> Because I didn't find it, sorry. Sometimes I miss a source, which is usually why a fair answer is missing. I'm trying to make sure this happens as rarely as possible.

> **is krillion developed by a team?**
> No, just me.

Two things follow. First, rarity is **corpus frequency, not player frequency** - "how often a word or name actually turns up in what people read and write". Second, the top tier is deliberately *not* the rarest answer; it is picked for landability.

The privacy policy closes off the alternative reading ([krillion.io/privacy](https://krillion.io/privacy), effective August 29, 2026):

> Every answer you type is sent to our server to be checked - that's how scoring works. **Daily answers are checked and discarded, not stored.** One exception: answers to the free practice dive are recorded (with the random player id) so we can tune how answers are scored.

> When you finish a dive, we store the game, your score, and the random player id. That's what powers the "better than X% of divers" stat - it's a scoreboard of anonymous ids, not people.

So the only player-derived number in the whole game is the **score percentile**, not any per-answer rarity. `/api/today/complete` returns `{betterThan, dist}`, and the results screen renders `dist` as a smoothed histogram with the aria-label `Score distribution of today's players; your score beats ${r}% of them` (`2917o8chwly0y.js`). Player answers feed curation only, offline, and only from the free practice mode.

I could not verify which route counts as the "free practice dive". The Lexicon pack is the one with `payUrl: null` and is labelled "FREE FOR NOW" on [krillion.io/packs](https://krillion.io/packs), which makes it the likely candidate, but the policy does not name it.

### Evidence the mechanical path is a quantile cut - INFERENCE

`GET https://krillion.io/api/packs/lexicon/1/reveal` and `.../20/reveal` (the Lexicon pack is currently free) returned answer sets with a striking pattern:

```
242 answers  plankton=60 schooler=60 rare=60 deepcut=60 krillion=2   "Name an English word containing 'age'"
242 answers  plankton=60 schooler=60 rare=60 deepcut=60 krillion=2   "Name an adverb that doesn't end in -ly"
242 answers  plankton=60 schooler=60 rare=60 deepcut=60 krillion=2   "Name an English word with three or more T's"
103 answers  plankton=16 schooler=35 rare=28 deepcut=22 krillion=2   "Name an English word containing 'ough'"
 36 answers  plankton=6  schooler=11 rare=10 deepcut=7  krillion=2   "Name an English word ending in '-proof'"
```

Across all 14 lexicon rounds I pulled, **no tier ever exceeded 60**. Across the 7 daily rounds, one tier held 905. My inference: the pack pipeline ranks a candidate list by familiarity score, cuts it into the four ordinary tiers, and caps each tier at 60 entries; where the underlying list is short the cap never bites and the bands come out uneven. The daily pipeline does not apply that cap. **This is inferred from the counts, not stated anywhere.** I could not verify the cap value or the bucketing rule from any first-party statement.

`tooclever` appeared exactly once in everything I fetched, and the answer was **"Antidisestablishmentarianism"**, tagged on both "Name an English word containing 'anti'" and "Name an English word ending in '-ism'". Zero `tooclever` answers in today's daily. That is consistent with it being a hand-placed trap on specific prompts rather than a computed band - **inference**, though the FAQ definition ("the go-to 'obscure' pick") points the same way.

### What the tiers actually encode

The tier assignments make the intent legible. Real examples from today's sheet:

- "Name an animal known for camouflage": plankton is **Chameleon, Octopus** - only two. Krillion is **Satanic leaf-tailed gecko**.
- "Name a country that fought in World War II": plankton is the eight you would shout - China, France, Germany, Italy, Japan, Soviet Union, United Kingdom, United States. Krillion is **Cuba** and **Mongolia**, both true and both surprising.
- "Name an astronaut or cosmonaut": plankton is **Buzz Aldrin, Neil Armstrong**, and only those two. Schooler includes **Jeff Bezos** and **Katy Perry**, which is a joke and also an accurate read of what people will type. Krillion is **Arnaldo Tamayo Mendez**.
- "Name a language that is an official language of a European country": plankton is English, French, German, Italian, Spanish. Krillion is **Maltese Sign Language**.
- "Name a country smaller than Belgium (by area)": plankton is Monaco, Singapore, Vatican City. Krillion is **Lesotho** - not obscure, just not what the prompt makes you reach for.

The cheap tier is tiny and precisely aimed at the reflex answer. The top tier is one or two answers that are *findable but not reflexive*. Everything in between is bulk.

## The prompt bank and why it feels inexhaustible

Observed on 2026-09-03:

| Pool | Size | Prompts | Source |
|---|---|---|---|
| Daily | `dayNumber: 50`, archive `lastDay: 49` | 350 | `/api/today`, `/api/unlimited/1` |
| Unlimited (paid) | `lastGame: 74` games of 7 | 518 | `/api/unlimited/1` |
| Packs: Lexicon, Movies, Sports, Geography | 30 chapters each, 7 rounds | 840 | `/api/packs/lexicon/1`, [krillion.io/packs](https://krillion.io/packs) |

That is roughly **1,700 distinct prompts already authored**, against a consumption rate of seven a day. I could not verify whether the unlimited and pack pools reuse prompts that have aired as dailies - the archive is paywalled (`/api/archive/1` returned HTTP 402), so I could not diff them. The unlimited game 1 prompts I did see ("Name a noodle dish", "Name a species of great ape", "Name a character from Stranger Things") do not overlap today's daily.

There is no seeded shuffle and no generation step visible anywhere. `/api/today` accepts a `preview` parameter (`` `/api/today?preview=${encodeURIComponent(e)}` `` in `2917o8chwly0y.js`), which is what you would build to look at a day you have already scheduled. Pack payloads carry a `version` field (`"version":"d009e7aaaf179abefbd17f77"`), so answer sets are content-hashed and revised over time. **The mechanism is editorial supply, not clever runtime maths.**

`/api/suggest` accepts `{playerId, text}` from an in-game suggestion box, so players feed the prompt pipeline too.

## What makes a good prompt in this format

From the 21 prompts I could observe in full (7 daily, 14 lexicon), plus the pack listings:

**Answer-set size.** 36 to 982, with most between 60 and 250. The two extremes both work but differently: 36 answers ("-proof") makes almost everything scoreable and the tiers do the work; 982 ("astronaut or cosmonaut") makes the deep tail nearly unreachable and the game becomes "can you get past Armstrong".

**The good ones are closed-but-wide.** They have a real membership test - a dictionary, a list of countries, a wiki category - so "is this valid?" has an answer, but membership runs to dozens or hundreds so the player has somewhere to go. "Name a capital city in the Americas" (59), "Name a part of a newspaper" (79), "Name a country that fought in World War II" (77).

**Finite canonical sets are used, but always widened.** Krillion does not ask "name one of the Beatles". It asks "Name a capital city in the Americas" and then counts Brades, King Edward Point and The Bottom - dependencies and territories that widen a set most people think of as closed. The pleasure is discovering the set was bigger than you assumed.

**Open folk categories get a constraint bolted on.** Not "name an animal" but "Name an animal known for camouflage". Not "name a word" but "Name an English word containing 'ough'". The constraint is what makes a rarity gradient exist at all.

**A comparative or negative frame creates instant depth.** "Name a country smaller than Belgium (by area)" is the sharpest prompt in today's set: 62 answers, three obvious ones, and Lesotho as the gem. The frame does the tiering for you.

**Structural word prompts are cheap to author and score.** Two thirds of the Lexicon pack is "contains X", "ends in X", "starts with X", "silent letter", "irregular plural". These are exactly the prompts the FAQ says can be "scored entirely mechanically" - a dictionary filter plus a frequency table gives you the whole answer set and its tiers with no human judgement.

**Recognisable prompts I recorded** (a sample, all first-party):

Daily 2026-09-03: capital city in the Americas; animal known for camouflage; country that fought in World War II; language that is an official language of a European country; astronaut or cosmonaut; block in Minecraft; country smaller than Belgium.
Unlimited #1: noodle dish; species of great ape; character from Stranger Things; hot drink; variety of wine; interjection or exclamation; country with a coastline.
Lexicon: word containing "age" / "ough" / "anti" / "geo" / "terra"; word ending in "-ism" / "-ette" / "-proof"; filler word people say while thinking; idiom or saying that mentions food; part of a newspaper; archaic English word; compound word starting with "land" / "foot" / "down"; compound word ending in "work"; word with a silent T; word starting with "dw"; word that starts with a silent K; adverb that doesn't end in -ly; playwright; word with an irregular plural; word with three or more T's; word with no repeated letters (8+ letters); word that spells a different word backwards; word whose letters are in reverse alphabetical order (4+ letters); word that starts and ends with the same letter (5+ letters).

## First-party statements: what exists and what does not

The only first-party sources I found are the site itself: the FAQ, the privacy policy, the packs page, and the API payloads. All are quoted above.

I could **not** find any developer post on X, Bluesky, Reddit, Hacker News, Product Hunt, GitHub or a personal blog. A web search surfaced only third-party aggregators and answer-mirror sites (krillion.org, krillion.me, listdle.com, xinquji.com), none of which are primary and none of which I have relied on. The bundles contain no social links at all - the only contact is `mailto:support@krillion.io`, given in the FAQ under "are you going to make an app?". There is no `robots.txt` and no `sitemap.xml`. The developer appears to be deliberately anonymous, and the FAQ's "No, just me" is the whole public account of who makes it.

So: **I could not verify the developer's identity, and I could not find any statement about the mechanics beyond the FAQ and privacy pages.** If those pages change, this document is out of date.

Where my training data disagreed with what I fetched, I have gone with the fetch. One search result claimed players get "about 20 seconds per prompt"; the shipped bundle says `ANSWER_MS = 25e3`, so 25 seconds plus a 3-second preview.

## What this means for Martillion

Martillion's bank today: 150 questions across six topic files, 8,957 answers, median 61 answers per question, tiers `{10: 629, 30: 1957, 60: 2455, 85: 2263, 100: 1653}` (measured from `data/questions/*.json`).

Against Krillion, four things stand out.

**1. Cut the top tier down to one or two answers per question.** This is the biggest single divergence. Martillion has 1,653 answers at tier 100 - about eleven Full Marx answers per question. Krillion ships **exactly one or two** krillion answers per prompt, without exception across all 21 prompts I sampled. "One in a krillion" is a designated gem, not a band. Full Marx currently costs nothing to hit, so it means nothing when you hit it. Demote the bulk of tier 100 to 85 and hand-pick one Full Marx answer per question. The FAQ's rule for picking it is worth copying literally: not the rarest answer, but the most *satisfying to land on* - findable, defensible, and something a few players will actually reach.

**2. Invert the tier pyramid.** Krillion's shape per prompt is roughly: 2-12 plankton, 7-42 schooler, 11-135 rare, a long deepcut tail, 1-2 krillion. Martillion's cheapest tier holds 629 answers across 150 questions - about 4 per question, which is close - but the mass sits at 60 and 85 rather than in a genuine tail. The felt effect of a deep tail is that most of what you *could* have said is invisible to you, which is what makes the reveal worth reading. Widening the 85 tier is cheaper than widening the middle, and it is where the discovery lives.

**3. Rarity should mean "how reflexively would someone say this", not "how obscure is this really".** Krillion's assignments are unambiguous on this: Chameleon and Octopus are the only two plankton answers for camouflage; Lesotho is a krillion for "smaller than Belgium" despite being a well-known country. Jeff Bezos and Katy Perry sit in the middle of the astronaut set because that is honestly where players will reach. For Martillion this is the more tractable target too - you are judging what a person types under a 25-second clock, not building a frequency corpus. When authoring a tier, ask "how many people in a room of ten would say this first?" and let the answer set the tier.

**4. Steal `tooclever`.** Martillion's second uprising spec removed the 15-point tier. Krillion kept it for exactly one job: the smug pick. "Antidisestablishmentarianism" was the only `tooclever` answer in everything I pulled, and it is tagged on the two prompts where someone would smugly reach for it. A 15-point "Armchair Radical" tier, applied sparingly to the two or three answers per question that a person offers *because they think it is obscure*, would land well against the Marx theming and costs almost nothing to author.

Two things **not** to copy:

- **Do not build server-side answer checking.** Martillion is a static site on GitHub Pages with no build step, and that constraint is right for it. Krillion needs a server because a shipped bank is a spoiler and it sells archive access. Martillion's bank being readable is a feature, not a leak.
- **Do not chase player-frequency scoring.** Krillion does not do it either - daily answers are discarded. The only player statistic in the whole game is the score percentile, which needs a server and a population. Authored tiers are the real mechanism, and Martillion already has them.

Two smaller things worth taking:

- **Quips are an under-used lever here.** Krillion carries them on 0-46% of answers per prompt, written where the fact is genuinely good ("Belize built it inland after a hurricane flattened Belize City."). Martillion already has the `remark` field the second uprising spec describes, but it is populated on **1 of 8,957 answers**. Krillion's practice suggests the right target is not full coverage but a deliberate handful per question - the Full Marx answer and a few deep cuts where the fact rewards the reveal.
- **The prompt shape matters more than the bank size.** The strongest prompts in the sample bolt a constraint onto an open category ("an animal known for **camouflage**") or use a comparative frame ("a country **smaller than Belgium**"). Both create a rarity gradient for free. Martillion's median of 61 answers per question already sits inside Krillion's healthy range, so the work is in prompt framing, not volume.

On repetition: Krillion's answer to "never the same question twice" is 1,700 authored prompts and seven a day. Martillion has 150 questions and plays seven rounds a session, so it exhausts far faster. If the feeling of an inexhaustible bank matters, the lever is more prompts, not smarter selection - and the Lexicon pack shows the cheap way to get them, since structural word prompts ("contains 'age'", "ends in '-ism'") can be generated and tiered from a dictionary plus a frequency list with very little hand authoring.
