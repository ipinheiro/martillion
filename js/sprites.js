// @ts-check
import { applyPatches } from "./pixel.js";

/** @typedef {import("./pixel.js").Sprite} Sprite */
/** @typedef {import("./pixel.js").Patch} Patch */

/** Concrete colours for contexts without CSS (favicon, previews). Tokens match style.css. */
export const SPRITE_COLOURS = Object.freeze({
  red: "#C8102E",
  ink: "#1B1712",
  cream: "#F3E9D2",
  "cream-dim": "#E4D5B5",
  star: "#E8B923",
  skin: "#E9C9A0",
  grey: "#8C8478",
  "grey-light": "#B9B1A2",
});

/** Palette letters as used in the design canvas the art was drawn in. */
const PALETTE = Object.freeze({
  K: "ink",
  G: "grey",
  L: "grey-light",
  S: "skin",
  R: "red",
  C: "cream",
  Y: "star",
});

/** @param {string[]} rows */
const sprite = (rows) => ({ palette: PALETTE, rows });

/** Marx, level gaze. 32 x 32. Grey hair and beard with strands, red jacket, cream shirt. */
export const MARX = sprite([
  ".......LLL....LLLL.....LL.......",
  ".....LLLLLLL.LLLLLLLL.LLLLLLL...",
  "....LLLLLLLLLLLLLLLLLLLLLLLLLLL.",
  "...LLLGLLLLLLLLLLLLLLLLLLGLLLLL.",
  "..LLLGLLLLLLLLLLLLLLLLLLLLGLLLLL",
  "..LLGLLLLLSSSSSSSSSSSSSLLLLLGLLL",
  ".LLGLLLLLLSSSSSSSSSSSSSLLLLLLGLL",
  ".LLGLLLLLLSSSSSSSSSSSSSLLLLLLGLL",
  ".LGLLLLLLLSSSSSSSSSSSSSLLLLLLLGL",
  ".LGLLLLLLLSSSSSSSSSSSSSLLLLLLLGL",
  "..GLLLLLLLSSSSSSSSSSSSSLLLLLLLG.",
  "..LGLLLLLLSKKKSSSSSKKKSLLLLLLGL.",
  "...GLLLLLLSSCKSSSSSCKSSLLLLLLG..",
  "....LLLLLLSSSSSSSSSSSSSLLLLLL...",
  ".....LLLLLSSSSSSKSSSSSSLLLLL....",
  "......LLLLSSSSSKKSSSSSSLLLL.....",
  "......LLLLSSSSSSSSSSSSSLLLL.....",
  ".....LLLLLSGGGGGGGGGGGSLLLLL....",
  "....LLLLLLLLLGGKKKGGLLLLLLLLL...",
  "...LLLLLGLLLLLLGGGLLLLLLGLLLLL..",
  "..LLLLLGLLLLLLLLLLLLLLLLGLLLLLL.",
  "..LLLLLGLLLLLGLLLLLGLLLLGLLLLLL.",
  ".LLLLLLGLLLLLGLLLLLGLLLLGLLLLLLL",
  ".LLLLLLGLLLLLGLLLLLGLLLLGLLLLLLL",
  ".LLLLLLLGLLLLGLLLLLGLLLGLLLLLLLL",
  "..LLLLLLGLLLLGLLLLLGLLLGLLLLLLL.",
  "R..LLLLLLGLLLGLLLLLGLLLGLLLLLL.R",
  "RRR..LLLLLGLLGLLLLLGLLGLLLLL..RR",
  "RRRRR..LLLLLLLLLLLLLLLLLLL..RRRR",
  "RRRRRRRCCCLLLLLLLLLLLLLLCCCRRRRR",
  "RRRRRRRRRCCCCLLLLLLLLCCCCRRRRRRR",
  "RRRRRRRRRRCCCCCKKKKCCCCCRRRRRRRR",
]);

/** Sunglasses over the eyes, with a glint. @type {Patch[]} */
const SUNGLASSES = [
  [11, 10, "KKKKK"],
  [11, 18, "KKKKK"],
  [12, 10, "KYKKK"],
  [12, 15, "KKK"],
  [12, 18, "KKKKK"],
  [13, 10, "KKKKK"],
  [13, 18, "KKKKK"],
];

