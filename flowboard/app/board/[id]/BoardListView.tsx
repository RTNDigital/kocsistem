"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import type { Card, Column, Label, Profile } from "@/types/domain";
import { AvatarStack } from "@/components/ui";
import { I } from "@/components/Icons";
import { fmtDate, dueState } from "@/lib/utils";
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import {
  attachClosestEdge,
  extractClosestEdge,
  type Edge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index";
import { DropIndicator } from "@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box";
import { useMoveCard } from "@/hooks/useBoard";

type GroupBy = "status" | "priority";

interface Props {
  boardId: string;
  cards: Card[];
  columns: Column[];
  labels: Label[];
  users: Profile[];
  actorId: string;
  onOpenCard: (id: string) => void;
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, med: 1, low: 2, none: 3 };

type ListDragData = { type: "list-card"; cardId: string; columnId: string };

function rec<T>(v: T): T & Record<string | symbol, unknown> {
  return v as T & Record<string | symbol, unknown>;
}

function parseListData(d: Record<string | symbol, unknown>): ListDragData | null {
  if (d.type === "list-card" && typeof d.cardId === "string")
    return d as unknown as ListDragData;
  return null;
}

// ---------------------------------------------------------------------------
// ListCardRow – individual draggable/droppable row
// ---------------------------------------------------------------------------
interface RowProps {
  card: Card;
  col: Column | undefined;
  cardLabels: { id: string; name: string; color: string }[];
  assigneeProfiles: Profile[];
  groupBy: GroupBy;
  onOpenCard: (id: string) => void;
}

function ListCardRow({ card, col, cardLabels, assigneeProfiles, groupBy, onOpenCard }: RowProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return combine(
      draggable({
        element: el,
        getInitialData: () =>
          rec<ListDragData>({ type: "list-card", cardId: card.id, columnId: card.column_id }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      }),
      dropTargetForElements({
        element: el,
        getData: ({ input }) =>
          attachClosestEdge(
            rec<ListDragData>({ type: "list-card", cardId: card.id, columnId: card.column_id }),
            { element: el, input, allowedEdges: ["top", "bottom"] }
          ),
        onDragEnter: ({ self }) => setClosestEdge(extractClosestEdge(self.data)),
        onDrag: ({ self }) => setClosestEdge(extractClosestEdge(self.data)),
        onDragLeave: () => setClosestEdge(null),
        onDrop: () => setClosestEdge(null),
        canDrop: ({ source }) => {
          const d = parseListData(source.data);
          return d !== null && d.cardId !== card.id;
        },
      }),
    );
  }, [card.id, card.column_id]);

  const due = dueState(card.due_at);
  const priColor =
    card.priority === "high" ? "var(--err)" :
    card.priority === "med"  ? "var(--warn)" :
    card.priority === "low"  ? "var(--ok)" : null;

  return (
    <div
      ref={ref}
      style={{ position: "relative", opacity: isDragging ? 0.4 : 1 }}
    >
      <button
        onClick={() => onOpenCard(card.id)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          width: "100%", textAlign: "left",
          padding: "8px 4px", border: 0,
          borderBottom: "1px solid var(--line)",
          background: "transparent", cursor: isDragging ? "grabbing" : "grab",
          color: "var(--ink)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        {/* Drag handle */}
        <span style={{ color: "var(--ink-4)", flexShrink: 0, display: "flex", alignItems: "center" }}>
          {I.drag}
        </span>

        {/* Priority dot */}
        {priColor ? (
          <span title={card.priority ?? ""} style={{ width: 8, height: 8, borderRadius: "50%", background: priColor, flexShrink: 0 }} />
        ) : (
          <span style={{ width: 8, height: 8, border: "1.5px solid var(--line-strong)", borderRadius: "50%", flexShrink: 0 }} />
        )}

        {/* Title */}
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {card.title}
        </span>

        {/* Label swatches */}
        <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
          {cardLabels.slice(0, 4).map((l) => (
            <span key={l.id} title={l.name} style={{ height: 4, width: 16, borderRadius: 2, background: l.color }} />
          ))}
        </div>

        {/* Status column (only shown when grouping by priority) */}
        {groupBy === "priority" && (
          <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)", width: 90, textAlign: "right", flexShrink: 0 }}>
            {col?.title ?? "—"}
          </span>
        )}

        {/* Checklist */}
        {card.checklist_count > 0 && (
          <span className="mono" style={{
            fontSize: 11, width: 36, textAlign: "right", flexShrink: 0,
            color: card.checklist_done === card.checklist_count ? "var(--ok)" : "var(--ink-4)",
          }}>
            {card.checklist_done}/{card.checklist_count}
          </span>
        )}

        {/* Due date */}
        <span className="mono" style={{
          fontSize: 11, width: 64, textAlign: "right", flexShrink: 0,
          color: due === "overdue" ? "var(--err)" : due === "soon" ? "var(--warn)" : "var(--ink-4)",
        }}>
          {card.due_at ? fmtDate(card.due_at) : "—"}
        </span>

        {/* Assignees */}
        <div style={{ width: 60, display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
          {assigneeProfiles.length > 0 && (
            <AvatarStack users={assigneeProfiles} size={20} max={3} />
          )}
        </div>
      </button>

      {closestEdge && <DropIndicator edge={closestEdge} gap="0px" />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BoardListView
// ---------------------------------------------------------------------------
export function BoardListView({ boardId, cards, columns, labels, users, actorId, onOpenCard }: Props) {
  const [groupBy, setGroupBy] = useState<GroupBy>("status");
  const moveCard = useMoveCard(boardId);

  const labelMap = useMemo(
    () => Object.fromEntries(labels.map((l) => [l.id, l])),
    [labels]
  );
  const userMap = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])),
    [users]
  );
  const colMap = useMemo(
    () => Object.fromEntries(columns.map((c) => [c.id, c])),
    [columns]
  );

  const sortedCards = useMemo(
    () => [...cards].sort((a, b) => a.position.localeCompare(b.position)),
    [cards]
  );

  const groups = useMemo(() => {
    const map = new Map<string, Card[]>();

    if (groupBy === "status") {
      columns.forEach((col) => map.set(col.title, []));
      sortedCards.forEach((c) => {
        const key = colMap[c.column_id]?.title ?? "—";
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(c);
      });
    } else {
      sortedCards.forEach((c) => {
        const key = c.priority ?? "none";
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(c);
      });
      return [...map.entries()].sort(
        (a, b) => (PRIORITY_ORDER[a[0]] ?? 9) - (PRIORITY_ORDER[b[0]] ?? 9)
      );
    }

    return [...map.entries()].filter(([, list]) => list.length > 0);
  }, [sortedCards, columns, colMap, groupBy]);

  useEffect(() => {
    return monitorForElements({
      onDrop({ source, location }) {
        const targets = location.current.dropTargets;
        if (targets.length === 0) return;

        const src = parseListData(source.data);
        if (!src) return;

        const targetData = parseListData(targets[0].data);
        if (!targetData || targetData.cardId === src.cardId) return;

        const movedCard = cards.find((c) => c.id === src.cardId);
        const targetCard = cards.find((c) => c.id === targetData.cardId);
        if (!movedCard || !targetCard) return;

        const toColumnId = targetCard.column_id;
        const siblingsInTargetCol = cards
          .filter((c) => c.column_id === toColumnId)
          .sort((a, b) => a.position.localeCompare(b.position));

        const edge = extractClosestEdge(targets[0].data);
        const targetIdx = siblingsInTargetCol.findIndex((c) => c.id === targetData.cardId);

        let toIndex: number;
        if (movedCard.column_id === toColumnId) {
          const fromIdx = siblingsInTargetCol.findIndex((c) => c.id === src.cardId);
          toIndex = getReorderDestinationIndex({
            startIndex: fromIdx,
            indexOfTarget: targetIdx,
            closestEdgeOfTarget: edge,
            axis: "vertical",
          });
          if (fromIdx === toIndex) return;
        } else {
          toIndex = edge === "bottom" ? targetIdx + 1 : targetIdx;
        }

        const siblingsExcludingMoved = siblingsInTargetCol
          .filter((c) => c.id !== src.cardId)
          .map((c) => c.id);

        moveCard.mutate({
          cardId: src.cardId,
          toColumnId,
          toIndex,
          actorId,
          fromColumnId: movedCard.column_id,
          siblingsExcludingMoved,
        });
      },
    });
  }, [cards, moveCard, actorId]);

  if (cards.length === 0) {
    return (
      <div style={{
        margin: "40px auto", maxWidth: 400, padding: "40px 32px",
        textAlign: "center", background: "var(--surface)",
        border: "1px dashed var(--line-strong)", borderRadius: 14, color: "var(--ink-3)",
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>No cards</div>
        <div style={{ fontSize: 13 }}>No cards match the current filters.</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 60px" }}>
      {/* Group-by selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 4px 4px" }}>
        <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>Group by</span>
        <div style={{ display: "inline-flex", background: "var(--surface-2)", borderRadius: 7, padding: 2 }}>
          {(["status", "priority"] as GroupBy[]).map((g) => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              style={{
                border: 0, cursor: "pointer", padding: "3px 9px", borderRadius: 5,
                background: groupBy === g ? "var(--surface)" : "transparent",
                boxShadow: groupBy === g ? "var(--shadow-sm)" : "none",
                fontSize: 11.5,
                color: groupBy === g ? "var(--ink)" : "var(--ink-3)",
              }}
            >
              {g}
            </button>
          ))}
        </div>
        <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-4)" }}>
          {cards.length} cards
        </span>
      </div>

      {groups.map(([gname, list]) => (
        <div key={gname} style={{ marginTop: 14 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "7px 4px", borderBottom: "1px solid var(--line)",
          }}>
            {groupBy === "priority" && (
              <span style={{
                width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                background:
                  gname === "high" ? "var(--err)" :
                  gname === "med"  ? "var(--warn)" :
                  gname === "low"  ? "var(--ok)" : "var(--line-strong)",
              }} />
            )}
            <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-2)" }}>
              {gname}
            </span>
            <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>{list.length}</span>
          </div>

          {list.map((card) => {
            const col = colMap[card.column_id];
            const cardLabels = card.labels.map((id) => labelMap[id]).filter(Boolean);
            const assigneeProfiles = card.assignees.map((id) => userMap[id]).filter(Boolean);

            return (
              <ListCardRow
                key={card.id}
                card={card}
                col={col}
                cardLabels={cardLabels}
                assigneeProfiles={assigneeProfiles}
                groupBy={groupBy}
                onOpenCard={onOpenCard}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
