import assert from "node:assert/strict";
import test from "node:test";
import { createStorage } from "../js/storage.js";

const DEFAULTS = { bestScore: 0, totalPoints: 0, gamesPlayed: 0, recentQuestionIds: [] };

function fakeBackend(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
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
  const state = {
    bestScore: 630,
    totalPoints: 4100,
    gamesPlayed: 9,
    recentQuestionIds: ["films-tv-01"],
  };
  storage.save(state);
  assert.deepEqual(storage.load(), state);
  assert.ok(backend.data["martillion.v1"].includes("630"));
});

test("corrupt JSON loads as defaults", () => {
  const storage = createStorage(fakeBackend({ "martillion.v1": "{not json" }));
  assert.deepEqual(storage.load(), DEFAULTS);
});

test("wrong shape loads as defaults", () => {
  const storage = createStorage(
    fakeBackend({ "martillion.v1": JSON.stringify({ bestScore: "high" }) }),
  );
  assert.deepEqual(storage.load(), DEFAULTS);
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
  assert.deepEqual(storage.load(), DEFAULTS);
  const state = { bestScore: 100, totalPoints: 100, gamesPlayed: 1, recentQuestionIds: [] };
  storage.save(state);
  assert.deepEqual(storage.load(), state);
});

test("load returns distinct array objects (no shared reference)", () => {
  const storage = createStorage(fakeBackend());
  const load1 = storage.load();
  const load2 = storage.load();

  // Both should be defaults
  assert.deepEqual(load1, DEFAULTS);
  assert.deepEqual(load2, DEFAULTS);

  // But the arrays should be distinct objects
  assert.notStrictEqual(load1.recentQuestionIds, load2.recentQuestionIds);

  // Mutating one should not affect the other
  load1.recentQuestionIds.push("test-id");
  assert.deepEqual(load2.recentQuestionIds, []);

  // And a fresh storage should still get a fresh empty array
  const storage2 = createStorage(fakeBackend());
  assert.deepEqual(storage2.load().recentQuestionIds, []);
});
