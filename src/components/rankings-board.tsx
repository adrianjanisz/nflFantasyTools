"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { players as seedPlayers, type Player } from "@/lib/players";
import { cloneRanking, normalizeRanking, tiers, type RankingState, type Tier } from "@/lib/ranking-state";
import { createClient } from "@/lib/supabase/client";

const positions = ["ALL", "QB", "RB", "WR", "TE"] as const;
type PositionFilter = (typeof positions)[number];
type SaveStatus = "loading" | "saving" | "saved" | "error";

const positionOrder: Record<Player["position"], number> = { QB: 0, RB: 1, WR: 2, TE: 3 };
const sortedPlayerIds = (catalog: Player[]) => [...catalog]
  .sort((left, right) => positionOrder[left.position] - positionOrder[right.position] || left.name.localeCompare(right.name))
  .map((player) => player.id);
const emptyTierRanking = (catalog: Player[] = seedPlayers): RankingState => ({ S: [], A: [], B: [], C: [], D: [], E: [], F: [], G: [], H: [], I: sortedPlayerIds(catalog) });

export default function RankingsBoard({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [players, setPlayers] = useState<Player[]>(seedPlayers);
  const playerById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const [ranking, setRanking] = useState<RankingState>(emptyTierRanking);
  const [rankingReady, setRankingReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("loading");
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [filter, setFilter] = useState<PositionFilter>("ALL");
  const [query, setQuery] = useState("");
  const lastPersistedRanking = useRef<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    let cancelled = false;

    const loadRanking = async () => {
      const { data, error } = await supabase
        .from("user_rankings")
        .select("ranking")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setSaveStatus("error");
        setRankingReady(true);
        return;
      }

      if (data?.ranking) {
        const savedRanking = normalizeRanking(data.ranking);
        lastPersistedRanking.current = JSON.stringify(savedRanking);
        setRanking(savedRanking);
        setSaveStatus("saved");
      }

      setRankingReady(true);
    };

    void loadRanking();
    return () => { cancelled = true; };
  }, [supabase, userId]);

  useEffect(() => {
    fetch("/api/players")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Unable to load Sleeper players")))
      .then((livePlayers: Array<Player & { sleeperId?: string }>) => {
        const liveByName = new Map(livePlayers.map((player) => [player.name.toLowerCase(), player]));
        setPlayers([
          ...seedPlayers.map((player) => {
            const live = liveByName.get(player.name.toLowerCase());
            return live ? { ...player, team: live.team, position: live.position } : player;
          }),
          ...livePlayers.filter((player) => !seedPlayers.some((seed) => seed.name.toLowerCase() === player.name.toLowerCase())),
        ]);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!rankingReady) return;

    const reconcileTimer = window.setTimeout(() => {
      setRanking((current) => {
        const rankedIds = new Set(Object.values(current).flat());
        const newPlayerIds = sortedPlayerIds(players).filter((id) => !rankedIds.has(id));
        return newPlayerIds.length ? { ...current, I: [...current.I, ...newPlayerIds] } : current;
      });
    }, 0);

    return () => window.clearTimeout(reconcileTimer);
  }, [players, rankingReady]);

  useEffect(() => {
    if (!rankingReady) return;

    const serializedRanking = JSON.stringify(ranking);
    if (serializedRanking === lastPersistedRanking.current) return;

    const saveTimer = window.setTimeout(async () => {
      setSaveStatus("saving");
      const { error } = await supabase.from("user_rankings").upsert({
        user_id: userId,
        ranking,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        setSaveStatus("error");
        return;
      }

      lastPersistedRanking.current = serializedRanking;
      setSaveStatus("saved");
    }, 500);

    return () => window.clearTimeout(saveTimer);
  }, [ranking, rankingReady, supabase, userId]);

  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (playerId: string) => {
      const player = playerById.get(playerId);
      if (!player) return false;
      return (filter === "ALL" || player.position === filter) && (!normalizedQuery || player.name.toLowerCase().includes(normalizedQuery));
    };
  }, [filter, query, playerById]);

  const tierOf = (playerId: string, state: RankingState) => tiers.find((tier) => state[tier].includes(playerId));
  const handleDragStart = ({ active }: DragStartEvent) => setActivePlayerId(String(active.id));

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    setRanking((current) => {
      const sourceTier = tierOf(activeId, current);
      const destinationTier = overId.startsWith("tier:") ? overId.slice(5) as Tier : tierOf(overId, current);
      if (!sourceTier || !destinationTier || sourceTier === destinationTier) return current;
      const next = cloneRanking(current);
      next[sourceTier] = next[sourceTier].filter((id) => id !== activeId);
      const destinationIndex = overId.startsWith("tier:") ? next[destinationTier].length : next[destinationTier].indexOf(overId);
      next[destinationTier].splice(Math.max(0, destinationIndex), 0, activeId);
      return next;
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over) {
      const activeId = String(active.id);
      const overId = String(over.id);
      setRanking((current) => {
        const tier = tierOf(activeId, current);
        if (!tier || overId.startsWith("tier:") || tierOf(overId, current) !== tier || activeId === overId) return current;
        const oldIndex = current[tier].indexOf(activeId);
        const newIndex = current[tier].indexOf(overId);
        return oldIndex === newIndex ? current : { ...current, [tier]: arrayMove(current[tier], oldIndex, newIndex) };
      });
    }
    setActivePlayerId(null);
  };

  const reset = () => setRanking(emptyTierRanking(players));
  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };
  const saveMessage = saveStatus === "loading" ? "Loading board..." : saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved" : "Could not save";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark" aria-label="Rankings home"><span>R</span><i /></div>
        <nav className="side-nav" aria-label="Main navigation"><button className="nav-item active" type="button"><span>▦</span>Rankings</button></nav>
        <div className="sidebar-footer"><span className="status-dot" /> Cloud board</div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="product-lockup"><div className="product-title"><strong>Fantasy Rankings</strong></div></div>
          <div className="top-actions">
            <span className={`saved-label save-status-${saveStatus}`}>{saveMessage}</span>
            <button className="reset-button" type="button" onClick={reset}>Reset board</button>
            <button className="reset-button" type="button" onClick={() => void signOut()}>Sign out</button>
          </div>
        </header>

        <section className="board-toolbar" aria-label="Ranking controls">
          <div className="league-controls"><label>Position:<span className="position-tabs" role="tablist" aria-label="Filter by position">{positions.map((position) => <button role="tab" aria-selected={filter === position} className={filter === position ? "selected" : ""} key={position} type="button" onClick={() => setFilter(position)}>{position === "ALL" ? "Overall" : position}</button>)}</span></label></div>
          <div className="toolbar-controls"><label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search for a player..." aria-label="Search players" /></label></div>
        </section>

        <DndContext id="rankings-board" sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={() => setActivePlayerId(null)}>
          <section className="rankings-list" aria-label="Player rankings">
            {tiers.map((tier) => <TierGroup key={tier} tier={tier} playerIds={ranking[tier].filter(visible)} ranking={ranking} playerById={playerById} />)}
          </section>
          <DragOverlay dropAnimation={null}>{activePlayerId && playerById.get(activePlayerId) ? <DragPreview player={playerById.get(activePlayerId)!} rank={Object.values(ranking).flat().indexOf(activePlayerId) + 1} /> : null}</DragOverlay>
        </DndContext>
      </main>
    </div>
  );
}

