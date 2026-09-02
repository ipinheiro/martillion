import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { init } from "../js/main.js";
import { KEY } from "../js/storage.js";
import { TOPICS } from "../js/topics.js";

// A fake DOM just deep enough for main.js: elements with ids and classes taken from the real
// index.html, attributes, listeners, and children. No layout, no rendering.

class FakeElement {
  constructor(tag, id = "", classes = []) {
    this.tagName = tag;
    this.id = id;
    this.classes = new Set(classes);
    this.children = [];
    this.textContent = "";
    this.hidden = false;
    this.disabled = false;
    this.value = "";
    this.href = "";
    this.style = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.classList = {
      add: (c) => this.classes.add(c),
      toggle: (c, force) => (force ? this.classes.add(c) : this.classes.delete(c)),
      contains: (c) => this.classes.has(c),
    };
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }

  dispatch(type, event = {}) {
    for (const handler of this.listeners.get(type) ?? []) {
      handler({ type, preventDefault() {}, ...event });
    }
  }

  replaceChildren(...nodes) {
    this.children = nodes;
  }

  append(...nodes) {
    this.children.push(...nodes);
  }

  focus() {}
}

async function fakeDocumentFromIndexHtml() {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const elements = [];
  for (const tag of html.matchAll(/<(\w+)([^>]*)>/g)) {
    const id = tag[2].match(/\bid="([^"]+)"/)?.[1] ?? "";
    const classes = tag[2].match(/\bclass="([^"]+)"/)?.[1]?.split(/\s+/) ?? [];
    elements.push(new FakeElement(tag[1], id, classes));
  }
  return {
    elements,
    getElementById: (id) => elements.find((el) => el.id === id) ?? null,
    querySelectorAll: (selector) => elements.filter((el) => el.classes.has(selector.slice(1))),
    createElement: (tag) => new FakeElement(tag),
    createElementNS: (_ns, tag) => new FakeElement(tag),
  };
}

function makeBank() {
  return TOPICS.flatMap((topic) =>
    [1, 2].map((n) => ({
      id: `${topic}-0${n}`,
      topic,
      prompt: `Name something (${topic} ${n})`,
      answers: [
        { answer: "Anything", aliases: [], tier: 60 },
        { answer: "Rare thing", aliases: [], tier: 100 },
      ],
    })),
  );
}

function fakeFetch(bank, { fail = false } = {}) {
  return async (url) => {
    const topic = String(url).match(/questions\/([a-z-]+)\.json/)?.[1];
    if (fail || !topic) return { ok: false, status: 404, json: async () => null };
    return { ok: true, status: 200, json: async () => bank.filter((q) => q.topic === topic) };
  };
}

function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function boot({ bank = makeBank(), storage = fakeStorage(), fetchImpl, now } = {}) {
  const doc = await fakeDocumentFromIndexHtml();
  const errorHandlers = [];
  const originalListener = globalThis.addEventListener;
  globalThis.addEventListener = (type, handler) => errorHandlers.push([type, handler]);
  try {
    init(doc, {
      storageBackend: storage,
      fetchImpl: fetchImpl ?? fakeFetch(bank),
      random: () => 0.5,
      now: now ?? (() => 0),
    });
  } finally {
    globalThis.addEventListener = originalListener;
  }
  await flush();
  await flush();
  const $ = (id) => doc.getElementById(id);
  const visible = () =>
    doc.elements.filter((el) => el.classes.has("screen") && !el.hidden).map((el) => el.id);
  return { doc, $, visible, storage, errorHandlers };
}

test("boot renders stored stats immediately, then enables start once the bank loads", async () => {
  const stored = { bestScore: 420, totalPoints: 2100, gamesPlayed: 5, recentQuestionIds: [] };
  const { $, visible } = await boot({ storage: fakeStorage({ [KEY]: JSON.stringify(stored) }) });
  assert.deepEqual(visible(), ["screen-title"]);
  assert.equal($("best-score").textContent, "420");
  assert.equal($("plans-completed").textContent, "1");
  assert.equal($("plan-label").textContent, "100 / 2000 points toward the next plan");
  assert.equal($("start-button").disabled, false);
  assert.equal($("title-hero").children[0].tagName, "svg");
  assert.match($("favicon").href, /^data:image\/svg\+xml,/);
});

