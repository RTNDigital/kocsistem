"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useBoardsWithSprints } from "@/hooks/useTimeline";
import type { BoardWithSprints } from "@/lib/queries";

// ─── Constants ───────────────────────────────────────────────────────────────
const DAY_W_MIN = 6;
const DAY_W_DEFAULT = 28;
const DAY_W_MAX = 120;
const ROW_H = 72;       // px per board row
const HEADER_H = 56;    // timeline header height
const BAR_H = 28;       // main board bar height
const BAR_TOP = 16;     // y offset of bar within row
const SPRINT_H = 8;     // sprint segment height
const SPRINT_TOP = BAR_TOP + BAR_H + 6; // below the main bar
const LABELS_W = 220;   // frozen left label column width

// Zoom steps (px per day)
const ZOOM_STEPS = [6, 10, 14, 20, 28, 40, 56, 80, 120];

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

function dateToX(date: Date | string, rangeStart: Date, dayW = DAY_W_DEFAULT): number {
  const d = typeof date === "string" ? new Date(date) : date;
  return diffDays(rangeStart, d) * dayW;
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
        try { localStorage.setItem(key, JSON.stringify(next)); } catch { }
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

  const [dayW, setDayW] = useState(DAY_W_DEFAULT);
  const [connections, setConnections] = useLocalStorage<Connection[]>("ksb-timeline-connections", []);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const draggingRef = useRef<DragState | null>(null);

  // Zoom helpers
  const zoomIdx = ZOOM_STEPS.indexOf(dayW);
  const canZoomIn = dayW < DAY_W_MAX;
  const canZoomOut = dayW > DAY_W_MIN;

  const applyZoom = useCallback((newDayW: number) => {
    const el = scrollRef.current;
    if (!el) { setDayW(newDayW); return; }
    // Keep the center date stable
    const centerRatio = (el.scrollLeft + el.clientWidth / 2) / (el.scrollWidth || 1);
    setDayW(newDayW);
    // After re-render, restore center
    requestAnimationFrame(() => {
      if (el) el.scrollLeft = centerRatio * el.scrollWidth - el.clientWidth / 2;
    });
  }, []);

  const zoomIn = useCallback(() => {
    const next = ZOOM_STEPS.find((s) => s > dayW) ?? DAY_W_MAX;
    applyZoom(Math.min(next, DAY_W_MAX));
  }, [dayW, applyZoom]);

  const zoomOut = useCallback(() => {
    const next = [...ZOOM_STEPS].reverse().find((s) => s < dayW) ?? DAY_W_MIN;
    applyZoom(Math.max(next, DAY_W_MIN));
  }, [dayW, applyZoom]);

  // Ctrl + wheel to zoom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      // Anchor zoom to mouse X position
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const scrollRatioBefore = (el.scrollLeft + mouseX) / (el.scrollWidth || 1);

      setDayW((prev) => {
        const factor = e.deltaY < 0 ? 1 : -1;
        const idx = ZOOM_STEPS.findIndex((s) => s >= prev);
        const nextIdx = Math.max(0, Math.min(ZOOM_STEPS.length - 1, idx - factor));
        const next = ZOOM_STEPS[nextIdx];
        // Restore scroll position after render
        requestAnimationFrame(() => {
          if (el) el.scrollLeft = scrollRatioBefore * el.scrollWidth - mouseX;
        });
        return next;
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // ── Time range ──────────────────────────────────────────────────────────────
  const { rangeStart, rangeEnd, totalDays, months } = useMemo(() => {
    const today = startOfDay(new Date());
    let earliest = addDays(today, -180);
    let latest = addDays(today, 90);

    for (const b of boards) {
      const d = startOfDay(new Date(b.started_at ?? b.created_at));
      if (d < earliest) earliest = d;
      if (b.estimated_finished_at) {
        const fin = startOfDay(new Date(b.estimated_finished_at));
        if (fin > latest) latest = fin;
      }
    }

    const start = addDays(earliest, -30);
    const end = addDays(latest, 30);
    const total = Math.max(diffDays(start, end), 120);

    // Build month markers
    const monthMarkers: { label: string; x: number; date: Date }[] = [];
    const cursor = new Date(start);
    cursor.setDate(1);
    while (cursor <= end) {
      const x = dateToX(cursor, start, dayW);
      if (x >= 0 && x <= total * dayW) {
        monthMarkers.push({ label: monthLabel(cursor), x, date: new Date(cursor) });
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return { rangeStart: start, rangeEnd: end, totalDays: total, months: monthMarkers };
  }, [boards, dayW]);

  const todayX = dateToX(new Date(), rangeStart, dayW);

  // ── Scroll to today on mount ─────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = todayX - el.clientWidth / 2;
    el.scrollLeft = Math.max(0, target);
  }, [todayX, boards.length]);

  // ── Row index map ────────────────────────────────────────────────────────────
  const boardIndexMap = useMemo(() => {
    const m = new Map<string, number>();
    boards.forEach((b, i) => m.set(b.id, i));
    return m;
  }, [boards]);

  // ── Connection points (grid-relative coords, no scroll offset) ────────────────
  const getBoardBarEnd = useCallback((board: BoardWithSprints): { x: number; y: number } => {
    const idx = boardIndexMap.get(board.id) ?? 0;
    const startDate = board.started_at ? new Date(board.started_at) : new Date(board.created_at);
    const endDate = board.estimated_finished_at ? new Date(board.estimated_finished_at) : new Date();
    const barW = Math.max(dayW, diffDays(startDate, endDate) * dayW);
    const x = dateToX(startDate, rangeStart, dayW) + barW;
    const y = HEADER_H + idx * ROW_H + BAR_TOP + BAR_H / 2;
    return { x, y };
  }, [boardIndexMap, rangeStart, dayW]);

  const getBoardBarStart = useCallback((board: BoardWithSprints): { x: number; y: number } => {
    const idx = boardIndexMap.get(board.id) ?? 0;
    const startDate = board.started_at ? new Date(board.started_at) : new Date(board.created_at);
    const x = dateToX(startDate, rangeStart, dayW);
    const y = HEADER_H + idx * ROW_H + BAR_TOP + BAR_H / 2;
    return { x, y };
  }, [boardIndexMap, rangeStart, dayW]);

  // ── Drag-to-connect handlers ─────────────────────────────────────────────────
  const handleDragStart = useCallback((e: React.MouseEvent, board: BoardWithSprints, rowIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const gridEl = gridRef.current;
    const scrollEl = scrollRef.current;
    if (!gridEl || !scrollEl) return;

    // Grid-relative start point: right edge of the board bar
    const barEnd = getBoardBarEnd(board);
    const startX = barEnd.x;  // already grid-relative (no scroll correction needed)
    const startY = HEADER_H + rowIndex * ROW_H + BAR_TOP + BAR_H / 2;

    const getGridCoords = (ev: MouseEvent) => {
      const rect = gridEl.getBoundingClientRect();
      return {
        x: ev.clientX - rect.left + scrollEl.scrollLeft,
        y: ev.clientY - rect.top,
      };
    };

    const initial = getGridCoords(e.nativeEvent);
    const state: DragState = {
      fromBoardId: board.id,
      fromX: startX,
      fromY: startY,
      curX: initial.x,
      curY: initial.y,
    };
    draggingRef.current = state;
    setDragging({ ...state });

    const onMove = (ev: MouseEvent) => {
      const { x, y } = getGridCoords(ev);
      const next = { ...draggingRef.current!, curX: x, curY: y };
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
  }, [boards, connections, setConnections, getBoardBarEnd]);

  const removeConnection = useCallback((id: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== id));
  }, [setConnections]);

  // ── Render ───────────────────────────────────────────────────────────────────
  const totalW = totalDays * dayW;
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
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-.01em", color: "var(--accent)" }}>Timeline</span>
        <div style={{ flex: 1 }} />

        {/* Zoom controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, border: "1px solid var(--line)", borderRadius: 7, overflow: "hidden" }}>
          <button
            onClick={zoomOut}
            disabled={!canZoomOut}
            title="Zoom out (Ctrl+Scroll)"
            style={{
              fontSize: 16, lineHeight: 1, padding: "3px 10px",
              background: "transparent", border: 0,
              color: canZoomOut ? "var(--ink-2)" : "var(--ink-4)",
              cursor: canZoomOut ? "pointer" : "default",
            }}
          >−</button>
          <span
            onClick={() => applyZoom(DAY_W_DEFAULT)}
            title="Reset zoom"
            style={{
              fontSize: 11, fontWeight: 600, color: "var(--ink-3)",
              minWidth: 38, textAlign: "center", cursor: "pointer",
              userSelect: "none",
            }}
          >
            {Math.round((dayW / DAY_W_DEFAULT) * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={!canZoomIn}
            title="Zoom in (Ctrl+Scroll)"
            style={{
              fontSize: 16, lineHeight: 1, padding: "3px 10px",
              background: "transparent", border: 0,
              color: canZoomIn ? "var(--ink-2)" : "var(--ink-4)",
              cursor: canZoomIn ? "pointer" : "default",
            }}
          >+</button>
        </div>

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

            {/* SVG layer for connections — z-index above bars (8 > 4) */}
            <svg
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: totalW,
                height: totalH,
                pointerEvents: "none",
                zIndex: 8,
                overflow: "visible",
              }}
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="8"
                  markerHeight="6"
                  refX="7"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="var(--accent)" opacity={0.85} />
                </marker>
                <marker
                  id="arrowhead-preview"
                  markerWidth="8"
                  markerHeight="6"
                  refX="7"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="var(--accent)" opacity={0.5} />
                </marker>
              </defs>

              {/* Render saved connections */}
              {connections.map((conn) => {
                const fromBoard = boards.find((b) => b.id === conn.fromBoardId);
                const toBoard = boards.find((b) => b.id === conn.toBoardId);
                if (!fromBoard || !toBoard) return null;
                const from = getBoardBarEnd(fromBoard);
                const to = getBoardBarStart(toBoard);
                // Smooth cubic bezier: horizontal handles proportional to distance
                const dx = Math.max(Math.abs(to.x - from.x) * 0.45, 40);
                const path = `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
                return (
                  <g key={conn.id} style={{ pointerEvents: "all" }}>
                    {/* Invisible wider path for easy clicking */}
                    <path
                      d={path}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={14}
                      style={{ cursor: "pointer", pointerEvents: "all" }}
                      onClick={() => removeConnection(conn.id)}
                    />
                    <path
                      d={path}
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      opacity={0.75}
                      markerEnd="url(#arrowhead)"
                    />
                    <circle cx={from.x} cy={from.y} r={4} fill="var(--accent)" opacity={0.85} />
                    <circle cx={to.x} cy={to.y} r={4} fill="var(--accent)" opacity={0.85} />
                  </g>
                );
              })}

              {/* Drag preview line */}
              {dragging && (() => {
                const dx = Math.max(Math.abs(dragging.curX - dragging.fromX) * 0.45, 40);
                const path = `M ${dragging.fromX} ${dragging.fromY} C ${dragging.fromX + dx} ${dragging.fromY}, ${dragging.curX - dx} ${dragging.curY}, ${dragging.curX} ${dragging.curY}`;
                return (
                  <path
                    d={path}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    opacity={0.55}
                    markerEnd="url(#arrowhead-preview)"
                  />
                );
              })()}
            </svg>

            {/* Board bars — zIndex 4, below SVG layer (8) */}
            {boards.map((board, idx) => (
              <BoardBar
                key={board.id}
                board={board}
                idx={idx}
                rangeStart={rangeStart}
                dayW={dayW}
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
  dayW,
  onDragStart,
}: {
  board: BoardWithSprints;
  idx: number;
  rangeStart: Date;
  dayW: number;
  onDragStart: (e: React.MouseEvent) => void;
}) {
  const today = new Date();

  // Use explicit dates if set, otherwise fall back to created_at → today
  const barStart = board.started_at
    ? new Date(board.started_at)
    : new Date(board.created_at);
  const barEnd = board.estimated_finished_at
    ? new Date(board.estimated_finished_at)
    : today;

  const x = dateToX(barStart, rangeStart, dayW);
  const w = Math.max(dayW, diffDays(barStart, barEnd) * dayW);
  const top = HEADER_H + idx * ROW_H;

  // Progress: how far today is within the bar (0–1), for visual overlay
  const totalSpan = diffDays(barStart, barEnd);
  const elapsed = diffDays(barStart, today);
  const progress = totalSpan > 0 ? Math.min(1, Math.max(0, elapsed / totalSpan)) : 0;
  const isPast = today > barEnd;

  return (
    <div style={{ position: "absolute", top, left: 0, width: "100%", height: ROW_H, zIndex: 4 }}>
      {/* Main board bar */}
      <div
        title={`${board.title}${board.estimated_finished_at ? ` · Due ${new Date(board.estimated_finished_at).toLocaleDateString()}` : ""}`}
        style={{
          position: "absolute",
          left: x,
          top: BAR_TOP,
          width: w,
          height: BAR_H,
          borderRadius: 7,
          background: isPast
            ? `color-mix(in oklab, ${board.color} 60%, #888)`
            : board.color,
          opacity: 0.88,
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,.15)",
        }}
      >
        {/* Progress fill */}
        {progress > 0 && progress < 1 && (
          <div style={{
            position: "absolute",
            inset: 0,
            width: `${progress * 100}%`,
            background: "rgba(255,255,255,.18)",
            borderRadius: "7px 0 0 7px",
            pointerEvents: "none",
          }} />
        )}
        {/* Label */}
        <div style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          height: "100%",
          paddingLeft: 10,
          paddingRight: 24,
          gap: 8,
        }}>
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
          {board.estimated_finished_at && (
            <span style={{
              fontSize: 10.5,
              color: "rgba(255,255,255,.75)",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              flexShrink: 0,
            }}>
              {new Date(board.estimated_finished_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      </div>

      {/* Sprint segments */}
      {board.sprints.map((sprint) => {
        if (!sprint.started_at) return null;
        const sStart = new Date(sprint.started_at);
        const sEnd = sprint.ended_at ? new Date(sprint.ended_at) : today;
        const sx = dateToX(sStart, rangeStart, dayW);
        const sw = Math.max(dayW / 2, diffDays(sStart, sEnd) * dayW);
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
