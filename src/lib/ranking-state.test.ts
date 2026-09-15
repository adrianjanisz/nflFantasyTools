import { describe, expect, it } from "vitest";
import { cloneRanking, createDefaultRanking, getPositionRanks, normalizeRanking, tiers, type RankingState } from "./ranking-state";

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

describe("createDefaultRanking", () => {
  it("puts players in tier I by Sleeper search rank, then depth-chart order", () => {
    const ranking = createDefaultRanking([
      { id: "wilson", name: "Garrett Wilson", team: "NYJ", position: "WR", imageUrl: null, depthChartOrder: 1 },
      { id: "mahomes", name: "Patrick Mahomes", team: "KC", position: "QB", imageUrl: null, searchRank: 2, depthChartOrder: 1 },
      { id: "allen", name: "Josh Allen", team: "BUF", position: "QB", imageUrl: null, searchRank: 1, depthChartOrder: 1 },
      { id: "kelce", name: "Travis Kelce", team: "KC", position: "TE", imageUrl: null, depthChartOrder: 2 },
      { id: "gibbs", name: "Jahmyr Gibbs", team: "DET", position: "RB", imageUrl: null, searchRank: 5, depthChartOrder: 1 },
      { id: "robinson", name: "Bijan Robinson", team: "ATL", position: "RB", imageUrl: null, searchRank: 5, depthChartOrder: 2 },
    ]);

    expect(ranking.I).toEqual(["allen", "mahomes", "gibbs", "robinson", "wilson", "kelce"]);
    expect(tiers.filter((tier) => tier !== "I").every((tier) => ranking[tier].length === 0)).toBe(true);
  });
});

describe("getPositionRanks", () => {
  it("numbers each position in tier and player order", () => {
    const ranking: RankingState = { S: ["allen", "gibbs"], A: ["hurts", "bijan"], B: [], C: [], D: [], E: [], F: [], G: [], H: [], I: [] };
    const playerById = new Map([
      ["allen", { id: "allen", name: "Josh Allen", team: "BUF", position: "QB" as const, imageUrl: null }],
      ["gibbs", { id: "gibbs", name: "Jahmyr Gibbs", team: "DET", position: "RB" as const, imageUrl: null }],
      ["hurts", { id: "hurts", name: "Jalen Hurts", team: "PHI", position: "QB" as const, imageUrl: null }],
      ["bijan", { id: "bijan", name: "Bijan Robinson", team: "ATL", position: "RB" as const, imageUrl: null }],
    ]);

    expect(getPositionRanks(ranking, playerById)).toEqual(new Map([["allen", 1], ["gibbs", 1], ["hurts", 2], ["bijan", 2]]));
  });
});
