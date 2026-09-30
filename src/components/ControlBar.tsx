"use client";

import { useSimStore } from "@/store/useSimStore";

export function ControlBar() {
  const mode = useSimStore((s) => s.mode);
  const setMode = useSimStore((s) => s.setMode);
  const isPaused = useSimStore((s) => s.isPaused);
  const togglePause = useSimStore((s) => s.togglePause);
  const resetSimulation = useSimStore((s) => s.resetSimulation);
  const anchors = useSimStore((s) => s.anchors);
  const pulleys = useSimStore((s) => s.pulleys);
  const masses = useSimStore((s) => s.masses);
  const ropes = useSimStore((s) => s.ropes);

  const hasElements = anchors.length > 0 || pulleys.length > 0 || masses.length > 0;

  const handleRun = () => {
    if (!hasElements) return;
    setMode("run");
  };

  return (
    <div className="flex items-center gap-3">
      {/* Status Badge */}
      <div
        className={`status-badge ${
          mode === "build"
            ? "status-build"
            : isPaused
            ? "status-paused"
            : "status-run"
        }`}
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{
            background:
              mode === "build"
                ? "var(--color-accent)"
                : isPaused
                ? "var(--color-warning)"
                : "var(--color-success)",
            boxShadow:
              mode === "run" && !isPaused
                ? "0 0 6px var(--color-success)"
                : undefined,
          }}
        />
        {mode === "build" ? "Build Mode" : isPaused ? "Paused" : "Simulating"}
      </div>

      {/* Element counts */}
      {mode === "build" && (
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
          <span title="Anchors">⚓ {anchors.length}</span>
          <span title="Pulleys">◎ {pulleys.length}</span>
          <span title="Masses">▬ {masses.length}</span>
          <span title="Ropes">⌇ {ropes.length}</span>
        </div>
      )}

      {/* Buttons */}
      {mode === "build" ? (
        <button
          className="ctrl-btn ctrl-btn-run"
          onClick={handleRun}
          disabled={!hasElements}
          style={!hasElements ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
        >
          <span>▶</span> Run
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            className={`ctrl-btn ${isPaused ? "ctrl-btn-run" : "ctrl-btn-pause"}`}
            onClick={togglePause}
          >
            <span>{isPaused ? "▶" : "⏸"}</span> {isPaused ? "Resume" : "Pause"}
          </button>
          <button className="ctrl-btn ctrl-btn-reset" onClick={resetSimulation}>
            <span>↺</span> Reset
          </button>
        </div>
      )}
    </div>
  );
}
