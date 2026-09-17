import type { Season } from "./model";

export const rulesForSeason = (season: Season) => {
  const numGames = season.shortened?.numGames ?? 82;
  return {
    numGames,
    overUnderCutoff: Math.ceil((36 * numGames) / 82),
    paceTarget: Math.round((10 * numGames) / 82),
  };
};
export type SurpriseRules = ReturnType<typeof rulesForSeason>;
// Multiply integers before division: 47 must not become 46.99999999999999.
export const projectWins = (
  rules: SurpriseRules,
  { l, w }: { l: number; w: number },
) => (w + l ? Math.floor((rules.numGames * w) / (w + l)) : 0);
export const surpriseWins = (rules: SurpriseRules, overUnder: number) =>
  Math.ceil(overUnder + rules.paceTarget);
