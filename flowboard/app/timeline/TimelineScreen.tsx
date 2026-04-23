"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useBoardsWithSprints } from "@/hooks/useTimeline";
import type { BoardWithSprints } from "@/lib/queries";

// ─── Constants ───────────────────────────────────────────────────────────────
const DAY_W = 28;       // px per day
const ROW_H = 72;       // px per board row
const HEADER_H = 56;    // timeline header height
const BAR_H = 28;       // main board bar height
const BAR_TOP = 16;     // y offset of bar within row
const SPRINT_H = 8;     // sprint segment height
const SPRINT_TOP = BAR_TOP + BAR_H + 6; // below the main bar
const LABELS_W = 220;   // frozen left label column width

// ─── Types ───────────────────────────────────────────────────────────────────
interface Connection {
  id: string;
  fromBoardId: string;
  toBoardId: string;
}

interface DragState {
  fromBoardId: string;
  fromX: number;
  fromY: number;
  curX: number;
  curY: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function diffDays(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

function dateToX(date: Date | string, rangeStart: Date): number {
  const d = typeof date === "string" ? new Date(date) : date;
  return diffDays(rangeStart, d) * DAY_W;
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
}

function dayLabel(d: Date): string {
  return d.getDate().toString();
}

function genId(): string {
  return Math.random().toString(36).slice(2);
}

function useLocalStorage<T>(key: string, init: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [val, setVal] = useState<T>(() => {
    if (typeof window === "undefined") return init;
    try {
      const s = localStorage.getItem(key);
      return s ? (JSON.parse(s) as T) : init;
    } catch {
      return init;
    }
  });

  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      setVal((prev) => {
        const next = typeof v === "function" ? (v as (p: T) => T)(prev) : v;
        try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
        return next;
      });
    },
    [key]
  );

