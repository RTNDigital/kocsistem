"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import React, { useEffect, useState } from "react";
import { Avatar, AvatarStack, Button, Chip, InlineEdit, Menu, MenuItem, Textarea, Input } from "@/components/ui";
import { I, Icon } from "@/components/Icons";
import { useMe } from "@/hooks/useMe";
import { useCardDetail, useAddChecklist, useToggleChecklist, useDeleteChecklist, useAddComment, useDeleteComment, useCardActivities } from "@/hooks/useCard";
import { useDeleteCard, useToggleCardAssignee, useToggleCardLabel, useUpdateCard, useMoveCard, useToggleCardWatcher } from "@/hooks/useBoard";
import type { Column, Label, Profile } from "@/types/domain";
import type { CardPriority } from "@/types/database";
import { dueState, fmtDate, relativeTime } from "@/lib/utils";

interface Props {
  cardId: string;
  boardId: string;
  boardMembers: Profile[];
  allLabels: Label[];
  columns: Column[];
  onClose: () => void;
}

export function CardModal({ cardId, boardId, boardMembers, allLabels, columns, onClose }: Props) {
  const { data: me } = useMe();
  const { data: card, isLoading } = useCardDetail(cardId);
  const updateCard = useUpdateCard(boardId);
  const deleteCard = useDeleteCard(boardId);
  const toggleLabel = useToggleCardLabel(boardId);
  const toggleAssignee = useToggleCardAssignee(boardId);
  const toggleWatcher = useToggleCardWatcher(boardId);
  const moveCard = useMoveCard(boardId);
  const addChecklist = useAddChecklist(cardId, boardId);
  const toggleChecklist = useToggleChecklist(cardId, boardId);
  const deleteChecklist = useDeleteChecklist(cardId, boardId);
  const addComment = useAddComment(cardId, boardId);
  const delComment = useDeleteComment(cardId, boardId);

  const [comment, setComment] = useState("");
  const [checkText, setCheckText] = useState("");
  const [activityTab, setActivityTab] = useState<"comments" | "log">("comments");
  const { data: cardLogs = [] } = useCardActivities(cardId);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  // Cleanup file preview URL on unmount
  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  if (isLoading || !card) {
    return (
      <Backdrop onClose={onClose}>
        <div style={{ padding: 40, color: "var(--ink-3)" }}>Loading…</div>
      </Backdrop>
    );
  }

  const col = columns.find((c) => c.id === card.column_id);
  const checkDone = card.checklist.filter((c) => c.done).length;
  const checkTotal = card.checklist.length;
  const progress = checkTotal ? checkDone / checkTotal : 0;
  const due = dueState(card.due_at);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Validate on client side
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/svg+xml", "image/bmp", "image/tiff", "image/avif", "image/heic", "image/heif"];
    if (!allowedTypes.includes(file.type)) {
      alert("Unsupported file type. Use PNG, JPG, JPEG, WebP, GIF, SVG, BMP, TIFF, AVIF or HEIC.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("File too large. Max 10MB.");
      return;
    }
    setSelectedFile(file);
    setFilePreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const clearFile = () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setSelectedFile(null);
    setFilePreview(null);
  };

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!comment.trim() && !selectedFile) || !me) return;
    addComment.mutate({ authorId: me.id, text: comment.trim() || (selectedFile ? "📎 Image" : ""), file: selectedFile ?? undefined });
    setComment("");
    clearFile();
  };

  const submitChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkText.trim()) return;
    addChecklist.mutate(checkText.trim());
    setCheckText("");
  };

  return (
    <Backdrop onClose={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 820,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 14,
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
        }}
        className="card-modal"
      >
        {/* Header */}
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid var(--line)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11.5,
              color: "var(--ink-3)",
              marginBottom: 8,
            }}
          >
            <span className="mono" style={{ letterSpacing: ".06em", textTransform: "uppercase" }}>
              {col?.title ?? ""}
            </span>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
              <button
                onClick={() => {
                  if (confirm("Delete this card?")) {
                    deleteCard.mutate(card.id);
                    onClose();
                  }
                }}
                style={{
                  background: "transparent",
                  border: 0,
                  padding: 6,
                  borderRadius: 6,
                  color: "var(--ink-3)",
                  cursor: "pointer",
                }}
                aria-label="Delete card"
              >
                {I.trash}
              </button>
              <button
                onClick={onClose}
                style={{
                  background: "transparent",
                  border: 0,
                  padding: 6,
                  borderRadius: 6,
                  color: "var(--ink-3)",
                  cursor: "pointer",
                }}
                aria-label="Close"
              >
                {I.x}
              </button>
            </div>
          </div>

          <InlineEdit
            value={card.title}
            onCommit={(v) => updateCard.mutate({ cardId, patch: { title: v } })}
            render={(v) => (
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  letterSpacing: "-.01em",
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {v}
              </h2>
            )}
            inputStyle={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.01em" }}
          />

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 14,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {card.labels.map((l) => (
              <Chip key={l.id} color={l.color}>
                {l.name}
              </Chip>
            ))}
            {card.priority && (
              <Chip
                color={
                  card.priority === "high"
                    ? "var(--err)"
                    : card.priority === "med"
                    ? "var(--warn)"
                    : "var(--ok)"
                }
              >
                {card.priority} priority
              </Chip>
            )}
            {card.start_at && (
              <Chip color="var(--ink-3)">
                Start {fmtDate(card.start_at)}
              </Chip>
            )}
            {card.due_at && (
              <Chip
                color={
                  due === "overdue"
                    ? "var(--err)"
                    : due === "soon"
                    ? "var(--warn)"
                    : "var(--ink-3)"
                }
              >
                {fmtDate(card.due_at)}
              </Chip>
            )}
            {card.assignees.length > 0 && (
              <span style={{ marginLeft: "auto" }}>
                <AvatarStack users={card.assignees} size={24} max={5} />
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="card-modal-body" style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 0 }}>
          <div
            style={{
              padding: "20px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 22,
              minWidth: 0,
            }}
          >
            <Block label="Description">
              <DescriptionEditor
                value={card.description}
                onCommit={(v) => updateCard.mutate({ cardId, patch: { description: v } })}
              />
            </Block>

            <Block
              label="Checklist"
              right={
                checkTotal > 0 && (
                  <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                    {checkDone}/{checkTotal}
                  </span>
                )
              }
            >
              {checkTotal > 0 && (
                <div
                  style={{
                    height: 4,
                    background: "var(--surface-2)",
                    borderRadius: 2,
                    marginBottom: 10,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${progress * 100}%`,
                      height: "100%",
                      background: "var(--accent)",
                      transition: "width .2s",
                    }}
                  />
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {card.checklist.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      gap: 9,
                      alignItems: "center",
                      padding: "5px 2px",
                      borderRadius: 6,
                    }}
                  >
                    <button
                      onClick={() =>
                        toggleChecklist.mutate({ itemId: item.id, done: !item.done })
                      }
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        border: "1.5px solid " + (item.done ? "var(--accent)" : "var(--line-strong)"),
                        background: item.done ? "var(--accent)" : "transparent",
                        cursor: "pointer",
                        padding: 0,
                        color: "#fff",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      aria-label={item.done ? "Uncheck" : "Check"}
                    >
                      {item.done && <Icon d="M4 10l3 3 7-7" size={11} stroke={2.5} />}
                    </button>
                    <span
                      style={{
                        fontSize: 13.5,
                        flex: 1,
                        color: item.done ? "var(--ink-4)" : "var(--ink-2)",
                        textDecoration: item.done ? "line-through" : "none",
                      }}
                    >
                      {item.text}
                    </span>
                    <button
                      onClick={() => deleteChecklist.mutate(item.id)}
                      style={{
                        background: "transparent",
                        border: 0,
                        cursor: "pointer",
                        color: "var(--ink-4)",
                        padding: 2,
                      }}
                      aria-label="Delete item"
                    >
                      {I.x}
                    </button>
                  </div>
                ))}
              </div>
              <form
                onSubmit={submitChecklist}
                style={{ display: "flex", gap: 6, marginTop: checkTotal ? 8 : 0 }}
              >
                <Input
                  value={checkText}
                  onChange={(e) => setCheckText(e.target.value)}
                  placeholder="Add an item…"
                  style={{ fontSize: 13 }}
                />
                <Button size="sm" variant="default" type="submit">
                  Add
                </Button>
              </form>
            </Block>

            <Block
              label="Activity"
              right={
                <div style={{ display: "flex", gap: 2 }}>
                  {(["comments", "log"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActivityTab(tab)}
                      style={{
                        padding: "2px 10px",
                        borderRadius: 5,
                        border: "1px solid " + (activityTab === tab ? "var(--accent)" : "var(--line)"),
                        background: activityTab === tab ? "var(--accent)" : "transparent",
                        color: activityTab === tab ? "#fff" : "var(--ink-3)",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        letterSpacing: ".04em",
                        textTransform: "capitalize",
                      }}
                    >
                      {tab === "comments" ? `Comments (${card.comments.length})` : `Log (${cardLogs.length})`}
                    </button>
                  ))}
                </div>
              }
            >
              {activityTab === "comments" ? (
                <>
                  <form onSubmit={submitComment} style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                    {me && <Avatar user={me} size={28} />}
                    <div style={{ flex: 1 }}>
                      <Textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Write a comment… (⌘↵ to send)"
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") submitComment(e);
                        }}
                        style={{ minHeight: 60 }}
                      />
                      {/* File preview */}
                      {filePreview && selectedFile && (
                        <div style={{
                          marginTop: 8,
                          position: "relative",
                          display: "inline-block",
                          borderRadius: 8,
                          overflow: "hidden",
                          border: "1px solid var(--line)",
                          background: "var(--surface-2)",
                        }}>
                          <img
                            src={filePreview}
                            alt="Preview"
                            style={{
                              maxWidth: 180,
                              maxHeight: 120,
                              display: "block",
                              objectFit: "cover",
                            }}
                          />
                          <button
                            type="button"
                            onClick={clearFile}
                            style={{
                              position: "absolute",
                              top: 4,
                              right: 4,
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              background: "rgba(0,0,0,0.6)",
                              color: "#fff",
                              border: 0,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 12,
                              lineHeight: 1,
                              padding: 0,
                            }}
                            aria-label="Remove file"
                          >
                            ✕
                          </button>
                          <div style={{
                            fontSize: 10,
                            color: "var(--ink-3)",
                            padding: "3px 6px",
                            background: "var(--surface-2)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: 180,
                          }}>
                            {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)}KB)
                          </div>
                        </div>
                      )}
                      <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml,image/bmp,image/tiff,image/avif,image/heic,image/heif"
                            onChange={handleFileSelect}
                            style={{ display: "none" }}
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            title="Attach image"
                            style={{
                              background: "transparent",
                              border: "1px solid var(--line)",
                              borderRadius: 6,
                              padding: "4px 8px",
                              cursor: "pointer",
                              color: selectedFile ? "var(--accent)" : "var(--ink-3)",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 12,
                              transition: "all .15s",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = selectedFile ? "var(--accent)" : "var(--ink-3)"; }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                            {selectedFile ? "1 file" : "Attach"}
                          </button>
                        </div>
                        {(comment.trim() || selectedFile) && (
                          <Button
                            variant="primary"
                            size="sm"
                            type="submit"
                            disabled={addComment.isPending}
                          >
                            {addComment.isPending ? "Uploading…" : "Send"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </form>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {card.comments.map((c) => (
                      <div key={c.id} style={{ display: "flex", gap: 10 }}>
                        {c.author && <Avatar user={c.author} size={28} />}
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 3, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div>
                              <b style={{ color: "var(--ink)", fontWeight: 600 }}>
                                {c.author?.name ?? "Unknown"}
                              </b>
                              <span
                                className="mono"
                                style={{ color: "var(--ink-4)", marginLeft: 8, fontSize: 11 }}
                              >
                                {relativeTime(c.created_at)}
                              </span>
                            </div>
                            {me && c.author_id === me.id && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm("Delete this comment?")) {
                                    delComment.mutate(c.id);
                                  }
                                }}
                                title="Delete comment"
                                style={{
                                  background: "transparent",
                                  border: 0,
                                  cursor: "pointer",
                                  color: "var(--ink-4)",
                                  padding: "2px 4px",
                                  borderRadius: 4,
                                  display: "flex",
                                  alignItems: "center",
                                  transition: "color .15s",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--red, #e53e3e)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--ink-4)"; }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                                </svg>
                              </button>
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: 13.5,
                              color: "var(--ink-2)",
                              lineHeight: 1.5,
                              background: "var(--surface-2)",
                              borderRadius: 8,
                              padding: "8px 10px",
                            }}
                          >
                            {c.text}
                          </div>
                          {/* Comment attachments */}
                          {c.attachments && c.attachments.length > 0 && (
                            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {c.attachments.map((att) => (
                                <button
                                  key={att.id}
                                  type="button"
                                  onClick={() => setLightboxUrl(att.url)}
                                  style={{
                                    display: "block",
                                    borderRadius: 8,
                                    overflow: "hidden",
                                    border: "1px solid var(--line)",
                                    transition: "border-color .15s, box-shadow .15s",
                                    maxWidth: 240,
                                    padding: 0,
                                    background: "var(--surface-2)",
                                    cursor: "pointer",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = "var(--accent)";
                                    e.currentTarget.style.boxShadow = "0 0 0 2px color-mix(in oklab, var(--accent) 25%, transparent)";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = "var(--line)";
                                    e.currentTarget.style.boxShadow = "none";
                                  }}
                                >
                                  <img
                                    src={att.url}
                                    alt={att.file_name}
                                    style={{
                                      maxWidth: 240,
                                      maxHeight: 180,
                                      display: "block",
                                      objectFit: "cover",
                                    }}
                                    loading="lazy"
                                    onError={(e) => {
                                      const target = e.currentTarget;
                                      target.style.display = "none";
                                      const fallback = target.nextElementSibling as HTMLElement;
                                      if (fallback) fallback.style.display = "flex";
                                    }}
                                  />
                                  <div
                                    style={{
                                      display: "none",
                                      width: 240,
                                      height: 80,
                                      alignItems: "center",
                                      justifyContent: "center",
                                      gap: 6,
                                      color: "var(--ink-3)",
                                      fontSize: 12,
                                      background: "var(--surface-2)",
                                    }}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                    {att.file_name}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {card.comments.length === 0 && (
                      <div style={{ fontSize: 12.5, color: "var(--ink-4)", fontStyle: "italic", paddingLeft: 38 }}>
                        No comments yet.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {cardLogs.map((log) => (
                    <div
                      key={log.id}
                      style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "4px 0" }}
                    >
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: logDotColor(log.type as string),
                          marginTop: 6,
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13, color: "var(--ink-2)" }}>
                          {describeLog(log.type as string, log.payload as Record<string, unknown>)}
                        </span>
                        <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 1 }}>
                          <span style={{ fontWeight: 600 }}>{log.actor?.name ?? "Unknown"}</span>
                          <span className="mono" style={{ marginLeft: 6 }}>
                            {relativeTime(log.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {cardLogs.length === 0 && (
                    <div style={{ fontSize: 12.5, color: "var(--ink-4)", fontStyle: "italic" }}>
                      No activity yet.
                    </div>
                  )}
                </div>
              )}
            </Block>
          </div>

          {/* Sidebar */}
          <aside
            style={{
              padding: "20px 18px 20px 4px",
              borderLeft: "1px solid var(--line)",
              background: "color-mix(in oklab, var(--surface-2) 40%, var(--surface))",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
            className="card-modal-aside"
          >
            <SidebarTitle>Add to card</SidebarTitle>

            <Menu
              trigger={({ setOpen }) => (
                <SideBtn icon={I.users} onClick={() => setOpen((o) => !o)}>
                  Members ({card.assignees.length})
                </SideBtn>
              )}
            >
              {({ setOpen }) => boardMembers.map((u) => {
                const on = card.assignees.some((a) => a.id === u.id);
                const disabled = !on && card.assignees.length >= 1;
                return (
                  <button
                    key={u.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (disabled) return;
                      toggleAssignee.mutate({ cardId, userId: u.id, on: !on });
                      setOpen(false);
                    }}
                    style={{
                      ...popoverItem,
                      opacity: disabled ? 0.5 : 1,
                      cursor: disabled ? "not-allowed" : "pointer"
                    }}
                    disabled={disabled}
                  >
                    <Avatar user={u} size={22} />
                    <span style={{ flex: 1 }}>{u.name}</span>
                    {on && <span style={{ color: "var(--accent)" }}>{I.check}</span>}
                  </button>
                );
              })}
            </Menu>

            <Menu
              trigger={({ setOpen }) => (
                <SideBtn icon={I.eye} onClick={() => setOpen((o) => !o)}>
                  Watchers ({card.watchers.length})
                </SideBtn>
              )}
            >
              {({ setOpen }) => boardMembers.map((u) => {
                const on = card.watchers.some((w) => w.id === u.id);
                return (
                  <button
                    key={u.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWatcher.mutate({ cardId, userId: u.id, on: !on });
                      setOpen(false);
                    }}
                    style={popoverItem}
                  >
                    <Avatar user={u} size={22} />
                    <span style={{ flex: 1 }}>{u.name}</span>
                    {on && <span style={{ color: "var(--accent)" }}>{I.check}</span>}
                  </button>
                );
              })}
            </Menu>

            <Menu
              trigger={({ setOpen }) => (
                <SideBtn icon={I.flag} onClick={() => setOpen((o) => !o)}>
                  Labels ({card.labels.length})
                </SideBtn>
              )}
            >
              {allLabels.map((l) => {
                const on = card.labels.some((x) => x.id === l.id);
                return (
                  <button
                    key={l.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLabel.mutate({ cardId, labelId: l.id, on: !on });
                    }}
                    style={popoverItem}
                  >
                    <span
                      style={{ width: 24, height: 12, borderRadius: 3, background: l.color }}
                    />
                    <span style={{ flex: 1 }}>{l.name}</span>
                    {on && <span style={{ color: "var(--accent)" }}>{I.check}</span>}
                  </button>
                );
              })}
            </Menu>

            <StartDateField
              value={card.start_at}
              onChange={(v) => updateCard.mutate({ cardId, patch: { start_at: v } })}
            />

            <DueDateField
              value={card.due_at}
              onChange={(v) => updateCard.mutate({ cardId, patch: { due_at: v } })}
            />

            <Menu
              trigger={({ setOpen }) => (
                <SideBtn icon={I.zap} onClick={() => setOpen((o) => !o)}>
                  {card.priority ? `Priority — ${card.priority}` : "Priority"}
                </SideBtn>
              )}
            >
              {(["high", "med", "low"] as CardPriority[]).map((p) => (
                <button
                  key={p}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateCard.mutate({
                      cardId,
                      patch: { priority: card.priority === p ? null : p },
                    });
                  }}
                  style={popoverItem}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background:
                        p === "high" ? "var(--err)" : p === "med" ? "var(--warn)" : "var(--ok)",
                    }}
                  />
                  <span style={{ flex: 1 }}>{p}</span>
                  {card.priority === p && <span style={{ color: "var(--accent)" }}>{I.check}</span>}
                </button>
              ))}
            </Menu>

            <Menu
              trigger={({ setOpen }) => (
                <SideBtn icon={<span style={{ fontSize: 12, fontWeight: 700 }}>SP</span>} onClick={() => setOpen((o) => !o)}>
                  {card.story_points != null ? `Story Points — ${card.story_points}` : "Story Points"}
                </SideBtn>
              )}
            >
              {([1, 2, 3, 5, 8, 13] as number[]).map((pts) => (
                <button
                  key={pts}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateCard.mutate({
                      cardId,
                      patch: { story_points: card.story_points === pts ? null : pts },
                    });
                  }}
                  style={popoverItem}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 5,
                      background: "var(--surface-2)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--ink-2)",
                    }}
                  >
                    {pts}
                  </span>
                  <span style={{ flex: 1 }}>{pts === 1 ? "Trivial" : pts === 2 ? "Easy" : pts === 3 ? "Medium" : pts === 5 ? "Hard" : pts === 8 ? "Very Hard" : "Epic"}</span>
                  {card.story_points === pts && <span style={{ color: "var(--accent)" }}>{I.check}</span>}
                </button>
              ))}
            </Menu>

            <SidebarTitle style={{ marginTop: 18 }}>Move to column</SidebarTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "0 4px" }}>
              {columns.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    if (c.id !== card.column_id && me) {
                      moveCard.mutate({
                        cardId,
                        toColumnId: c.id,
                        toIndex: 0,
                        actorId: me.id,
                      });
                    }
                  }}
                  disabled={c.id === card.column_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    textAlign: "left",
                    padding: "6px 10px",
                    borderRadius: 6,
                    border: 0,
                    background: c.id === card.column_id ? "var(--surface-2)" : "transparent",
                    fontSize: 12.5,
                    color: c.id === card.column_id ? "var(--ink)" : "var(--ink-2)",
                    cursor: c.id === card.column_id ? "default" : "pointer",
                    fontWeight: c.id === card.column_id ? 600 : 400,
                  }}
                >
                  {c.id === card.column_id && <span style={{ color: "var(--accent)" }}>●</span>}
                  {c.title}
                </button>
              ))}
            </div>

            <div
              style={{
                marginTop: "auto",
                paddingTop: 14,
                borderTop: "1px dashed var(--line)",
                fontSize: 11,
                color: "var(--ink-4)",
              }}
            >
              <div className="mono">Created {fmtDate(card.created_at)}</div>
              <div className="mono" style={{ marginTop: 2 }}>
                ID {card.id.slice(-8)}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 720px) {
          .card-modal-body {
            grid-template-columns: 1fr !important;
          }
          .card-modal-aside {
            border-left: 0 !important;
            border-top: 1px solid var(--line);
            padding: 16px !important;
          }
        }
        
        /* Tiptap styles */
        :global(.ProseMirror) {
          outline: none;
        }
        :global(.ProseMirror > *:first-child) {
          margin-top: 0;
        }
        :global(.ProseMirror p) {
          margin-bottom: 0.5em;
        }
        :global(.ProseMirror ul), :global(.ProseMirror ol) {
          padding-left: 1.5rem;
          margin-bottom: 0.5em;
        }
        :global(.ProseMirror h1) {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0.5em 0;
        }
        :global(.ProseMirror h2) {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0.5em 0;
        }
      `}</style>

      {/* Image Lightbox */}
      {lightboxUrl && (
        <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      )}
    </Backdrop>
  );
}

function ImageLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
    };
    document.addEventListener("keydown", h, true);
    return () => document.removeEventListener("keydown", h, true);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "zoom-out",
        padding: 32,
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.15)",
          border: 0,
          color: "#fff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: 300,
          transition: "background .15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.3)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
        aria-label="Close preview"
      >
        ✕
      </button>
      <img
        src={url}
        alt="Preview"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "90vw",
          maxHeight: "85vh",
          borderRadius: 10,
          boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
          objectFit: "contain",
          cursor: "default",
        }}
      />
    </div>
  );
}

