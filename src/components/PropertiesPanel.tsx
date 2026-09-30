"use client";

import { useSimStore } from "@/store/useSimStore";
import type { Anchor, Pulley, MassBlock, SimElement } from "@/types";

export function PropertiesPanel() {
  const selectedId = useSimStore((s) => s.selectedId);
  const getElementById = useSimStore((s) => s.getElementById);
  const updateElement = useSimStore((s) => s.updateElement);
  const removeElement = useSimStore((s) => s.removeElement);
  const selectElement = useSimStore((s) => s.selectElement);
  const ropes = useSimStore((s) => s.ropes);

  if (!selectedId) return null;
  const element = getElementById(selectedId);
  if (!element) return null;

  const connectedRopes = ropes.filter((r) =>
    r.waypoints.some((wp) => wp.elementId === selectedId)
  );

  return (
    <aside
      className="panel animate-slide-in flex flex-col shrink-0"
      style={{
        width: 260,
        margin: 8,
        marginLeft: 0,
        maxHeight: "calc(100vh - 64px)",
        overflow: "auto",
      }}
    >
      {/* Header */}
      <div className="panel-header flex items-center justify-between">
        <span className="flex items-center gap-2">
          <ElementIcon element={element} />
          Properties
        </span>
        <button
          onClick={() => selectElement(null)}
          className="text-xs opacity-50 hover:opacity-100 transition-opacity"
          style={{ cursor: "pointer", background: "none", border: "none", color: "inherit" }}
        >
          ✕
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Label */}
        <Field label="Label">
          <input
            className="sim-input"
            value={element.label || ""}
            onChange={(e) => updateElement(selectedId, { label: e.target.value })}
          />
        </Field>

        {/* Position (read-only display) */}
        <Field label="Position">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs" style={{ color: "var(--color-text-muted)" }}>X</label>
              <input
                className="sim-input"
                type="number"
                value={Math.round(element.position.x)}
                onChange={(e) =>
                  updateElement(selectedId, {
                    position: { ...element.position, x: Number(e.target.value) },
                  })
                }
              />
            </div>
            <div className="flex-1">
              <label className="text-xs" style={{ color: "var(--color-text-muted)" }}>Y</label>
              <input
                className="sim-input"
                type="number"
                value={Math.round(element.position.y)}
                onChange={(e) =>
                  updateElement(selectedId, {
                    position: { ...element.position, y: Number(e.target.value) },
                  })
                }
              />
            </div>
          </div>
        </Field>

        {/* Anchor-specific */}
        {element.type === "anchor" && (
          <Field label="Anchor Type">
            <select
              className="sim-input"
              value={(element as Anchor).anchorType}
              onChange={(e) =>
                updateElement(selectedId, { anchorType: e.target.value as Anchor["anchorType"] })
              }
            >
              <option value="ceiling">Ceiling</option>
              <option value="floor">Floor</option>
              <option value="wall">Wall</option>
            </select>
          </Field>
        )}

        {/* Pulley-specific */}
        {element.type === "pulley" && (
          <>
            <Field label={`Radius: ${(element as Pulley).radius}px`}>
              <input
                className="sim-slider"
                type="range"
                min={15}
                max={60}
                value={(element as Pulley).radius}
                onChange={(e) => updateElement(selectedId, { radius: Number(e.target.value) })}
              />
            </Field>
            <Field label="Fixed">
              <div className="flex items-center gap-3">
                <div
                  className={`toggle-track ${(element as Pulley).isFixed ? "on" : ""}`}
                  onClick={() => updateElement(selectedId, { isFixed: !(element as Pulley).isFixed })}
                >
                  <div className="toggle-thumb" />
                </div>
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {(element as Pulley).isFixed ? "Bolted in place" : "Free-hanging"}
                </span>
              </div>
            </Field>
          </>
        )}

        {/* Mass-specific */}
        {element.type === "mass" && (
          <>
            <Field label={`Mass: ${(element as MassBlock).mass} kg`}>
              <input
                className="sim-slider"
                type="range"
                min={1}
                max={100}
                step={0.5}
                value={(element as MassBlock).mass}
                onChange={(e) => updateElement(selectedId, { mass: Number(e.target.value) })}
              />
            </Field>
            <Field label={`Width: ${(element as MassBlock).width}px`}>
              <input
                className="sim-slider"
                type="range"
                min={30}
                max={120}
                value={(element as MassBlock).width}
                onChange={(e) => updateElement(selectedId, { width: Number(e.target.value) })}
              />
            </Field>
            <Field label={`Height: ${(element as MassBlock).height}px`}>
              <input
                className="sim-slider"
                type="range"
                min={30}
                max={120}
                value={(element as MassBlock).height}
                onChange={(e) => updateElement(selectedId, { height: Number(e.target.value) })}
              />
            </Field>
          </>
        )}

        {/* Connected ropes */}
        {connectedRopes.length > 0 && (
          <Field label="Connected Ropes">
            <div className="flex flex-col gap-1">
              {connectedRopes.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-2 text-xs"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ background: r.color, flexShrink: 0 }}
                  />
                  <span>{r.waypoints.length} waypoints</span>
                </div>
              ))}
            </div>
          </Field>
        )}

        {/* Delete button */}
        <button
          className="ctrl-btn ctrl-btn-reset w-full justify-center mt-2"
          onClick={() => {
            removeElement(selectedId);
            selectElement(null);
          }}
        >
          <span>✕</span> Delete Element
        </button>
      </div>
    </aside>
  );
}

// ── Helper Components ────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function ElementIcon({ element }: { element: SimElement }) {
  const color =
    element.type === "anchor"
      ? "var(--color-anchor)"
      : element.type === "pulley"
      ? "var(--color-pulley)"
      : "var(--color-mass)";
  const icon = element.type === "anchor" ? "⚓" : element.type === "pulley" ? "◎" : "▬";
  return (
    <span
      className="w-5 h-5 rounded flex items-center justify-center text-xs"
      style={{ background: `${color}33`, color }}
    >
      {icon}
    </span>
  );
}
