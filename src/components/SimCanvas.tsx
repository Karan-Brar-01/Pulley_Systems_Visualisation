"use client";

import { useRef, useEffect, useCallback } from "react";
import { useSimStore } from "@/store/useSimStore";
import type { Vec2, SimElement, Anchor, Pulley, MassBlock } from "@/types";
import {
  GRID_SIZE, ANCHOR_RADIUS, COLORS, snapToGrid,
} from "@/lib/constants";
import { initializeEngine, pauseEngine, resumeEngine } from "@/engine/initializer";
import type { EngineState } from "@/engine/initializer";
import { renderEngine } from "@/engine/renderer";
import { computeKinematics, clearKinematicsHistory } from "@/engine/kinematicsCalc";
import Matter from "matter-js";

// ──────────────────────────────────────────────
// SimCanvas — The core rendering surface.
// Build mode: static rendering of elements + grid.
// Run mode: renders Matter.js body positions.
// ──────────────────────────────────────────────

export function SimCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const mouseRef = useRef<Vec2>({ x: 0, y: 0 });
  const engineRef = useRef<EngineState | null>(null);
  const kinTickRef = useRef<number>(0);

  // ── Zustand reads ───────────────────────────
  const mode = useSimStore((s) => s.mode);
  const activeTool = useSimStore((s) => s.activeTool);
  const anchors = useSimStore((s) => s.anchors);
  const pulleys = useSimStore((s) => s.pulleys);
  const masses = useSimStore((s) => s.masses);
  const ropes = useSimStore((s) => s.ropes);
  const selectedId = useSimStore((s) => s.selectedId);
  const ropeDrawing = useSimStore((s) => s.ropeDrawing);
  const dragId = useSimStore((s) => s.dragId);
  const isPaused = useSimStore((s) => s.isPaused);

  // ── Zustand actions ─────────────────────────
  const addAnchor = useSimStore((s) => s.addAnchor);
  const addPulley = useSimStore((s) => s.addPulley);
  const addMass = useSimStore((s) => s.addMass);
  const selectElement = useSimStore((s) => s.selectElement);
  const startDrag = useSimStore((s) => s.startDrag);
  const updateDrag = useSimStore((s) => s.updateDrag);
  const endDrag = useSimStore((s) => s.endDrag);
  const removeElement = useSimStore((s) => s.removeElement);
  const startRopeDrawing = useSimStore((s) => s.startRopeDrawing);
  const addRopeWaypoint = useSimStore((s) => s.addRopeWaypoint);
  const finishRopeDrawing = useSimStore((s) => s.finishRopeDrawing);
  const cancelRopeDrawing = useSimStore((s) => s.cancelRopeDrawing);
  const setActiveTool = useSimStore((s) => s.setActiveTool);
  const setKinematics = useSimStore((s) => s.setKinematics);

  // ── Engine lifecycle (mode changes) ─────────
  useEffect(() => {
    if (mode === "run") {
      // Initialize engine from current store state
      const store = useSimStore.getState();
      try {
        const es = initializeEngine(store);
        engineRef.current = es;
        clearKinematicsHistory();
      } catch (err) {
        console.error("Failed to initialize engine:", err);
      }
    } else {
      // Cleanup engine when returning to build mode
      if (engineRef.current) {
        engineRef.current.cleanup();
        engineRef.current = null;
      }
      clearKinematicsHistory();
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.cleanup();
        engineRef.current = null;
      }
    };
  }, [mode]);

  // ── Pause / Resume ──────────────────────────
  useEffect(() => {
    if (!engineRef.current) return;
    if (isPaused) {
      pauseEngine(engineRef.current.runner);
    } else {
      resumeEngine(engineRef.current.runner, engineRef.current.engine);
    }
  }, [isPaused]);

  // ── Resize canvas ──────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // ── Hit testing ─────────────────────────────
  const hitTest = useCallback(
    (pos: Vec2): SimElement | null => {
      const state = useSimStore.getState();

      // In run mode, use Matter.js body positions
      if (state.mode === "run" && engineRef.current) {
        const bodyMap = engineRef.current.bodyMap;
        // Test masses
        for (const m of state.masses) {
          const body = bodyMap.get(m.id);
          if (!body) continue;
          const hw = m.width / 2;
          const hh = m.height / 2;
          if (
            pos.x >= body.position.x - hw && pos.x <= body.position.x + hw &&
            pos.y >= body.position.y - hh && pos.y <= body.position.y + hh
          ) return m;
        }
        // Test pulleys
        for (const p of state.pulleys) {
          const body = bodyMap.get(p.id);
          if (!body) continue;
          const dx = pos.x - body.position.x;
          const dy = pos.y - body.position.y;
          if (dx * dx + dy * dy <= (p.radius + 6) ** 2) return p;
        }
        // Test anchors
        for (const a of state.anchors) {
          const body = bodyMap.get(a.id);
          if (!body) continue;
          const dx = pos.x - body.position.x;
          const dy = pos.y - body.position.y;
          if (dx * dx + dy * dy <= (ANCHOR_RADIUS + 8) ** 2) return a;
        }
        return null;
      }

      // Build mode — use Zustand positions
      for (const m of state.masses) {
        const hw = m.width / 2;
        const hh = m.height / 2;
        if (
          pos.x >= m.position.x - hw && pos.x <= m.position.x + hw &&
          pos.y >= m.position.y - hh && pos.y <= m.position.y + hh
        ) return m;
      }
      for (const p of state.pulleys) {
        const dx = pos.x - p.position.x;
        const dy = pos.y - p.position.y;
        if (dx * dx + dy * dy <= (p.radius + 6) ** 2) return p;
      }
      for (const a of state.anchors) {
        const dx = pos.x - a.position.x;
        const dy = pos.y - a.position.y;
        if (dx * dx + dy * dy <= (ANCHOR_RADIUS + 8) ** 2) return a;
      }
      return null;
    },
    []
  );

  // ── Mouse position from event ──────────────
  const getCanvasPos = useCallback((e: React.MouseEvent): Vec2 => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  // ── Mouse Down ──────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const pos = getCanvasPos(e);
      const state = useSimStore.getState();

      if (state.mode !== "build") {
        // In run mode, clicking selects for dashboard
        const hit = hitTest(pos);
        selectElement(hit?.id ?? null);
        return;
      }

      const snapped = { x: snapToGrid(pos.x), y: snapToGrid(pos.y) };

      switch (state.activeTool) {
        case "select": {
          const hit = hitTest(pos);
          if (hit) {
            selectElement(hit.id);
            startDrag(hit.id, { x: pos.x - hit.position.x, y: pos.y - hit.position.y });
          } else {
            selectElement(null);
          }
          break;
        }
        case "anchor":
          addAnchor(snapped);
          break;
        case "pulley":
          addPulley(snapped);
          break;
        case "mass":
          addMass(snapped);
          break;
        case "rope": {
          const hit = hitTest(pos);
          if (hit) {
            if (!state.ropeDrawing) {
              startRopeDrawing();
            }
            addRopeWaypoint({
              elementId: hit.id,
              elementType: hit.type,
            });
          }
          break;
        }
        case "delete": {
          const hit = hitTest(pos);
          if (hit) removeElement(hit.id);
          break;
        }
      }
    },
    [
      getCanvasPos, hitTest, addAnchor, addPulley, addMass,
      selectElement, startDrag, removeElement,
      startRopeDrawing, addRopeWaypoint,
    ]
  );

  // ── Mouse Move ──────────────────────────────
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const pos = getCanvasPos(e);
      mouseRef.current = pos;
      const state = useSimStore.getState();
      if (state.mode === "build" && state.dragId) {
        const snapped = { x: snapToGrid(pos.x), y: snapToGrid(pos.y) };
        updateDrag(snapped);
      }
    },
    [getCanvasPos, updateDrag]
  );

  // ── Mouse Up ────────────────────────────────
  const handleMouseUp = useCallback(() => {
    const state = useSimStore.getState();
    if (state.dragId) endDrag();
  }, [endDrag]);

  // ── Double Click (finish rope) ──────────────
  const handleDoubleClick = useCallback(() => {
    const state = useSimStore.getState();
    if (state.mode === "build" && state.activeTool === "rope" && state.ropeDrawing) {
      finishRopeDrawing();
    }
  }, [finishRopeDrawing]);

  // ── Keyboard shortcuts ──────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const state = useSimStore.getState();
      if (state.mode !== "build") return;
      if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "SELECT") return;

      switch (e.key.toLowerCase()) {
        case "v": setActiveTool("select"); break;
        case "a": setActiveTool("anchor"); break;
        case "p": setActiveTool("pulley"); break;
        case "m": setActiveTool("mass"); break;
        case "r": setActiveTool("rope"); break;
        case "x": setActiveTool("delete"); break;
        case "escape":
          if (state.ropeDrawing) cancelRopeDrawing();
          else selectElement(null);
          break;
        case "enter":
          if (state.ropeDrawing) finishRopeDrawing();
          break;
        case "delete":
        case "backspace": {
          if (state.selectedId) {
            removeElement(state.selectedId);
            selectElement(null);
          }
          break;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setActiveTool, cancelRopeDrawing, finishRopeDrawing, removeElement, selectElement]);

  // ── Render Loop ─────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const state = useSimStore.getState();

      // Clear
      ctx.clearRect(0, 0, w, h);

      // Background
      ctx.fillStyle = COLORS.bgSecondary;
      ctx.fillRect(0, 0, w, h);

      // Grid
      drawGrid(ctx, w, h);

      // Ceiling indicator
      drawCeiling(ctx, w);

      if (state.mode === "run" && engineRef.current) {
        // ── RUN MODE: render from physics engine ──
        renderEngine(ctx, engineRef.current, state, state.selectedId);

        // Update kinematics every 2 frames (~30fps)
        kinTickRef.current++;
        if (kinTickRef.current % 2 === 0 && state.selectedId) {
          const kd = computeKinematics(state.selectedId, engineRef.current);
          if (kd) {
            setKinematics(state.selectedId, kd);
          }
        }
      } else {
        // ── BUILD MODE: static rendering ──────────

        // Ropes (behind elements)
        for (const rope of state.ropes) {
          drawRope(ctx, rope, state);
        }

        // Rope drawing preview
        if (state.ropeDrawing && state.ropeDrawing.length > 0) {
          drawRopePreview(ctx, state.ropeDrawing, mouseRef.current, state);
        }

        // Anchors
        for (const a of state.anchors) {
          drawAnchor(ctx, a, a.id === state.selectedId);
        }

        // Pulleys
        for (const p of state.pulleys) {
          drawPulley(ctx, p, p.id === state.selectedId);
        }

        // Masses
        for (const m of state.masses) {
          drawMass(ctx, m, m.id === state.selectedId);
        }

        // Tool cursor preview
        if (!state.dragId) {
          drawToolPreview(ctx, state.activeTool, mouseRef.current);
        }
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [setKinematics]);

  // ── Cursor style ────────────────────────────
  const state = useSimStore.getState();
  const cursorClass =
    mode !== "build"
      ? "cursor-default"
      : activeTool === "select"
      ? dragId ? "cursor-grabbing" : "cursor-grab"
      : "cursor-crosshair";

  return (
    <div ref={containerRef} className={`w-full h-full ${cursorClass}`}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      />
    </div>
  );
}

