import assert from "node:assert/strict";
import test from "node:test";
import { spriteSize, spriteToRects } from "../js/pixel.js";
import { TIERS } from "../js/scorer.js";
import {
  HAMMER_SICKLE,
  MARX,
  MARX_HERO,
  previewSprites,
  reactionFor,
  SPRITE_COLOURS,
  STAR,
} from "../js/sprites.js";

test("SPRITE_COLOURS covers the eight palette tokens with hex values", () => {
  assert.deepEqual(Object.keys(SPRITE_COLOURS).sort(), [
    "cream",
    "cream-dim",
    "grey",
    "grey-light",
    "ink",
    "red",
    "skin",
    "star",
  ]);
  for (const hex of Object.values(SPRITE_COLOURS)) assert.match(hex, /^#[0-9A-F]{6}$/);
});

test("every sprite is rectangular, uses known palette keys, and known colour tokens", () => {
  for (const [name, sprite] of previewSprites()) {
    const size = spriteSize(sprite);
    assert.ok(size.width > 0 && size.height > 0, `${name} has size`);
    for (const rect of spriteToRects(sprite)) {
      assert.ok(rect.colour in SPRITE_COLOURS, `${name} uses colour token ${rect.colour}`);
    }
  }
});

test("Marx is 32 by 32 and the hero wears sunglasses", () => {
  assert.deepEqual(spriteSize(MARX), { width: 32, height: 32 });
  assert.deepEqual(spriteSize(MARX_HERO), { width: 32, height: 32 });
  assert.notDeepEqual(MARX_HERO.rows, MARX.rows);
});

test("hammer and sickle and star are 16 by 16 glyphs", () => {
  assert.deepEqual(spriteSize(HAMMER_SICKLE), { width: 16, height: 16 });
  assert.deepEqual(spriteSize(STAR), { width: 16, height: 16 });
});

test("every tier has a reaction with a label, and reactions differ from each other", () => {
  const seen = new Set();
  for (const tier of TIERS) {
    const { sprite, label } = reactionFor(tier.id);
    assert.deepEqual(spriteSize(sprite), { width: 32, height: 32 });
    assert.ok(label.startsWith("Marx"), `${tier.id} label names Marx`);
    const key = sprite.rows.join("\n");
    assert.ok(!seen.has(key), `${tier.id} reaction is distinct`);
    seen.add(key);
  }
  assert.throws(() => reactionFor("constructor"), /No reaction/);
});