function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      className="card-modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,20,19,.45)",
        backdropFilter: "blur(2px)",
        zIndex: 150,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "56px 20px",
        overflowY: "auto",
      }}
    >
      {children}
    </div>
  );
}

function SidebarTitle({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        fontSize: 10.5,
        fontWeight: 600,
        letterSpacing: ".1em",
        textTransform: "uppercase",
        color: "var(--ink-4)",
        padding: "0 8px",
        marginBottom: 2,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Block({
  label,
  right,
  children,
}: {
  label: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 9,
        }}
      >
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "var(--ink-3)",
          }}
        >
          {label}
        </span>
        {right}
      </div>
      {children}
    </div>
  );
}

function SideBtn({
  icon,
  onClick,
  children,
}: {
  icon: React.ReactNode;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        textAlign: "left",
        padding: "7px 10px",
        borderRadius: 7,
        background: "var(--surface)",
        fontSize: 12.5,
        color: "var(--ink-2)",
        cursor: "pointer",
        border: "1px solid var(--line)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--line-strong)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
    >
      <span style={{ color: "var(--ink-3)" }}>{icon}</span>
      {children}
    </button>
  );
}

function StartDateField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const inputValue = value ? new Date(value).toISOString().slice(0, 16) : "";
  return (
    <div style={{ position: "relative", marginBottom: 8 }}>
      <label style={{ display: "block", cursor: "pointer" }}>
        <span style={{ ...sideBtnLabelStyle }}>
          <span style={{ color: "var(--ink-3)", display: "inline-flex", marginRight: 8 }}>
            {I.clock}
          </span>
          {value ? `Start ${fmtDate(value)}` : "Start date"}
        </span>
        <input
          type="datetime-local"
          value={inputValue}
          onClick={(e) => {
            try {
              if ('showPicker' in HTMLInputElement.prototype) {
                e.currentTarget.showPicker();
              }
            } catch (err) {}
          }}
          onChange={(e) =>
            onChange(e.target.value ? new Date(e.target.value).toISOString() : null)
          }
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0,
            cursor: "pointer",
          }}
        />
      </label>
      {value && (
        <button
          onClick={() => onChange(null)}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            background: "transparent",
            border: 0,
            color: "var(--ink-4)",
            cursor: "pointer",
            padding: 2,
            zIndex: 10,
          }}
          aria-label="Clear date"
        >
          {I.x}
        </button>
      )}
    </div>
  );
}

