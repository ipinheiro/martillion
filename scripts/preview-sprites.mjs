// @ts-check
// Dev tool: renders every sprite to a PNG at 8x on cream, for eyeballing.
// Usage: node scripts/preview-sprites.mjs   (writes to /tmp/martillion-sprites/)
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { spriteSize, spriteToRects } from "../js/pixel.js";
import { previewSprites, SPRITE_COLOURS } from "../js/sprites.js";

const SCALE = 8;
const OUT = "/tmp/martillion-sprites";

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

/** @param {Uint8Array} bytes */
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * @param {string} type
 * @param {Uint8Array} data
 */
function chunk(type, data) {
  const typed = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
}

/**
 * @param {number} width
 * @param {number} height
 * @param {Buffer} rgb width * height * 3 bytes
 */
function encodePng(width, height, rgb) {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** @param {string} hex like #C8102E */
function rgbOf(hex) {
  return [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
}

/** @param {import("../js/pixel.js").Sprite} sprite */
function render(sprite) {
  const { width, height } = spriteSize(sprite);
  const w = width * SCALE;
  const h = height * SCALE;
  const rgb = Buffer.alloc(w * h * 3);
  const paper = rgbOf(SPRITE_COLOURS.cream);
  for (let i = 0; i < w * h; i++) rgb.set(paper, i * 3);
  for (const rect of spriteToRects(sprite)) {
    const colour = rgbOf(SPRITE_COLOURS[rect.colour]);
    for (let y = rect.y * SCALE; y < (rect.y + rect.h) * SCALE; y++) {
      for (let x = rect.x * SCALE; x < (rect.x + rect.w) * SCALE; x++) {
        rgb.set(colour, (y * w + x) * 3);
      }
    }
  }
  return encodePng(w, h, rgb);
}

mkdirSync(OUT, { recursive: true });
for (const [name, sprite] of previewSprites()) {
  writeFileSync(`${OUT}/${name}.png`, render(sprite));
  console.log(`${OUT}/${name}.png`);
}
