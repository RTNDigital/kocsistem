"use client";

import { AvatarStack } from "@/components/ui";
import { I } from "@/components/Icons";
import type { Card, Label, Profile } from "@/types/domain";
import { dueState, fmtDate } from "@/lib/utils";

interface Props {
  card: Card;
  labels: Label[];
  users: Profile[];
  onOpen: () => void;
  isDragging?: boolean;
}

export function CardTile({ card, labels, users, onOpen, isDragging }: Props) {
  const cardLabels = card.labels
    .map((id) => labels.find((l) => l.id === id))
    .filter(Boolean) as Label[];
  const assignees = card.assignees
    .map((id) => users.find((u) => u.id === id))
    .filter(Boolean) as Profile[];
  const due = dueState(card.due_at);
  const priColor =
    card.priority === "high"
      ? "var(--err)"
      : card.priority === "med"
      ? "var(--warn)"
      : "var(--ok)";

  return (
    <div
      onPointerUp={(e) => {
        if (e.defaultPrevented) return;
        if (isDragging) return;
        onOpen();
      }}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: "var(--card-pad)",
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
        boxShadow: "var(--shadow-sm)",
        transition: "border-color .12s, box-shadow .12s",
        opacity: isDragging ? 0.35 : 1,
        touchAction: "none",
      }}
      onMouseEnter={(e) => {
        if (isDragging) return;
        e.currentTarget.style.borderColor = "var(--line-strong)";
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--line)";
        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
      }}
    >
      {cardLabels.length > 0 && (
        <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
          {cardLabels.map((l) => (
            <span
              key={l.id}
              title={l.name}
              style={{ height: 4, width: 28, borderRadius: 2, background: l.color }}
            />
          ))}
        </div>
      )}

      <div style={{ fontSize: 13, lineHeight: 1.38, fontWeight: 500, color: "var(--ink)" }}>
        {card.priority && (
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: priColor,
              display: "inline-block",
              marginRight: 6,
              verticalAlign: "middle",
            }}
          />
        )}
        {card.title}
      </div>

      {(card.description ||
        card.checklist_count > 0 ||
        card.start_at ||
        card.due_at ||
        card.comment_count > 0 ||
        assignees.length > 0) && (
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            marginTop: 8,
            color: "var(--ink-3)",
            fontSize: 11.5,
            flexWrap: "wrap",
          }}
        >
          {card.description && (
            <span title="Has description" style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
              {I.list}
            </span>
          )}
          {card.start_at && (
            <span
              style={{
                display: "inline-flex",
                gap: 4,
                alignItems: "center",
                color: "var(--ink-3)",
              }}
              title="Start time"
            >
              {I.clock} <span className="mono">{fmtDate(card.start_at)}</span>
            </span>
          )}
          {card.due_at && (
            <span
              style={{
                display: "inline-flex",
                gap: 4,
                alignItems: "center",
                color:
                  due === "overdue"
                    ? "var(--err)"
                    : due === "soon"
                    ? "var(--warn)"
                    : "var(--ink-3)",
              }}
            >
              {I.clock} <span className="mono">{fmtDate(card.due_at)}</span>
            </span>
          )}
          {card.checklist_count > 0 && (
            <span
              style={{
                display: "inline-flex",
                gap: 4,
                alignItems: "center",
                color:
                  card.checklist_done === card.checklist_count
                    ? "var(--ok)"
                    : "var(--ink-3)",
              }}
            >
              {I.check}{" "}
              <span className="mono">
                {card.checklist_done}/{card.checklist_count}
              </span>
            </span>
          )}
          {card.comment_count > 0 && (
            <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
              {I.msg} <span className="mono">{card.comment_count}</span>
            </span>
          )}
          <div style={{ marginLeft: "auto" }}>
            {assignees.length > 0 && <AvatarStack users={assignees} size={20} max={3} />}
          </div>
        </div>
      )}
    </div>
  );
}
