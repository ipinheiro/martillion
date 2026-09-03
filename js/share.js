// @ts-check
import { normalize } from "./matcher.js";

/**
 * Score, verdict, one emoji per round, and, when the bank did not know something, the committee
 * line. Player input reaches the share only on that line and only through `normalize`, which
 * leaves letters, digits, and single spaces: nothing that could forge a score line.
 * @param {import("./game.js").Summary} summary
 */
export function shareText(summary) {
  const emojis = summary.rounds.map((round) => round.tier.emoji).join("");
  const lines = [`Martillion ✊ ${summary.total} - ${summary.stage.verdict}`, emojis];
  const misses = [...new Set(summary.rounds.flatMap((round) => round.unverified).map(normalize))];
  if (misses.length > 0) lines.push(`The committee could not verify: ${misses.join(", ")}`);
  return lines.join("\n");
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