test("a failed load shows the error screen and retry reloads", async (t) => {
  t.mock.method(console, "error", () => {});
  let fail = true;
  const bank = makeBank();
  const fetchImpl = async (url, opts) => fakeFetch(bank, { fail })(url, opts);
  const { $, visible } = await boot({ fetchImpl });
  assert.deepEqual(visible(), ["screen-error"]);
  assert.match($("error-detail").textContent, /failed to load/);
  fail = false;
  $("retry-button").dispatch("click");
  await flush();
  await flush();
  assert.deepEqual(visible(), ["screen-title"]);
  assert.equal($("start-button").disabled, false);
});

test("a full game scores, saves, and reports a new personal best only when earned", async () => {
  const { $, visible, storage } = await boot();
  $("start-button").dispatch("click");
  assert.deepEqual(visible(), ["screen-round"]);
  assert.equal($("round-count").textContent, "Round 1 of 7");

  const inputs = ["Anything", "Rare thing", "", "roomba", "Anything", "Anything", "Anything"];
  for (const [i, value] of inputs.entries()) {
    $("answer-input").value = value;
    $("answer-form").dispatch("submit");
    assert.deepEqual(visible(), ["screen-reveal"], `round ${i + 1} reveals`);
    assert.equal($("reveal-sprite").children[0].tagName, "svg");
    $("next-button").dispatch("click");
  }

  assert.deepEqual(visible(), ["screen-results"]);
  assert.equal($("reveal-detail").textContent, 'The committee recognises "Anything".');
  assert.equal($("results-score").textContent, "340 points");
  assert.equal($("results-stage").textContent, "Capitalism");
  assert.equal($("results-records").textContent, "A new personal best. The politburo is pleased.");
  assert.equal($("results-rounds").children.length, 7);
  assert.match($("results-rounds").children[2].textContent, /no answer \(\+0\)/);
  assert.match($("results-rounds").children[3].textContent, /💭 .* - roomba \(\+0\)/);
  const saved = JSON.parse(storage.data.get(KEY));
  assert.equal(saved.bestScore, 340);
  assert.equal(saved.gamesPlayed, 1);
  assert.equal(saved.recentQuestionIds.length, 7);

  $("again-button").dispatch("click");
  for (let i = 0; i < 7; i++) {
    $("answer-input").value = "";
    $("answer-form").dispatch("submit");
    $("next-button").dispatch("click");
  }
  assert.equal($("results-score").textContent, "0 points");
  assert.equal($("results-records").textContent, "Personal best: 340.");
});

test("the utopian reveal says zero points and the reveal detail matches the tier", async () => {
  const { $ } = await boot();
  $("start-button").dispatch("click");
  $("answer-input").value = "something the bank lacks";
  $("answer-form").dispatch("submit");
  assert.equal($("reveal-tier").textContent, "Utopian");
  assert.equal($("reveal-points").textContent, "+0");
  assert.equal(
    $("reveal-detail").textContent,
    "The committee cannot verify this. Zero points, comrade.",
  );
  assert.equal($("reveal-sprite").children[0].getAttribute("aria-label"), "Marx, doubtful");
});

test("the timer submits whatever is in the box when the round runs out", async () => {
  let clock = 0;
  const { $, visible } = await boot({ now: () => clock });
  $("start-button").dispatch("click");
  $("answer-input").value = "Anything";
  clock = 31_000;
  await new Promise((resolve) => setTimeout(resolve, 250));
  assert.deepEqual(visible(), ["screen-reveal"]);
  assert.equal($("reveal-tier").textContent, "Comrade");
  $("next-button").dispatch("click");
  assert.deepEqual(visible(), ["screen-round"]);
  clock = 62_000;
  await new Promise((resolve) => setTimeout(resolve, 250));
  assert.deepEqual(visible(), ["screen-reveal"], "the next round's timer runs out too");
  assert.equal($("reveal-tier").textContent, "No answer");
});
