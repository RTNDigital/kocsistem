"use client";

import { useState } from "react";
import { Button, Input, Chip } from "@/components/ui";
import { I } from "@/components/Icons";
import { useAddLabel, useUpdateLabel, useDeleteLabel } from "@/hooks/useBoard";
import type { Label } from "@/types/domain";

interface Props {
  boardId: string;
  labels: Label[];
  onClose: () => void;
}

const PRESET_COLORS = [
  "#f87171", // red-400
  "#fb923c", // orange-400
  "#fbbf24", // amber-400
  "#4ade80", // green-400
  "#34d399", // emerald-400
  "#2dd4bf", // teal-400
  "#38bdf8", // sky-400
  "#60a5fa", // blue-400
  "#818cf8", // indigo-400
  "#c084fc", // purple-400
  "#e879f9", // fuchsia-400
  "#f472b6", // pink-400
];

export function BoardLabelsModal({ boardId, labels, onClose }: Props) {
  const addLabel = useAddLabel(boardId);
  const updateLabel = useUpdateLabel(boardId);
  const deleteLabel = useDeleteLabel(boardId);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setColor(PRESET_COLORS[0]);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (editingId) {
      updateLabel.mutate({ labelId: editingId, patch: { name, color } }, {
        onSuccess: resetForm
      });
    } else {
      addLabel.mutate({ name, color }, {
        onSuccess: resetForm
      });
    }
  };

  const startEdit = (l: Label) => {
    setEditingId(l.id);
    setName(l.name);
    setColor(l.color);
  };

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
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Manage Labels</h2>
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

        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", background: "var(--surface-2)" }}>
           <h3 style={{ margin: "0 0 10px 0", fontSize: 13, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>
             {editingId ? "Edit Label" : "Create New Label"}
           </h3>
           <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
             <Input 
                placeholder="Label name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
             />
             <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
               {PRESET_COLORS.map(c => (
                 <button
                   key={c}
                   onClick={() => setColor(c)}
                   style={{
                     width: 24, height: 24, borderRadius: 6,
                     background: c,
                     border: color === c ? "2px solid var(--ink)" : "2px solid transparent",
                     cursor: "pointer"
                   }}
                 />
               ))}
             </div>
             <div style={{ display: "flex", gap: 8 }}>
               <Button variant="primary" onClick={handleSave} disabled={!name.trim() || addLabel.isPending || updateLabel.isPending}>
                 {editingId ? "Update" : "Create"}
               </Button>
               {editingId && (
                 <Button variant="ghost" onClick={resetForm}>Cancel</Button>
               )}
             </div>
           </div>
        </div>

        <div style={{ maxHeight: 300, overflowY: "auto" }}>
          {labels.length > 0 ? (
            <div style={{ padding: "10px 20px" }}>
              {labels.map((l) => (
                <div
                  key={l.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 0",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 16, height: 16, borderRadius: 4, background: l.color }} />
                    <span style={{ fontSize: 13.5, fontWeight: 500 }}>{l.name}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => startEdit(l)}>
                    {I.edit}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                      if (confirm("Are you sure you want to delete this label?")) {
                          deleteLabel.mutate(l.id);
                      }
                  }}>
                    {I.trash}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--ink-4)" }}
            >
              No labels found on this board.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
