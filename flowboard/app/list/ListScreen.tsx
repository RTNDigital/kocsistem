"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Button, Input, AvatarStack } from "@/components/ui";
import { I } from "@/components/Icons";
import { useListCards } from "@/hooks/useListView";
import { useMe } from "@/hooks/useMe";
import { fmtDate, dueState } from "@/lib/utils";
import type { ListCard } from "@/types/domain";

type GroupBy = "status" | "board" | "priority";
type Priority = "high" | "med" | "low" | "none";

interface Filters {
  text: string;
  priority: Priority[];
  due: "week" | "overdue" | "" ;
  onlyMine: boolean;
}

function matchesFilters(card: ListCard, f: Filters, meId: string | undefined): boolean {
  if (f.onlyMine && meId && !card.assignees.includes(meId)) return false;
  if (f.priority.length && !f.priority.includes((card.priority ?? "none") as Priority)) return false;
  if (f.due === "week" && !(card.due_at && new Date(card.due_at).getTime() < Date.now() + 1000 * 60 * 60 * 24 * 7)) return false;
  if (f.due === "overdue" && !(card.due_at && new Date(card.due_at).getTime() < Date.now())) return false;
  if (f.text.trim()) {
    const q = f.text.toLowerCase();
    if (!(card.title + " " + (card.description ?? "")).toLowerCase().includes(q)) return false;
  }
  return true;
}

function groupKey(card: ListCard, groupBy: GroupBy): string {
  if (groupBy === "board") return card.board_title;
  if (groupBy === "priority") return card.priority ?? "none";
  return card.column_title;
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, med: 1, low: 2, none: 3 };

