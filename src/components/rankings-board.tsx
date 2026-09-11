"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
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
import { playerById, players } from "@/lib/players";
import { cloneRanking, initialRanking, tiers, type RankingState, type Tier } from "@/lib/ranking-state";

const positions = ["ALL", "QB", "RB", "WR", "TE"] as const;
type PositionFilter = (typeof positions)[number];
const storageKey = "nfl-rankings-board";

export default function RankingsBoard() {
  const [ranking, setRanking] = useState<RankingState>(() => {
    if (typeof window === "undefined") return cloneRanking(initialRanking);
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return cloneRanking(initialRanking);
    try {
      return cloneRanking({ ...initialRanking, ...(JSON.parse(saved) as Partial<RankingState>) });
    } catch {
      window.localStorage.removeItem(storageKey);
      return cloneRanking(initialRanking);
    }
  });
  const [filter, setFilter] = useState<PositionFilter>("ALL");
  const [query, setQuery] = useState("");
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [hydrated] = useState(true);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(storageKey, JSON.stringify(ranking));
  }, [hydrated, ranking]);

  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (playerId: string) => {
      const player = playerById.get(playerId);
      if (!player) return false;
      const matchesPosition = filter === "ALL" || player.position === filter;
      const matchesQuery = !normalizedQuery || player.name.toLowerCase().includes(normalizedQuery);
      return matchesPosition && matchesQuery;
    };
  }, [filter, query]);

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
    setRanking(cloneRanking(initialRanking));
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

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={() => setActivePlayerId(null)}>
        <section className="rankings-list" aria-label="Player rankings">
          {tiers.map((tier) => (
            <TierGroup key={tier} tier={tier} playerIds={ranking[tier].filter(visible)} ranking={ranking} />
          ))}
        </section>
        <DragOverlay dropAnimation={null}>{activePlayerId && playerById.get(activePlayerId) ? <DragPreview player={playerById.get(activePlayerId)!} rank={Object.values(ranking).flat().indexOf(activePlayerId) + 1} /> : null}</DragOverlay>
        </DndContext>
      </main>
    </div>
  );
}

function TierGroup({ tier, playerIds, ranking }: { tier: Tier; playerIds: string[]; ranking: RankingState }) {
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

function PlayerRow({ player, rank }: { player: (typeof players)[number]; rank: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: player.id });
  return <div ref={setNodeRef} className={`player-row ${isDragging ? "is-dragging" : ""}`} style={{ transform: CSS.Transform.toString(transform), transition }} {...attributes} {...listeners}>
    <span className="rank-number">{rank}.</span>
    <Image src={player.imageUrl} alt="" className="player-image" width={32} height={32} loading="lazy" unoptimized />
    <div className="player-name"><strong>{player.name}</strong><span>{player.position === "QB" ? "Quarterback" : player.position === "RB" ? "Running back" : player.position === "WR" ? "Wide receiver" : "Tight end"}</span></div>
    <span className={`position-pill position-${player.position.toLowerCase()}`}>{player.position}</span>
    <span className="team-code">{player.team}</span>
  </div>;
}

function DragPreview({ player, rank }: { player: (typeof players)[number]; rank: number }) {
  return <div className="drag-preview">
    <span className="rank-number">{rank}.</span>
    <Image src={player.imageUrl} alt="" className="player-image" width={32} height={32} unoptimized />
    <div className="player-name"><strong>{player.name}</strong></div>
    <span className={`position-pill position-${player.position.toLowerCase()}`}>{player.position}</span>
    <span className="team-code">{player.team}</span>
  </div>;
}