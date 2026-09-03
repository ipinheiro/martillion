# Question bank sources: prompts, answer sets, and objective tiering

Date: 2026-09-03
Status: research, no code written
Scope: sources that could (a) generate more "Name a ___" prompts, (b) enumerate near-exhaustive answer sets, and (c) supply an objective popularity signal to set `tier` automatically.

Every endpoint below marked **verified** was called from this machine on 2026-09-03 and the numbers quoted are the ones that came back. Anything I could not confirm from a primary source is marked **unverified**.

## The shape of the problem

The bank is 150 questions across six topic files, 8,957 answer entries, tiers `10 / 30 / 60 / 85 / 100` where **higher scores mean rarer** ([`docs/superpowers/specs/2026-09-02-second-uprising-design.md`](../superpowers/specs/2026-09-02-second-uprising-design.md)). Anything not in the bank scores zero, so recall matters more than precision: a missing common answer is a bug, a missing obscure answer is a shrug.

Measured across the current bank:

| tier | answers | share |
|---|---|---|
| 10 (False Consciousness) | 629 | 7.0% |
| 30 (The Masses) | 1,957 | 21.8% |
| 60 (Comrade) | 2,455 | 27.4% |
| 85 (Vanguard) | 2,263 | 25.3% |
| 100 (Full Marx) | 1,653 | 18.5% |

