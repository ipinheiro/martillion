import { matchAnswer } from "./matcher.js";
import { tierInfo, stageForScore } from "./scorer.js";

export const ROUNDS = 7;
export const MAX_PER_TOPIC = 2;
export const RECENT_LIMIT = 40;

function shuffle(items, rng) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function sampleQuestions(bank, recentIds, rng) {
  let pool = bank.filter((question) => !recentIds.includes(question.id));
  if (pool.length < ROUNDS) pool = [...bank];
  const picked = [];
  const perTopic = new Map();

  function take(candidates) {
    for (const question of candidates) {
      if (picked.some((p) => p.id === question.id)) continue;
      const count = perTopic.get(question.topic) ?? 0;
      if (count >= MAX_PER_TOPIC) continue;
      picked.push(question);
      perTopic.set(question.topic, count + 1);
      if (picked.length === ROUNDS) return;
    }
  }

  take(shuffle(pool, rng));
  if (picked.length < ROUNDS) take(shuffle(bank, rng));
  return picked;
}

export function updateRecent(recentIds, playedIds) {
  return [...recentIds, ...playedIds].slice(-RECENT_LIMIT);
}

export function createUprising(questions) {
  const rounds = [];
  return {
    get round() { return rounds.length; },
    isOver: () => rounds.length >= questions.length,
    current: () => questions[rounds.length],
    submit(input) {
      const question = questions[rounds.length];
      const { points, answer } = matchAnswer(input, question.answers);
      const result = {
        questionId: question.id,
        prompt: question.prompt,
        input,
        matchedAnswer: answer,
        points,
        tier: tierInfo(points),
      };
      rounds.push(result);
      return result;
    },
    summary() {
      const total = rounds.reduce((sum, result) => sum + result.points, 0);
      return { total, rounds: [...rounds], stage: stageForScore(total) };
    },
  };
}
