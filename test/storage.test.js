import assert from "node:assert/strict";
import test from "node:test";
import { createStorage, defaultState, isValidState, KEY } from "../js/storage.js";

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

const played = {
  bestScore: 630,
  totalPoints: 4100,
  gamesPlayed: 9,
  recentQuestionIds: ["films-tv-01"],
};

test("KEY is the versioned storage key", () => {
  assert.equal(KEY, "martillion.v1");
});

test("defaultState returns a fresh object each call", () => {
  assert.deepEqual(defaultState(), {
    bestScore: 0,
    totalPoints: 0,
    gamesPlayed: 0,
    recentQuestionIds: [],
  });
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
  const raw =
    '{"bestScore":1,"totalPoints":1,"gamesPlayed":1,"recentQuestionIds":[],"__proto__":{"polluted":true}}';
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