export function ListScreen() {
  const router = useRouter();
  const { data: me } = useMe();
  const { data: cards = [], isLoading } = useListCards();

  const [filters, setFilters] = useState<Filters>({ text: "", priority: [], due: "", onlyMine: false });
  const [groupBy, setGroupBy] = useState<GroupBy>("status");

  const setFilter = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  const togglePriority = (p: Priority) => {
    setFilters((f) => ({
      ...f,
      priority: f.priority.includes(p) ? f.priority.filter((x) => x !== p) : [...f.priority, p],
    }));
  };

  const filtered = useMemo(
    () => cards.filter((c) => matchesFilters(c, filters, me?.id)),
    [cards, filters, me?.id]
  );

  const groups = useMemo(() => {
    const map = new Map<string, ListCard[]>();
    filtered.forEach((c) => {
      const k = groupKey(c, groupBy);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(c);
    });
    const entries = [...map.entries()];
    if (groupBy === "priority") {
      entries.sort((a, b) => (PRIORITY_ORDER[a[0]] ?? 9) - (PRIORITY_ORDER[b[0]] ?? 9));
    }
    return entries;
  }, [filtered, groupBy]);

  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.onlyMine) activeChips.push({ key: "mine", label: "Assigned to me", clear: () => setFilter({ onlyMine: false }) });
  if (filters.due === "week") activeChips.push({ key: "due", label: "Due this week", clear: () => setFilter({ due: "" }) });
  if (filters.due === "overdue") activeChips.push({ key: "overdue", label: "Overdue", clear: () => setFilter({ due: "" }) });
  filters.priority.forEach((p) => activeChips.push({ key: "p-" + p, label: `Priority: ${p}`, clear: () => togglePriority(p) }));

  return (
    <AppShell>
      <div style={{ padding: "28px 36px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-.02em", margin: 0 }}>
            All cards
          </h1>
          <span className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-4)" }}>
            {filtered.length} cards
          </span>
        </div>

        {/* Filter bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Quick filters */}
          <FilterChipBtn active={filters.onlyMine} onClick={() => setFilter({ onlyMine: !filters.onlyMine })}>
            Mine
          </FilterChipBtn>
          <FilterChipBtn active={filters.due === "week"} onClick={() => setFilter({ due: filters.due === "week" ? "" : "week" })}>
            Due this week
          </FilterChipBtn>
          <FilterChipBtn active={filters.due === "overdue"} onClick={() => setFilter({ due: filters.due === "overdue" ? "" : "overdue" })}>
            Overdue
          </FilterChipBtn>

          <div style={{ width: 1, height: 20, background: "var(--line)", margin: "0 2px" }} />

          {/* Priority toggles */}
          {(["high", "med", "low"] as Priority[]).map((p) => (
            <FilterChipBtn key={p} active={filters.priority.includes(p)} onClick={() => togglePriority(p)}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                background: p === "high" ? "var(--err)" : p === "med" ? "var(--warn)" : "var(--ok)",
                display: "inline-block",
              }} />
              {p}
            </FilterChipBtn>
          ))}

          {/* Text search */}
          <div style={{ position: "relative", marginLeft: "auto" }}>
            <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--ink-4)", pointerEvents: "none" }}>
              {I.search}
            </span>
            <Input
              value={filters.text}
              onChange={(e) => setFilter({ text: e.target.value })}
              placeholder="Filter text…"
              style={{ paddingLeft: 32, width: 200, height: 32, fontSize: 12.5 }}
            />
          </div>

          {/* Group by */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Group</span>
            <div style={{ display: "inline-flex", background: "var(--surface-2)", borderRadius: 8, padding: 2 }}>
              {(["status", "board", "priority"] as GroupBy[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGroupBy(g)}
                  style={{
                    border: 0, cursor: "pointer", padding: "4px 8px", borderRadius: 6,
                    background: groupBy === g ? "var(--surface)" : "transparent",
                    boxShadow: groupBy === g ? "var(--shadow-sm)" : "none",
                    fontSize: 11.5,
                    color: groupBy === g ? "var(--ink)" : "var(--ink-3)",
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            {activeChips.map((c) => (
              <span key={c.key} style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "3px 6px 3px 8px", fontSize: 11.5,
                background: "var(--surface-2)", border: "1px solid var(--line)",
                borderRadius: 6, color: "var(--ink-2)",
              }}>
                {c.label}
                <button onClick={c.clear} style={{ background: "transparent", border: 0, cursor: "pointer", color: "var(--ink-4)", padding: 0, display: "flex" }}>
                  {I.x}
                </button>
              </span>
            ))}
            <button
              onClick={() => setFilters({ text: "", priority: [], due: "", onlyMine: false })}
              style={{ background: "transparent", border: 0, cursor: "pointer", fontSize: 11.5, color: "var(--ink-3)", padding: "3px 6px", textDecoration: "underline" }}
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* List body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "6px 36px 60px" }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--ink-4)", fontSize: 13 }}>
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          groups.map(([gname, list]) => (
            <div key={gname} style={{ marginTop: 16 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 4px", borderBottom: "1px solid var(--line)",
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-2)" }}>
                  {gname}
                </span>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>{list.length}</span>
              </div>
              <div>
                {list.map((card) => (
                  <ListRow
                    key={card.id}
                    card={card}
                    onClick={() => router.push(`/board/${card.board_id}`)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}

function ListRow({ card, onClick }: { card: ListCard; onClick: () => void }) {
  const due = dueState(card.due_at);
  const priColor =
    card.priority === "high" ? "var(--err)" :
    card.priority === "med"  ? "var(--warn)" :
    card.priority === "low"  ? "var(--ok)" : null;

  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%",
        textAlign: "left", padding: "9px 4px", border: 0,
        borderBottom: "1px solid var(--line)", background: "transparent",
        cursor: "pointer", color: "var(--ink)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {priColor ? (
        <span title={card.priority ?? ""} style={{ width: 8, height: 8, borderRadius: "50%", background: priColor, flexShrink: 0 }} />
      ) : (
        <span style={{ width: 8, height: 8, border: "1.5px solid var(--line-strong)", borderRadius: "50%", flexShrink: 0 }} />
      )}

      {/* Board badge */}
      <span className="mono" style={{
        fontSize: 10.5, color: "var(--ink-4)", width: 80, flexShrink: 0,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 2, background: card.board_color, marginRight: 4, verticalAlign: "middle" }} />
        {card.board_title.slice(0, 10).toUpperCase()}
      </span>

      {/* Title */}
      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {card.title}
      </span>

      {/* Label swatches */}
      <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
        {card.label_objects.slice(0, 4).map((l) => (
          <span key={l.id} title={l.name} style={{ height: 4, width: 16, borderRadius: 2, background: l.color }} />
        ))}
      </div>

      {/* Column (status) */}
      <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)", width: 88, textAlign: "right", flexShrink: 0 }}>
        {card.column_title}
      </span>

      {/* Checklist */}
      {card.checklist_count > 0 && (
        <span className="mono" style={{
          fontSize: 11, width: 38, textAlign: "right", flexShrink: 0,
          color: card.checklist_done === card.checklist_count ? "var(--ok)" : "var(--ink-4)",
        }}>
          {card.checklist_done}/{card.checklist_count}
        </span>
      )}

      {/* Due date */}
      <span className="mono" style={{
        fontSize: 11, width: 68, textAlign: "right", flexShrink: 0,
        color: due === "overdue" ? "var(--err)" : due === "soon" ? "var(--warn)" : "var(--ink-4)",
      }}>
        {card.due_at ? fmtDate(card.due_at) : "—"}
      </span>

      {/* Assignees */}
      <div style={{ width: 64, display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
        {card.assignee_profiles.length > 0 && (
          <AvatarStack users={card.assignee_profiles} size={20} max={3} />
        )}
      </div>
    </button>
  );
}

function FilterChipBtn({
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
        padding: "5px 9px", borderRadius: 6, border: "1px solid var(--line)",
        background: active ? "color-mix(in oklab, var(--accent) 14%, var(--surface))" : "var(--surface)",
        color: active ? "var(--ink)" : "var(--ink-3)",
        fontSize: 12, fontWeight: active ? 500 : 400, cursor: "pointer",
        borderColor: active ? "var(--accent)" : "var(--line)",
      }}
    >
      {children}
    </button>
  );
}

function EmptyState() {
  return (
    <div style={{
      margin: "40px auto", maxWidth: 400, padding: "40px 32px",
      textAlign: "center", background: "var(--surface)",
      border: "1px dashed var(--line-strong)", borderRadius: 14, color: "var(--ink-3)",
    }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Nothing here</div>
      <div style={{ fontSize: 13 }}>No cards match the current filters.</div>
    </div>
  );
}
