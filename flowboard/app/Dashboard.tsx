"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button, Input, Avatar } from "@/components/ui";
import { I } from "@/components/Icons";
import { useMe } from "@/hooks/useMe";
import { useBoards, useCreateBoard, useUpdateBoard, useRecentActivity } from "@/hooks/useBoards";
import { greeting, relativeTime } from "@/lib/utils";

export function Dashboard() {
  const { data: me } = useMe();
  const { data: boards = [], isLoading } = useBoards();
  const createBoard = useCreateBoard();
  const toggleStar = useUpdateBoard();
  const [query, setQuery] = useState("");
  const [addingProject, setAddingProject] = useState(false);
  const [addingPersonal, setAddingPersonal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newStarted, setNewStarted] = useState("");
  const [newFinished, setNewFinished] = useState("");

  const filtered = boards.filter(
    (b) => !query || b.title.toLowerCase().includes(query.toLowerCase())
  );

  const projectBoards = filtered.filter((b) => b.type === "project");
  const personalBoards = filtered.filter((b) => b.type === "personal");
  const starredProject = projectBoards.filter((b) => b.starred);
  const otherProject = projectBoards.filter((b) => !b.starred);

  const submitProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !me) return;
    createBoard.mutate(
      {
        title: newTitle.trim(),
        ownerId: me.id,
        type: "project",
        started_at: newStarted || null,
        estimated_finished_at: newFinished || null,
      },
      {
        onSuccess: () => {
          setNewTitle("");
          setNewStarted("");
          setNewFinished("");
          setAddingProject(false);
        },
      }
    );
  };

  const submitPersonal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !me) return;
    createBoard.mutate(
      { title: newTitle.trim(), ownerId: me.id, type: "personal" },
      {
        onSuccess: () => {
          setNewTitle("");
          setAddingPersonal(false);
        },
      }
    );
  };

  const cancelAdding = () => {
    setAddingProject(false);
    setAddingPersonal(false);
    setNewTitle("");
    setNewStarted("");
    setNewFinished("");
  };

  return (
    <AppShell>
      <div className="dash-page" style={{ maxWidth: 1160, width: "100%", margin: "0 auto", padding: "36px 40px 80px" }}>
        <header
          className="dash-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "end",
            marginBottom: 30,
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: "var(--ink-3)",
                letterSpacing: ".1em",
                marginBottom: 6,
              }}
            >
              BOARDS · {boards.length}
            </div>
            <h1
              style={{
                fontSize: 34,
                fontWeight: 600,
                letterSpacing: "-.02em",
                margin: 0,
                lineHeight: 1.1,
                color: "var(--accent)",
              }}
            >
              Good {greeting()}, {me?.name?.split(" ")[0] ?? "there"}.
            </h1>
            <p style={{ color: "var(--ink-3)", fontSize: 14, margin: "6px 0 0" }}>
              {projectBoards.length} team {projectBoards.length === 1 ? "board" : "boards"} ·{" "}
              {personalBoards.length} personal
            </p>
          </div>

          <div className="dash-header-actions" style={{ display: "flex", gap: 8 }}>
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
                placeholder="Search boards"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ paddingLeft: 32, width: 220 }}
              />
            </div>
            <Button variant="ghost" onClick={() => { cancelAdding(); setAddingPersonal(true); }}>
              {I.plus} My board
            </Button>
            {me?.is_admin && (
              <Button variant="primary" onClick={() => { cancelAdding(); setAddingProject(true); }}>
                {I.plus} Team board
              </Button>
            )}
          </div>
        </header>

        {addingPersonal && (
          <form
            onSubmit={submitPersonal}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line-strong)",
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              boxShadow: "var(--shadow-md)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--ink-3)",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                }}
              >
                New personal board
              </span>
              <span
                style={{
                  fontSize: 10,
                  background: "var(--surface-2)",
                  color: "var(--ink-3)",
                  borderRadius: 4,
                  padding: "2px 6px",
                  fontWeight: 500,
                }}
              >
                Only visible to you
              </span>
            </div>
            <Input
              autoFocus
              placeholder="Board title — e.g. Weekly goals"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button variant="primary" type="submit" disabled={createBoard.isPending}>
                {createBoard.isPending ? "…" : "Create"}
              </Button>
              <Button type="button" variant="ghost" onClick={cancelAdding}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {addingProject && (
          <form
            onSubmit={submitProject}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line-strong)",
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              boxShadow: "var(--shadow-md)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--ink-3)",
                  textTransform: "uppercase",
                  letterSpacing: ".08em",
                }}
              >
                New team board
              </span>
            </div>
            <Input
              autoFocus
              placeholder="Board title — e.g. Q3 Roadmap"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                  Start date
                </label>
                <input
                  type="date"
                  value={newStarted}
                  onChange={(e) => setNewStarted(e.target.value)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 7,
                    border: "1px solid var(--line-strong)",
                    background: "var(--surface)",
                    color: "var(--ink)",
                    fontSize: 13,
                    outline: "none",
                    fontFamily: "var(--font-sans)",
                  }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                  Est. finish date
                </label>
                <input
                  type="date"
                  value={newFinished}
                  onChange={(e) => setNewFinished(e.target.value)}
                  min={newStarted || undefined}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 7,
                    border: "1px solid var(--line-strong)",
                    background: "var(--surface)",
                    color: "var(--ink)",
                    fontSize: 13,
                    outline: "none",
                    fontFamily: "var(--font-sans)",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, marginLeft: "auto", alignSelf: "flex-end" }}>
                <Button variant="primary" type="submit" disabled={createBoard.isPending}>
                  {createBoard.isPending ? "…" : "Create"}
                </Button>
                <Button type="button" variant="ghost" onClick={cancelAdding}>
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        )}

        {isLoading && (
          <div style={{ color: "var(--ink-4)", fontSize: 13, padding: 24 }}>Loading…</div>
        )}

        {/* Team boards */}
        {!isLoading && starredProject.length > 0 && (
          <Section title="Starred">
            <BoardGrid
              boards={starredProject}
              onStar={(id, on) => toggleStar.mutate({ boardId: id, patch: { starred: on } })}
            />
          </Section>
        )}

        {!isLoading && (
          <Section
            title="Team boards"
            count={otherProject.length}
          >
            <BoardGrid
              boards={otherProject}
              onStar={(id, on) => toggleStar.mutate({ boardId: id, patch: { starred: on } })}
              onAdd={me?.is_admin ? () => { cancelAdding(); setAddingProject(true); } : undefined}
              addLabel="New team board"
            />
          </Section>
        )}

        {/* Personal boards */}
        {!isLoading && (
          <Section
            title="My boards"
            count={personalBoards.length}
            badge="Personal"
          >
            <BoardGrid
              boards={personalBoards}
              onStar={(id, on) => toggleStar.mutate({ boardId: id, patch: { starred: on } })}
              onAdd={() => { cancelAdding(); setAddingPersonal(true); }}
              addLabel="New personal board"
            />
          </Section>
        )}

        <Section title="Recent activity">
          <ActivityFeed />
        </Section>
      </div>
    </AppShell>
  );
}

