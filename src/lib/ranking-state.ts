export const tiers = ["S", "A", "B", "C", "D", "E", "F", "G", "H", "I"] as const;

export type Tier = (typeof tiers)[number];

export type RankingState = Record<Tier, string[]>;

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
