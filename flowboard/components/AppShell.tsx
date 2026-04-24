"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, Menu, MenuItem } from "./ui";
import { I, Logo } from "./Icons";
import { useMe } from "@/hooks/useMe";
import { useBoards } from "@/hooks/useBoards";
import { logoutAction } from "@/app/login/actions";
import { useQueryClient } from "@tanstack/react-query";
import { TweaksPanel } from "./TweaksPanel";
import { SprintArchiveModal } from "@/app/board/[id]/SprintArchiveModal";
import { KaiChat } from "./KaiChat";
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: me } = useMe();
  const { data: boards = [] } = useBoards();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [archiveBoardId, setArchiveBoardId] = useState<string | null>(null);
  const [kaiOpen, setKaiOpen] = useState(false);

  // Extract boardId when on a board page
  const boardIdMatch = pathname.match(/^\/board\/([\w-]+)/);
  const currentBoardId = boardIdMatch ? boardIdMatch[1] : null;
  const qc = useQueryClient();

  // Listen for sprint archive event globally
  useEffect(() => {
    const handler = (e: Event) => {
      const { boardId: id } = (e as CustomEvent).detail;
      setArchiveBoardId(id);
    };
    window.addEventListener("open-sprint-archive", handler);
    return () => window.removeEventListener("open-sprint-archive", handler);
  }, []);

  // ⌘B toggles sidebar
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = (e.target as HTMLElement | null)?.tagName?.toLowerCase() ?? "";
      if (t === "input" || t === "textarea") return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);

  const starred = boards.filter((b) => b.starred);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      {/* Mobile top bar */}
      <div className="mobile-bar">
        <button
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          style={{
            background: "transparent",
            border: 0,
            color: "var(--ink)",
            cursor: "pointer",
            padding: 6,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <Logo size={22} />
        <div style={{ marginLeft: "auto" }}>{me && <Avatar user={me} size={26} />}</div>
      </div>

      {/* Backdrop for mobile drawer */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.4)",
            zIndex: 90,
          }}
          className="mobile-only"
        />
      )}

      <aside
        className={`sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}
        style={{
          width: collapsed ? 0 : 244,
          flexShrink: 0,
          borderRight: "1px solid var(--line)",
          background: "color-mix(in oklab, var(--surface-2) 55%, var(--bg))",
          transition: "width .18s",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <div
          style={{
            minWidth: 244,
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          {/* Workspace header */}
          <div style={{ padding: "12px 10px 10px", borderBottom: "1px solid var(--line)" }}>
            <Menu
              trigger={({ setOpen }) => (
                <button
                  onClick={() => setOpen((o) => !o)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    width: "100%",
                    padding: "6px 8px",
                    background: "transparent",
                    border: 0,
                    borderRadius: 7,
                    cursor: "pointer",
                    color: "var(--ink)",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 5,
                      background: "var(--ink)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--surface)",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    F
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      letterSpacing: "-.01em",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "var(--accent)",
                    }}
                  >
                    {me?.name?.split(" ")[0] ?? "You"}&apos;s workspace
                  </span>
                  <span style={{ marginLeft: "auto", color: "var(--ink-4)" }}>{I.chev}</span>
                </button>
              )}
            >
              <MenuItem danger onClick={async () => {
                qc.clear();
                await logoutAction();
              }}>
                {I.logout} Sign out
              </MenuItem>
            </Menu>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, overflowY: "auto", padding: "10px 8px", fontSize: 13 }}>
            <NavItem
              href="/"
              icon={I.grid}
              label="Boards"
              active={pathname === "/"}
              onClick={() => setMobileOpen(false)}
            />

            <NavItem
              href="/timeline"
              icon={I.calendar}
              label="Timeline"
              active={pathname === "/timeline"}
              onClick={() => setMobileOpen(false)}
            />

            <NavItem
              href="/list"
              icon={I.list}
              label="List view"
              active={pathname === "/list"}
              onClick={() => setMobileOpen(false)}
            />

            <NavItem
              href="/leaderboard"
              icon={I.trophy}
              label="Leaderboard"
              active={pathname === "/leaderboard"}
              onClick={() => setMobileOpen(false)}
            />

            <NavButton
              icon={I.kai}
              label="KAI Assistant"
              onClick={() => {
                setMobileOpen(false);
                setKaiOpen(true);
              }}
            />

            {!currentBoardId ? (
              <Menu
                align="start"
                trigger={({ setOpen }) => (
                  <NavButton
                    icon={I.archive}
                    label="Sprint Archive"
                    onClick={() => setOpen((o) => !o)}
                  />
                )}
              >
                {boards.length > 0 ? (
                  boards.map((b) => (
                    <MenuItem
                      key={b.id}
                      onClick={() => {
                        setMobileOpen(false);
                        window.dispatchEvent(
                          new CustomEvent("open-sprint-archive", { detail: { boardId: b.id } })
                        );
                      }}
                    >
                      {b.title}
                    </MenuItem>
                  ))
                ) : (
                  <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--ink-4)" }}>
                    No boards found
                  </div>
                )}
              </Menu>
            ) : (
              <NavButton
                icon={I.archive}
                label="Sprint Archive"
                onClick={() => {
                  setMobileOpen(false);
                  window.dispatchEvent(
                    new CustomEvent("open-sprint-archive", { detail: { boardId: currentBoardId } })
                  );
                }}
              />
            )}

            {starred.length > 0 && (
              <NavSection label="Favorites">
                {starred.map((b) => (
                  <NavItem
                    key={b.id}
                    href={`/board/${b.id}`}
                    icon={<Swatch color={b.color} />}
                    label={b.title}
                    active={pathname === `/board/${b.id}`}
                    onClick={() => setMobileOpen(false)}
                  />
                ))}
              </NavSection>
            )}

            <NavSection label="All boards">
              {boards.map((b) => (
                <NavItem
                  key={b.id}
                  href={`/board/${b.id}`}
                  icon={<Swatch color={b.color} />}
                  label={b.title}
                  active={pathname === `/board/${b.id}`}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
              {boards.length === 0 && (
                <div style={{ padding: "6px 10px", fontSize: 12, color: "var(--ink-4)" }}>
                  No boards yet
                </div>
              )}
            </NavSection>
          </nav>

          {/* Footer */}
          <div
            style={{
              borderTop: "1px solid var(--line)",
              padding: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
              position: "relative",
            }}
          >
            {tweaksOpen && <TweaksPanel onClose={() => setTweaksOpen(false)} />}
            {me && <Avatar user={me} size={24} />}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {me?.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--ink-4)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {me?.email}
              </div>
            </div>
            <button
              title="Appearance"
              onClick={() => setTweaksOpen((o) => !o)}
              style={{
                background: tweaksOpen ? "var(--surface-2)" : "transparent",
                border: 0,
                padding: "6px 10px",
                color: tweaksOpen ? "var(--ink-2)" : "var(--ink-4)",
                cursor: "pointer",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                gap: 6,
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 12,
                fontWeight: 500,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink-2)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = tweaksOpen ? "var(--ink-2)" : "var(--ink-4)")}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3a9 9 0 0 1 0 18" fill="currentColor" stroke="none" opacity=".15"/>
                <circle cx="9" cy="9" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="15" cy="9" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="9" cy="15" r="1.5" fill="currentColor" stroke="none"/>
                <circle cx="15" cy="15" r="1.5" fill="currentColor" stroke="none"/>
              </svg>
              Appearance
            </button>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {children}
      </main>

      {archiveBoardId && (
        <SprintArchiveModal boardId={archiveBoardId} onClose={() => setArchiveBoardId(null)} />
      )}

      <KaiChat open={kaiOpen} onClose={() => setKaiOpen(false)} />
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
  active,
  count,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href as any}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "5px 8px",
        borderRadius: 6,
        background: active ? "color-mix(in oklab, var(--accent) 14%, transparent)" : "transparent",
        color: active ? "var(--ink)" : "var(--ink-2)",
        fontSize: 12.5,
        textAlign: "left",
        fontWeight: active ? 500 : 400,
        marginBottom: 1,
        textDecoration: "none",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          width: 16,
          justifyContent: "center",
          color: active ? "var(--accent)" : "var(--ink-4)",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span
        style={{
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {count != null && (
        <span className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>
          {count}
        </span>
      )}
    </Link>
  );
}

function NavButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "5px 8px",
        borderRadius: 6,
        background: "transparent",
        border: 0,
        color: "var(--ink-2)",
        fontSize: 12.5,
        textAlign: "left",
        fontWeight: 400,
        marginBottom: 1,
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "color-mix(in oklab, var(--accent) 8%, transparent)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span
        style={{
          display: "inline-flex",
          width: 16,
          justifyContent: "center",
          color: "var(--ink-4)",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
    </button>
  );
}


function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          padding: "4px 10px 4px",
          fontSize: 10.5,
          fontWeight: 600,
          color: "var(--accent)",
          textTransform: "uppercase",
          letterSpacing: ".1em",
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <span
      style={{ width: 10, height: 10, borderRadius: 3, background: color, display: "inline-block" }}
    />
  );
}

