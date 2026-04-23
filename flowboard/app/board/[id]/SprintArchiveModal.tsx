"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { I } from "@/components/Icons";
import { useSprintArchives, useSprintArchiveDetail } from "@/hooks/useBoard";
import type { Sprint, SprintArchivedCard } from "@/types/domain";

export function SprintArchiveModal({
  boardId,
  onClose,
}: {
  boardId: string;
  onClose: () => void;
}) {
  const { data: sprints = [], isLoading } = useSprintArchives(boardId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: detail } = useSprintArchiveDetail(selectedId);

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.55)",
          zIndex: 200,
          animation: "fadeIn .15s ease",
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: "3vh 3vw",
          background: "var(--surface)",
          borderRadius: 16,
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 80px rgba(0,0,0,.35)",
          overflow: "hidden",
          animation: "slideUp .2s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "16px 20px",
            borderBottom: "1px solid var(--line)",
            background: "linear-gradient(135deg, color-mix(in oklab, var(--accent) 8%, var(--surface)), var(--surface))",
          }}
        >
          <span style={{ color: "var(--accent)" }}>{I.archive}</span>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, flex: 1 }}>
            Sprint Archive
          </h2>
          <Button size="sm" variant="ghost" onClick={onClose}>
            {I.x}
          </Button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Sidebar — Sprint list */}
          <div
            style={{
              width: 260,
              flexShrink: 0,
              borderRight: "1px solid var(--line)",
              overflowY: "auto",
              padding: "10px 0",
              background: "color-mix(in oklab, var(--surface-2) 40%, var(--surface))",
            }}
          >
            {isLoading && (
              <div style={{ padding: "20px", color: "var(--ink-4)", fontSize: 13 }}>
                Loading…
              </div>
            )}
            {!isLoading && sprints.length === 0 && (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "var(--ink-4)",
                  fontSize: 13,
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>{I.archive}</div>
                No completed sprints yet
              </div>
            )}
            {sprints.map((s: Sprint & { card_count?: number }) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 16px",
                  border: 0,
                  background:
                    selectedId === s.id
                      ? "color-mix(in oklab, var(--accent) 14%, transparent)"
                      : "transparent",
                  cursor: "pointer",
                  borderLeft:
                    selectedId === s.id ? "3px solid var(--accent)" : "3px solid transparent",
                  transition: "all .12s",
                  color: "var(--ink)",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                  {s.title}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-4)", display: "flex", gap: 8 }}>
                  <span>Sprint #{s.sprint_number}</span>
                  <span>·</span>
                  <span>
                    {s.ended_at
                      ? new Date(s.ended_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </span>
                </div>
                {(s as any).card_count != null && (
                  <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 2 }}>
                    {(s as any).card_count} tasks archived
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Main — Sprint detail */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
            {!selectedId && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "var(--ink-4)",
                  fontSize: 14,
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 40, opacity: 0.2 }}>{I.archive}</span>
                Select a sprint to view its archive
              </div>
            )}

            {selectedId && detail && (
              <>
                {/* Sprint meta */}
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>
                    {detail.sprint.title}
                  </h3>
                  {detail.sprint.goal && (
                    <p style={{ margin: "0 0 8px", color: "var(--ink-3)", fontSize: 13 }}>
                      {detail.sprint.goal}
                    </p>
                  )}
                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      fontSize: 12,
                      color: "var(--ink-4)",
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {I.rocket} Sprint #{detail.sprint.sprint_number}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {I.calendar}{" "}
                      {new Date(detail.sprint.started_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      →{" "}
                      {detail.sprint.ended_at
                        ? new Date(detail.sprint.ended_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {I.check} {detail.cards.length} tasks completed
                    </span>
                  </div>
                </div>

                {/* Summary table */}
                {detail.cards.length === 0 ? (
                  <div style={{ color: "var(--ink-4)", fontSize: 13 }}>
                    No tasks were archived in this sprint.
                  </div>
                ) : (
                  <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid var(--line)" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: 12.5,
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            background: "color-mix(in oklab, var(--surface-2) 60%, var(--surface))",
                            textAlign: "left",
                          }}
                        >
                          <th style={thStyle}>Task</th>
                          <th style={thStyle}>Assignees</th>
                          <th style={thStyle}>Watchers</th>
                          <th style={thStyle}>Due Date</th>
                          <th style={thStyle}>Labels</th>
                          <th style={thStyle}>Priority</th>
                          <th style={thStyle}>Checklist</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.cards.map((card: SprintArchivedCard) => (
                          <tr
                            key={card.id}
                            style={{
                              borderTop: "1px solid var(--line)",
                              transition: "background .1s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background =
                                "color-mix(in oklab, var(--accent) 4%, transparent)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "transparent")
                            }
                          >
                            <td style={tdStyle}>
                              <span style={{ fontWeight: 500 }}>{card.card_title}</span>
                              {card.created_by_name && (
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "var(--ink-4)",
                                    marginTop: 2,
                                  }}
                                >
                                  by {card.created_by_name}
                                </div>
                              )}
                            </td>
                            <td style={tdStyle}>
                              {card.assignee_names.length > 0 ? (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                                  {card.assignee_names.map((n, i) => (
                                    <span key={i} style={chipStyle("#3E7CE0")}>
                                      {n}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span style={{ color: "var(--ink-4)" }}>—</span>
                              )}
                            </td>
                            <td style={tdStyle}>
                              {card.watcher_names.length > 0 ? (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                                  {card.watcher_names.map((n, i) => (
                                    <span key={i} style={chipStyle("#8B5BD9")}>
                                      {n}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span style={{ color: "var(--ink-4)" }}>—</span>
                              )}
                            </td>
                            <td style={tdStyle}>
                              {card.card_due_at ? (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    fontSize: 11.5,
                                  }}
                                >
                                  {I.calendar}
                                  {new Date(card.card_due_at).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              ) : (
                                <span style={{ color: "var(--ink-4)" }}>—</span>
                              )}
                            </td>
                            <td style={tdStyle}>
                              {card.label_names.length > 0 ? (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                                  {card.label_names.map((name, i) => (
                                    <span
                                      key={i}
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 4,
                                        padding: "2px 7px",
                                        borderRadius: 4,
                                        fontSize: 11,
                                        fontWeight: 500,
                                        background: `color-mix(in oklab, ${card.label_colors[i] ?? "#888"} 18%, transparent)`,
                                        color: card.label_colors[i] ?? "var(--ink-3)",
                                      }}
                                    >
                                      <span
                                        style={{
                                          width: 7,
                                          height: 7,
                                          borderRadius: 2,
                                          background: card.label_colors[i] ?? "#888",
                                        }}
                                      />
                                      {name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span style={{ color: "var(--ink-4)" }}>—</span>
                              )}
                            </td>
                            <td style={tdStyle}>
                              {card.card_priority ? (
                                <span style={priorityStyle(card.card_priority)}>
                                  {card.card_priority.toUpperCase()}
                                </span>
                              ) : (
                                <span style={{ color: "var(--ink-4)" }}>—</span>
                              )}
                            </td>
                            <td style={tdStyle}>
                              {card.checklist_total > 0 ? (
                                <span
                                  style={{
                                    fontSize: 11.5,
                                    color:
                                      card.checklist_done === card.checklist_total
                                        ? "var(--ok)"
                                        : "var(--ink-3)",
                                  }}
                                >
                                  {card.checklist_done}/{card.checklist_total}
                                </span>
                              ) : (
                                <span style={{ color: "var(--ink-4)" }}>—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: ".05em",
  color: "var(--ink-4)",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  verticalAlign: "top",
};

function chipStyle(color: string): React.CSSProperties {
  return {
    display: "inline-block",
    padding: "1px 6px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 500,
    background: `color-mix(in oklab, ${color} 16%, transparent)`,
    color,
  };
}

function priorityStyle(p: string): React.CSSProperties {
  const colors: Record<string, string> = {
    high: "#E5484D",
    med: "#E6884E",
    low: "#2E7D6A",
  };
  const c = colors[p] ?? "var(--ink-3)";
  return {
    display: "inline-block",
    padding: "1px 7px",
    borderRadius: 4,
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: ".04em",
    background: `color-mix(in oklab, ${c} 14%, transparent)`,
    color: c,
  };
}
