import { describe, expect, it } from "vitest";
import { cloneRanking, normalizeRanking, tiers, type RankingState } from "./ranking-state";

describe("normalizeRanking", () => {
  it("keeps only string player IDs and supplies every tier", () => {
    const ranking = normalizeRanking({ S: ["gibbs", 12, null], I: ["allen"] });

    expect(ranking.S).toEqual(["gibbs"]);
    expect(ranking.I).toEqual(["allen"]);
    expect(tiers.every((tier) => Array.isArray(ranking[tier]))).toBe(true);
  });

  it("turns malformed saved data into an empty ranking", () => {
    const ranking = normalizeRanking("not a ranking");

    expect(tiers.every((tier) => ranking[tier].length === 0)).toBe(true);
  });
});

describe("cloneRanking", () => {
  it("does not mutate the saved ranking when a tier is edited", () => {
    const source: RankingState = { S: ["gibbs"], A: [], B: [], C: [], D: [], E: [], F: [], G: [], H: [], I: ["allen"] };
    const copy = cloneRanking(source);
    copy.S.push("bijan");

    expect(source.S).toEqual(["gibbs"]);
    expect(copy.S).toEqual(["gibbs", "bijan"]);
  });
});
