"use client";

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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  useAddCard,
  useAddColumn,
  useDeleteColumn,
  useMoveCard,
  useMoveColumn,
} from "@/hooks/useBoard";
import type { Card, Column, Label, Profile } from "@/types/domain";
import { Button, Input, InlineEdit, Menu, MenuItem, Textarea, Chip } from "@/components/ui";
import { I } from "@/components/Icons";
import { CardTile } from "./CardTile";

// ---------------------------------------------------------------------------
// DnD data types
// ---------------------------------------------------------------------------
type DragData =
  | { type: "card"; cardId: string; columnId: string }
  | { type: "column"; colId: string }
  | { type: "column-drop"; colId: string };

// Casts a plain object to satisfy pragmatic-dnd's Record<string|symbol,unknown> constraint.
function rec<T>(v: T): T & Record<string | symbol, unknown> {
  return v as T & Record<string | symbol, unknown>;
}

function parseData(d: Record<string | symbol, unknown>): DragData | null {
  if (d.type === "card" && typeof d.cardId === "string")
    return d as unknown as DragData;
  if (d.type === "column" && typeof d.colId === "string")
    return d as unknown as DragData;
  if (d.type === "column-drop" && typeof d.colId === "string")
    return d as unknown as DragData;
  return null;
}

function isCardData(d: DragData | null): d is Extract<DragData, { type: "card" }> {
  return d?.type === "card";
}
function isColData(d: DragData | null): d is Extract<DragData, { type: "column" }> {
  return d?.type === "column";
}
function isColDropData(d: DragData | null): d is Extract<DragData, { type: "column-drop" }> {
  return d?.type === "column-drop";
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface Props {
  boardId: string;
  columns: Column[];
  cards: Card[];
  labels: Label[];
  users: Profile[];
  actorId: string;
  onUpdateColumn: (colId: string, patch: { title?: string; wip_limit?: number }) => void;
  onOpenCard: (id: string) => void;
}

// ---------------------------------------------------------------------------
// KanbanBoard
// ---------------------------------------------------------------------------
export function KanbanBoard({
  boardId,
  columns: columnsRaw,
  cards,
  labels,
  users,
  actorId,
  onUpdateColumn,
  onOpenCard,
}: Props) {
  const moveCard = useMoveCard(boardId);
  const moveColumn = useMoveColumn(boardId);
  const addCard = useAddCard(boardId);
  const addColumn = useAddColumn(boardId);
  const deleteColumn = useDeleteColumn(boardId);

  const columns = useMemo(
    () => [...columnsRaw].sort((a, b) => a.position.localeCompare(b.position)),
    [columnsRaw]
  );

  const cardsByColumn = useMemo(() => {
    const map = new Map<string, Card[]>();
    for (const col of columns) map.set(col.id, []);
    for (const c of cards) {
      const arr = map.get(c.column_id);
      if (arr) arr.push(c);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.position.localeCompare(b.position));
    }
    return map;
  }, [columns, cards]);

  const findCard = useCallback(
    (id: string): Card | null => cards.find((c) => c.id === id) ?? null,
    [cards]
  );

  useEffect(() => {
    return monitorForElements({
      onDrop({ source, location }) {
        const targets = location.current.dropTargets;
        if (targets.length === 0) return;

        const src = parseData(source.data);
        if (!src) return;

        // ── Column reorder ───────────────────────────────────────────────
        if (isColData(src)) {
          const rawColTarget = targets.find((t) => parseData(t.data)?.type === "column");
          if (!rawColTarget) return;
          const tgt = parseData(rawColTarget.data);
          if (!isColData(tgt) || tgt.colId === src.colId) return;

          const ids = columns.map((c) => c.id);
          const oldIdx = ids.indexOf(src.colId);
          const newIdx = ids.indexOf(tgt.colId);
          if (oldIdx === -1 || newIdx === -1) return;

          const edge = extractClosestEdge(rawColTarget.data);
          const destIdx = getReorderDestinationIndex({
            startIndex: oldIdx,
            indexOfTarget: newIdx,
            closestEdgeOfTarget: edge,
            axis: "horizontal",
          });
          moveColumn.mutate({ colId: src.colId, toIndex: destIdx });
          return;
        }

        // ── Card move / reorder ──────────────────────────────────────────
        if (!isCardData(src)) return;
        const movedCard = findCard(src.cardId);
        if (!movedCard) return;

        const innerData = parseData(targets[0].data);

        // Dropped on a specific card
        if (isCardData(innerData) && innerData.cardId !== src.cardId) {
          const targetCard = findCard(innerData.cardId);
          if (!targetCard) return;
          const toColumnId = targetCard.column_id;
          const list = cardsByColumn.get(toColumnId) ?? [];
          const targetIdx = list.findIndex((c) => c.id === innerData.cardId);
          const edge = extractClosestEdge(targets[0].data);

          let toIndex: number;
          if (movedCard.column_id === toColumnId) {
            const fromIdx = list.findIndex((c) => c.id === src.cardId);
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
          moveCard.mutate({ cardId: src.cardId, toColumnId, toIndex, actorId });
          return;
        }

        // Dropped on a column drop zone (empty area)
        const rawColDropTarget = targets.find((t) => parseData(t.data)?.type === "column-drop");
        if (rawColDropTarget) {
          const colDrop = parseData(rawColDropTarget.data);
          if (!isColDropData(colDrop)) return;
          const toColumnId = colDrop.colId;
          const list = (cardsByColumn.get(toColumnId) ?? []).filter((c) => c.id !== src.cardId);
          const colEdge = extractClosestEdge(rawColDropTarget.data);
          const toIndex = colEdge === "top" ? 0 : list.length;
          moveCard.mutate({ cardId: src.cardId, toColumnId, toIndex, actorId });
        }
      },
    });
  }, [columns, cards, cardsByColumn, findCard, moveCard, moveColumn, actorId]);

  return (
    <div style={{ flex: 1, overflowX: "auto", overflowY: "hidden" }}>
      <div
        style={{
          display: "flex",
          gap: "var(--col-gap)",
          padding: "18px 20px 40px",
          alignItems: "flex-start",
          minHeight: "calc(100vh - 200px)",
        }}
      >
        {columns.map((col) => (
          <ColumnView
            key={col.id}
            col={col}
            cards={cardsByColumn.get(col.id) ?? []}
            labels={labels}
            users={users}
            actorId={actorId}
            onAddCard={(title) => addCard.mutate({ columnId: col.id, title, actorId })}
            onUpdateColumn={(patch) => onUpdateColumn(col.id, patch)}
            onDeleteColumn={() => {
              if (
                confirm(
                  `Delete column "${col.title}" and its ${
                    cardsByColumn.get(col.id)?.length ?? 0
                  } cards?`
                )
              )
                deleteColumn.mutate(col.id);
            }}
            onOpenCard={onOpenCard}
          />
        ))}
        <AddColumn onAdd={(title) => addColumn.mutate(title)} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column
// ---------------------------------------------------------------------------
function ColumnView({
  col,
  cards,
  labels,
  users,
  actorId: _actorId,
  onAddCard,
  onUpdateColumn,
  onDeleteColumn,
  onOpenCard,
}: {
  col: Column;
  cards: Card[];
  labels: Label[];
  users: Profile[];
  actorId: string;
  onAddCard: (title: string) => void;
  onUpdateColumn: (patch: { title?: string; wip_limit?: number }) => void;
  onDeleteColumn: () => void;
  onOpenCard: (id: string) => void;
}) {
  const colRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCardOver, setIsCardOver] = useState(false);
  const [colEdge, setColEdge] = useState<Edge | null>(null);

  useEffect(() => {
    const colEl = colRef.current;
    const hdrEl = headerRef.current;
    if (!colEl || !hdrEl) return;

    return combine(
      draggable({
        element: colEl,
        dragHandle: hdrEl,
        getInitialData: () => rec({ type: "column" as const, colId: col.id }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      }),
      dropTargetForElements({
        element: colEl,
        canDrop: ({ source }) => {
          const d = parseData(source.data);
          if (isCardData(d)) return true;
          if (isColData(d)) return d.colId !== col.id;
          return false;
        },
        getData: ({ source, input, element }) => {
          const d = parseData(source.data);
          if (isColData(d)) {
            return attachClosestEdge(
              rec({ type: "column" as const, colId: col.id }),
              { input, element, allowedEdges: ["left", "right"] }
            );
          }
          return attachClosestEdge(
            rec({ type: "column-drop" as const, colId: col.id }),
            { input, element, allowedEdges: ["top", "bottom"] }
          );
        },
        onDragEnter: ({ source, self }) => {
          const d = parseData(source.data);
          if (isCardData(d)) setIsCardOver(true);
          if (isColData(d)) setColEdge(extractClosestEdge(self.data));
        },
        onDrag: ({ source, self }) => {
          if (isColData(parseData(source.data))) setColEdge(extractClosestEdge(self.data));
        },
        onDragLeave: ({ source }) => {
          const d = parseData(source.data);
          if (isCardData(d)) setIsCardOver(false);
          if (isColData(d)) setColEdge(null);
        },
        onDrop: () => { setIsCardOver(false); setColEdge(null); },
      })
    );
  }, [col.id]);

  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const wipOver = col.wip_limit > 0 && cards.length > col.wip_limit;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setAdding(false);
      return;
    }
    onAddCard(newTitle.trim());
    setNewTitle("");
  };

  return (
    <div
      ref={colRef}
      style={{
        width: 280,
        flexShrink: 0,
        background: "var(--surface-2)",
        borderRadius: 12,
        border: "1px solid var(--line)",
        display: "flex",
        flexDirection: "column",
        maxHeight: "calc(100vh - 200px)",
        opacity: isDragging ? 0.4 : 1,
        position: "relative",
      }}
    >
      {colEdge && <DropIndicator edge={colEdge} gap="var(--col-gap)" />}
      <div
        ref={headerRef}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 12px 8px",
          cursor: "grab",
          touchAction: "none",
        }}
      >
        <InlineEdit
          value={col.title}
          onCommit={(v) => onUpdateColumn({ title: v })}
          render={(v) => (
            <span style={{ fontWeight: 600, fontSize: 13, letterSpacing: "-.005em" }}>{v}</span>
          )}
          inputStyle={{ fontWeight: 600, fontSize: 13 }}
        />
        <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>
          {cards.length}
          {col.wip_limit > 0 && <>/{col.wip_limit}</>}
        </span>
        {wipOver && (
          <Chip color="var(--err)" style={{ marginLeft: "auto" }}>
            WIP
          </Chip>
        )}
        <Menu
          align="end"
          trigger={({ setOpen }) => (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpen((o) => !o);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                marginLeft: wipOver ? 0 : "auto",
                background: "transparent",
                border: 0,
                padding: 4,
                cursor: "pointer",
                color: "var(--ink-4)",
              }}
              aria-label="Column menu"
            >
              {I.more}
            </button>
          )}
        >
          <MenuItem
            onClick={() => {
              const v = prompt("WIP limit (0 for none)", String(col.wip_limit || 0));
              if (v != null) onUpdateColumn({ wip_limit: Math.max(0, parseInt(v) || 0) });
            }}
          >
            Set WIP limit…
          </MenuItem>
          <MenuItem onClick={() => setAdding(true)}>Add card</MenuItem>
          <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />
          <MenuItem danger onClick={onDeleteColumn}>
            Delete column
          </MenuItem>
        </Menu>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "2px 8px 8px",
          display: "flex",
          flexDirection: "column",
          gap: "var(--card-gap)",
          minHeight: 60,
        }}
        className={isCardOver ? "dnd-column-drop-active" : ""}
      >
        {cards.map((card) => (
          <DraggableCard
            key={card.id}
            card={card}
            labels={labels}
            users={users}
            onOpen={() => onOpenCard(card.id)}
          />
        ))}

        {cards.length === 0 && !adding && (
          <div
            style={{
              fontSize: 12,
              color: "var(--ink-4)",
              padding: "12px 6px",
              fontStyle: "italic",
              textAlign: "center",
            }}
          >
            Drop a card here
          </div>
        )}

        {adding ? (
          <form onSubmit={submit} style={{ marginTop: 2 }}>
            <Textarea
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(e);
                }
                if (e.key === "Escape") {
                  setAdding(false);
                  setNewTitle("");
                }
              }}
              placeholder="Card title…"
              style={{ minHeight: 56, fontSize: 13 }}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <Button variant="primary" size="sm" type="submit">
                Add card
              </Button>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => {
                  setAdding(false);
                  setNewTitle("");
                }}
              >
                {I.x}
              </Button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            style={{
              background: "transparent",
              border: 0,
              color: "var(--ink-3)",
              fontSize: 12.5,
              padding: "8px 10px",
              borderRadius: 8,
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "color-mix(in oklab, var(--ink) 4%, transparent)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            {I.plus} Add a card
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Draggable card wrapper
// ---------------------------------------------------------------------------
function DraggableCard({
  card,
  labels,
  users,
  onOpen,
}: {
  card: Card;
  labels: Label[];
  users: Profile[];
  onOpen: () => void;
}) {
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
          rec({ type: "card" as const, cardId: card.id, columnId: card.column_id }),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      }),
      dropTargetForElements({
        element: el,
        canDrop: ({ source }) => {
          const d = parseData(source.data);
          return isCardData(d) && d.cardId !== card.id;
        },
        getData: ({ input, element }) =>
          attachClosestEdge(
            rec({ type: "card" as const, cardId: card.id, columnId: card.column_id }),
            { input, element, allowedEdges: ["top", "bottom"] }
          ),
        onDragEnter: ({ self }) => setClosestEdge(extractClosestEdge(self.data)),
        onDrag: ({ self }) => setClosestEdge(extractClosestEdge(self.data)),
        onDragLeave: () => setClosestEdge(null),
        onDrop: () => setClosestEdge(null),
      })
    );
  }, [card.id, card.column_id]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <CardTile
        card={card}
        labels={labels}
        users={users}
        onOpen={onOpen}
        isDragging={isDragging}
      />
      {closestEdge && <DropIndicator edge={closestEdge} gap="var(--card-gap)" />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add column
// ---------------------------------------------------------------------------
function AddColumn({ onAdd }: { onAdd: (title: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setAdding(false);
      return;
    }
    onAdd(title.trim());
    setTitle("");
    setAdding(false);
  };
  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        style={{
          width: 280,
          flexShrink: 0,
          background: "transparent",
          border: "2px dashed var(--line-strong)",
          borderRadius: 12,
          padding: "14px 16px",
          cursor: "pointer",
          color: "var(--ink-3)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          alignSelf: "flex-start",
        }}
      >
        {I.plus} Add column
      </button>
    );
  }
  return (
    <form
      onSubmit={submit}
      style={{
        width: 280,
        flexShrink: 0,
        background: "var(--surface)",
        border: "1px solid var(--line-strong)",
        borderRadius: 12,
        padding: 10,
        alignSelf: "flex-start",
      }}
    >
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Column title"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setAdding(false);
            setTitle("");
          }
        }}
      />
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <Button variant="primary" size="sm" type="submit">
          Add
        </Button>
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => {
            setAdding(false);
            setTitle("");
          }}
        >
          {I.x}
        </Button>
      </div>
    </form>
  );
}
