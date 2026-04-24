"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Button, Input, AvatarStack, InlineEdit, Menu, MenuItem, Chip } from "@/components/ui";
import { dueState } from "@/lib/utils";
import type { Profile, Column as ColumnType } from "@/types/domain";
import { I } from "@/components/Icons";
import { useMe } from "@/hooks/useMe";
import { useBoard, useUpdateColumn, useActiveSprint, useStartSprint, useCompleteSprint } from "@/hooks/useBoard";
import { useUpdateBoard, useDeleteBoard } from "@/hooks/useBoards";
import { KanbanBoard } from "./KanbanBoard";
import { BoardListView } from "./BoardListView";
import { CardModal } from "./CardModal";
import { BoardMembersModal } from "./BoardMembersModal";
import { BoardLabelsModal } from "./BoardLabelsModal";

type ViewMode = "kanban" | "list";
type Priority = "high" | "med" | "low";
type DueDateFilter = "overdue" | "soon" | "has_date" | "no_date";

export function BoardScreen({ boardId }: { boardId: string }) {
  const router = useRouter();
  const { data: me, isLoading: meLoading } = useMe();
  const { data, isLoading: boardLoading } = useBoard(boardId, !!me);
  const isLoading = meLoading || boardLoading;
  const toggleStar = useUpdateBoard();
  const updateBoard = useUpdateBoard();
  const deleteBoard = useDeleteBoard();
  const updateColumn = useUpdateColumn(boardId);

  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [query, setQuery] = useState("");
  const [labelFilters, setLabelFilters] = useState<string[]>([]);
  const [priorityFilters, setPriorityFilters] = useState<Priority[]>([]);
  const [assigneeFilters, setAssigneeFilters] = useState<string[]>([]);
  const [dueDateFilters, setDueDateFilters] = useState<DueDateFilter[]>([]);
  const [columnFilters, setColumnFilters] = useState<string[]>([]);
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [managingMembers, setManagingMembers] = useState(false);
  const [managingLabels, setManagingLabels] = useState(false);
  const [showSprintDialog, setShowSprintDialog] = useState(false);

  // Sprint hooks
  const { data: activeSprint } = useActiveSprint(boardId);
  const startSprintMut = useStartSprint(boardId);
  const completeSprintMut = useCompleteSprint(boardId);

  // Reset filters when board changes
  useEffect(() => {
    setQuery("");
    setLabelFilters([]);
    setPriorityFilters([]);
    setAssigneeFilters([]);
    setDueDateFilters([]);
    setColumnFilters([]);
  }, [boardId]);

  const togglePriority = (p: Priority) =>
    setPriorityFilters((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );

  const filteredCards = useMemo(() => {
    if (!data) return [];
    return data.cards.filter((c) => {
      if (
        query &&
        !(c.title + " " + c.description).toLowerCase().includes(query.toLowerCase())
      )
        return false;
      if (labelFilters.length && !c.labels.some((l) => labelFilters.includes(l))) return false;
      if (priorityFilters.length && !priorityFilters.includes((c.priority ?? "") as Priority)) return false;
      if (assigneeFilters.length && !c.assignees.some((a) => assigneeFilters.includes(a))) return false;
      if (columnFilters.length && !columnFilters.includes(c.column_id)) return false;
      if (dueDateFilters.length) {
        const ds = dueState(c.due_at);
        const match = dueDateFilters.some((f) => {
          if (f === "overdue") return ds === "overdue";
          if (f === "soon") return ds === "soon";
          if (f === "has_date") return !!c.due_at;
          if (f === "no_date") return !c.due_at;
          return false;
        });
        if (!match) return false;
      }
      return true;
    });
  }, [data, query, labelFilters, priorityFilters, assigneeFilters, dueDateFilters, columnFilters]);

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
  const canManageBoard = me?.is_admin || (board.type === "personal" && board.owner_id === me?.id);

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
        <div className="board-header-actions" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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
          <Button size="sm" variant="default" onClick={() => window.dispatchEvent(new CustomEvent("open-sprint-archive", { detail: { boardId } }))}>
            {I.archive} Archive
          </Button>
          {canManageBoard && (
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
                    const doneCol = columns.find((c) => c.title.toLowerCase() === "done");
                    const hasIncompleteCards = data.cards.some((c) => c.column_id !== doneCol?.id);
                    
                    if (hasIncompleteCards) {
                      alert("Cannot complete sprint: not all tasks are done. All cards must be moved to the 'Done' column.");
                      return;
                    }

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

      {/* Filter + view-switcher bar */}
      <div
        className="filter-bar"
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
        {/* View tabs */}
        <div style={{ display: "inline-flex", background: "var(--surface-2)", borderRadius: 8, padding: 2, flexShrink: 0 }}>
          <ViewTab active={viewMode === "kanban"} onClick={() => setViewMode("kanban")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="5" height="18" rx="1.5" />
              <rect x="10" y="3" width="5" height="12" rx="1.5" />
              <rect x="17" y="3" width="5" height="15" rx="1.5" />
            </svg>
            Kanban
          </ViewTab>
          <ViewTab active={viewMode === "list"} onClick={() => setViewMode("list")}>
            {I.list}
            List
          </ViewTab>
        </div>

        <div className="filter-divider" style={{ width: 1, height: 20, background: "var(--line)", flexShrink: 0 }} />

        {/* Search */}
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
            style={{ paddingLeft: 32, width: 200 }}
          />
        </div>

        {/* Label filter */}
        <LabelFilter labels={labels} value={labelFilters} onChange={setLabelFilters} />

        {/* Priority filter */}
        <PriorityFilter value={priorityFilters} onChange={setPriorityFilters} onToggle={togglePriority} />

        {/* Assignee filter */}
        <AssigneeFilter users={memberProfiles} value={assigneeFilters} onChange={setAssigneeFilters} />

        {/* Due date filter */}
        <DueDateFilterMenu value={dueDateFilters} onChange={setDueDateFilters} />

        {/* Column filter */}
        <ColumnFilter columns={columns} value={columnFilters} onChange={setColumnFilters} />

        {/* Active filter chips */}
        {(labelFilters.length > 0 || priorityFilters.length > 0 || assigneeFilters.length > 0 || dueDateFilters.length > 0 || columnFilters.length > 0 || query) && (
          <button
            onClick={() => { setQuery(""); setLabelFilters([]); setPriorityFilters([]); setAssigneeFilters([]); setDueDateFilters([]); setColumnFilters([]); }}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              fontSize: 11.5, color: "var(--ink-4)", textDecoration: "underline", padding: "0 2px",
            }}
          >
            Clear all
          </button>
        )}

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
            {filteredCards.length}{filteredCards.length !== data.cards.length ? `/${data.cards.length}` : ""} cards
            {viewMode === "kanban" && ` · ${columns.length} columns`}
          </span>
        </div>
      </div>

      {viewMode === "kanban" ? (
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
      ) : (
        <BoardListView
          boardId={boardId}
          cards={filteredCards}
          columns={columns}
          labels={labels}
          users={memberProfiles}
          actorId={me?.id ?? ""}
          onOpenCard={setOpenCardId}
        />
      )}

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

      {managingMembers && canManageBoard && (
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

function ViewTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        border: 0, cursor: "pointer", padding: "4px 9px", borderRadius: 6,
        background: active ? "var(--surface)" : "transparent",
        boxShadow: active ? "var(--shadow-sm)" : "none",
        fontSize: 12, fontWeight: active ? 500 : 400,
        color: active ? "var(--ink)" : "var(--ink-3)",
      }}
    >
      {children}
    </button>
  );
}

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: "high", label: "High",   color: "var(--err)" },
  { value: "med",  label: "Medium", color: "var(--warn)" },
  { value: "low",  label: "Low",    color: "var(--ok)" },
];

