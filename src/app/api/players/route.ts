import { NextResponse } from "next/server";

const positions = ["QB", "RB", "WR", "TE"] as const;
const sleeperEndpoint = "https://api.sleeper.app/v1/players/nfl";

type SleeperPlayer = {
  player_id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  team?: string | null;
  position?: string | null;
  fantasy_positions?: string[] | null;
  status?: string | null;
  search_rank?: number | null;
  depth_chart_order?: number | null;
};

type AppPlayer = {
  id: string;
  name: string;
  team: string;
  position: "QB" | "RB" | "WR" | "TE";
  imageUrl: string | null;
  sleeperId: string;
  searchRank: number | null;
  depthChartOrder: number | null;
};

const getPlayerName = (player: SleeperPlayer) =>
  player.full_name || [player.first_name, player.last_name].filter(Boolean).join(" ");

export async function GET() {
  try {
    const responses = await Promise.all(
      positions.map((position) =>
        fetch(`${sleeperEndpoint}?position=${position}&active=true`, {
          next: { revalidate: 21600 },
        }).then((response) => {
          if (!response.ok) throw new Error(`Sleeper returned ${response.status}`);
          return response.json() as Promise<Record<string, SleeperPlayer>>;
        }),
      ),
    );

    const players = new Map<string, AppPlayer>();
    for (const response of responses) {
      for (const player of Object.values(response)) {
        const position = player.position || player.fantasy_positions?.[0];
        const name = getPlayerName(player);
        if (!player.player_id || !name || !player.team || !positions.includes(position as typeof positions[number])) continue;
        if (player.status && player.status !== "Active") continue;
        const normalizedPosition = position as AppPlayer["position"];
        players.set(player.player_id, {
          id: `sleeper-${player.player_id}`,
          name,
          team: player.team,
          position: normalizedPosition,
          imageUrl: null,
          sleeperId: player.player_id,
          searchRank: player.search_rank ?? null,
          depthChartOrder: player.depth_chart_order ?? null,
        });
      }
    }

    return NextResponse.json([...players.values()], {
      headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load players" }, { status: 502 });
  }
}
