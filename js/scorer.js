export const TIERS = {
  100: { name: "Full Marx", emoji: "⭐" },
  85: { name: "Vanguard", emoji: "🚩" },
  60: { name: "Comrade", emoji: "✊" },
  30: { name: "The Masses", emoji: "👥" },
  15: { name: "Utopian", emoji: "💭" },
  10: { name: "False Consciousness", emoji: "🐑" },
  0: { name: "No answer", emoji: "⬛" },
};

const STAGES = [
  {
    min: 650,
    name: "Full communism",
    verdict: "Full communism achieved",
    flavour: "The state has withered away. Utopia, scientifically.",
  },
  {
    min: 500,
    name: "Socialism",
    verdict: "Socialism achieved",
    flavour: "From each according to their ability. Ability detected.",
  },
  {
    min: 350,
    name: "Revolution brewing",
    verdict: "Revolution brewing",
    flavour: "A spectre is haunting this quiz.",
  },
  {
    min: 200,
    name: "Capitalism",
    verdict: "Stuck in capitalism",
    flavour: "You have nothing to lose but your chains.",
  },
  {
    min: 0,
    name: "Feudalism",
    verdict: "Stuck in feudalism",
    flavour: "The material conditions were not yet ripe.",
  },
];

export const PLAN_TARGET = 2000;

export function tierInfo(points) {
  return TIERS[points];
}

export function stageForScore(total) {
  return STAGES.find((stage) => total >= stage.min);
}

export function fiveYearPlans(totalPoints) {
  return {
    completed: Math.floor(totalPoints / PLAN_TARGET),
    progress: totalPoints % PLAN_TARGET,
    target: PLAN_TARGET,
  };
}