function PriorityFilter({
  value,
  onChange,
  onToggle,
}: {
  value: Priority[];
  onChange: (v: Priority[]) => void;
  onToggle: (p: Priority) => void;
}) {
  return (
    <Menu
      trigger={({ setOpen }) => (
        <Button size="sm" variant="default" onClick={() => setOpen((o) => !o)}>
          {I.flag}
          Priority{" "}
          {value.length > 0 && (
            <Chip color="var(--accent)" style={{ marginLeft: 4 }}>
              {value.length}
            </Chip>
          )}
        </Button>
      )}
    >
      <div style={{ padding: "4px", minWidth: 160 }}>
        {PRIORITIES.map(({ value: p, label, color }) => {
          const on = value.includes(p);
          return (
            <button
              key={p}
              onClick={(e) => { e.stopPropagation(); onToggle(p); }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", textAlign: "left", padding: "6px 8px",
                borderRadius: 6, border: 0,
                background: on ? "var(--surface-2)" : "transparent",
                fontSize: 13, cursor: "pointer", color: "var(--ink)",
              }}
            >
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{label}</span>
              {on && <span style={{ color: "var(--accent)" }}>{I.check}</span>}
            </button>
          );
        })}
        {value.length > 0 && (
          <>
            <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />
            <MenuItem onClick={() => onChange([])}>Clear</MenuItem>
          </>
        )}
      </div>
    </Menu>
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

function AssigneeFilter({
  users,
  value,
  onChange,
}: {
  users: Profile[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  };

  return (
    <Menu
      trigger={({ setOpen }) => (
        <Button size="sm" variant="default" onClick={() => setOpen((o) => !o)}>
          {I.user}
          Assignee{" "}
          {value.length > 0 && (
            <Chip color="var(--accent)" style={{ marginLeft: 4 }}>
              {value.length}
            </Chip>
          )}
        </Button>
      )}
    >
      <div style={{ padding: "4px", minWidth: 180 }}>
        {users.length === 0 && (
          <div style={{ padding: "8px 10px", fontSize: 12, color: "var(--ink-4)" }}>
            No members yet
          </div>
        )}
        {users.map((u) => {
          const on = value.includes(u.id);
          return (
            <button
              key={u.id}
              onClick={(e) => { e.stopPropagation(); toggle(u.id); }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", textAlign: "left", padding: "6px 8px",
                borderRadius: 6, border: 0,
                background: on ? "var(--surface-2)" : "transparent",
                fontSize: 13, cursor: "pointer", color: "var(--ink)",
              }}
            >
              <span
                style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: u.color, display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 10, fontWeight: 700,
                  color: "#fff", flexShrink: 0,
                }}
              >
                {u.initials}
              </span>
              <span style={{ flex: 1 }}>{u.name}</span>
              {on && <span style={{ color: "var(--accent)" }}>{I.check}</span>}
            </button>
          );
        })}
        {value.length > 0 && (
          <>
            <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />
            <MenuItem onClick={() => onChange([])}>Clear</MenuItem>
          </>
        )}
      </div>
    </Menu>
  );
}

