// @ts-check

/** @param {import("./game.js").Summary} summary */
export function shareText(summary) {
  const emojis = summary.rounds.map((round) => round.tier.emoji).join("");
  return `Martillion ✊ ${summary.total} - ${summary.stage.verdict}\n${emojis}`;
}

/**
 * @param {string} text
 * @param {Pick<Clipboard, "writeText"> | undefined} [clipboard] defaults to the browser clipboard
 */
export async function copyShare(text, clipboard = globalThis.navigator?.clipboard) {
  if (!text) return false;
  try {
    if (!clipboard) throw new Error("Clipboard API unavailable (insecure context?)");
    await clipboard.writeText(text);
    return true;
  } catch (error) {
    console.warn("clipboard write failed", error);
    return false;
  }
}