function DueDateField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const inputValue = value ? new Date(value).toISOString().slice(0, 10) : "";
  return (
    <div style={{ position: "relative" }}>
      <label style={{ display: "block", cursor: "pointer" }}>
        <span style={{ ...sideBtnLabelStyle }}>
          <span style={{ color: "var(--ink-3)", display: "inline-flex", marginRight: 8 }}>
            {I.clock}
          </span>
          {value ? `Due ${fmtDate(value)}` : "Due date"}
        </span>
        <input
          type="date"
          value={inputValue}
          onClick={(e) => {
            try {
              if ('showPicker' in HTMLInputElement.prototype) {
                e.currentTarget.showPicker();
              }
            } catch (err) {}
          }}
          onChange={(e) =>
            onChange(e.target.value ? new Date(e.target.value).toISOString() : null)
          }
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0,
            cursor: "pointer",
          }}
        />
      </label>
      {value && (
        <button
          onClick={() => onChange(null)}
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            background: "transparent",
            border: 0,
            color: "var(--ink-4)",
            cursor: "pointer",
            padding: 2,
            zIndex: 10,
          }}
          aria-label="Clear date"
        >
          {I.x}
        </button>
      )}
    </div>
  );
}

const sideBtnLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  textAlign: "left",
  padding: "7px 10px",
  borderRadius: 7,
  background: "var(--surface)",
  fontSize: 12.5,
  color: "var(--ink-2)",
  border: "1px solid var(--line)",
};

