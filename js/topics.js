// @ts-check

/** Topic slugs in display order. The bank has one file per slug under data/questions/. */
export const TOPICS = Object.freeze([
  "animals-nature",
  "films-tv",
  "books-stories",
  "the-world",
  "psychology",
  "theory-revolution",
]);

/** @type {Map<string, string>} */
export const TOPIC_LABELS = new Map([
  ["animals-nature", "Animals & nature"],
  ["films-tv", "Films & TV"],
  ["books-stories", "Books & stories"],
  ["the-world", "The world"],
  ["psychology", "Psychology"],
  ["theory-revolution", "Theory & revolution"],
]);

/**
 * @param {string} slug
 * @returns {string}
 */
export function topicLabel(slug) {
  const label = TOPIC_LABELS.get(slug);
  if (label === undefined) throw new Error(`Unknown topic: ${slug}`);
  return label;
}
