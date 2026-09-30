"use client";

import { useSimStore } from "@/store/useSimStore";
import type { ToolType } from "@/types";

const tools: { type: ToolType; icon: string; label: string; shortcut: string }[] = [
  { type: "select",  icon: "⊹",  label: "Select & Move",  shortcut: "V" },
  { type: "anchor",  icon: "⚓", label: "Fixed Anchor",    shortcut: "A" },
  { type: "pulley",  icon: "◎", label: "Pulley",          shortcut: "P" },
  { type: "mass",    icon: "▬", label: "Mass Block",      shortcut: "M" },
  { type: "rope",    icon: "⌇",  label: "Rope / Connect",  shortcut: "R" },
  { type: "delete",  icon: "✕", label: "Delete",          shortcut: "X" },
];

const toolColors: Record<ToolType, string> = {
  select: "var(--color-accent)",
  anchor: "var(--color-anchor)",
  pulley: "var(--color-pulley)",
  mass:   "var(--color-mass)",
  rope:   "#A3E635",
  delete: "var(--color-danger)",
};

export function Toolbar() {
  const activeTool = useSimStore((s) => s.activeTool);
  const setActiveTool = useSimStore((s) => s.setActiveTool);
  const ropeDrawing = useSimStore((s) => s.ropeDrawing);

  return (
    <aside
      className="flex flex-col items-center gap-2 py-4 px-2 shrink-0"
      style={{
        width: 60,
        background: "var(--color-surface)",
        borderRight: "1px solid var(--color-border)",
      }}
    >
      {tools.map((tool) => (
        <button
          key={tool.type}
          className={`tool-btn ${activeTool === tool.type ? "active" : ""}`}
          onClick={() => setActiveTool(tool.type)}
          title={`${tool.label} (${tool.shortcut})`}
          style={
            activeTool === tool.type
              ? {
                  background: `linear-gradient(135deg, ${toolColors[tool.type]}, ${toolColors[tool.type]}dd)`,
                  borderColor: toolColors[tool.type],
                  boxShadow: `0 0 16px ${toolColors[tool.type]}55`,
                }
              : undefined
          }
        >
          <span className="text-lg">{tool.icon}</span>
          <span className="tool-label">{tool.label}</span>
        </button>
      ))}

      {/* Divider */}
      <div className="w-8 my-1" style={{ borderTop: "1px solid var(--color-border)" }} />

      {/* Rope drawing status */}
      {ropeDrawing && (
        <div
          className="rope-drawing-indicator text-center"
          style={{
            fontSize: 10,
            color: "#A3E635",
            fontWeight: 600,
            lineHeight: 1.3,
          }}
        >
          Drawing
          <br />
          Rope
          <br />
          <span style={{ fontSize: 9, opacity: 0.7 }}>
            ({ropeDrawing.length} pts)
          </span>
        </div>
      )}
    </aside>
  );
}