That distribution turns out to matter later, because it can be checked against real survey data (see [ProtoQA](#protoqa-family-feud-with-answer-counts---the-closest-real-analogue)).

**The central finding of this research:** every generic popularity source measures `P(entity)` - how famous a thing is in general. The game needs `P(entity named | prompt)` - how likely a player is to say it *for this question*. Those two come apart badly, and the gap is where auto-tiering fails. Kazakhstan is a much more famous country than Mongolia, but Mongolia is a far more obvious landlocked country. Numbers for this below.

---

## Comparison table

| Source | What it contains | Licence | Rate limit | Verdict |
|---|---|---|---|---|
| [Wikidata SPARQL](#wikidata-sparql-the-backbone-for-enumeration) | Structured class membership, 1,142 dog breeds, 40 landlocked countries, sitelink counts | CC0 (public domain) | 60s query deadline, 5 parallel/IP, 60s CPU per 60s, 30 errors/min | **Strong.** Best precision for enumeration; sitelinks are a free second signal. Incomplete for some classes (84% recall on landlocked countries) |
| [Wikipedia Category API](#wikipedia-categories-best-raw-recall) | `Category:Landlocked countries` = 51 members | CC BY-SA 4.0 | 10 req/min anonymous by IP | **Strong.** Best recall (98% of the bank), noise is trivially filtered |
| [WMF clickstream dumps](#wmf-clickstream-the-signal-nobody-uses) | Monthly article→article click counts, enwiki 493 MB gzipped | CC0 | Bulk file download, no API | **Strong and underused.** 100% recall on landlocked, 80% on cognitive biases, plus a category-conditioned popularity number |
| [Wikipedia pageviews API](#wikipedia-pageviews-a-weaker-signal-than-it-looks) | Per-article views, monthly/daily, from 2015-07 | CC0 (data), CORS `*` | 10 req/min anonymous; batch 50 titles via Action API | **Weak alone** (ρ = -0.305). Useful only inside a blend |
| [Google Books Ngrams](#google-books-ngrams-the-best-single-signal-for-proper-nouns) | Relative word frequency in books to 2019 | CC BY 3.0 Unported | Undocumented; JSON endpoint unofficial | **Best single signal** (ρ = -0.564). Blind to anything renamed or famous after 2019 |
| [wordfreq / SUBTLEX](#wordfreq-and-subtlex-good-for-common-nouns-bad-for-proper-nouns) | Zipf frequencies, 42 languages, blends SUBTLEX + subtitles + Wikipedia | Apache-2.0 (package) | Offline, no limit | **Good for common nouns only.** Breaks on multi-word proper nouns and polysemy |
| [ProtoQA](#protoqa-family-feud-with-answer-counts---the-closest-real-analogue) | Family Feud questions with per-answer respondent counts | CC BY 4.0 | GitHub raw | **Strong as calibration, not as content.** Gives the real shape of answer-frequency distributions |
| [Open Trivia DB](#open-trivia-db-and-the-trivia-api-honestly-a-poor-fit) | 21,612 questions, one right answer + 3 wrong | CC BY-SA 4.0 | 1 request per 5s per IP | **Poor fit.** Wrong format; usable only as prompt inspiration |
| [The Trivia API](#open-trivia-db-and-the-trivia-api-honestly-a-poor-fit) | ~14,400 questions, has `difficulty` and `isNiche` | CC BY-NC 4.0 | 20 requests per 5s (observed header) | **Poor fit and NC-licensed.** Avoid |
| [ConceptNet](#conceptnet-and-wordnet-for-folk-categories) | `/r/IsA` edges for folk categories | CC BY-SA 4.0 | API returned **502** all day 2026-09-03 | **Use the dump, not the API.** Noisy but the only option for "name a dip" |
| [Open English WordNet](#conceptnet-and-wordnet-for-folk-categories) | Hyponym trees, 2025 edition | CC BY 4.0 (unverified) | Offline | **Good for common-noun categories.** Small, clean, offline |
| [DBpedia](#dbpedia-a-slower-wikipedia-category-api) | Wikipedia categories as RDF, 52 rows for landlocked | CC BY-SA 3.0 (unverified) | Public endpoint, undocumented | **Redundant.** The Wikipedia API gives the same thing, fresher |
| [SWOW-EN18](#small-world-of-words-and-category-norms-right-idea-wrong-licence) | Free-association norms, 12,217 cues, 83,000+ participants | **CC BY-NC-ND 3.0** | Download requires name and email | **Do not use.** NC-ND, no redistribution. Wrong licence for a public site |
| [Jeopardy! clue dumps](#jeopardy-and-pointless) | 554,000 clues, 1984-2026 | **Proprietary** (Jeopardy Productions Inc.) | GitHub | **Do not use.** Not licensed for redistribution |
| [Pointless](#jeopardy-and-pointless) | 100-person surveys per question | Not public | n/a | **Not available.** Confirmed proprietary |

---

## Wikidata SPARQL: the backbone for enumeration

Endpoint: `https://query.wikidata.org/sparql`
Licence: CC0, "No rights reserved", for the public domain ([Wikidata:Data access](https://www.wikidata.org/wiki/Wikidata:Data_access)).

### Documented limits

From the [WDQS User Manual](https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual):

- "There is a hard query deadline configured which is set to **60 seconds**."
- "Currently access to the service is limited to **5 parallel queries** per IP."
- "One client (user agent + IP) is allowed **60 seconds of processing time each 60 seconds**."
- "One client is allowed **30 error queries per minute**." Exceeding these returns HTTP 429; ignoring 429s "can be temporarily banned from the service."

Note the **graph split of 9 May 2025**: `query.wikidata.org` now serves the main graph only, and scholarly articles moved to `https://query-scholarly.wikidata.org/` ([Wikidata:SPARQL query service/WDQS graph split](https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/WDQS_graph_split)). Irrelevant to this project - the bank contains no scholarly articles - but worth knowing before writing a query that silently returns nothing.

User-Agent is required. The [Wikimedia Foundation User-Agent Policy](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy) specifies the format `CoolBot/0.0 (https://example.org/coolbot/; coolbot@example.org) generic-library/0.0` and applies to "both API and non-API requests". Scripts without one "may be blocked without notice."

### Verified query 1: Beatles members

```sparql
SELECT ?p ?pLabel WHERE {
  ?p wdt:P463 wd:Q1299 .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
```

HTTP 200 in 5.88s, 9 rows: John Lennon, Paul McCartney, Ringo Starr, George Harrison, Stuart Sutcliffe, Pete Best, Chas Newby, Tommy Moore, William Campbell Shears.

That is the whole answer set for "Name a member of The Beatles", and it illustrates the general problem neatly. The four everyone names arrive undifferentiated from the five almost nobody would, and the last entry (Q113576608, described in Wikidata only as "British musician" - I did not verify who it refers to) is the kind of member you would want to review before shipping. Enumeration is solved; ordering is not.

### Verified query 2: landlocked countries, with a popularity column

```sparql
SELECT ?item ?itemLabel ?sitelinks WHERE {
  ?item wdt:P31 wd:Q123480 .
  FILTER NOT EXISTS { ?item wdt:P576 ?dissolved }
  ?item wikibase:sitelinks ?sitelinks .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY DESC(?sitelinks)
```

HTTP 200 in 2.64s, **40 rows**. `wikibase:sitelinks` is free in the same query and needs no second API call.

Measured against the bank's hand-authored `the-world-03` (45 answers):

- recall **38/45 (84%)**
- misses: Rwanda, Paraguay, Armenia, Andorra, Uzbekistan, Liechtenstein, Azerbaijan - all genuinely landlocked, all simply missing the `P31` claim
- extras: Transnistria, Sovereign State of the Bektashi Order

So Wikidata is high precision, incomplete recall. **It cannot be the only enumeration source.**

### Verified query 3: dog breeds, and why sitelinks work here

```sparql
SELECT ?item ?itemLabel ?sitelinks WHERE {
  ?item wdt:P31 wd:Q39367 .
  ?item wikibase:sitelinks ?sitelinks .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY DESC(?sitelinks)
```

HTTP 200 in 5.45s, **1,142 rows** - far too many for a 60-answer question, and 216 of them have no English label (they come back as bare QIDs), 261 have one sitelink or fewer.

A sitelink threshold prunes it cleanly:

| threshold | breeds surviving |
|---|---|
| ≥ 1 | 919 |
| ≥ 10 | 499 |
| ≥ 20 | 323 |
| ≥ 30 | 152 |
| ≥ 40 | **66** |
| ≥ 50 | 30 |

The top 60 by sitelinks, in order, is already a usable draft bank ordered common-to-rare: German Shepherd (92), dingo (88), Labrador Retriever (81), beagle (72), Chihuahua (71), Bulldog, Golden Retriever, dachshund, Rottweiler, Akita, pug, Siberian Husky, Dalmatian, Boxer, poodle ... Cane Corso, Australian Cattle Dog, Bernese Mountain Dog, Shetland Sheepdog, basset hound, Cairn Terrier, American Pit Bull Terrier, Irish Setter, Scottish Terrier, American Staffordshire Terrier.

**But sitelinks saturate.** For the 40 landlocked countries the range was 280 to 387 (Switzerland 387, Austria 371, Afghanistan 362 ... Lesotho 280), because every country has an article in nearly every language edition. Sitelinks discriminate well when a class spans real fame levels (dog breeds: 92 down to 0) and are useless when every member is already globally notable (countries, chemical elements, planets).

**Verdict: strong.** Use it for the high-precision core of an answer set and for the sitelink cut-off that keeps a 1,142-row class down to a playable 60. Do not trust it for completeness, and do not trust sitelinks as a tier signal for uniformly famous classes.

---

## Wikipedia categories: best raw recall

Endpoint: `https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:Landlocked%20countries&cmlimit=100&cmtype=page`

**Verified.** Returns 51 members. Against the bank's 45:

- recall **44/45 (98%)** - only Turkmenistan missing
- 7 extras, all obviously filterable: "Landlocked country", "Landlocked developing countries", two treaty articles, "Tellurocracy", South Ossetia, Transnistria

This is the single best recall of any enumeration route tested, and it needs one HTTP request.

Combining the three routes tested on the same question:

| route | set size | recall of bank | extras |
|---|---|---|---|
| Wikidata `P31` | 40 | 38/45 (84%) | 2 |
| Wikipedia category | 51 | **44/45 (98%)** | 7 |
| clickstream hub links | 161 | **45/45 (100%)** | 116 |
| union of all three | 164 | 45/45 (100%) | 119 |

Licence: Wikipedia text is CC BY-SA 4.0. Note that a *list of article titles* is arguably not a copyrightable expression, but the safe reading for a public site is to attribute. Wikidata's CC0 avoids the question entirely, which is one more reason to prefer Wikidata as the primary and Wikipedia as the recall top-up.

Rate limits: the [Wikimedia APIs rate limits page](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits) documents limits enforced **per minute**, not per hour: "Requests with no identifying characteristics other than IP address: **10**" per minute, 200/min for an unauthenticated browser, 2,000/min for established editors. They "apply across all sites and platforms, including requests to the Action API and REST APIs."

**Verdict: strong.** Best recall, cheapest call. Pair with Wikidata.

---

## Wikipedia pageviews: a weaker signal than it looks

Endpoint: `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/{title}/monthly/{start}/{end}`

**Verified.** Data begins **2015-07** (a request from 2000-01 returned its first item at `2015070100`, 135 months to 2026-09). Response carries `access-control-allow-origin: *`, so it is callable from the browser, though baking values at authoring time is the right choice for a no-build-step static site.

Real numbers, en.wikipedia, `user` agent filter, calendar 2025:

| article | 2025 total views | monthly average |
|---|---|---|
| Anglerfish | 853,348 | 71,112 |
| Octopus | 802,260 | 66,855 |
| Colossal squid | 666,909 | 55,575 |
| Blobfish | 68,618 | 5,718 |
| Dumbo octopus | 2,563 | 213 |

Those five are all in `animals-nature-01` ("Name a deep-sea creature"), and the ordering is broadly sane.

### Two failure modes, both measured

**1. News spikes.** Colossal squid, monthly:

```
2024-09  71,888     2025-03   49,637
2024-10  48,899     2025-04  174,969   <- first live footage, March 2025
2024-11  45,726     2025-05   54,696
2024-12  46,401     2025-06   39,444
```

A single month is 3.5x the baseline. **Any pipeline must use a median over a multi-year window, never a mean and never a recent window.**

**2. Encyclopaedic interest is not top-of-mind recall.** Batched daily pageviews for all 45 landlocked countries (one request, `action=query&prop=pageviews`, 59 days), median views per day:

```
Switzerland   6,476     Kazakhstan  6,414     Czech Republic 6,350
Afghanistan   6,131     Kosovo      5,348     Armenia        5,304
...
Mongolia      4,096     Botswana    2,359     Malawi         1,759
```

Kazakhstan outranks Austria. Kosovo outranks Mongolia. Armenia outranks Hungary. These reflect geopolitics, diaspora and news, not what a quiz player blurts out.

Correlating against the bank's hand-assigned tiers (n = 45, Spearman; negative means the signal agrees, because more views should mean a lower tier):

**ρ = -0.305.** Bucketing pageviews into the bank's own tier counts gives exact agreement of only **9/45 (20%)**, within one tier **31/45 (68%)**.

Worst disagreements: Kazakhstan (bank 85, pageviews say 10), Uzbekistan (bank 100, says 30), Mongolia (bank 10, says 60), Slovakia (bank 30, says 85).

**Verdict: weak on its own, useful in a blend.** Do not ship a tier assigned by pageviews alone.

---

## Google Books Ngrams: the best single signal for proper nouns

Download and licence: [Google Books Ngram datasets v3](https://storage.googleapis.com/books/ngrams/books/datasetsv3.html) - "This compilation is licensed under a **Creative Commons Attribution 3.0 Unported License**." Version 3 (20200217) covers 1-grams to 5-grams at `http://storage.googleapis.com/books/ngrams/books/20200217/eng/`. Also on BigQuery.

There is also a JSON endpoint behind the Ngram Viewer, `https://books.google.com/ngrams/json?content=...&year_start=2010&year_end=2019&corpus=en-2019&smoothing=3`. **Verified**, HTTP 200. It is not formally documented as an API, so treat it as convenient for authoring-time lookups of tens of terms, not as infrastructure. For anything systematic, use the bulk files.

Mean relative frequency 2010-2019, `en-2019` corpus, for the 45 landlocked countries (3 batched requests):

```
Switzerland   1.344e-5     Kazakhstan   2.175e-6     Turkmenistan   7.172e-7
Afghanistan   1.213e-5     Mongolia     2.074e-6     Liechtenstein  4.761e-7
Austria       1.077e-5     Slovakia     1.809e-6     San Marino     3.264e-7
Hungary       7.686e-6     Belarus      1.415e-6     Andorra        2.631e-7
Ethiopia      4.740e-6     Uzbekistan   1.358e-6     Czechia        4.380e-8
```

**ρ = -0.564** against the bank tiers - comfortably the best single signal tested, and the one that most closely tracks "would a person think of this".

**Its failure mode is time.** The corpus stops in 2019, so anything renamed since is invisible: Czechia 4.38e-8, North Macedonia 1.65e-8, Eswatini 1.01e-8 all land in the bottom three, which is wrong for Czechia (the bank has it at tier 30, correctly - people say it). Any pipeline needs an alias-aware lookup that also queries the former name (Czech Republic, Macedonia, Swaziland) and takes the maximum.

**Verdict: best single signal, with a hard cut-off at 2019.**

---

## wordfreq and SUBTLEX: good for common nouns, bad for proper nouns

Package: [`wordfreq`](https://github.com/rspeer/wordfreq) 3.1.1, **Apache-2.0** (confirmed from the installed distribution metadata). Its data comes from Luminoso's Exquisite Corpus and blends SUBTLEX-US, SUBTLEX-UK, SUBTLEX-CH, SUBTLEX-DE, SUBTLEX-NL, the Leeds Internet Corpus, Wikipedia, ParaCrawl and OPUS OpenSubtitles 2018. Robyn Speer obtained written permission from Marc Brysbaert to redistribute the SUBTLEX lists "for any purpose, not just for academic use" ([wordfreq README](https://github.com/rspeer/wordfreq/blob/master/README.md)). 42 languages. Fully offline, so no rate limit and no network dependency at authoring time.

`zipf_frequency(word, 'en')` against the bank tiers: **ρ = -0.463**, better than pageviews, worse than ngrams.

**Two verified failure modes for proper nouns:**

**1. Multi-word inflation.** `wordfreq` combines multi-token phrases, and a proper noun made of common words comes out looking common:

```
Central African Republic  phrase=4.32   parts: central 5.12, african 4.82, republic 4.60
South Sudan               phrase=3.89   parts: south 5.40, sudan 3.90
Vatican City              phrase=3.78   parts: vatican 3.79, city 5.61
```

"Central African Republic" scores 4.32, *higher than Switzerland's 4.23*. The bank has it at tier 100.

**2. Polysemy.** `turkey` 4.56 (the bird), `georgia` 4.46 (the US state), `chad` 3.93 (the name), `jordan` 4.51, `mali` 3.53, `niger` 3.45. Any country, animal or name that is also an ordinary English word is inflated.

**Verdict: use it for the common-noun categories where it is actually valid** - "name a dip", "name a gun", "name a type of pasta". Do not use it for proper nouns without a multi-word guard. It is the natural rarity signal for exactly the categories Wikidata models badly, which makes it complementary rather than redundant.

---

## WMF clickstream: the signal nobody uses

Download: `https://dumps.wikimedia.org/other/clickstream/{YYYY-MM}/clickstream-enwiki-{YYYY-MM}.tsv.gz`
Latest available 2026-09-03: **2026-07**, enwiki **492,902,361 bytes** gzipped, published 2026-08-05.
Licence: CC0, as with all Wikimedia analytics data.
Format **verified** by downloading the small `azwiki` file (851 KB, 78,706 rows): four tab-separated columns `prev`, `curr`, `type`, `n`, where `type` is `link` or `external`.

This dataset records, for each pair of articles, how many times readers actually clicked from one to the other in a month. Clicking *from* a category hub article *to* a member is a category-conditioned measurement, which is much closer to `P(entity | prompt)` than any generic popularity number.

I streamed the English file through a filter (no bulk disk write) for a handful of hub articles.

### Enumeration: it is the best recall of anything tested

From `Landlocked_country`, 161 distinct link targets, **100% recall of the bank's 45 answers**, plus 116 extras.

From `List_of_cognitive_biases` + `Cognitive_bias`, 246 distinct targets, **53/66 (80%) recall** of the bank's `Name a cognitive bias` when matched with the game's own `normalize()` from `js/matcher.js` (raw string matching scored only 39%, because the bank authors "The Dunning-Kruger effect" and the article is "Dunning–Kruger effect" - the project's own normaliser closes that gap, which is itself a useful check).

And it proposes genuinely good answers the bank is missing, ranked by clicks:

```
hot cold empathy gap         381      cognitive dissonance      113
aesthetic usability effect   153      error management theory   109
hyperbolic discounting       139      women are wonderful effect 97
attribute substitution       122      wishful thinking           72
time saving bias             121      identifiable victim effect 68
```

### Tiering: powerful but directionally unstable

From `Landlocked_country`, the most-clicked members are Liechtenstein (1,283), Uzbekistan (1,203), Transnistria (724), South Ossetia (601), Kazakhstan (559), Kyrgyzstan (550). Switzerland, Austria, Mongolia and Nepal - the bank's four tier-10 answers - are nowhere near the top.

Mean clicks by bank tier:

| tier | n | mean clicks |
|---|---|---|
| 10 | 4 | 128 |
| 30 | 8 | 99 |
| 60 | 9 | 73 |
| 85 | 14 | 167 |
| 100 | 10 | **381** |

Readers click the members that *surprise* them. For this category the correlation with tier is **positive** (ρ = +0.207) - more clicks means rarer - and the curve is U-shaped rather than monotonic, but the tier-100 group stands out sharply.

For cognitive biases the direction **reverses**: tier 10 mean 166, tier 30 mean 57, tier 60 mean 29, tier 85 mean 35, tier 100 mean 20. There, readers click the famous ones.

The difference is category shape. "Landlocked country" is a category where membership is the surprise (everyone knows Kazakhstan, nobody knows it is landlocked). "Cognitive bias" is a category where the members themselves vary in fame. Clickstream tracks *surprise*, which is sometimes rarity and sometimes not.

**Verdict: strong for enumeration, use with care for tiering.** It is the only source tested that measures behaviour conditioned on the category, and adding it to the blend gave the best correlation of any combination (below). But its sign is not stable across categories, so it cannot be applied blindly.

---

## ProtoQA: Family Feud with answer counts - the closest real analogue

Repository: [`iesl/protoqa-data`](https://github.com/iesl/protoqa-data)
Licence: **CC-BY-4.0**, confirmed via the GitHub licence API. This is the only answer-frequency dataset found that is properly licensed for a public site.

Contents (**verified** by downloading `data/dev/dev.crowdsourced.jsonl`, 109 KB, 52 questions): each question carries `answers.raw`, a map of the literal strings respondents gave to how many gave them, plus `answers.clusters` grouping synonyms with a count. Median **100 responses per question**, median **10 answer clusters per question**.

```
QUESTION: name something that is hard to guess about a person you are just meeting.
  raw: {"age":22, "name":10, "birthday":7, "job":2, "past":2, "salary":1,
        "his virginity":1, "broken socks":1, ...}
  clusters: 35, 28, 12, 11, 6, 5, 1
```

The repo also holds 8,781 training instances scraped from Family Feud fan sites and 102 evaluation questions (**unverified** - I only downloaded the dev split).

**The content is the wrong domain.** These are everyday prompts ("name something that is hard to guess about a person you are just meeting"), not knowledge categories. It will not supply answers for "Name a landlocked country".

**But the distribution is exactly what this project needs to calibrate against.** Measured over all 541 clusters in the dev split:

| share of respondents giving the answer | clusters | share |
|---|---|---|
| ≥ 30% (the answer everyone gives) | 38 | **7.0%** |
| 15-30% | 53 | 9.8% |
| 7-15% | 134 | 24.8% |
| 3-7% | 129 | 23.8% |
| < 3% (long tail) | 187 | 34.6% |

Cumulative share captured by the top-k answers, median across questions: top-1 **35%**, top-2 54%, top-3 65%, top-5 **80%**, top-8 91%, top-12 94%.

Set that against the bank's own distribution from the top of this document: **7.0% / 21.8% / 27.4% / 25.3% / 18.5%**.

The tier-10 band matches ProtoQA's ">= 30% of respondents" band to the decimal (7.0% both). That is a coincidence of two small samples, but it is a reassuring one: the authored bank's sense of "the obvious answer everyone gives" is empirically the right size. The bank is fatter in the middle and thinner in the tail than the survey data, which is the expected consequence of authoring 60 answers rather than recording 100 free responses.

**Verdict: strong as calibration, useless as content.** Use its bands to set how many answers belong in each tier, and use its top-k curve as a sanity check that tier 10 stays small.

---

## Open Trivia DB and The Trivia API: honestly, a poor fit

Both were called and both work. Neither is much use here, and it is worth being blunt about why.

**Open Trivia DB** (`https://opentdb.com/api.php`), **verified**:
- Licence: **CC BY-SA 4.0** ([API config page](https://opentdb.com/api_config.php))
- Rate limit: "Each IP can only access the API once every 5 seconds"
- Size: 21,612 questions total, of which only **5,298 verified**, 10,906 still pending, 5,425 rejected (`api_count_global.php`)
- 24 categories

**The Trivia API** (`https://the-trivia-api.com/api/questions`), **verified**:
- Licence: **CC BY-NC 4.0** - "free for noncommercial use... If you would like to use the API commercially... this service is offered through a paid subscription" ([the-trivia-api.com](https://the-trivia-api.com/))
- Rate limit read directly from the response headers: `ratelimit-limit: 20`, `ratelimit-policy: 20;w=5` - 20 requests per 5 second window
- ~14,400 questions; items carry `difficulty` and an `isNiche` boolean

### Why the format does not transfer

A trivia question has one right answer and a set of deliberately wrong ones:

```json
{ "question": "In Game of Thrones, what is Littlefinger's real name?",
  "correct_answer": "Petyr Baelish",
  "incorrect_answers": ["Podrick Payne", "Lancel Lannister", "Torrhen Karstark"] }
```

This game asks for *any of many* correct answers, weighted by rarity. The three structural mismatches:

1. **One answer, not fifty.** There is no answer set to harvest. A 5,000-question dump yields 5,000 single answers, not one 60-deep bank.
2. **The distractors are poison.** `incorrect_answers` are chosen to be plausible-but-wrong. Feeding them into a bank would score people for wrong answers.
3. **`difficulty` is question difficulty, not answer rarity.** "Hard" on The Trivia API means few people know the fact. Tier 100 here means few people *think of it first* among many things they do know. Budweiser being first brewed in St. Louis is `difficulty: hard`; that is a different axis entirely.

The one genuine use: **prompt mining**. Scanning ~5,000 verified CC BY-SA questions for category nouns ("Which of these is a type of ___", "What breed of dog...") is a cheap way to generate a list of *candidate categories* worth turning into "Name a ___" prompts. The answers get thrown away.

**Verdict: poor fit for answers, mildly useful for prompt ideas.** Prefer Open Trivia DB (CC BY-SA) over The Trivia API (CC BY-NC) - a public GitHub Pages site is arguably fine under NC, but the ambiguity is not worth it when a share-alike alternative exists.

---

## ConceptNet and WordNet: for folk categories

These matter for the categories Wikidata cannot model: "name a dip", "name a gun", "name a thing in a kitchen drawer".

**ConceptNet 5.7**
- Licence: **CC BY-SA 4.0**, and the project explicitly states users "may not add restrictions such as 'non-commercial' or 'research use only'" ([Copying and sharing ConceptNet](https://github.com/commonsense/conceptnet5/wiki/Copying-and-sharing-ConceptNet)). Constituent datasets (Open Mind Common Sense, Verbosity, Wiktionary, WordNet) are all compatible.
- **The web API is down.** `https://api.conceptnet.io/query?rel=/r/IsA&end=/c/en/gun` returned **HTTP 502 Bad Gateway** on three attempts across the session on 2026-09-03, from both the `/query` and `/c/en/{term}` forms. This is a current observation, not a permanent state, but it means the API cannot be a dependency.
- The bulk dump is up: `https://s3.amazonaws.com/conceptnet/downloads/2019/edges/conceptnet-assertions-5.7.0.csv.gz`, HTTP 200, **497,963,447 bytes**. Use this instead.
- The `/r/IsA` relation is what you want, but it is noisy crowd data and needs a weight threshold plus manual review.

**Open English WordNet**
- Latest release **2025-edition**, published 2025-12-31 (GitHub releases API, [globalwordnet/english-wordnet](https://github.com/globalwordnet/english-wordnet)). Assets include `english-wordnet-2025.xml.gz` (10.8 MB) and a JSON build (9.5 MB).
- Licence: CC BY 4.0 - **unverified**, I read the release metadata but not the licence file.
- Hyponym trees are far cleaner than ConceptNet's `IsA` and the whole thing is 10 MB. For "name a firearm" or "name a soup", walking hyponyms of a synset gives a tight, sane list.

**Verdict: WordNet first, ConceptNet as a top-up.** WordNet is smaller, cleaner and offline; ConceptNet has broader folk coverage but needs filtering and its API is currently unreliable. Pair either with `wordfreq` for the tier, since both produce common nouns, which is precisely where `wordfreq` is valid.

---

## DBpedia: a slower Wikipedia category API

Endpoint `https://dbpedia.org/sparql`, **verified**:

```sparql
SELECT ?s WHERE { ?s dct:subject <http://dbpedia.org/resource/Category:Landlocked_countries> } LIMIT 60
```

HTTP 200 in 0.76s, **52 rows** - essentially the same set as the Wikipedia Category API returned, because it is the same category, extracted into RDF.

Licence: CC BY-SA 3.0 - **unverified**, I did not read DBpedia's licence page.

**Verdict: redundant.** It gives you Wikipedia's categories with a snapshot lag and an extra query language, when `list=categorymembers` gives you them live in one HTTP GET. Skip it.

---

## Small World of Words and category norms: right idea, wrong licence

**SWOW-EN18** is the largest English free-association dataset: 12,217 cue words, collected 2011-2018 from over 83,000 participants, each cue shown to 100 people who gave up to three associations ([smallworldofwords.org research page](https://smallworldofwords.org/en/project/research), read from the page's own `schema.org` DataCatalog metadata).

Its licence is the problem. The metadata states plainly:

- `"license": "https://creativecommons.org/licenses/by-nc-nd/3.0/"`
- `"conditionsOfAccess": "Free for non-commercial scientific research; download requires name and email; no redistribution without permission."`

**CC BY-NC-ND**: non-commercial *and* no derivatives, plus an explicit no-redistribution condition. Deriving tier numbers from it and publishing them in a GitHub repo is a derivative work redistributed publicly. **Do not use it.**

**Van Overschelde, Rawson & Dunlosky (2004) category norms** are conceptually the perfect dataset for this game. 70 categories, over 600 participants, and - the detail that matters - "participants generated as many exemplars as possible in **30 seconds**", with a `TOTAL` statistic defined as "the proportion of all participants who gave the particular response" ([validation study, *Cahiers de Psychologie Cognitive*](https://journals.openedition.org/cpl/4802)). That is literally this game's mechanic, measured, with a per-answer rarity number attached. Categories include GEMSTONES, FRUITS, VEGETABLES, INSECTS, HERBS, COLOURS, TOOLS, FLOWERS.

**Availability and licence: unverified.** The norms were published as an appendix to *Journal of Memory and Language* 50, 289-335. I found no open download and no licence statement. Extended tables down to TOTAL = 0.02 are described as "available from Van Overschelde et al." Worth an email to the authors; not something to plan around.

**Verdict: SWOW is licence-blocked, category norms are the right idea but unobtainable as of this research.** ProtoQA (CC BY 4.0) is the usable substitute.

---

## Jeopardy! and Pointless

**Jeopardy!** dumps are large and easy to find - [`jwolle1/jeopardy_clue_dataset`](https://github.com/jwolle1/jeopardy_clue_dataset) holds 554,000 clues from 1984 to 2026 - but every one of them carries the same note: **all data is property of Jeopardy Productions, Inc.** The repository being on GitHub does not license the content. And structurally it is the same one-right-answer format as Open Trivia DB, so even if it were clear, it would not fit.

**Pointless** is the closest broadcast analogue to this game's scoring: contestants are rewarded for answers that *fewer* of 100 surveyed people gave, which is exactly the tier mechanic. Its survey data would be the ideal source.

It is not available. The surveys have been run by **Redshift Research** through their **Crowdology** panel since the show began in 2009, and respondents are deliberately not told they are answering Pointless questions ([Den of Geek](https://www.denofgeek.com/culture/pointless-how-are-the-100-people-polled-other-questions/), [UKGameshows](https://www.ukgameshows.com/ukgs/Pointless)). There is no API, no dataset, and no indication the production company has released any of it. Fan wikis transcribe individual episodes' answers but not the underlying survey counts.

**Verdict: neither is usable.** Pointless is the right model and the data does not exist publicly; Jeopardy! data exists and is not licensed.

---

## What actually predicts the hand-assigned tiers

All correlations below are Spearman ρ over the 45 answers of `the-world-03` ("Name a landlocked country") against the tiers a human authored. Negative means the signal agrees with the human. "Exact" and "within-1" bucket each signal into the bank's own tier counts (4/8/9/14/10) and compare.

| signal | ρ | exact | within one tier |
|---|---|---|---|
| Wikipedia pageviews (59-day median) | -0.305 | 9/45 (20%) | 31/45 (68%) |
| wordfreq Zipf | -0.463 | - | - |
| Google Books Ngrams | **-0.564** | 11/45 | 38/45 (**84%**) |
| wordfreq + ngrams | -0.551 | 12/45 | 38/45 (84%) |
| pageviews + wordfreq + ngrams | -0.574 | **19/45 (42%)** | 36/45 (80%) |
| pageviews + wordfreq + ngrams + clickstream | **-0.631** | 17/45 | 37/45 (82%) |

Read honestly:

- **A blend beats any single signal**, and the four-signal blend is the best at ρ = -0.631.
- **Exact agreement never exceeds 42%.** Auto-tiering cannot be shipped unreviewed.
- **Within-one-tier agreement is 80-84%** across every reasonable blend. That is the useful number: the machine puts four answers in five within one tier of where a human would.
- Google Books Ngrams alone gets 84% within-one for one HTTP request. The extra signals buy rank correlation, not bucket accuracy.

The residual error is systematic. The worst blend disagreements:

```
Ethiopia    bank 85, predicted 10    famous country, nobody thinks "landlocked"
Kazakhstan  bank 85, predicted 30    same
Armenia     bank 85, predicted 30    same
Mongolia    bank 10, predicted 60    archetypal landlocked country, modest fame
Czechia     bank 30, predicted 85    renamed 2016, invisible to a 2019 corpus
```

Four of those five are the `P(entity)` versus `P(entity | prompt)` gap, and the fifth is a corpus cut-off. Neither is noise a bigger blend will average away.

---

## Recommended pipeline

The shape is: **enumerate broadly, score objectively, bucket by proportion, and put a human on the diff.** The design spec's constraint that this is a static site with no build step means all of this runs as an authoring-time script that emits JSON, never at runtime.

### Stage 1 - Prompt generation

1. Mine Open Trivia DB's ~5,298 verified questions (CC BY-SA 4.0, one request per 5s) for category nouns, discarding all answers. Output: candidate category phrases.
2. Resolve each candidate to a Wikidata class QID via `wbsearchentities`, and to a Wikipedia category title. A candidate that resolves to neither is either a folk category (route it to WordNet) or not a category at all (drop it).
3. Keep candidates whose class has between roughly 40 and 500 members. Below 40 there is no game; above 500 the answer set will not be authorable. The dog-breed threshold table above shows how to hit that window with a sitelink cut-off.

### Stage 2 - Answer enumeration

Take the **union** of three routes, since they have complementary failure modes:

| route | contributes |
|---|---|
| Wikidata `P31`/`P279*` + sitelink threshold | high-precision core, plus a free sitelink number |
| Wikipedia `list=categorymembers` | the recall top-up (98% versus Wikidata's 84%) |
| clickstream links out of the hub article | the long tail plus a category-conditioned click count |

Deduplicate with the project's own `normalize()` from `js/matcher.js` - this is not optional. Raw string matching scored 39% on the cognitive-bias check where `normalize()` scored 80%, because the bank authors leading articles and the encyclopaedia uses en-dashes.

For folk categories with no Wikidata class ("a dip", "a gun"), substitute Open English WordNet hyponyms, topped up from the ConceptNet 5.7 dump's `/r/IsA` edges above a weight threshold.

Aliases come nearly free: Wikidata `skos:altLabel`, Wikipedia redirects (`list=backlinks` with `blfilterredir=redirects`), and the clickstream's own variant spellings.

### Stage 3 - Popularity scoring

For each candidate answer, collect what applies:

| signal | how | valid for |
|---|---|---|
| Google Books Ngrams, mean relative frequency 2010-2019 | bulk files, or the JSON endpoint for small batches | everything; **query former names too and take the max** |
| Wikipedia pageviews, **median** monthly views over 3+ years | `action=query&prop=pageviews` batches 50 titles per request | entities with an article |
| `wordfreq` Zipf | offline, Apache-2.0 | **single-token common nouns only** - skip multi-word proper nouns and known polysemes |
| clicks from the hub article | one monthly clickstream file | anything the hub links to |
| Wikidata sitelinks | free in the enumeration query | classes whose members span real fame levels; skip when the range is narrow |

Guard rails, all of them earned from a measured failure above:

- **Median, never mean, over a long window.** Colossal squid's April 2025 spike was 3.5x baseline.
- **Alias-max on ngrams.** Czechia scores 4.38e-8; Czech Republic does not.
- **Skip `wordfreq` for multi-word proper nouns.** "Central African Republic" outscores "Switzerland".
- **Check the sitelink range before trusting sitelinks.** 280-387 across all countries is no signal.
- **Decide the clickstream's sign per category, do not assume it.** It correlated +0.207 with tier for landlocked countries and negatively for cognitive biases.

### Stage 4 - Bucketing into tiers

Convert each signal to a **rank** within the question (not a raw value - the scales are incommensurable), sum the available ranks, and cut the ordering into the five tiers by **proportion**, using the ProtoQA-derived bands as the target shape:

| tier | ProtoQA band | share | for a 60-answer question |
|---|---|---|---|
| 10 False Consciousness | ≥ 30% of respondents | 7% | 4 |
| 30 The Masses | 15-30% | 10% | 6 |
| 60 Comrade | 7-15% | 25% | 15 |
| 85 Vanguard | 3-7% | 24% | 14 |
| 100 Full Marx | < 3% | 35% | 21 |

The design spec requires at least 2 answers per authored tier, which these proportions satisfy for any question of 15 or more answers.

This is close to what the bank already does (7.0 / 21.8 / 27.4 / 25.3 / 18.5) and the tier-10 band matches exactly. The visible difference is that the survey data wants a fatter tier-100 tail and a thinner tier-30 band than the authors have used.

### Stage 5 - Human review, non-negotiable

Emit a diff, not a bank. For each question show the proposed tier, the existing tier if any, and the raw signals behind it. Review the disagreements, which is where the interesting cases live:

```
Ethiopia    bank=85  proposed=10   pv=4533  zipf=3.73  ng=4.74e-6  clicks=471
```

At 42% exact and 82% within-one, roughly one answer in six needs moving and about half need a glance. That is a large saving over authoring 60 tiers by hand, and nowhere near good enough to ship unattended.

### What to build first

If only one thing gets built: **Wikipedia category members for enumeration, Google Books Ngrams for the tier, ProtoQA proportions for the buckets.** Three sources, two HTTP calls per question, ρ = -0.564 and 84% within one tier. Everything else is refinement.

### Attribution

If this ships, the site needs an acknowledgements line. Minimum: Wikidata (CC0, no attribution required but courteous), Wikipedia (CC BY-SA 4.0), Google Books Ngrams (CC BY 3.0), ProtoQA (CC BY 4.0), and Open Trivia DB (CC BY-SA 4.0) if its prompts are used. Note that **CC BY-SA is share-alike**: if Wikipedia or Open Trivia DB text ends up in the bank verbatim, the bank inherits share-alike. Wikidata's CC0 and Google's CC BY avoid that, which is another argument for making Wikidata the primary enumeration route and treating Wikipedia as a recall check whose *facts* (not prose) are used.

---

## Appendix: reproducing the checks

Working queries and calls, all run 2026-09-03 with `User-Agent: MartillionQuestionBankResearch/0.1 (<contact email>)`.

```bash
# Wikidata: landlocked countries with a popularity column
curl -s -G 'https://query.wikidata.org/sparql' \
  --data-urlencode 'query=SELECT ?item ?itemLabel ?sitelinks WHERE {
    ?item wdt:P31 wd:Q123480 .
    FILTER NOT EXISTS { ?item wdt:P576 ?d }
    ?item wikibase:sitelinks ?sitelinks .
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }
    ORDER BY DESC(?sitelinks)' \
  -H 'Accept: application/sparql-results+json' -H "User-Agent: $UA"

# Wikipedia category members (best recall, one request)
curl -s -H "User-Agent: $UA" --get 'https://en.wikipedia.org/w/api.php' \
  --data-urlencode 'action=query' --data-urlencode 'format=json' \
  --data-urlencode 'list=categorymembers' --data-urlencode 'cmtype=page' \
  --data-urlencode 'cmtitle=Category:Landlocked countries' --data-urlencode 'cmlimit=100'

# Pageviews for up to 50 titles in ONE request (last 60 days, daily)
curl -s -H "User-Agent: $UA" --get 'https://en.wikipedia.org/w/api.php' \
  --data-urlencode 'action=query' --data-urlencode 'format=json' \
  --data-urlencode 'prop=pageviews' --data-urlencode 'redirects=1' \
  --data-urlencode 'titles=Switzerland|Austria|Mongolia|...'

# Pageviews, long window, one article (use the MEDIAN of these)
curl -s -H "User-Agent: $UA" \
  'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/Colossal_squid/monthly/2015070100/2026090100'

# Google Books Ngrams, batched
curl -s -H "User-Agent: $UA" --get 'https://books.google.com/ngrams/json' \
  --data-urlencode 'content=Switzerland,Mongolia,Turkmenistan,Eswatini' \
  --data-urlencode 'year_start=2010' --data-urlencode 'year_end=2019' \
  --data-urlencode 'corpus=en-2019' --data-urlencode 'smoothing=3'

# Clickstream, filtered in one streaming pass (no 493 MB on disk)
curl -s -H "User-Agent: $UA" \
  'https://dumps.wikimedia.org/other/clickstream/2026-07/clickstream-enwiki-2026-07.tsv.gz' \
  | zcat | awk -F'\t' '$1=="Landlocked_country" && $3=="link"'
```