const DUE_DATE_OPTIONS: { value: DueDateFilter; label: string; color: string }[] = [
  { value: "overdue", label: "Overdue",    color: "var(--err)" },
  { value: "soon",    label: "Due Soon",   color: "var(--warn)" },
  { value: "has_date", label: "Has Date",  color: "var(--accent)" },
  { value: "no_date", label: "No Date",    color: "var(--ink-4)" },
];

function DueDateFilterMenu({
  value,
  onChange,
}: {
  value: DueDateFilter[];
  onChange: (v: DueDateFilter[]) => void;
}) {
  const toggle = (f: DueDateFilter) => {
    onChange(value.includes(f) ? value.filter((x) => x !== f) : [...value, f]);
  };

  return (
    <Menu
      trigger={({ setOpen }) => (
        <Button size="sm" variant="default" onClick={() => setOpen((o) => !o)}>
          {I.calendar}
          Due Date{" "}
          {value.length > 0 && (
            <Chip color="var(--accent)" style={{ marginLeft: 4 }}>
              {value.length}
            </Chip>
          )}
        </Button>
      )}
    >
      <div style={{ padding: "4px", minWidth: 160 }}>
        {DUE_DATE_OPTIONS.map(({ value: f, label, color }) => {
          const on = value.includes(f);
          return (
            <button
              key={f}
              onClick={(e) => { e.stopPropagation(); toggle(f); }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", textAlign: "left", padding: "6px 8px",
                borderRadius: 6, border: 0,
                background: on ? "var(--surface-2)" : "transparent",
                fontSize: 13, cursor: "pointer", color: "var(--ink)",
              }}
            >
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{label}</span>
              {on && <span style={{ color: "var(--accent)" }}>{I.check}</span>}
            </button>
          );
        })}
        {value.length > 0 && (
          <>
            <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />
            <MenuItem onClick={() => onChange([])}>Clear</MenuItem>
          </>
        )}
      </div>
    </Menu>
  );
}

function ColumnFilter({
  columns,
  value,
  onChange,
}: {
  columns: ColumnType[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  };

  return (
    <Menu
      trigger={({ setOpen }) => (
        <Button size="sm" variant="default" onClick={() => setOpen((o) => !o)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="5" height="18" rx="1.5" />
            <rect x="10" y="3" width="5" height="18" rx="1.5" />
            <rect x="17" y="3" width="5" height="18" rx="1.5" />
          </svg>
          Column{" "}
          {value.length > 0 && (
            <Chip color="var(--accent)" style={{ marginLeft: 4 }}>
              {value.length}
            </Chip>
          )}
        </Button>
      )}
    >
      <div style={{ padding: "4px", minWidth: 160 }}>
        {columns.map((col) => {
          const on = value.includes(col.id);
          return (
            <button
              key={col.id}
              onClick={(e) => { e.stopPropagation(); toggle(col.id); }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                width: "100%", textAlign: "left", padding: "6px 8px",
                borderRadius: 6, border: 0,
                background: on ? "var(--surface-2)" : "transparent",
                fontSize: 13, cursor: "pointer", color: "var(--ink)",
              }}
            >
              <span style={{ flex: 1 }}>{col.title}</span>
              {on && <span style={{ color: "var(--accent)" }}>{I.check}</span>}
            </button>
          );
        })}
        {value.length > 0 && (
          <>
            <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />
            <MenuItem onClick={() => onChange([])}>Clear</MenuItem>
          </>
        )}
      </div>
    </Menu>
  );
}