function TierGroup({ tier, playerIds, ranking, playerById }: { tier: Tier; playerIds: string[]; ranking: RankingState; playerById: Map<string, Player> }) {
  const { setNodeRef } = useDroppable({ id: `tier:${tier}` });
  return <div className="tier-group" ref={setNodeRef}>
    <div className={`tier-label tier-${tier.toLowerCase()}`}><strong>{tier}</strong></div>
    <SortableContext items={playerIds} strategy={verticalListSortingStrategy}>
      <div className="tier-players">
        {playerIds.map((playerId) => {
          const player = playerById.get(playerId);
          return player ? <PlayerRow key={player.id} player={player} rank={Object.values(ranking).flat().indexOf(playerId) + 1} /> : null;
        })}
        {!playerIds.length && <div className="empty-tier">Drop players here</div>}
      </div>
    </SortableContext>
  </div>;
}

function PlayerRow({ player, rank }: { player: Player; rank: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: player.id });
  return <div ref={setNodeRef} className={`player-row ${isDragging ? "is-dragging" : ""}`} style={{ transform: CSS.Transform.toString(transform), transition }} {...attributes} {...listeners}>
    <span className="rank-number">{rank}.</span><PlayerAvatar player={player} />
    <div className="player-name"><strong>{player.name}</strong><span>{player.position === "QB" ? "Quarterback" : player.position === "RB" ? "Running back" : player.position === "WR" ? "Wide receiver" : "Tight end"}</span></div>
    <span className={`position-pill position-${player.position.toLowerCase()}`}>{player.position}</span><span className="team-code">{player.team}</span>
  </div>;
}

function DragPreview({ player, rank }: { player: Player; rank: number }) {
  return <div className="drag-preview"><span className="rank-number">{rank}.</span><PlayerAvatar player={player} /><div className="player-name"><strong>{player.name}</strong></div><span className={`position-pill position-${player.position.toLowerCase()}`}>{player.position}</span><span className="team-code">{player.team}</span></div>;
}

function PlayerAvatar({ player }: { player: Player }) {
  return <span className="player-image player-fallback" aria-hidden="true">{player.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>;
}
