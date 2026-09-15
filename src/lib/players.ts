export type Position = "QB" | "RB" | "WR" | "TE";

export type Player = {
  id: string;
  name: string;
  team: string;
  position: Position;
  imageUrl: string | null;
  searchRank?: number | null;
  depthChartOrder?: number | null;
};

export const players: Player[] = [
  { id: "gibbs", name: "Jahmyr Gibbs", team: "DET", position: "RB", imageUrl: null },
  { id: "bijan", name: "Bijan Robinson", team: "ATL", position: "RB", imageUrl: null },
  { id: "chase", name: "Ja'Marr Chase", team: "CIN", position: "WR", imageUrl: null },
  { id: "puka", name: "Puka Nacua", team: "LAR", position: "WR", imageUrl: null },
  { id: "mccaffrey", name: "Christian McCaffrey", team: "SF", position: "RB", imageUrl: null },
  { id: "amon-ra", name: "Amon-Ra St. Brown", team: "DET", position: "WR", imageUrl: null },
  { id: "jsn", name: "Jaxon Smith-Njigba", team: "SEA", position: "WR", imageUrl: null },
  { id: "taylor", name: "Jonathan Taylor", team: "IND", position: "RB", imageUrl: null },
  { id: "ceedee", name: "CeeDee Lamb", team: "DAL", position: "WR", imageUrl: null },
  { id: "cook", name: "James Cook", team: "BUF", position: "RB", imageUrl: null },
  { id: "jefferson", name: "Justin Jefferson", team: "MIN", position: "WR", imageUrl: null },
  { id: "brown", name: "Chase Brown", team: "CIN", position: "RB", imageUrl: null },
  { id: "achane", name: "De'Von Achane", team: "MIA", position: "RB", imageUrl: null },
  { id: "hampton", name: "Omarion Hampton", team: "LAC", position: "RB", imageUrl: null },
  { id: "barkley", name: "Saquon Barkley", team: "PHI", position: "RB", imageUrl: null },
  { id: "walker", name: "Kenneth Walker III", team: "SEA", position: "RB", imageUrl: null },
  { id: "allen", name: "Josh Allen", team: "BUF", position: "QB", imageUrl: null },
  { id: "hurts", name: "Jalen Hurts", team: "PHI", position: "QB", imageUrl: null },
  { id: "lamar", name: "Lamar Jackson", team: "BAL", position: "QB", imageUrl: null },
  { id: "laporta", name: "Sam LaPorta", team: "DET", position: "TE", imageUrl: null },
];

export const playerById = new Map(players.map((player) => [player.id, player]));
