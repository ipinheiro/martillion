// @ts-check
import { compose } from "./pixel.js";

/** @typedef {import("./pixel.js").Sprite} Sprite */

/** Concrete colours for contexts without CSS (favicon, previews). Tokens match style.css. */
export const SPRITE_COLOURS = Object.freeze({
  red: "#C8102E",
  ink: "#1B1712",
  cream: "#F3E9D2",
  "cream-dim": "#E4D5B5",
  star: "#E8B923",
  skin: "#E9C9A0",
});

const PALETTE = Object.freeze({
  "#": "ink",
  r: "red",
  c: "cream",
  d: "cream-dim",
  y: "star",
  s: "skin",
});

/** @param {string[]} rows */
const sprite = (rows) => ({ palette: PALETTE, rows });

/** Marx, level gaze. 32 x 32. Hair and beard in ink, jacket in red, shirt in cream. */
export const MARX = sprite([
  "..........############..........",
  ".......##################.......",
  ".....######################.....",
  "....########################....",
  "..############################..",
  ".##############################.",
  ".##############################.",
  ".#######ssssssssssssssss#######.",
  ".######ssssssssssssssssss######.",
  "..####ssssssssssssssssssss####..",
  "..####ss####ssssssss####ss####..",
  ".####sssss##ssssssss##sssss####.",
  ".####sssss##ssssssss##sssss####.",
  "..###ssssssssss##ssssssssss###..",
  "..###sssssssss#ss#sssssssss###..",
  "..###sss################sss###..",
  "..############################..",
  "..############ssss############..",
  "..############################..",
  "..############################..",
  "..############################..",
  "...##########################...",
  "....########################....",
  ".....######################.....",
  ".......##################.......",
  ".........##############.........",
  "....rrrrrrr##########rrrrrrr....",
  "...rrrrrrrrr########rrrrrrrrr...",
  "..rrrrrrrrrrr######rrrrrrrrrrr..",
  "..rrrrrrrrrrrccccccrrrrrrrrrrr..",
  "..rrrrrrrrrrrrccccrrrrrrrrrrrr..",
  "..rrryrrrrrrrrrccrrrrrrrrrrrrr..",
]);

/** Sunglasses, 20 x 4, placed at (6, 10). */
const SUNGLASSES = sprite([
  "#########..#########",
  "#y################y#",
  "#########..#########",
  ".#######....#######.",
]);

/** A five-point star, 5 x 5. */
export const STAR = sprite(["..y..", ".yyy.", "yyyyy", ".yyy.", "..y.."]);

/** Closed eyes, 12 x 2, placed at (10, 11). */
const EYES_CLOSED = sprite(["ss........ss", "##........##"]);

/** Happy closed eyes, 14 x 2, placed at (9, 11). */
const EYES_HAPPY = sprite(["s#s.......s#s.", "#s#.......#s#."]);

/** One raised eyebrow, 4 x 2, placed at (20, 9). */
const BROW_RAISED = sprite(["####", "ssss"]);

/** Question mark, 5 x 7, placed at (26, 0). */
const QUERY = sprite([".yyy.", "y...y", "....y", "...y.", "..y..", ".....", "..y.."]);

/** Big Z, 5 x 5, placed at (26, 0). */
const BIG_Z = sprite(["yyyyy", "...y.", "..y..", ".y...", "yyyyy"]);

/** Small z, 3 x 3, placed at (23, 5). */
const SMALL_Z = sprite(["yyy", ".y.", "yyy"]);

/** Raised fist with sleeve, 8 x 10, placed at (23, 13). */
const FIST = sprite([
  "..#####.",
  ".#sssss#",
  ".#s#s#s#",
  ".#sssss#",
  ".#s#s#s#",
  ".#sssss#",
  "..##sss#",
  "..#cccc#",
  "..#rrrr#",
  "..#rrrr#",
]);

/** Hand over the face, 13 x 10, placed at (4, 8). */
const PALM = sprite([
  ".##.##.##.##.",
  ".ss.ss.ss.ss.",
  "#ss#ss#ss#ss#",
  "#ss#ss#ss#ss#",
  "#ss#ss#ss#ss#",
  "#ssssssssss#.",
  "#ssssssssss#.",
  "#ssssssssss#.",
  ".#sssssssss#.",
  "..#########..",
]);

/** Hammer and sickle, 16 x 16, ink. */
export const HAMMER_SICKLE = sprite([
  ".....######.....",
  "...##......##...",
  "..#..........#..",
  ".#............#.",
  ".#..........###.",
  ".#.........#####",
  ".#........#####.",
  ".#.......####..#",
  "..#.....##.....#",
  "..#....##......#",
  "...#..##......#.",
  "....####.....#..",
  "...###.....##...",
  "..##.....###....",
  ".##.............",
  "................",
]);

/**
 * @typedef {object} Layer
 * @property {Sprite} sprite
 * @property {number} x
 * @property {number} y
 */

/** @type {(sprite: Sprite, x: number, y: number) => Layer} */
const at = (sprite, x, y) => ({ sprite, x, y });

/** @type {Map<string, { layers: Layer[], label: string }>} */
const REACTIONS = new Map([
  [
    "full-marx",
    { layers: [at(SUNGLASSES, 6, 10), at(STAR, 27, 0)], label: "Marx, delighted, in sunglasses" },
  ],
  ["vanguard", { layers: [at(FIST, 23, 13)], label: "Marx, fist raised" }],
  ["comrade", { layers: [at(EYES_HAPPY, 9, 11)], label: "Marx, content" }],
  ["masses", { layers: [], label: "Marx, unmoved" }],
  ["utopian", { layers: [at(BROW_RAISED, 20, 9), at(QUERY, 26, 0)], label: "Marx, doubtful" }],
  ["false-consciousness", { layers: [at(PALM, 4, 8)], label: "Marx, hand over his face" }],
  [
    "no-answer",
    {
      layers: [at(EYES_CLOSED, 10, 11), at(BIG_Z, 26, 0), at(SMALL_Z, 23, 5)],
      label: "Marx, asleep",
    },
  ],
]);

/** @param {Layer[]} layers */
function build(layers) {
  return layers.reduce(
    (base, layer) => compose(base, layer.sprite, { x: layer.x, y: layer.y }),
    MARX,
  );
}

/** Marx in sunglasses, for the title screen. */
export const MARX_HERO = build([at(SUNGLASSES, 6, 10)]);

/** @param {string} tierId */
export function reactionFor(tierId) {
  const reaction = REACTIONS.get(tierId);
  if (!reaction) throw new Error(`No reaction for tier ${tierId}`);
  return { sprite: build(reaction.layers), label: reaction.label };
}

/** Every sprite worth looking at, for the preview script and the well-formedness test. */
export function previewSprites() {
  /** @type {Map<string, Sprite>} */
  const all = new Map([
    ["marx", MARX],
    ["marx-hero", MARX_HERO],
    ["hammer-sickle", HAMMER_SICKLE],
    ["star", STAR],
  ]);
  for (const tierId of REACTIONS.keys()) {
    all.set(`reaction-${tierId}`, reactionFor(tierId).sprite);
  }
  return all;
}
