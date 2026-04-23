"use client";

import { useState } from "react";
import { Avatar, Button, Chip } from "@/components/ui";
import { I } from "@/components/Icons";
import { useAllProfiles, useAddBoardMember, useRemoveBoardMember } from "@/hooks/useBoards";
import type { Profile } from "@/types/domain";

interface Props {
  boardId: string;
  members: (Profile & { role: string })[];
  onClose: () => void;
}

export function BoardMembersModal({ boardId, members, onClose }: Props) {
  const { data: allProfiles = [] } = useAllProfiles();
  const addMember = useAddBoardMember(boardId);
  const removeMember = useRemoveBoardMember(boardId);
  const [search, setSearch] = useState("");

  const memberIds = new Set(members.map((m) => m.id));

  const nonMembers = allProfiles.filter(
    (p) => !memberIds.has(p.id) && p.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,20,19,.45)",
        backdropFilter: "blur(2px)",
        zIndex: 150,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "80px 20px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 14,
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Board Members</h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: 0,
              cursor: "pointer",
              color: "var(--ink-3)",
              padding: 4,
            }}
          >
            {I.x}
          </button>
        </div>

        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--line)" }}>
          <input
            autoFocus
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid var(--line-strong)",
              background: "var(--surface-2)",
              fontSize: 13,
              color: "var(--ink)",
              outline: "none",
            }}
          />
        </div>

        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {filteredMembers.length > 0 && (
            <div style={{ padding: "10px 20px 4px" }}>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  color: "var(--ink-4)",
                  marginBottom: 6,
                }}
              >
                Current Members
              </div>
              {filteredMembers.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <Avatar user={m} size={30} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>{m.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>{m.email}</div>
                  </div>
                  <Chip
                    color={
                      m.role === "owner"
                        ? "var(--accent)"
                        : m.role === "editor"
                        ? "var(--ok)"
                        : "var(--ink-3)"
                    }
                  >
                    {m.role === "owner" ? "Scrum Master" : m.role === "editor" ? "Member" : "Observer"}
                  </Chip>
                  {m.role !== "owner" && (
                    <button
                      onClick={() => removeMember.mutate(m.id)}
                      style={{
                        background: "transparent",
                        border: 0,
                        cursor: "pointer",
                        color: "var(--ink-4)",
                        padding: 4,
                        borderRadius: 4,
                      }}
                      title="Remove member"
                    >
                      {I.x}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {nonMembers.length > 0 && (
            <div style={{ padding: "10px 20px" }}>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  color: "var(--ink-4)",
                  marginBottom: 6,
                }}
              >
                Available Users
              </div>
              {nonMembers.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <Avatar user={p} size={30} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-4)" }}>{p.email}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => addMember.mutate({ userId: p.id, role: "editor" })}
                    disabled={addMember.isPending}
                  >
                    {I.plus} Add
                  </Button>
                </div>
              ))}
            </div>
          )}

          {nonMembers.length === 0 && filteredMembers.length === 0 && (
            <div
              style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--ink-4)" }}
            >
              No users found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
