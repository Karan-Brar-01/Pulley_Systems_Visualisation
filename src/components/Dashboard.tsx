"use client";

import { useSimStore } from "@/store/useSimStore";
import type { SimElement, MassBlock } from "@/types";

export function Dashboard() {
  const selectedId = useSimStore((s) => s.selectedId);
  const getElementById = useSimStore((s) => s.getElementById);
  const kinematics = useSimStore((s) => s.kinematics);
  const selectElement = useSimStore((s) => s.selectElement);

  if (!selectedId) return null;
  const element = getElementById(selectedId);
  if (!element) return null;

  const kd = kinematics[selectedId];

  return (
    <aside
      className="panel animate-slide-in flex flex-col shrink-0"
      style={{
        width: 280,
        margin: 8,
        marginLeft: 0,
        maxHeight: "calc(100vh - 64px)",
        overflow: "auto",
      }}
    >
      {/* Header */}
      <div className="panel-header flex items-center justify-between">
        <span className="flex items-center gap-2">
          <DashIcon element={element} />
          Kinematics
        </span>
        <button
          onClick={() => selectElement(null)}
          className="text-xs opacity-50 hover:opacity-100 transition-opacity"
          style={{ cursor: "pointer", background: "none", border: "none", color: "inherit" }}
        >
          ✕
        </button>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Element info */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
            {element.label || element.id}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: getTypeBg(element.type),
              color: getTypeColor(element.type),
              border: `1px solid ${getTypeColor(element.type)}44`,
            }}
          >
            {element.type}
          </span>
        </div>

        {/* Mass info (for mass blocks) */}
        {element.type === "mass" && (
          <div className="kv-card">
            <div className="kv-label">Mass</div>
            <div className="kv-value">
              {(element as MassBlock).mass.toFixed(1)}
              <span className="kv-unit">kg</span>
            </div>
          </div>
        )}

        {/* Velocity */}
        <div className="kv-card">
          <div className="kv-label">Velocity</div>
          <div className="kv-value">
            {kd ? kd.speed.toFixed(3) : "0.000"}
            <span className="kv-unit">m/s</span>
          </div>
          {kd && (
            <div className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
              vx: {kd.velocity.x.toFixed(3)} &nbsp; vy: {kd.velocity.y.toFixed(3)}
            </div>
          )}
        </div>

        {/* Acceleration */}
        <div className="kv-card">
          <div className="kv-label">Acceleration</div>
          <div className="kv-value">
            {kd ? kd.accelerationMag.toFixed(3) : "0.000"}
            <span className="kv-unit">m/s²</span>
          </div>
          {kd && (
            <div className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
              ax: {kd.acceleration.x.toFixed(3)} &nbsp; ay: {kd.acceleration.y.toFixed(3)}
            </div>
          )}
        </div>

        {/* Tension */}
        <div className="kv-card">
          <div className="kv-label">Rope Tensions</div>
          {kd && kd.tensions.length > 0 ? (
            <div className="flex flex-col gap-2 mt-1">
              {kd.tensions.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: t.ropeColor }}
                  />
                  <span className="kv-value text-base">
                    {t.tension.toFixed(2)}
                    <span className="kv-unit">N</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
              {kd ? "No rope attached" : "Waiting for data..."}
            </div>
          )}
        </div>

        {/* Weight force (for masses) */}
        {element.type === "mass" && (
          <div className="kv-card">
            <div className="kv-label">Weight (mg)</div>
            <div className="kv-value">
              {((element as MassBlock).mass * 9.81).toFixed(2)}
              <span className="kv-unit">N</span>
            </div>
          </div>
        )}

        {/* Net Force estimate */}
        {element.type === "mass" && kd && (
          <div className="kv-card">
            <div className="kv-label">Net Force (F = ma)</div>
            <div className="kv-value">
              {((element as MassBlock).mass * kd.accelerationMag).toFixed(2)}
              <span className="kv-unit">N</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function getTypeColor(type: string): string {
  switch (type) {
    case "anchor": return "var(--color-anchor)";
    case "pulley": return "var(--color-pulley)";
    case "mass":   return "var(--color-mass)";
    default:       return "var(--color-accent)";
  }
}

function getTypeBg(type: string): string {
  switch (type) {
    case "anchor": return "rgba(245, 158, 11, 0.15)";
    case "pulley": return "rgba(99, 102, 241, 0.15)";
    case "mass":   return "rgba(236, 72, 153, 0.15)";
    default:       return "rgba(59, 130, 246, 0.15)";
  }
}

function DashIcon({ element }: { element: SimElement }) {
  const color = getTypeColor(element.type);
  return (
    <span
      className="w-5 h-5 rounded flex items-center justify-center"
      style={{ background: `${color}33`, color, fontSize: 12 }}
    >
      📊
    </span>
  );
}
