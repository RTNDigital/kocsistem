export function cn(...xs: Array<string | false | null | undefined>): string {
  return xs.filter(Boolean).join(" ");
}

export function fmtDate(ts: string | number | Date | null | undefined): string | null {
  if (!ts) return null;
  const d = new Date(ts);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export type DueState = "overdue" | "soon" | "normal" | null;

export function dueState(ts: string | number | null | undefined): DueState {
  if (!ts) return null;
  const at = new Date(ts).getTime();
  const diff = at - Date.now();
  if (diff < 0) return "overdue";
  if (diff < 1000 * 60 * 60 * 24) return "soon";
  return "normal";
}

export function relativeTime(ts: string | number | Date): string {
  const at = new Date(ts).getTime();
  const s = Math.round((Date.now() - at) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.round(s / 86400)}d ago`;
  return fmtDate(ts) ?? "";
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

export function initialsFrom(name: string): string {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

const PALETTE = ["#5B5BF5", "#2E7D6A", "#C84B7A", "#E6884E", "#8B5BD9", "#3E7CE0"];
export function pickColor(): string {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)];
}
