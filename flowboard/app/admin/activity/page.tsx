import { getDeletedCardActivities } from "@/lib/queries";
import { fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminActivityPage() {
  const logs = await getDeletedCardActivities();

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Deleted Card Logs</h1>
        <p style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 6 }}>
          Activity history for cards that have been deleted. Admin only.
        </p>
      </div>

      {logs.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--ink-4)", fontStyle: "italic" }}>
          No deleted card activity found.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {logs.map((log, i) => {
            const payload = log.payload as Record<string, unknown>;
            const cardTitle = (payload.title ?? payload.card_id ?? "—") as string;
            return (
              <div
                key={log.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr 160px",
                  gap: 16,
                  padding: "10px 14px",
                  background: i % 2 === 0 ? "var(--surface)" : "var(--surface-2)",
                  borderRadius: i === 0 ? "8px 8px 0 0" : i === logs.length - 1 ? "0 0 8px 8px" : 0,
                  border: "1px solid var(--line)",
                  borderTop: i === 0 ? undefined : "none",
                  alignItems: "center",
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: 11,
                    background: "var(--surface-2)",
                    border: "1px solid var(--line)",
                    borderRadius: 4,
                    padding: "2px 6px",
                    color: "var(--ink-3)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {log.type}
                </span>
                <div>
                  <span style={{ color: "var(--ink)", fontWeight: 500 }}>
                    {cardTitle}
                  </span>
                  {payload.text && (
                    <span style={{ color: "var(--ink-3)", marginLeft: 8 }}>
                      — {String(payload.text).slice(0, 60)}
                    </span>
                  )}
                </div>
                <div style={{ textAlign: "right", fontSize: 11.5, color: "var(--ink-4)" }}>
                  <div style={{ fontWeight: 600, color: "var(--ink-2)" }}>
                    {log.actor?.name ?? "Unknown"}
                  </div>
                  <div className="mono">{fmtDate(log.created_at)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
