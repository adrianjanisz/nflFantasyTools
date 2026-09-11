export type Position = "QB" | "RB" | "WR" | "TE";

export type Player = {
  id: string;
  name: string;
  team: string;
  position: Position;
  imageUrl: string;
};

const espnHeadshot = (id: string) =>
  `https://a.espncdn.com/i/headshots/nfl/players/full/${id}.png`;

export const players: Player[] = [
  { id: "gibbs", name: "Jahmyr Gibbs", team: "DET", position: "RB", imageUrl: espnHeadshot("4429795") },
  { id: "bijan", name: "Bijan Robinson", team: "ATL", position: "RB", imageUrl: espnHeadshot("4430807") },
  { id: "chase", name: "Ja'Marr Chase", team: "CIN", position: "WR", imageUrl: espnHeadshot("4362628") },
  { id: "puka", name: "Puka Nacua", team: "LAR", position: "WR", imageUrl: espnHeadshot("4427366") },
  { id: "mccaffrey", name: "Christian McCaffrey", team: "SF", position: "RB", imageUrl: espnHeadshot("3117251") },
  { id: "amon-ra", name: "Amon-Ra St. Brown", team: "DET", position: "WR", imageUrl: espnHeadshot("4374302") },
  { id: "jsn", name: "Jaxon Smith-Njigba", team: "SEA", position: "WR", imageUrl: espnHeadshot("4430878") },
  { id: "taylor", name: "Jonathan Taylor", team: "IND", position: "RB", imageUrl: espnHeadshot("4241417") },
  { id: "ceedee", name: "CeeDee Lamb", team: "DAL", position: "WR", imageUrl: espnHeadshot("4047646") },
  { id: "cook", name: "James Cook", team: "BUF", position: "RB", imageUrl: espnHeadshot("4361529") },
  { id: "jefferson", name: "Justin Jefferson", team: "MIN", position: "WR", imageUrl: espnHeadshot("4262921") },
  { id: "brown", name: "Chase Brown", team: "CIN", position: "RB", imageUrl: espnHeadshot("4429275") },
  { id: "achane", name: "De'Von Achane", team: "MIA", position: "RB", imageUrl: espnHeadshot("4685690") },
  { id: "hampton", name: "Omarion Hampton", team: "LAC", position: "RB", imageUrl: espnHeadshot("4688806") },
  { id: "barkley", name: "Saquon Barkley", team: "PHI", position: "RB", imageUrl: espnHeadshot("3929630") },
  { id: "walker", name: "Kenneth Walker III", team: "KC", position: "RB", imageUrl: espnHeadshot("4430800") },
  { id: "allen", name: "Josh Allen", team: "BUF", position: "QB", imageUrl: espnHeadshot("3918299") },
  { id: "hurts", name: "Jalen Hurts", team: "PHI", position: "QB", imageUrl: espnHeadshot("4040715") },
  { id: "lamar", name: "Lamar Jackson", team: "BAL", position: "QB", imageUrl: espnHeadshot("3916387") },
  { id: "laporta", name: "Sam LaPorta", team: "DET", position: "TE", imageUrl: espnHeadshot("4427365") },
];

export const playerById = new Map(players.map((player) => [player.id, player]));