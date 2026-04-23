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
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newStarted, setNewStarted] = useState("");
  const [newFinished, setNewFinished] = useState("");

  const filtered = boards.filter(
    (b) => !query || b.title.toLowerCase().includes(query.toLowerCase())
  );
  const starred = filtered.filter((b) => b.starred);
  const others = filtered.filter((b) => !b.starred);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !me) return;
    createBoard.mutate(
      {
        title: newTitle.trim(),
        ownerId: me.id,
        started_at: newStarted || null,
        estimated_finished_at: newFinished || null,
      },
      {
        onSuccess: () => {
          setNewTitle("");
          setNewStarted("");
          setNewFinished("");
          setAdding(false);
        },
      }
    );
  };

  return (
    <AppShell>
      <div style={{ maxWidth: 1160, width: "100%", margin: "0 auto", padding: "36px 40px 80px" }}>
        <header
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
              {boards.length} {boards.length === 1 ? "board" : "boards"} ·{" "}
              {starred.length} starred
            </p>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
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
            {me?.is_admin && (
              <Button variant="primary" onClick={() => setAdding(true)}>
                {I.plus} New board
              </Button>
            )}
          </div>
        </header>

        {adding && (
          <form
            onSubmit={submit}
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
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setAdding(false);
                    setNewTitle("");
                    setNewStarted("");
                    setNewFinished("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </form>
        )}

        {isLoading && (
          <div style={{ color: "var(--ink-4)", fontSize: 13, padding: 24 }}>Loading…</div>
        )}

        {!isLoading && starred.length > 0 && (
          <Section title="Starred">
            <BoardGrid
              boards={starred}
              onStar={(id, on) => toggleStar.mutate({ boardId: id, patch: { starred: on } })}
            />
          </Section>
        )}

        {!isLoading && (
          <Section
            title={starred.length ? "All boards" : "Your boards"}
            count={others.length}
          >
            <BoardGrid
              boards={others}
              onStar={(id, on) => toggleStar.mutate({ boardId: id, patch: { starred: on } })}
              createCard={me?.is_admin ? () => setAdding(true) : undefined}
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
  children,
}: {
  title: string;
  count?: number;
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
        <div style={{ height: 1, background: "var(--line)", flex: 1 }} />
      </div>
      {children}
    </section>
  );
}

function BoardGrid({
  boards,
  onStar,
  createCard,
}: {
  boards: { id: string; title: string; color: string; starred: boolean }[];
  onStar: (id: string, on: boolean) => void;
  createCard?: () => void;
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

      {createCard && (
        <button
          onClick={createCard}
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
          <span>New board</span>
        </button>
      )}
    </div>
  );
}

function ActivityFeed() {
  const { data: items = [], isLoading } = useRecentActivity(8);
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
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {items.map((it, i) => (
        <div
          key={it.id}
          style={{
            display: "flex",
            gap: 12,
            padding: "13px 16px",
            borderTop: i ? "1px solid var(--line)" : "none",
            alignItems: "center",
          }}
        >
          {it.actor && <Avatar user={it.actor} size={28} />}
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
  );
}

function describeActivity(type: string) {
  switch (type) {
    case "board_created":
      return "created a new board";
    case "card_created":
      return "added a card";
    case "card_moved":
      return "moved a card";
    case "card_completed":
      return "completed a card";
    case "card_commented":
      return "commented on a card";
    default:
      return "did something";
  }
}
