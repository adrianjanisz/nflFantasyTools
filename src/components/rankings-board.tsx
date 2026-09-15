"use client";

import { useEffect, useMemo, useState } from "react";
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
import { cloneRanking, initialRanking, tiers, type RankingState, type Tier } from "@/lib/ranking-state";

const positions = ["ALL", "QB", "RB", "WR", "TE"] as const;
type PositionFilter = (typeof positions)[number];
const storageKey = "nfl-rankings-board-v2";
const positionOrder: Record<Player["position"], number> = { QB: 0, RB: 1, WR: 2, TE: 3 };
const sortedPlayerIds = (catalog: Player[]) => [...catalog]
  .sort((left, right) => positionOrder[left.position] - positionOrder[right.position] || left.name.localeCompare(right.name))
  .map((player) => player.id);
const emptyTierRanking = (): RankingState => ({ S: [], A: [], B: [], C: [], D: [], E: [], F: [], G: [], H: [], I: sortedPlayerIds(seedPlayers) });

export default function RankingsBoard() {
  const [players, setPlayers] = useState<Player[]>(seedPlayers);
  const playerById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  // Keep the first browser render identical to the server render. Saved board
  // data is restored only after React has hydrated the page.
  const [ranking, setRanking] = useState<RankingState>(emptyTierRanking);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const restoreSavedRanking = window.setTimeout(() => {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        try {
          setRanking(cloneRanking({ ...initialRanking, ...(JSON.parse(saved) as Partial<RankingState>) }));
        } catch {
          window.localStorage.removeItem(storageKey);
        }
      }
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(restoreSavedRanking);
  }, []);

  const [filter, setFilter] = useState<PositionFilter>("ALL");
  const [query, setQuery] = useState("");
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(storageKey, JSON.stringify(ranking));
  }, [hydrated, ranking]);

  useEffect(() => {
    fetch("/api/players")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Unable to load Sleeper players")))
      .then((livePlayers: Array<Player & { sleeperId?: string }>) => {
        const liveByName = new Map(livePlayers.map((player) => [player.name.toLowerCase(), player]));
        const mergedCatalog = [
          ...seedPlayers.map((player) => {
            const live = liveByName.get(player.name.toLowerCase());
            return live ? { ...player, team: live.team, position: live.position, imageUrl: live.imageUrl || player.imageUrl } : player;
          }),
          ...livePlayers.filter((player) => !seedPlayers.some((seed) => seed.name.toLowerCase() === player.name.toLowerCase())),
        ];
        setPlayers((current) => {
          const currentByName = new Map(current.map((player) => [player.name.toLowerCase(), player]));
          const merged = mergedCatalog.map((player) => {
            const existing = currentByName.get(player.name.toLowerCase());
            if (existing && existing.id !== player.id) return { ...existing, team: player.team, position: player.position, imageUrl: player.imageUrl || existing.imageUrl };
            const live = liveByName.get(player.name.toLowerCase());
            return live ? { ...player, team: live.team, position: live.position, imageUrl: live.imageUrl || player.imageUrl } : player;
          });
          return merged;
        });
        setRanking((current) => {
          const hasPlacedPlayers = tiers.some((tier) => tier !== "I" && current[tier].length > 0);
          const rankedIds = new Set(Object.values(current).flat());
          const rankedNames = new Set(
            Object.values(current).flat().map((id) => {
              const seed = seedPlayers.find((player) => player.id === id);
              return seed?.name.toLowerCase();
            }).filter(Boolean),
          );
          const newPlayers = livePlayers.filter((player) => !rankedIds.has(player.id) && !rankedNames.has(player.name.toLowerCase()));
          if (hasPlacedPlayers) return newPlayers.length ? { ...current, I: [...current.I, ...newPlayers.map((player) => player.id)] } : current;
          return { ...current, I: sortedPlayerIds(mergedCatalog) };
        });
      })
      .catch(() => undefined);
  }, []);

  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (playerId: string) => {
      const player = playerById.get(playerId);
      if (!player) return false;
      const matchesPosition = filter === "ALL" || player.position === filter;
      const matchesQuery = !normalizedQuery || player.name.toLowerCase().includes(normalizedQuery);
      return matchesPosition && matchesQuery;
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

  const reset = () => {
    setRanking({ S: [], A: [], B: [], C: [], D: [], E: [], F: [], G: [], H: [], I: sortedPlayerIds(players) });
    window.localStorage.removeItem(storageKey);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
          <div className="brand-mark" aria-label="Rankings home"><span>R</span><i /></div>
        <nav className="side-nav" aria-label="Main navigation">
          <button className="nav-item active" type="button"><span>▥</span>Rankings</button>
        </nav>
        <div className="sidebar-footer"><span className="status-dot" /> Local board</div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="product-lockup"><div className="product-title"><strong>Fantasy Rankings</strong></div></div>
          <div className="top-actions"><button className="reset-button" type="button" onClick={reset}>Reset board</button></div>
        </header>

        <section className="board-toolbar" aria-label="Ranking controls">
          <div className="league-controls"><label>Position:<span className="position-tabs" role="tablist" aria-label="Filter by position">{positions.map((position) => <button role="tab" aria-selected={filter === position} className={filter === position ? "selected" : ""} key={position} type="button" onClick={() => setFilter(position)}>{position === "ALL" ? "Overall" : position}</button>)}</span></label></div>
          <div className="toolbar-controls">
            <label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search for a player..." aria-label="Search players" /></label>
          </div>
        </section>

        <DndContext id="rankings-board" sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={() => setActivePlayerId(null)}>
        <section className="rankings-list" aria-label="Player rankings">
          {tiers.map((tier) => (
            <TierGroup key={tier} tier={tier} playerIds={ranking[tier].filter(visible)} ranking={ranking} playerById={playerById} />
          ))}
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
          if (!player) return null;
          return <PlayerRow key={player.id} player={player} rank={Object.values(ranking).flat().indexOf(playerId) + 1} />;
        })}
        {!playerIds.length && <div className="empty-tier">Drop players here</div>}
      </div>
    </SortableContext>
  </div>;
}

function PlayerRow({ player, rank }: { player: Player; rank: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: player.id });
  return <div ref={setNodeRef} className={`player-row ${isDragging ? "is-dragging" : ""}`} style={{ transform: CSS.Transform.toString(transform), transition }} {...attributes} {...listeners}>
    <span className="rank-number">{rank}.</span>
    <PlayerAvatar player={player} />
    <div className="player-name"><strong>{player.name}</strong><span>{player.position === "QB" ? "Quarterback" : player.position === "RB" ? "Running back" : player.position === "WR" ? "Wide receiver" : "Tight end"}</span></div>
    <span className={`position-pill position-${player.position.toLowerCase()}`}>{player.position}</span>
    <span className="team-code">{player.team}</span>
  </div>;
}

function DragPreview({ player, rank }: { player: Player; rank: number }) {
  return <div className="drag-preview">
    <span className="rank-number">{rank}.</span>
    <PlayerAvatar player={player} />
    <div className="player-name"><strong>{player.name}</strong></div>
    <span className={`position-pill position-${player.position.toLowerCase()}`}>{player.position}</span>
    <span className="team-code">{player.team}</span>
  </div>;
}

function PlayerAvatar({ player }: { player: Player }) {
  return <span className="player-image player-fallback" aria-hidden="true">{player.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>;
}