const popoverItem: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  textAlign: "left",
  padding: "6px 8px",
  borderRadius: 6,
  border: 0,
  background: "transparent",
  fontSize: 13,
  cursor: "pointer",
  color: "var(--ink)",
};

function describeLog(type: string, payload: Record<string, unknown>): string {
  switch (type) {
    case "card_created":         return `Card created: "${payload.title ?? ""}"`;
    case "card_deleted":         return `Card deleted: "${payload.title ?? ""}"`;
    case "card_moved":           return "Moved to another column";
    case "card_completed":       return "Card completed";
    case "card_commented":       return `Commented`;
    case "card_title_changed":   return `Title changed → "${payload.new ?? ""}"`;
    case "card_description_changed": return "Description updated";
    case "card_priority_changed":
      return payload.new ? `Priority set to ${payload.new}` : "Priority removed";
    case "card_due_changed":
      return payload.new ? `Due date set to ${fmtDate(payload.new as string)}` : "Due date removed";
    case "card_start_changed":
      return payload.new ? `Start date set to ${fmtDate(payload.new as string)}` : "Start date removed";
    case "card_label_added":     return `Label added: ${payload.label_name ?? ""}`;
    case "card_label_removed":   return `Label removed: ${payload.label_name ?? ""}`;
    case "card_assignee_added":  return `${payload.user_name ?? "Someone"} assigned`;
    case "card_assignee_removed":return `${payload.user_name ?? "Someone"} unassigned`;
    case "card_checklist_added": return `Checklist item added: "${payload.text ?? ""}"`;
    case "card_checklist_done":  return `Checklist completed: "${payload.text ?? ""}"`;
    case "card_checklist_undone":return `Checklist uncompleted: "${payload.text ?? ""}"`;
    case "card_checklist_deleted":return `Checklist item deleted: "${payload.text ?? ""}"`;
    default:                     return type;
  }
}

