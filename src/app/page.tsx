"use client";

import { Toolbar } from "@/components/Toolbar";
import { SimCanvas } from "@/components/SimCanvas";
import { ControlBar } from "@/components/ControlBar";
import { PropertiesPanel } from "@/components/PropertiesPanel";
import { Dashboard } from "@/components/Dashboard";
import { HintBar } from "@/components/HintBar";
import { useSimStore } from "@/store/useSimStore";

export default function Home() {
  const mode = useSimStore((s) => s.mode);
  const selectedId = useSimStore((s) => s.selectedId);

  return (
    <div className="h-full flex flex-col" style={{ background: "var(--color-background)" }}>
      {/* ─── Top Bar ─────────────────────────── */}
      <header
        className="flex items-center justify-between px-5 h-12 shrink-0"
        style={{
          background: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        {/* Logo / Title */}
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{
              background: "linear-gradient(135deg, var(--color-accent), var(--color-violet))",
              color: "white",
            }}
          >
            ⚙
          </div>
          <h1 className="text-sm font-semibold tracking-wide" style={{ color: "var(--color-foreground)" }}>
            Pulley System Simulator
          </h1>
        </div>

        {/* Control Bar (Run / Pause / Reset) */}
        <ControlBar />
      </header>

      {/* ─── Main Content ────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Left Toolbar (Build Mode Only) */}
        {mode === "build" && <Toolbar />}

        {/* Canvas */}
        <div className="flex-1 relative">
          <SimCanvas />
          <HintBar />
        </div>

        {/* Right Panel: Properties (Build) or Dashboard (Run) */}
        {mode === "build" && selectedId && <PropertiesPanel />}
        {mode === "run" && selectedId && <Dashboard />}
      </div>
    </div>
  );
}