function Section({
  title,
  count,
  badge,
  children,
}: {
  title: string;
  count?: number;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 44 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 }}>
        <h2
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: "var(--ink-3)",
            margin: 0,
          }}
        >
          {title}
        </h2>
        {count != null && (
          <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>
            {count}
          </span>
        )}
        {badge && (
          <span
            style={{
              fontSize: 10,
              background: "var(--surface-2)",
              color: "var(--ink-3)",
              borderRadius: 4,
              padding: "1px 6px",
              fontWeight: 500,
            }}
          >
            {badge}
          </span>
        )}
        <div style={{ height: 1, background: "var(--line)", flex: 1 }} />
      </div>
      {children}
    </section>
  );
}

function BoardGrid({
  boards,
  onStar,
  onAdd,
  addLabel,
}: {
  boards: { id: string; title: string; color: string; starred: boolean }[];
  onStar: (id: string, on: boolean) => void;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: 14,
      }}
    >
      {boards.map((b) => (
        <Link
          key={b.id}
          href={`/board/${b.id}`}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: 16,
            cursor: "pointer",
            transition: "transform .12s, border-color .12s, box-shadow .12s",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minHeight: 156,
            textDecoration: "none",
            color: "inherit",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--line-strong)";
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "var(--shadow-md)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--line)";
            e.currentTarget.style.transform = "";
            e.currentTarget.style.boxShadow = "";
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: b.color,
                boxShadow: "inset 0 0 0 1px rgba(0,0,0,.08)",
              }}
            />
            <button
              onClick={(e) => {
                e.preventDefault();
                onStar(b.id, !b.starred);
              }}
              style={{
                background: "transparent",
                border: 0,
                cursor: "pointer",
                color: b.starred ? "var(--warn)" : "var(--ink-4)",
                padding: 2,
              }}
              aria-label={b.starred ? "Unstar" : "Star"}
            >
              {b.starred ? I.starF : I.star}
            </button>
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-.01em" }}>{b.title}</div>
        </Link>
      ))}

      {onAdd && (
        <button
          onClick={onAdd}
          style={{
            background: "transparent",
            border: "2px dashed var(--line-strong)",
            borderRadius: 12,
            padding: 16,
            cursor: "pointer",
            color: "var(--ink-3)",
            fontSize: 13,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            minHeight: 156,
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "var(--surface-2)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {I.plus}
          </span>
          <span>{addLabel ?? "New board"}</span>
        </button>
      )}
    </div>
  );
}

