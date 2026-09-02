import assert from "node:assert/strict";
import test from "node:test";
import {
  applyPatches,
  compose,
  paintSprite,
  spriteSize,
  spriteToRects,
  spriteToSvgString,
  TRANSPARENT,
} from "../js/pixel.js";

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

test("applyPatches writes runs into rows and leaves the original alone", () => {
  const base = { palette, rows: ["....", "....", "...."] };
  const patched = applyPatches(base, [
    [0, 1, "##"],
    [2, 3, "r"],
  ]);
  assert.deepEqual(patched.rows, [".##.", "....", "...r"]);
  assert.deepEqual(base.rows, ["....", "....", "...."]);
  assert.throws(() => applyPatches(base, [[1, 3, "##"]]), /runs past/);
  assert.throws(() => applyPatches(base, [[3, 0, "#"]]), /runs past/);
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
