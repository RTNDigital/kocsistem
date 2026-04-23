"use client";

/**
 * KanbanBoard — drag-drop powered by @dnd-kit.
 *
 * Architecture decisions:
 *   - One <DndContext> wraps the whole board so cards can move between
 *     columns and columns can be reordered without nesting two contexts.
 *   - Sensors:
 *       PointerSensor with an 8px activation distance keeps clicks (open card)
 *       distinct from drags. TouchSensor with a 250ms long-press lets users
 *       scroll the board on mobile *unless* they intentionally hold a card.
 *       KeyboardSensor gives ARIA-compliant keyboard reordering for free.
 *   - We only commit to the server in `onDragEnd`; intermediate `onDragOver`
 *     events update UI state for visual feedback but never write to Supabase
 *     (would otherwise hammer the DB during a single drag).
 *   - Optimistic updates live in the React Query cache — see useMoveCard.
 *
 * Mobile UX:
 *   - 250ms long-press start so vertical scroll still works.
 *   - Columns are horizontally scrollable on overflow.
 *   - Header / filter bars wrap on narrow screens (handled in BoardScreen.tsx).
 */

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState } from "react";
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

interface Props {
  boardId: string;
  columns: Column[];
  cards: Card[];
  labels: Label[];
  users: Profile[];
  actorId: string;
  onUpdateColumn: (
    colId: string,
    patch: { title?: string; wip_limit?: number }
  ) => void;
  onOpenCard: (id: string) => void;
}

type ActiveDrag =
  | { type: "card"; id: string; card: Card }
  | { type: "column"; id: string; column: Column }
  | null;