  return [val, set];
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function TimelineScreen() {
  const { data: boards = [], isLoading } = useBoardsWithSprints();
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const [connections, setConnections] = useLocalStorage<Connection[]>("ksb-timeline-connections", []);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const draggingRef = useRef<DragState | null>(null);

  // ── Time range ──────────────────────────────────────────────────────────────
  const { rangeStart, rangeEnd, totalDays, months } = useMemo(() => {
    const today = startOfDay(new Date());
    let earliest = addDays(today, -180);

    for (const b of boards) {
      const d = startOfDay(new Date(b.created_at));
      if (d < earliest) earliest = d;
    }

    const start = addDays(earliest, -30);
    const end = addDays(today, 120);
    const total = diffDays(start, end);

    // Build month markers
    const monthMarkers: { label: string; x: number; date: Date }[] = [];
    const cursor = new Date(start);
    cursor.setDate(1);
    while (cursor <= end) {
      const x = dateToX(cursor, start);
      if (x >= 0 && x <= total * DAY_W) {
        monthMarkers.push({ label: monthLabel(cursor), x, date: new Date(cursor) });
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return { rangeStart: start, rangeEnd: end, totalDays: total, months: monthMarkers };
  }, [boards]);

  const todayX = dateToX(new Date(), rangeStart);

  // ── Scroll to today on mount ─────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = todayX - el.clientWidth / 2;
    el.scrollLeft = Math.max(0, target);
  }, [todayX, boards.length]);

  // ── Drag-to-connect handlers ─────────────────────────────────────────────────
  const handleDragStart = useCallback((e: React.MouseEvent, board: BoardWithSprints, rowIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const gridEl = gridRef.current;
    const scrollEl = scrollRef.current;
    if (!gridEl || !scrollEl) return;

    const barEndX = Math.min(dateToX(new Date(), rangeStart), dateToX(rangeEnd, rangeStart));
    const boardEndX = dateToX(new Date(board.created_at), rangeStart) + Math.max(1, diffDays(new Date(board.created_at), new Date())) * DAY_W;
    const startX = Math.min(boardEndX, barEndX) - scrollEl.scrollLeft;
    const startY = HEADER_H + rowIndex * ROW_H + BAR_TOP + BAR_H / 2;

    const state: DragState = {
      fromBoardId: board.id,
      fromX: startX + scrollEl.scrollLeft,
      fromY: startY,
      curX: e.clientX - gridEl.getBoundingClientRect().left + scrollEl.scrollLeft,
      curY: e.clientY - gridEl.getBoundingClientRect().top,
    };
    draggingRef.current = state;
    setDragging({ ...state });

    const onMove = (ev: MouseEvent) => {
      const rect = gridEl.getBoundingClientRect();
      const next = {
        ...draggingRef.current!,
        curX: ev.clientX - rect.left + scrollEl.scrollLeft,
        curY: ev.clientY - rect.top,
      };
      draggingRef.current = next;
      setDragging({ ...next });
    };

    const onUp = (ev: MouseEvent) => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);

      const rect = gridEl.getBoundingClientRect();
      const dropY = ev.clientY - rect.top - HEADER_H;
      const targetIndex = Math.floor(dropY / ROW_H);

      if (targetIndex >= 0 && targetIndex < boards.length) {
        const targetBoard = boards[targetIndex];
        if (targetBoard.id !== board.id) {
          const alreadyExists = connections.some(
            (c) => c.fromBoardId === board.id && c.toBoardId === targetBoard.id
          );
          if (!alreadyExists) {
            setConnections((prev) => [
              ...prev,
              { id: genId(), fromBoardId: board.id, toBoardId: targetBoard.id },
            ]);
          }
        }
      }

      draggingRef.current = null;
      setDragging(null);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [boards, connections, rangeStart, rangeEnd, setConnections]);

  const removeConnection = useCallback((id: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== id));
  }, [setConnections]);

  // ── Row index map ────────────────────────────────────────────────────────────
  const boardIndexMap = useMemo(() => {
    const m = new Map<string, number>();
    boards.forEach((b, i) => m.set(b.id, i));
    return m;
  }, [boards]);

  // ── Connection points ────────────────────────────────────────────────────────
  function getBoardBarEnd(board: BoardWithSprints): { x: number; y: number } {
    const idx = boardIndexMap.get(board.id) ?? 0;
    const created = new Date(board.created_at);
    const today = new Date();
    const endDate = today > created ? today : created;
    const x = dateToX(endDate, rangeStart);
    const y = HEADER_H + idx * ROW_H + BAR_TOP + BAR_H / 2;
    return { x, y };
  }

  function getBoardBarStart(board: BoardWithSprints): { x: number; y: number } {
    const idx = boardIndexMap.get(board.id) ?? 0;
    const x = dateToX(new Date(board.created_at), rangeStart);
    const y = HEADER_H + idx * ROW_H + BAR_TOP + BAR_H / 2;
    return { x, y };
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  const totalW = totalDays * DAY_W;
  const totalH = HEADER_H + boards.length * ROW_H;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      {/* Page header */}
      <div style={{
        borderBottom: "1px solid var(--line)",
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "var(--surface)",
        flexShrink: 0,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--ink-3)" }}>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18" />
          <path d="M8 2v4M16 2v4" />
        </svg>
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-.01em" }}>Timeline</span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => {
            const el = scrollRef.current;
            if (el) el.scrollLeft = Math.max(0, todayX - el.clientWidth / 2);
          }}
          style={{
            fontSize: 12,
            padding: "4px 10px",
            borderRadius: 6,
            border: "1px solid var(--line)",
            background: "var(--surface)",
            color: "var(--ink-2)",
            cursor: "pointer",
          }}
        >
          Today
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Frozen left labels */}
        <div style={{
          width: LABELS_W,
          flexShrink: 0,
          borderRight: "1px solid var(--line)",
          background: "color-mix(in oklab, var(--surface-2) 60%, var(--bg))",
          display: "flex",
          flexDirection: "column",
          zIndex: 10,
        }}>
          {/* Header spacer */}
          <div style={{
            height: HEADER_H,
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            padding: "0 14px",
            gap: 6,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: ".08em" }}>
              Projects
            </span>
          </div>

          {/* Board label rows */}
          <div style={{ flex: 1, overflowY: "hidden" }}>
            {isLoading ? (
              <div style={{ padding: "20px 14px", fontSize: 13, color: "var(--ink-4)" }}>Loading…</div>
            ) : boards.length === 0 ? (
              <div style={{ padding: "20px 14px", fontSize: 13, color: "var(--ink-4)" }}>No boards yet</div>
            ) : (
              boards.map((board) => (
                <LabelRow key={board.id} board={board} />
              ))
            )}
          </div>
        </div>

        {/* Scrollable timeline grid */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowX: "auto",
            overflowY: "hidden",
            position: "relative",
          }}
        >
          <div
            ref={gridRef}
            style={{
              width: totalW,
              height: totalH,
              position: "relative",
              userSelect: "none",
            }}
          >
            {/* Month header row */}
            <div style={{
              height: HEADER_H,
              position: "sticky",
              top: 0,
              zIndex: 20,
              borderBottom: "1px solid var(--line)",
              background: "color-mix(in oklab, var(--surface-2) 60%, var(--bg))",
            }}>
              {months.map((m, i) => {
                const nextX = months[i + 1]?.x ?? totalW;
                const width = nextX - m.x;
                return (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: m.x,
                      top: 0,
                      width,
                      height: "100%",
                      borderLeft: "1px solid var(--line)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                      padding: "0 8px 6px",
                    }}
                  >
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--ink-3)",
                      letterSpacing: ".06em",
                    }}>
                      {m.label} {m.date.getFullYear()}
                    </span>
                  </div>
                );
              })}

              {/* Today pill in header */}
              <div style={{
                position: "absolute",
                left: todayX - 28,
                top: 10,
                background: "var(--accent)",
                color: "var(--accent-ink)",
                fontSize: 10.5,
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: 20,
                letterSpacing: ".04em",
                pointerEvents: "none",
                zIndex: 5,
              }}>
                {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()}
              </div>
            </div>

            {/* Row backgrounds */}
            {boards.map((board, idx) => (
              <div
                key={board.id}
                style={{
                  position: "absolute",
                  top: HEADER_H + idx * ROW_H,
                  left: 0,
                  width: "100%",
                  height: ROW_H,
                  borderBottom: "1px solid var(--line)",
                  background: idx % 2 === 0 ? "transparent" : "color-mix(in oklab, var(--surface-2) 30%, transparent)",
                }}
              />
            ))}

            {/* Today vertical line */}
            <div style={{
              position: "absolute",
              left: todayX,
              top: HEADER_H,
              width: 1.5,
              height: boards.length * ROW_H,
              background: "var(--accent)",
              opacity: 0.35,
              pointerEvents: "none",
              zIndex: 3,
            }} />

            {/* SVG layer for connections */}
            <svg
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 5,
                overflow: "visible",
              }}
            >
              {/* Render saved connections */}
              {connections.map((conn) => {
                const fromBoard = boards.find((b) => b.id === conn.fromBoardId);
                const toBoard = boards.find((b) => b.id === conn.toBoardId);
                if (!fromBoard || !toBoard) return null;
                const from = getBoardBarEnd(fromBoard);
                const to = getBoardBarStart(toBoard);
                const dx = Math.abs(to.x - from.x) * 0.5;
                const path = `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
                return (
                  <g key={conn.id} style={{ pointerEvents: "all" }}>
                    <path
                      d={path}
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      opacity={0.7}
                    />
                    <circle cx={from.x} cy={from.y} r={4} fill="var(--accent)" opacity={0.8} />
                    <circle cx={to.x} cy={to.y} r={4} fill="var(--accent)" opacity={0.8} />
                    {/* Invisible wider path for click target */}
                    <path
                      d={path}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={12}
                      style={{ cursor: "pointer", pointerEvents: "all" }}
                      onClick={() => removeConnection(conn.id)}
                    />
                  </g>
                );
              })}

              {/* Drag preview line */}
              {dragging && (() => {
                const dx = Math.abs(dragging.curX - dragging.fromX) * 0.5;
                const path = `M ${dragging.fromX} ${dragging.fromY} C ${dragging.fromX + dx} ${dragging.fromY}, ${dragging.curX - dx} ${dragging.curY}, ${dragging.curX} ${dragging.curY}`;
                return (
                  <path
                    d={path}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    opacity={0.5}
                  />
                );
              })()}
            </svg>

            {/* Board bars */}
            {boards.map((board, idx) => (
              <BoardBar
                key={board.id}
                board={board}
                idx={idx}
                rangeStart={rangeStart}
                onDragStart={(e) => handleDragStart(e, board, idx)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Label Row (frozen left) ──────────────────────────────────────────────────
function LabelRow({ board }: { board: BoardWithSprints }) {
  return (
    <Link
      href={`/board/${board.id}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: ROW_H,
        padding: "0 14px",
        borderBottom: "1px solid var(--line)",
        textDecoration: "none",
        color: "var(--ink)",
        transition: "background .12s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "color-mix(in oklab, var(--accent) 8%, transparent)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span style={{
        width: 10,
        height: 10,
        borderRadius: 3,
        background: board.color,
        flexShrink: 0,
        display: "inline-block",
      }} />
      <span style={{
        fontSize: 13,
        fontWeight: 500,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {board.title}
      </span>
      {board.sprints.length > 0 && (
        <span style={{
          marginLeft: "auto",
          fontSize: 10.5,
          color: "var(--ink-4)",
          fontVariantNumeric: "tabular-nums",
          flexShrink: 0,
        }}>
          {board.sprints.length}s
        </span>
      )}
    </Link>
  );
}

// ─── Board Bar (timeline bar + sprints + drag handle) ────────────────────────
function BoardBar({
  board,
  idx,
  rangeStart,
  onDragStart,
}: {
  board: BoardWithSprints;
  idx: number;
  rangeStart: Date;
  onDragStart: (e: React.MouseEvent) => void;
}) {
  const today = new Date();
  const created = new Date(board.created_at);
  const barStart = created < today ? created : today;
  const barEnd = today > created ? today : created;

  const x = dateToX(barStart, rangeStart);
  const w = Math.max(DAY_W, diffDays(barStart, barEnd) * DAY_W);
  const top = HEADER_H + idx * ROW_H;

  return (
    <div style={{ position: "absolute", top, left: 0, width: "100%", height: ROW_H, zIndex: 4 }}>
      {/* Main board bar */}
      <div
        title={board.title}
        style={{
          position: "absolute",
          left: x,
          top: BAR_TOP,
          width: w,
          height: BAR_H,
          borderRadius: 7,
          background: board.color,
          opacity: 0.85,
          display: "flex",
          alignItems: "center",
          paddingLeft: 10,
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,.15)",
        }}
      >
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: "#fff",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          pointerEvents: "none",
        }}>
          {board.title}
        </span>
      </div>

      {/* Sprint segments */}
      {board.sprints.map((sprint) => {
        if (!sprint.started_at) return null;
        const sStart = new Date(sprint.started_at);
        const sEnd = sprint.ended_at ? new Date(sprint.ended_at) : today;
        const sx = dateToX(sStart, rangeStart);
        const sw = Math.max(DAY_W / 2, diffDays(sStart, sEnd) * DAY_W);
        const isActive = sprint.status === "active";
        return (
          <div
            key={sprint.id}
            title={`Sprint ${sprint.sprint_number}: ${sprint.title || ""}`}
            style={{
              position: "absolute",
              left: sx,
              top: SPRINT_TOP,
              width: sw,
              height: SPRINT_H,
              borderRadius: 4,
              background: isActive ? "var(--accent)" : "var(--ink-3)",
              opacity: isActive ? 0.9 : 0.45,
            }}
          />
        );
      })}

      {/* Drag handle — right edge of bar */}
      <div
        onMouseDown={onDragStart}
        title="Drag to connect to another board"
        style={{
          position: "absolute",
          left: x + w - 6,
          top: BAR_TOP + BAR_H / 2 - 8,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "var(--surface)",
          border: `2px solid ${board.color}`,
          cursor: "crosshair",
          zIndex: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 1px 4px rgba(0,0,0,.2)",
        }}
      >
        <div style={{ width: 4, height: 4, borderRadius: "50%", background: board.color }} />
      </div>
    </div>
  );
}
