import { stageForScore, tierInfo } from "./scorer.js";

export function shareText(roundPoints, total) {
  const stage = stageForScore(total);
  const emojis = roundPoints.map((points) => tierInfo(points).emoji).join("");
  return `Martillion ✊ ${total} - ${stage.verdict}\n${emojis}`;
}

export async function copyShare(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