const CARD_PREFIX = "card:";
const COL_PREFIX = "col:";
const COL_DROP_PREFIX = "coldrop:";

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

  const [active, setActive] = useState<ActiveDrag>(null);

  // Sort columns + cards by their fractional position. This is what makes
  // ordering survive across page reloads — we never trust array index alone.
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

  // Sensors — see file header for rationale
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function findCard(id: string): Card | null {
    return cards.find((c) => c.id === id) ?? null;
  }

  function findContainerOf(itemId: string): string | null {
    // itemId might be a card-id or a column-id (when hovering an empty column).
    // We strip prefixes elsewhere; here we assume the raw card or column id.
    const card = findCard(itemId);
    if (card) return card.column_id;
    if (columns.some((c) => c.id === itemId)) return itemId;
    return null;
  }

  function onDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    if (id.startsWith(CARD_PREFIX)) {
      const cardId = id.slice(CARD_PREFIX.length);
      const card = findCard(cardId);
      if (card) setActive({ type: "card", id: cardId, card });
    } else if (id.startsWith(COL_PREFIX)) {
      const colId = id.slice(COL_PREFIX.length);
      const col = columns.find((c) => c.id === colId);
      if (col) setActive({ type: "column", id: colId, column: col });
    }
  }

  function onDragEnd(e: DragEndEvent) {
    setActive(null);
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) return;

    // ---------------------- COLUMN reorder ----------------------
    if (activeId.startsWith(COL_PREFIX) && overId.startsWith(COL_PREFIX)) {
      const fromCol = activeId.slice(COL_PREFIX.length);
      const toCol = overId.slice(COL_PREFIX.length);
      if (fromCol === toCol) return;

      const orderedIds = columns.map((c) => c.id);
      const oldIndex = orderedIds.indexOf(fromCol);
      const newIndex = orderedIds.indexOf(toCol);
      if (oldIndex === -1 || newIndex === -1) return;
      // arrayMove tells us the visual end-state; we then send the column to that index.
      const reordered = arrayMove(orderedIds, oldIndex, newIndex);
      const targetIdx = reordered.indexOf(fromCol);
      moveColumn.mutate({ colId: fromCol, toIndex: targetIdx });
      return;
    }

    // ---------------------- CARD move/reorder -------------------
    if (!activeId.startsWith(CARD_PREFIX)) return;
    const cardId = activeId.slice(CARD_PREFIX.length);
    const movedCard = findCard(cardId);
    if (!movedCard) return;

    // Resolve destination column. The drop target may be:
    //   1. another card in the same/different column → use that card's column
    //   2. an empty column drop zone (id "coldrop:<colId>") → that column
    //   3. nothing → no-op
    let toColumnId: string | null = null;
    let toIndex = 0;

    if (overId.startsWith(CARD_PREFIX)) {
      const overCardId = overId.slice(CARD_PREFIX.length);
      const overCard = findCard(overCardId);
      if (!overCard) return;
      toColumnId = overCard.column_id;

      const targetList = cardsByColumn.get(toColumnId) ?? [];
      const overIdx = targetList.findIndex((c) => c.id === overCardId);
      if (movedCard.column_id === toColumnId) {
        // Re-order within the same column.
        const fromIdx = targetList.findIndex((c) => c.id === cardId);
        if (fromIdx === overIdx) return;
        // arrayMove gives the visual final order; we extract the new index
        const finalOrder = arrayMove(targetList, fromIdx, overIdx);
        toIndex = finalOrder.findIndex((c) => c.id === cardId);
      } else {
        // Insert *before* the over-card in the destination column.
        toIndex = overIdx;
      }
    } else if (overId.startsWith(COL_DROP_PREFIX)) {
      toColumnId = overId.slice(COL_DROP_PREFIX.length);
      const targetList = (cardsByColumn.get(toColumnId) ?? []).filter(
        (c) => c.id !== cardId
      );
      toIndex = targetList.length;
    } else {
      return;
    }

    if (!toColumnId) return;

    moveCard.mutate({ cardId, toColumnId, toIndex, actorId });
  }

  // -- Render --
  const colOrder = columns.map((c) => COL_PREFIX + c.id);

  return (
    <div style={{ flex: 1, overflowX: "auto", overflowY: "hidden" }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActive(null)}
      >
        <div
          style={{
            display: "flex",
            gap: "var(--col-gap)",
            padding: "18px 20px 40px",
            alignItems: "flex-start",
            minHeight: "calc(100vh - 200px)",
          }}
        >
          <SortableContext items={colOrder} strategy={horizontalListSortingStrategy}>
            {columns.map((col) => (
              <ColumnView
                key={col.id}
                col={col}
                cards={cardsByColumn.get(col.id) ?? []}
                labels={labels}
                users={users}
                actorId={actorId}
                onAddCard={(title) =>
                  addCard.mutate({ columnId: col.id, title, actorId })
                }
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
          </SortableContext>

          <AddColumn onAdd={(title) => addColumn.mutate(title)} />
        </div>

        <DragOverlay
          dropAnimation={{
            duration: 180,
            easing: "cubic-bezier(.18,.67,.6,1.22)",
          }}
          modifiers={active?.type === "column" ? [restrictToHorizontalAxis] : undefined}
        >
          {active?.type === "card" && (
            <div className="dnd-card-overlay" style={{ width: 280 }}>
              <CardTile
                card={active.card}
                labels={labels}
                users={users}
                onOpen={() => {}}
                isDragging={false}
              />
            </div>
          )}
          {active?.type === "column" && (
            <div className="dnd-card-overlay" style={{ width: 280 }}>
              <ColumnHeader title={active.column.title} count={cardsByColumn.get(active.column.id)?.length ?? 0} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
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
  const sortableCol = useSortable({
    id: COL_PREFIX + col.id,
    data: { type: "column" },
  });
  // The empty-zone droppable — used when a column has 0 cards or when dragging
  // a card to the bottom of the list.
  const dropZone = useSortable({
    id: COL_DROP_PREFIX + col.id,
    data: { type: "column-drop" },
  });

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

  const cardIds = cards.map((c) => CARD_PREFIX + c.id);

  return (
    <div
      ref={sortableCol.setNodeRef}
      style={{
        width: 280,
        flexShrink: 0,
        background: "var(--surface-2)",
        borderRadius: 12,
        border: "1px solid var(--line)",
        display: "flex",
        flexDirection: "column",
        maxHeight: "calc(100vh - 200px)",
        transform: CSS.Transform.toString(sortableCol.transform),
        transition: sortableCol.transition,
        opacity: sortableCol.isDragging ? 0.4 : 1,
      }}
    >
      <div
        {...sortableCol.attributes}
        {...sortableCol.listeners}
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
        ref={dropZone.setNodeRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "2px 8px 8px",
          display: "flex",
          flexDirection: "column",
          gap: "var(--card-gap)",
          minHeight: 60,
        }}
        className={dropZone.isOver ? "dnd-column-drop-active" : ""}
      >
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              labels={labels}
              users={users}
              onOpen={() => onOpenCard(card.id)}
            />
          ))}
        </SortableContext>

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
// Sortable card wrapper
// ---------------------------------------------------------------------------
function SortableCard({
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
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: CARD_PREFIX + card.id,
    data: { type: "card", card },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      {...attributes}
      {...listeners}
    >
      <CardTile
        card={card}
        labels={labels}
        users={users}
        onOpen={onOpen}
        isDragging={isDragging}
      />
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

function ColumnHeader({ title, count }: { title: string; count: number }) {
  return (
    <div
      style={{
        background: "var(--surface-2)",
        borderRadius: 12,
        border: "1px solid var(--line)",
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span style={{ fontWeight: 600, fontSize: 13 }}>{title}</span>
      <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>
        {count}
      </span>
    </div>
  );
}
