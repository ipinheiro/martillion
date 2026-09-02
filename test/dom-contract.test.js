import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