// ──────────────────────────────────────────────
// Drawing Helpers (Build Mode)
// ──────────────────────────────────────────────

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = COLORS.bgTertiary;
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.35;

  for (let x = 0; x <= w; x += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

function drawCeiling(ctx: CanvasRenderingContext2D, w: number) {
  const ceilingH = 14;
  ctx.fillStyle = "rgba(51, 65, 85, 0.5)";
  ctx.fillRect(0, 0, w, ceilingH);

  ctx.strokeStyle = "rgba(100, 116, 139, 0.5)";
  ctx.lineWidth = 1;
  for (let x = 0; x < w + ceilingH; x += 8) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - ceilingH, ceilingH);
    ctx.stroke();
  }

  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, ceilingH);
  ctx.lineTo(w, ceilingH);
  ctx.stroke();
}

function drawAnchor(ctx: CanvasRenderingContext2D, a: Anchor, selected: boolean) {
  const { x, y } = a.position;
  const r = ANCHOR_RADIUS;

  if (selected) {
    ctx.shadowColor = COLORS.anchor;
    ctx.shadowBlur = 16;
  }

  // Mounting bracket
  ctx.strokeStyle = COLORS.anchor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 10, y - 12);
  ctx.lineTo(x + 10, y - 12);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x, y - 12);
  ctx.lineTo(x, y - r);
  ctx.stroke();

  // Circle
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = selected ? COLORS.anchor : "#D97706";
  ctx.fill();
  ctx.strokeStyle = COLORS.anchor;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.bgPrimary;
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;

  if (a.label) {
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(a.label, x, y + r + 14);
  }

  if (selected) {
    ctx.strokeStyle = COLORS.anchor;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(x, y, r + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawPulley(ctx: CanvasRenderingContext2D, p: Pulley, selected: boolean) {
  const { x, y } = p.position;
  const r = p.radius;

  if (selected) {
    ctx.shadowColor = COLORS.pulley;
    ctx.shadowBlur = 16;
  }

  if (p.isFixed) {
    ctx.strokeStyle = COLORS.bgTertiary;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x, 14);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = COLORS.pulley;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 6, 14);
    ctx.lineTo(x + 6, 14);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(99, 102, 241, 0.1)";
  ctx.fill();
  ctx.strokeStyle = COLORS.pulley;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, r - 4, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(99, 102, 241, 0.3)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.pulley;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.bgSecondary;
  ctx.fill();

  ctx.strokeStyle = "rgba(99, 102, 241, 0.2)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(x + 5 * Math.cos(angle), y + 5 * Math.sin(angle));
    ctx.lineTo(x + (r - 5) * Math.cos(angle), y + (r - 5) * Math.sin(angle));
    ctx.stroke();
  }

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;

  if (p.label) {
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(p.label, x, y + r + 16);
  }

  if (p.isFixed) {
    ctx.fillStyle = "rgba(165, 180, 252, 0.6)";
    ctx.font = "8px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("FIXED", x, y + r + 26);
  }

  if (selected) {
    ctx.strokeStyle = COLORS.pulley;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(x, y, r + 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawMass(ctx: CanvasRenderingContext2D, m: MassBlock, selected: boolean) {
  const { x, y } = m.position;
  const hw = m.width / 2;
  const hh = m.height / 2;

  if (selected) {
    ctx.shadowColor = COLORS.mass;
    ctx.shadowBlur = 16;
  }

  const grad = ctx.createLinearGradient(x - hw, y - hh, x + hw, y + hh);
  grad.addColorStop(0, "rgba(236, 72, 153, 0.2)");
  grad.addColorStop(1, "rgba(236, 72, 153, 0.08)");
  ctx.fillStyle = grad;

  const cr = 6;
  ctx.beginPath();
  ctx.moveTo(x - hw + cr, y - hh);
  ctx.lineTo(x + hw - cr, y - hh);
  ctx.arcTo(x + hw, y - hh, x + hw, y - hh + cr, cr);
  ctx.lineTo(x + hw, y + hh - cr);
  ctx.arcTo(x + hw, y + hh, x + hw - cr, y + hh, cr);
  ctx.lineTo(x - hw + cr, y + hh);
  ctx.arcTo(x - hw, y + hh, x - hw, y + hh - cr, cr);
  ctx.lineTo(x - hw, y - hh + cr);
  ctx.arcTo(x - hw, y - hh, x - hw + cr, y - hh, cr);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = COLORS.mass;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y - hh, 3, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.mass;
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;

  ctx.fillStyle = COLORS.textPrimary;
  ctx.font = "bold 13px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${m.mass}kg`, x, y);

  if (m.label) {
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = "10px Inter, sans-serif";
    ctx.fillText(m.label, x, y + hh + 14);
  }

  if (selected) {
    ctx.strokeStyle = COLORS.mass;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(x - hw - 6, y - hh - 6, m.width + 12, m.height + 12);
    ctx.setLineDash([]);
  }

  ctx.textBaseline = "alphabetic";
}

// ── Rope Drawing ──────────────────────────────

type StoreState = ReturnType<typeof useSimStore.getState>;

function getElementCenter(id: string, state: StoreState): Vec2 | null {
  const el =
    state.anchors.find((a) => a.id === id) ||
    state.pulleys.find((p) => p.id === id) ||
    state.masses.find((m) => m.id === id);
  if (!el) return null;
  if (el.type === "mass") {
    return { x: el.position.x, y: el.position.y - (el as MassBlock).height / 2 };
  }
  return { ...el.position };
}

function computeTangentPoints(
  from: Vec2,
  pulleyCenter: Vec2,
  pulleyRadius: number,
  to: Vec2
): { entry: Vec2; exit: Vec2; wrapStart: number; wrapEnd: number } {
  const r = pulleyRadius - 2;

  const angleIn = Math.atan2(from.y - pulleyCenter.y, from.x - pulleyCenter.x);
  const angleOut = Math.atan2(to.y - pulleyCenter.y, to.x - pulleyCenter.x);

  const dIn = Math.sqrt(
    (from.x - pulleyCenter.x) ** 2 + (from.y - pulleyCenter.y) ** 2
  );
  const tangentAngleIn = dIn > r ? Math.acos(r / dIn) : 0;
  const entryAngle = angleIn + (angleIn < angleOut ? tangentAngleIn : -tangentAngleIn);

  const dOut = Math.sqrt(
    (to.x - pulleyCenter.x) ** 2 + (to.y - pulleyCenter.y) ** 2
  );
  const tangentAngleOut = dOut > r ? Math.acos(r / dOut) : 0;
  const exitAngle = angleOut + (angleOut > angleIn ? -tangentAngleOut : tangentAngleOut);

  return {
    entry: {
      x: pulleyCenter.x + r * Math.cos(entryAngle),
      y: pulleyCenter.y + r * Math.sin(entryAngle),
    },
    exit: {
      x: pulleyCenter.x + r * Math.cos(exitAngle),
      y: pulleyCenter.y + r * Math.sin(exitAngle),
    },
    wrapStart: entryAngle,
    wrapEnd: exitAngle,
  };
}

function drawRope(
  ctx: CanvasRenderingContext2D,
  rope: import("@/types").RopeRoute,
  state: StoreState
) {
  if (rope.waypoints.length < 2) return;

  ctx.strokeStyle = rope.color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const points: Vec2[] = [];
  const arcs: { center: Vec2; radius: number; start: number; end: number; color: string }[] = [];

  for (let i = 0; i < rope.waypoints.length; i++) {
    const wp = rope.waypoints[i];
    const center = getElementCenter(wp.elementId, state);
    if (!center) continue;

    if (wp.elementType === "pulley") {
      const pulley = state.pulleys.find((p) => p.id === wp.elementId);
      if (!pulley) { points.push(center); continue; }

      const prevCenter = i > 0 ? getElementCenter(rope.waypoints[i - 1].elementId, state) : null;
      const nextCenter = i < rope.waypoints.length - 1
        ? getElementCenter(rope.waypoints[i + 1].elementId, state)
        : null;

      if (prevCenter && nextCenter) {
        const tangents = computeTangentPoints(prevCenter, center, pulley.radius, nextCenter);
        points.push(tangents.entry);
        arcs.push({
          center,
          radius: pulley.radius - 2,
          start: tangents.wrapStart,
          end: tangents.wrapEnd,
          color: rope.color,
        });
        points.push(tangents.exit);
      } else {
        points.push(center);
      }
    } else {
      points.push(center);
    }
  }

  if (points.length >= 2) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  }

  for (const arc of arcs) {
    ctx.beginPath();
    ctx.arc(arc.center.x, arc.center.y, arc.radius, arc.start, arc.end);
    ctx.strokeStyle = arc.color;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.fillStyle = rope.color;
  if (points.length > 0) {
    for (const pt of [points[0], points[points.length - 1]]) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawRopePreview(
  ctx: CanvasRenderingContext2D,
  waypoints: import("@/types").RopeWaypoint[],
  mouse: Vec2,
  state: StoreState
) {
  if (waypoints.length === 0) return;

  ctx.strokeStyle = "#A3E635";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.globalAlpha = 0.7;

  ctx.beginPath();
  let started = false;

  for (const wp of waypoints) {
    const center = getElementCenter(wp.elementId, state);
    if (!center) continue;
    if (!started) {
      ctx.moveTo(center.x, center.y);
      started = true;
    } else {
      ctx.lineTo(center.x, center.y);
    }
  }

  if (started) {
    ctx.lineTo(mouse.x, mouse.y);
  }
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Draw waypoint dots
  ctx.fillStyle = "#A3E635";
  for (const wp of waypoints) {
    const center = getElementCenter(wp.elementId, state);
    if (!center) continue;
    ctx.beginPath();
    ctx.arc(center.x, center.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawToolPreview(ctx: CanvasRenderingContext2D, tool: string, mouse: Vec2) {
  ctx.globalAlpha = 0.3;

  switch (tool) {
    case "anchor": {
      ctx.beginPath();
      ctx.arc(snapToGrid(mouse.x), snapToGrid(mouse.y), ANCHOR_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.anchor;
      ctx.fill();
      break;
    }
    case "pulley": {
      ctx.beginPath();
      ctx.arc(snapToGrid(mouse.x), snapToGrid(mouse.y), 30, 0, Math.PI * 2);
      ctx.strokeStyle = COLORS.pulley;
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    }
    case "mass": {
      const sx = snapToGrid(mouse.x);
      const sy = snapToGrid(mouse.y);
      ctx.strokeStyle = COLORS.mass;
      ctx.lineWidth = 2;
      ctx.strokeRect(sx - 30, sy - 25, 60, 50);
      break;
    }
  }

  ctx.globalAlpha = 1;
}
