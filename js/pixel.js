// @ts-check

/**
 * A sprite is a palette from single characters to colour tokens, plus rows of equal length.
 * "." is transparent. Colour tokens name CSS custom properties without the leading dashes.
 * @typedef {object} Sprite
 * @property {Record<string, string>} palette
 * @property {string[]} rows
 */

/** @typedef {{ x: number, y: number, w: number, h: number, colour: string }} Rect */

export const TRANSPARENT = ".";
const SVG_NS = "http://www.w3.org/2000/svg";

/** @param {Sprite} sprite */
export function spriteSize(sprite) {
  const height = sprite.rows.length;
  const width = sprite.rows[0]?.length ?? 0;
  for (const row of sprite.rows) {
    if (row.length !== width) throw new Error(`Ragged sprite row: "${row}"`);
  }
  return { width, height };
}

/**
 * Horizontal runs of one colour become one rect each.
 * @param {Sprite} sprite
 * @returns {Rect[]}
 */
export function spriteToRects(sprite) {
  const { width, height } = spriteSize(sprite);
  /** @type {Rect[]} */
  const rects = [];
  for (let y = 0; y < height; y++) {
    const row = sprite.rows[y];
    let x = 0;
    while (x < width) {
      const key = row[x];
      if (key === TRANSPARENT) {
        x++;
        continue;
      }
      if (!Object.hasOwn(sprite.palette, key)) {
        throw new Error(`Unknown palette key "${key}" at ${x},${y}`);
      }
      let run = 1;
      while (x + run < width && row[x + run] === key) run++;
      rects.push({ x, y, w: run, h: 1, colour: sprite.palette[key] });
      x += run;
    }
  }
  return rects;
}

/**
 * Paints the overlay onto a copy of the base at the given offset. Overlay pixels past the base
 * edge are clipped.
 * @param {Sprite} base
 * @param {Sprite} overlay
 * @param {{ x: number, y: number }} offset
 * @returns {Sprite}
 */
export function compose(base, overlay, offset) {
  const { width } = spriteSize(base);
  const overlaySize = spriteSize(overlay);
  for (const [key, colour] of Object.entries(overlay.palette)) {
    if (Object.hasOwn(base.palette, key) && base.palette[key] !== colour) {
      throw new Error(`Palette conflict on "${key}": ${base.palette[key]} vs ${colour}`);
    }
  }
  const rows = base.rows.map((row, y) => {
    const oy = y - offset.y;
    if (oy < 0 || oy >= overlaySize.height) return row;
    let out = "";
    for (let x = 0; x < width; x++) {
      const ox = x - offset.x;
      const key = ox >= 0 && ox < overlaySize.width ? overlay.rows[oy][ox] : TRANSPARENT;
      out += key === TRANSPARENT ? row[x] : key;
    }
    return out;
  });
  return { palette: { ...base.palette, ...overlay.palette }, rows };
}

/**
 * A patch writes a run of palette characters into one row: [row, column, characters].
 * @typedef {[number, number, string]} Patch
 */

/**
 * Applies patches to a copy of the sprite. Throws if a patch runs past the edge.
 * @param {Sprite} sprite
 * @param {Patch[]} patches
 * @returns {Sprite}
 */
export function applyPatches(sprite, patches) {
  const { width, height } = spriteSize(sprite);
  const rows = sprite.rows.map((row) => row.split(""));
  for (const [y, x, letters] of patches) {
    if (y < 0 || y >= height || x < 0 || x + letters.length > width) {
      throw new Error(`Patch "${letters}" at ${x},${y} runs past the ${width}x${height} sprite`);
    }
    for (let i = 0; i < letters.length; i++) rows[y][x + i] = letters[i];
  }
  return { palette: sprite.palette, rows: rows.map((row) => row.join("")) };
}

/**
 * @param {Record<string, string>} colours token to concrete colour
 * @param {string} token
 */
function resolve(colours, token) {
  if (!Object.hasOwn(colours, token)) throw new Error(`No colour for token "${token}"`);
  return colours[token];
}

/**
 * Standalone SVG markup with concrete colours, for the favicon and for tests.
 * @param {Sprite} sprite
 * @param {Record<string, string>} colours
 */
export function spriteToSvgString(sprite, colours) {
  const { width, height } = spriteSize(sprite);
  const body = spriteToRects(sprite)
    .map(
      (r) =>
        `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${resolve(colours, r.colour)}"/>`,
    )
    .join("");
  return `<svg xmlns="${SVG_NS}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">${body}</svg>`;
}

/**
 * An <svg> element whose rect fills are CSS custom properties, so the stylesheet owns the
 * palette. An empty label marks the sprite decorative.
 * @param {Pick<Document, "createElementNS">} doc
 * @param {Sprite} sprite
 * @param {string} label
 */
export function paintSprite(doc, sprite, label) {
  const { width, height } = spriteSize(sprite);
  const svg = doc.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.classList.add("sprite");
  if (label) {
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", label);
  } else {
    svg.setAttribute("aria-hidden", "true");
  }
  for (const r of spriteToRects(sprite)) {
    const rect = doc.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", String(r.x));
    rect.setAttribute("y", String(r.y));
    rect.setAttribute("width", String(r.w));
    rect.setAttribute("height", String(r.h));
    rect.setAttribute("fill", `var(--${r.colour})`);
    svg.append(rect);
  }
  return svg;
}
