"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Button, Input, AvatarStack, InlineEdit, Menu, MenuItem, Chip } from "@/components/ui";
import { I } from "@/components/Icons";
import { useMe } from "@/hooks/useMe";
import { useBoard, useUpdateColumn } from "@/hooks/useBoard";
import { useUpdateBoard, useDeleteBoard } from "@/hooks/useBoards";
import { KanbanBoard } from "./KanbanBoard";
import { CardModal } from "./CardModal";
import { BoardMembersModal } from "./BoardMembersModal";
import { BoardLabelsModal } from "./BoardLabelsModal";

export function BoardScreen({ boardId }: { boardId: string }) {
  const router = useRouter();
  const { data: me } = useMe();
  const { data, isLoading } = useBoard(boardId);
  const toggleStar = useUpdateBoard();
  const updateBoard = useUpdateBoard();
  const deleteBoard = useDeleteBoard();
  const updateColumn = useUpdateColumn(boardId);
  const [query, setQuery] = useState("");
  const [labelFilters, setLabelFilters] = useState<string[]>([]);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [managingMembers, setManagingMembers] = useState(false);
  const [managingLabels, setManagingLabels] = useState(false);

  // Reset filters when board changes
  useEffect(() => {
    setQuery("");
    setLabelFilters([]);
  }, [boardId]);

  const filteredCards = useMemo(() => {
    if (!data) return [];
    return data.cards.filter((c) => {
      if (
        query &&
        !(c.title + " " + c.description).toLowerCase().includes(query.toLowerCase())
      )
        return false;
      if (labelFilters.length && !c.labels.some((l) => labelFilters.includes(l))) return false;
      return true;
    });
  }, [data, query, labelFilters]);

  if (isLoading) {
    return (
      <AppShell>
        <div style={{ padding: 40, color: "var(--ink-3)" }}>Loading…</div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <div style={{ padding: 40 }}>
          <h2>Board not found</h2>
          <p style={{ color: "var(--ink-3)" }}>
            This board may have been deleted or you no longer have access.
          </p>
        </div>
      </AppShell>
    );
  }

  const { board, members, columns, labels } = data;
  const memberProfiles = members.map((m) => m.profile);

  return (
    <AppShell>
      {/* Board header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 20px",
          borderBottom: "1px solid var(--line)",
          background: `linear-gradient(180deg, color-mix(in oklab, ${board.color} 8%, var(--bg)), var(--bg))`,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 5,
              background: board.color,
              flexShrink: 0,
            }}
          />
          <InlineEdit
            value={board.title}
            onCommit={(v) => updateBoard.mutate({ boardId, patch: { title: v } })}
            render={(v) => (
              <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.01em" }}>{v}</span>
            )}
            inputStyle={{ fontSize: 15, fontWeight: 600 }}
          />
          <button
            onClick={() => toggleStar.mutate({ boardId, patch: { starred: !board.starred } })}
            style={{
              background: "transparent",
              border: 0,
              cursor: "pointer",
              color: board.starred ? "var(--warn)" : "var(--ink-4)",
              padding: 2,
            }}
            aria-label="Star board"
          >
            {board.starred ? I.starF : I.star}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AvatarStack users={memberProfiles} size={24} max={4} />
          <Button size="sm" variant="default" onClick={() => setManagingLabels(true)}>
            {I.filter} Labels
          </Button>
          {me?.is_admin && (
            <>
              <Button size="sm" variant="default" onClick={() => setManagingMembers(true)}>
                {I.users} Members
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this board? This action cannot be undone.")) {
                    deleteBoard.mutate(boardId, {
                      onSuccess: () => router.push("/")
                    });
                  }
                }}
                title="Delete Board"
              >
                {I.trash}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 20px",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--ink-4)",
            }}
          >
            {I.search}
          </span>
          <Input
            id="board-search"
            placeholder="Search cards"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ paddingLeft: 32, width: 220 }}
          />
        </div>
        <LabelFilter labels={labels} value={labelFilters} onChange={setLabelFilters} />

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 12,
            color: "var(--ink-3)",
          }}
          className="hide-on-mobile"
        >
          <span>
            {data.cards.length} cards · {columns.length} columns
          </span>
        </div>
      </div>

      <KanbanBoard
        boardId={boardId}
        columns={columns}
        cards={filteredCards}
        labels={labels}
        users={memberProfiles}
        actorId={me?.id ?? ""}
        onUpdateColumn={(colId, patch) => updateColumn.mutate({ colId, patch })}
        onOpenCard={setOpenCardId}
      />

      {openCardId && (
        <CardModal
          cardId={openCardId}
          boardId={boardId}
          boardMembers={memberProfiles}
          allLabels={labels}
          columns={columns}
          onClose={() => setOpenCardId(null)}
        />
      )}

      {managingMembers && me?.is_admin && (
        <BoardMembersModal
          boardId={boardId}
          members={members.map((m) => ({ ...m.profile, role: m.role }))}
          onClose={() => setManagingMembers(false)}
        />
      )}

      {managingLabels && (
        <BoardLabelsModal
          boardId={boardId}
          labels={labels}
          onClose={() => setManagingLabels(false)}
        />
      )}

      <style jsx>{`
        @media (max-width: 720px) {
          .hide-on-mobile {
            display: none !important;
          }
        }
      `}</style>
    </AppShell>
  );
}

function LabelFilter({
  labels,
  value,
  onChange,
}: {
  labels: { id: string; name: string; color: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <Menu
      trigger={({ setOpen }) => (
        <Button size="sm" variant="default" onClick={() => setOpen((o) => !o)}>
          <span style={{ color: "var(--ink-3)" }}>{I.filter}</span>
          Labels{" "}
          {value.length > 0 && (
            <Chip color="var(--accent)" style={{ marginLeft: 4 }}>
              {value.length}
            </Chip>
          )}
        </Button>
      )}
    >
      <div style={{ padding: "4px", minWidth: 180 }}>
        {labels.length === 0 && (
          <div style={{ padding: "8px 10px", fontSize: 12, color: "var(--ink-4)" }}>
            No labels yet
          </div>
        )}
        {labels.map((l) => {
          const on = value.includes(l.id);
          return (
            <button
              key={l.id}
              onClick={(e) => {
                e.stopPropagation();
                onChange(on ? value.filter((x) => x !== l.id) : [...value, l.id]);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                textAlign: "left",
                padding: "6px 8px",
                borderRadius: 6,
                border: 0,
                background: on ? "var(--surface-2)" : "transparent",
                fontSize: 13,
                cursor: "pointer",
                color: "var(--ink)",
              }}
            >
              <span
                style={{ width: 10, height: 10, borderRadius: 3, background: l.color }}
              />
              <span style={{ flex: 1 }}>{l.name}</span>
              {on && <span style={{ color: "var(--accent)" }}>{I.check}</span>}
            </button>
          );
        })}
        {value.length > 0 && (
          <>
            <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />
            <MenuItem onClick={() => onChange([])}>Clear filters</MenuItem>
          </>
        )}
      </div>
    </Menu>
  );
}