function logDotColor(type: string): string {
  if (type === "card_created")   return "var(--ok)";
  if (type === "card_deleted")   return "var(--err)";
  if (type.includes("checklist_done")) return "var(--ok)";
  if (type.includes("checklist")) return "var(--ink-3)";
  if (type.includes("assignee")) return "var(--accent)";
  if (type.includes("label"))    return "var(--warn)";
  if (type === "card_commented") return "var(--accent)";
  return "var(--ink-4)";
}

function DescriptionEditor({
  value,
  onCommit,
}: {
  value: string | null;
  onCommit: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    immediatelyRender: false,
  });

  const commit = () => {
    setEditing(false);
    if (editor) {
      const html = editor.getHTML();
      if (html !== (value ?? "")) {
        onCommit(html);
      }
    }
  };

  useEffect(() => {
    if (editor && value && !editing) {
      const currentHtml = editor.getHTML();
      if (currentHtml !== value && value !== "<p></p>") {
        editor.commands.setContent(value);
      }
    }
  }, [value, editor, editing]);

  if (editing) {
    return (
      <div className="tiptap-editor-container" style={{
        border: "1px solid var(--line-strong)",
        borderRadius: 8,
        overflow: "hidden",
        background: "var(--surface)",
      }}>
        <div style={{
          display: "flex", gap: 4, padding: "6px 8px", borderBottom: "1px solid var(--line)", background: "var(--surface-2)", flexWrap: "wrap"
        }}>
          <Button size="sm" variant="default" type="button" onClick={() => editor?.chain().focus().toggleBold().run()} style={{ background: editor?.isActive('bold') ? 'var(--line)' : 'transparent', border: 0, padding: "4px 8px" }}><b>B</b></Button>
          <Button size="sm" variant="default" type="button" onClick={() => editor?.chain().focus().toggleItalic().run()} style={{ background: editor?.isActive('italic') ? 'var(--line)' : 'transparent', border: 0, padding: "4px 8px" }}><i>I</i></Button>
          <Button size="sm" variant="default" type="button" onClick={() => editor?.chain().focus().toggleStrike().run()} style={{ background: editor?.isActive('strike') ? 'var(--line)' : 'transparent', border: 0, padding: "4px 8px" }}><s>S</s></Button>
          <div style={{ width: 1, background: "var(--line)", margin: "0 4px" }} />
          <Button size="sm" variant="default" type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} style={{ background: editor?.isActive('heading', { level: 1 }) ? 'var(--line)' : 'transparent', border: 0, padding: "4px 8px", fontWeight: 600 }}>H1</Button>
          <Button size="sm" variant="default" type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} style={{ background: editor?.isActive('heading', { level: 2 }) ? 'var(--line)' : 'transparent', border: 0, padding: "4px 8px", fontWeight: 600 }}>H2</Button>
          <div style={{ width: 1, background: "var(--line)", margin: "0 4px" }} />
          <Button size="sm" variant="default" type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()} style={{ background: editor?.isActive('bulletList') ? 'var(--line)' : 'transparent', border: 0, padding: "4px 8px" }}>• List</Button>
          <Button size="sm" variant="default" type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()} style={{ background: editor?.isActive('orderedList') ? 'var(--line)' : 'transparent', border: 0, padding: "4px 8px" }}>1. List</Button>
        </div>
        <div style={{ padding: "12px", minHeight: 120 }}>
          <EditorContent editor={editor} />
        </div>
        <div style={{ padding: "8px 12px", display: "flex", gap: 6, justifyContent: "flex-end", borderTop: "1px solid var(--line)", background: "var(--surface-2)" }}>
          <Button size="sm" variant="default" type="button" onClick={() => {
            if (editor) editor.commands.setContent(value || "");
            setEditing(false);
          }}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" type="button" onClick={commit}>
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => { setEditing(true); setTimeout(() => editor?.commands.focus('end'), 50); }}
      style={{
        minHeight: 60,
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid var(--line)",
        background: "var(--surface-2)",
        fontSize: 13.5,
        color: value && value !== "<p></p>" ? "var(--ink-2)" : "var(--ink-4)",
        cursor: "text",
        lineHeight: 1.55,
      }}
    >
      {value && value !== "<p></p>" ? (
        <div className="ProseMirror tiptap-render" dangerouslySetInnerHTML={{ __html: value }} />
      ) : (
        "Add a description…"
      )}
    </div>
  );
}
