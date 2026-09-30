"use client";

import { useSimStore } from "@/store/useSimStore";

const toolHints: Record<string, string> = {
  select:  "Click to select • Drag to move • Delete/Backspace to remove",
  anchor:  "Click on the canvas to place a fixed anchor point",
  pulley:  "Click on the canvas to place a pulley wheel",
  mass:    "Click on the canvas to place a mass block",
  rope:    "Click elements in order to create a rope path • Double-click or Enter to finish • Esc to cancel",
  delete:  "Click on an element to delete it",
};

export function HintBar() {
  const mode = useSimStore((s) => s.mode);
  const activeTool = useSimStore((s) => s.activeTool);
  const ropeDrawing = useSimStore((s) => s.ropeDrawing);
  const isPaused = useSimStore((s) => s.isPaused);

  if (mode === "run") {
    return (
      <div className="hint-bar">
        <span style={{ color: isPaused ? "var(--color-warning)" : "var(--color-success)" }}>
          {isPaused ? "⏸ Paused" : "▶ Simulating"}
        </span>
        <span style={{ color: "var(--color-text-muted)" }}>
          • Click an element to view kinematics
        </span>
      </div>
    );
  }

  const hint = toolHints[activeTool] || "";
  const ropeHint = ropeDrawing
    ? `  •  Drawing rope: ${ropeDrawing.length} waypoint${ropeDrawing.length !== 1 ? "s" : ""} placed`
    : "";

  return (
    <div className="hint-bar">
      <span style={{ color: "var(--color-text-muted)" }}>{hint}</span>
      {ropeHint && (
        <span className="rope-drawing-indicator" style={{ color: "#A3E635", marginLeft: 8 }}>
          {ropeHint}
        </span>
      )}
      <span className="ml-auto" style={{ color: "var(--color-text-muted)", fontSize: 10 }}>
        Shortcuts: V A P M R X
      </span>
    </div>
  );
}
