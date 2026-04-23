"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Button, Input, AvatarStack, InlineEdit, Menu, MenuItem, Chip } from "@/components/ui";
import { I } from "@/components/Icons";
import { useMe } from "@/hooks/useMe";
import { useBoard, useUpdateColumn, useActiveSprint, useStartSprint, useCompleteSprint } from "@/hooks/useBoard";
import { useUpdateBoard, useDeleteBoard } from "@/hooks/useBoards";
import { KanbanBoard } from "./KanbanBoard";
import { CardModal } from "./CardModal";
import { BoardMembersModal } from "./BoardMembersModal";
import { BoardLabelsModal } from "./BoardLabelsModal";
import { SprintArchiveModal } from "./SprintArchiveModal";

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
  const [showArchive, setShowArchive] = useState(false);
  const [showSprintDialog, setShowSprintDialog] = useState(false);

  // Sprint hooks
  const { data: activeSprint } = useActiveSprint(boardId);
  const startSprintMut = useStartSprint(boardId);
  const completeSprintMut = useCompleteSprint(boardId);

  // Reset filters when board changes
  useEffect(() => {
    setQuery("");
    setLabelFilters([]);
  }, [boardId]);

  // Listen for sidebar archive button event
  useEffect(() => {
    const handler = (e: Event) => {
      const { boardId: id } = (e as CustomEvent).detail;
      if (id === boardId) setShowArchive(true);
    };
    window.addEventListener("open-sprint-archive", handler);
    return () => window.removeEventListener("open-sprint-archive", handler);
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
              <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.01em", color: "var(--accent)" }}>{v}</span>
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
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Sprint indicator */}
          {activeSprint && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 8,
                background: "color-mix(in oklab, var(--accent) 12%, transparent)",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--accent)",
              }}
            >
              <span style={{ display: "inline-flex" }}>{I.rocket}</span>
              {activeSprint.title}
            </div>
          )}

          <AvatarStack users={memberProfiles} size={24} max={4} />
          <Button size="sm" variant="default" onClick={() => setManagingLabels(true)}>
            {I.filter} Labels
          </Button>
          <Button size="sm" variant="default" onClick={() => setShowArchive(true)}>
            {I.archive} Archive
          </Button>
          {me?.is_admin && (
            <>
              {!activeSprint ? (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setShowSprintDialog(true)}
                >
                  {I.rocket} Start Sprint
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => {
                    if (
                      confirm(
                        `Complete "${activeSprint.title}"?\n\nAll cards in the "Done" column will be archived and removed from the board.`
                      )
                    ) {
                      completeSprintMut.mutate(activeSprint.id);
                    }
                  }}
                  style={{ borderColor: "var(--ok)", color: "var(--ok)" }}
                >
                  {I.check} Complete Sprint
                </Button>
              )}
              <Button size="sm" variant="default" onClick={() => setManagingMembers(true)}>
                {I.users} Members
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this board? This action cannot be undone.")) {
                    deleteBoard.mutate(boardId, {
                      onSuccess: () => router.push("/"),
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

      {showArchive && (
        <SprintArchiveModal boardId={boardId} onClose={() => setShowArchive(false)} />
      )}

      {showSprintDialog && (
        <StartSprintDialog
          onStart={(title, goal) => {
            startSprintMut.mutate(
              { title, goal },
              { onSuccess: () => setShowSprintDialog(false) }
            );
          }}
          onClose={() => setShowSprintDialog(false)}
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

// ---- Start Sprint Dialog ----
function StartSprintDialog({
  onStart,
  onClose,
}: {
  onStart: (title: string, goal: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.5)",
          zIndex: 300,
        }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          background: "var(--surface)",
          borderRadius: 14,
          padding: "24px",
          width: 400,
          maxWidth: "90vw",
          zIndex: 301,
          boxShadow: "0 20px 60px rgba(0,0,0,.3)",
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--accent)" }}>{I.rocket}</span> Start New Sprint
        </h3>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)", display: "block", marginBottom: 4 }}>
            Sprint Name *
          </label>
          <Input
            id="sprint-title"
            placeholder="e.g. Sprint 1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            style={{ width: "100%" }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)", display: "block", marginBottom: 4 }}>
            Sprint Goal (optional)
          </label>
          <textarea
            id="sprint-goal"
            placeholder="What's the objective of this sprint?"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={3}
            style={{
              width: "100%",
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--surface-2)",
              color: "var(--ink)",
              fontSize: 13,
              resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => title.trim() && onStart(title.trim(), goal.trim())}
            disabled={!title.trim()}
          >
            {I.rocket} Start Sprint
          </Button>
        </div>
      </div>
    </>
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
