"use client";

import { Avatar } from "@/components/ui";
import { I } from "@/components/Icons";
import { useLeaderboard } from "@/hooks/useBoard";
import type { LeaderboardEntry } from "@/lib/queries";
import { AppShell } from "@/components/AppShell";

export function LeaderboardScreen() {
  const { data: entries = [], isLoading } = useLeaderboard();

  return (
    <AppShell>
    <div
      style={{
        maxWidth: 680,
        margin: "0 auto",
        padding: "36px 24px",
        width: "100%",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ color: "var(--accent)", fontSize: 22 }}>{I.trophy}</span>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              margin: 0,
              letterSpacing: "-.02em",
            }}
          >
            Leaderboard
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "var(--ink-3)" }}>
          Story point totals earned by each team member across all tasks.
        </p>
      </div>

      {isLoading && (
        <div style={{ color: "var(--ink-4)", fontSize: 13, padding: "40px 0", textAlign: "center" }}>
          Loading…
        </div>
      )}

      {!isLoading && entries.length === 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            padding: "60px 0",
            color: "var(--ink-4)",
          }}
        >
          <span style={{ fontSize: 40, opacity: 0.25 }}>{I.trophy}</span>
          <p style={{ margin: 0, fontSize: 13 }}>
            No story points assigned yet. Add story points to tasks to see the leaderboard.
          </p>
        </div>
      )}

      {!isLoading && entries.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {entries.map((entry, index) => (
            <LeaderboardRow key={entry.id} entry={entry} rank={index + 1} />
          ))}
        </div>
      )}
    </div>
    </AppShell>
  );
}

function LeaderboardRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const isTop3 = rank <= 3;
  const medalColor =
    rank === 1 ? "#F5A623" : rank === 2 ? "#A8A9AD" : rank === 3 ? "#CD7F32" : undefined;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 18px",
        borderRadius: 12,
        background: isTop3
          ? `color-mix(in oklab, ${medalColor} 8%, var(--surface))`
          : "var(--surface)",
        border: `1px solid ${isTop3 ? `color-mix(in oklab, ${medalColor} 30%, var(--line))` : "var(--line)"}`,
        transition: "box-shadow .15s",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,.08)")
      }
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      {/* Rank */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: medalColor
            ? `color-mix(in oklab, ${medalColor} 20%, transparent)`
            : "var(--surface-2)",
          color: medalColor ?? "var(--ink-3)",
          fontWeight: 700,
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
      </div>

      {/* Avatar */}
      <Avatar
        user={{
          name: entry.name,
          initials: entry.initials,
          color: entry.color,
        }}
        size={36}
      />

      {/* Name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 14,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {entry.name}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ink-4)", marginTop: 1 }}>
          {entry.active_points > 0 && (
            <span style={{ marginRight: 8 }}>
              {entry.active_points} active
            </span>
          )}
          {entry.archived_points > 0 && (
            <span>{entry.archived_points} completed</span>
          )}
        </div>
      </div>

      {/* Score */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <span
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: medalColor ?? "var(--ink)",
            letterSpacing: "-.02em",
          }}
        >
          {entry.total_points}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--ink-4)",
            textTransform: "uppercase",
            letterSpacing: ".05em",
          }}
        >
          pts
        </span>
      </div>
    </div>
  );
}