const ACTIVITY_CATEGORIES = [
  {
    key: "board",
    label: "Board",
    icon: I.grid,
    color: "#7c6ef5",
    types: new Set(["board_created"]),
  },
  {
    key: "card",
    label: "Kartlar",
    icon: I.list,
    color: "#3b82f6",
    types: new Set([
      "card_created", "card_moved", "card_completed", "card_deleted",
      "card_title_changed", "card_description_changed", "card_priority_changed",
      "card_due_changed", "card_start_changed",
    ]),
  },
  {
    key: "comment",
    label: "Yorumlar",
    icon: I.msg,
    color: "#10b981",
    types: new Set(["card_commented"]),
  },
  {
    key: "checklist",
    label: "Checklist",
    icon: I.check,
    color: "#f59e0b",
    types: new Set([
      "card_checklist_added", "card_checklist_done",
      "card_checklist_undone", "card_checklist_deleted",
    ]),
  },
  {
    key: "label",
    label: "Etiketler",
    icon: I.flag,
    color: "#ec4899",
    types: new Set(["card_label_added", "card_label_removed"]),
  },
  {
    key: "member",
    label: "Üyeler",
    icon: I.users,
    color: "#06b6d4",
    types: new Set(["card_assignee_added", "card_assignee_removed"]),
  },
] as const;

function getActivityCategory(type: string) {
  for (const cat of ACTIVITY_CATEGORIES) {
    if ((cat.types as ReadonlySet<string>).has(type)) return cat.key;
  }
  return "card";
}

function ActivityFeed() {
  const { data: items = [], isLoading } = useRecentActivity(30);

  if (isLoading) return <div style={{ color: "var(--ink-4)" }}>Loading…</div>;
  if (items.length === 0) {
    return (
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 12,
          padding: 24,
          color: "var(--ink-4)",
          fontSize: 13,
          fontStyle: "italic",
        }}
      >
        No activity yet — create a card to get started.
      </div>
    );
  }

  const groups: Record<string, typeof items> = {};
  for (const item of items) {
    const key = getActivityCategory(item.type);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }

  const activeCategories = ACTIVITY_CATEGORIES.filter((c) => groups[c.key]?.length);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {activeCategories.map((cat) => (
        <div
          key={cat.key}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 14px",
              borderBottom: "1px solid var(--line)",
              background: "color-mix(in oklab, var(--surface) 92%, var(--line))",
            }}
          >
            <span style={{ color: cat.color, display: "flex", alignItems: "center" }}>
              {cat.icon}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)", letterSpacing: "0.02em" }}>
              {cat.label}
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 11,
                background: "var(--line)",
                borderRadius: 20,
                padding: "1px 8px",
                color: "var(--ink-3)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {groups[cat.key].length}
            </span>
          </div>
          {groups[cat.key].map((it, i) => (
            <div
              key={it.id}
              style={{
                display: "flex",
                gap: 12,
                padding: "11px 14px",
                borderTop: i ? "1px solid var(--line)" : "none",
                alignItems: "center",
              }}
            >
              {it.actor && <Avatar user={it.actor} size={26} />}
              <div style={{ flex: 1, fontSize: 13, color: "var(--ink-2)" }}>
                <b style={{ color: "var(--ink)", fontWeight: 600 }}>
                  {it.actor?.name ?? "Someone"}
                </b>{" "}
                {describeActivity(it.type)}
              </div>
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>
                {relativeTime(it.created_at)}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function describeActivity(type: string) {
  switch (type) {
    case "board_created":            return "created a new board";
    case "card_created":             return "added a card";
    case "card_moved":               return "moved a card";
    case "card_completed":           return "completed a card";
    case "card_deleted":             return "deleted a card";
    case "card_commented":           return "commented on a card";
    case "card_title_changed":       return "changed a card title";
    case "card_description_changed": return "updated a card description";
    case "card_priority_changed":    return "changed a card priority";
    case "card_due_changed":         return "updated the due date";
    case "card_start_changed":       return "updated the start date";
    case "card_label_added":         return "added a label";
    case "card_label_removed":       return "removed a label";
    case "card_assignee_added":      return "assigned a member";
    case "card_assignee_removed":    return "unassigned a member";
    case "card_checklist_added":     return "added a checklist item";
    case "card_checklist_done":      return "completed a checklist item";
    case "card_checklist_undone":    return "unchecked a checklist item";
    case "card_checklist_deleted":   return "deleted a checklist item";
    default:                         return "performed an action";
  }
}