/** A hand over the eyes. @type {Patch[]} */
const PALM = [
  [9, 10, "KKKKKKKKKKKKK"],
  [10, 9, "KSSKSSKSSKSSSSK"],
  [11, 9, "KSSKSSKSSKSSSSK"],
  [12, 9, "KSSKSSKSSKSSSSK"],
  [13, 9, "KSSKSSKSSKSSSSK"],
  [14, 9, "KSSSSSSSSSSSSSK"],
  [15, 9, "KSSSSSSSSSSSSSK"],
  [16, 9, "KSSSSSSSSSSSSSK"],
  [17, 9, "KKKKKKKKKKKKKKK"],
];

/** A raised fist beside the beard, red sleeve below. @type {Patch[]} */
const FIST = [
  [16, 27, "SSS"],
  [17, 26, "SSSSS"],
  [18, 26, "SKSKS"],
  [19, 26, "SSSSS"],
  [20, 26, "SKKKS"],
  [21, 26, "SSSSS"],
  [22, 27, "RRR"],
  [23, 27, "RRRR"],
  [24, 27, "RRRRR"],
  [25, 27, "RRRRR"],
  [26, 27, "RRRRR"],
];

/** Happy closed eyes and a smile. @type {Patch[]} */
const CONTENT = [
  [10, 11, "KKK"],
  [10, 19, "KKK"],
  [11, 11, "SSS"],
  [11, 19, "SSS"],
  [12, 12, "SS"],
  [12, 19, "SS"],
  [13, 12, "KK"],
  [13, 19, "KK"],
  [18, 14, "KKKKK"],
];

/** One raised eyebrow and a red question mark. @type {Patch[]} */
const DOUBTFUL = [
  [10, 19, "KKK"],
  [11, 19, "SSS"],
  [0, 27, "RRR"],
  [1, 26, "R"],
  [1, 30, "R"],
  [2, 30, "R"],
  [3, 29, "R"],
  [4, 28, "R"],
  [6, 28, "R"],
];

/** Closed eyes and a trail of Zs. @type {Patch[]} */
const ASLEEP = [
  [11, 11, "SSS"],
  [11, 19, "SSS"],
  [12, 11, "KKK"],
  [12, 19, "KKK"],
  [0, 27, "KKKK"],
  [1, 29, "K"],
  [2, 28, "K"],
  [3, 27, "KKKK"],
  [5, 29, "KKK"],
  [6, 30, "K"],
  [7, 29, "KKK"],
];

/** Hammer and sickle, 16 x 16, ink. */
export const HAMMER_SICKLE = sprite([
  ".........KK.....",
  ".KKKKK....KKK...",
  ".KKKKK.....KKK..",
  ".KKKKK......KKK.",
  ".KKKKKK......KKK",
  "....KK.......KKK",
  ".....KK......KKK",
  "......KK.....KKK",
  ".......KK....KKK",
  "........KK..KKK.",
  ".........KKKKK..",
  "..........KKK...",
  ".........KKKK...",
  ".......KK...KK..",
  "......KK.....KK.",
  ".....KK.......KK",
]);

/** A five-point star, 16 x 16. */
export const STAR = sprite([
  ".......YY.......",
  ".......YY.......",
  "......YYYY......",
  "......YYYY......",
  ".....YYYYYY.....",
  "YYYYYYYYYYYYYYYY",
  ".YYYYYYYYYYYYYY.",
  "..YYYYYYYYYYYY..",
  "...YYYYYYYYYY...",
  "....YYYYYYYY....",
  "....YYYYYYYY....",
  "...YYYYYYYYYYY..",
  "...YYYY..YYYY...",
  "..YYY......YYY..",
  ".YY..........YY.",
  "Y..............Y",
]);

/** @type {Map<string, { patches: Patch[], label: string }>} */
const REACTIONS = new Map([
  ["full-marx", { patches: SUNGLASSES, label: "Marx, delighted, in sunglasses" }],
  ["vanguard", { patches: FIST, label: "Marx, fist raised" }],
  ["comrade", { patches: CONTENT, label: "Marx, content" }],
  ["masses", { patches: [], label: "Marx, unmoved" }],
  ["utopian", { patches: DOUBTFUL, label: "Marx, doubtful" }],
  ["false-consciousness", { patches: PALM, label: "Marx, hand over his face" }],
  ["no-answer", { patches: ASLEEP, label: "Marx, asleep" }],
]);

/** Marx in sunglasses, for the title screen. */
export const MARX_HERO = applyPatches(MARX, SUNGLASSES);

/** @param {string} tierId */
export function reactionFor(tierId) {
  const reaction = REACTIONS.get(tierId);
  if (!reaction) throw new Error(`No reaction for tier ${tierId}`);
  return { sprite: applyPatches(MARX, reaction.patches), label: reaction.label };
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
