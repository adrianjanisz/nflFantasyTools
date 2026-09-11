export const tiers = ["S", "A", "B", "C", "D", "E", "F", "G", "H", "I"] as const;

export type Tier = (typeof tiers)[number];

export type RankingState = Record<Tier, string[]>;

export const initialRanking: RankingState = {
  S: ["gibbs", "bijan", "chase"],
  A: ["puka", "mccaffrey", "amon-ra", "jsn", "taylor"],
  B: ["ceedee", "cook", "jefferson", "brown", "achane", "hampton", "barkley", "walker"],
  C: ["ceedee", "cook", "jefferson", "brown", "achane", "hampton", "barkley", "walker"],
  D: ["allen", "hurts"],
  E: ["lamar"],
  F: ["laporta"],
  G: [],
  H: [],
  I: [],
};

export const cloneRanking = (ranking: RankingState): RankingState => ({
  S: [...ranking.S],
  A: [...ranking.A],
  B: [...ranking.B],
  C: [...ranking.C],
  D: [...(ranking.D ?? [])],
  E: [...(ranking.E ?? [])],
  F: [...(ranking.F ?? [])],
  G: [...(ranking.G ?? [])],
  H: [...(ranking.H ?? [])],
  I: [...(ranking.I ?? [])],
});