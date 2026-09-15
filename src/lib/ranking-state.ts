export const tiers = ["S", "A", "B", "C", "D", "E", "F", "G", "H", "I"] as const;

export type Tier = (typeof tiers)[number];

export type RankingState = Record<Tier, string[]>;

const emptyRanking = (): RankingState => Object.fromEntries(tiers.map((tier) => [tier, []])) as unknown as RankingState;

export const normalizeRanking = (value: unknown): RankingState => {
  if (!value || typeof value !== "object") return emptyRanking();
  const stored = value as Partial<Record<Tier, unknown>>;
  return Object.fromEntries(tiers.map((tier) => [tier, Array.isArray(stored[tier]) ? stored[tier].filter((id): id is string => typeof id === "string") : []])) as RankingState;
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
