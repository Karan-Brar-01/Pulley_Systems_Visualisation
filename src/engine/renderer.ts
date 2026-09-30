// ──────────────────────────────────────────────
// Engine Renderer
// Draws Matter.js bodies onto the HTML5 Canvas
// during Run mode. Replaces the static drawing
// functions from the build-mode canvas.
// ──────────────────────────────────────────────

import Matter from "matter-js";
import { COLORS, ANCHOR_RADIUS } from "@/lib/constants";
import type { EngineState } from "./initializer";
import type { SimStore } from "@/store/useSimStore";

/**
 * Render all physics bodies and rope chains onto the canvas.
 */
export function renderEngine(
  ctx: CanvasRenderingContext2D,
  engineState: EngineState,
  store: SimStore,
  selectedId: string | null
) {
  const { bodyMap, ropeSystems } = engineState;

  // ── Draw rope chains ────────────────────────
  if (ropeSystems) {
    for (const rope of ropeSystems) {
      ctx.strokeStyle = rope.color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (rope.waypoints.length > 1) {
        ctx.beginPath();
        const firstPos = rope.waypoints[0];
        ctx.moveTo(firstPos.body.position.x + firstPos.localOffset.x, firstPos.body.position.y + firstPos.localOffset.y);
        for (let i = 1; i < rope.waypoints.length; i++) {
          const wp = rope.waypoints[i];
          ctx.lineTo(wp.body.position.x + wp.localOffset.x, wp.body.position.y + wp.localOffset.y);
        }
        ctx.stroke();
      }
    }
  }

  // ── Draw anchors ────────────────────────────
  for (const anchor of store.anchors) {
    const body = bodyMap.get(anchor.id);
    if (!body) continue;
    const { x, y } = body.position;
    const isSelected = anchor.id === selectedId;

    if (isSelected) {
      ctx.shadowColor = COLORS.anchor;
      ctx.shadowBlur = 16;
    }

    // Bracket
    ctx.strokeStyle = COLORS.anchor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 12);
    ctx.lineTo(x + 10, y - 12);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y - 12);
    ctx.lineTo(x, y - ANCHOR_RADIUS);
    ctx.stroke();

    // Circle
    ctx.beginPath();
    ctx.arc(x, y, ANCHOR_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = isSelected ? COLORS.anchor : "#D97706";
    ctx.fill();
    ctx.strokeStyle = COLORS.anchor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner dot
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.bgPrimary;
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    // Label
    if (anchor.label) {
      ctx.fillStyle = COLORS.textSecondary;
      ctx.font = "10px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(anchor.label, x, y + ANCHOR_RADIUS + 14);
    }

    // Selection ring
    if (isSelected) {
      ctx.strokeStyle = COLORS.anchor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(x, y, ANCHOR_RADIUS + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // ── Draw pulleys ────────────────────────────
  for (const pulley of store.pulleys) {
    const body = bodyMap.get(pulley.id);
    if (!body) continue;
    const { x, y } = body.position;
    const r = pulley.radius;
    const isSelected = pulley.id === selectedId;
    const angle = body.angle;

    if (isSelected) {
      ctx.shadowColor = COLORS.pulley;
      ctx.shadowBlur = 16;
    }

    // Connection to ceiling if fixed
    if (pulley.isFixed) {
      ctx.strokeStyle = COLORS.bgTertiary;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.lineTo(x, 14);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Outer ring
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(99, 102, 241, 0.1)";
    ctx.fill();
    ctx.strokeStyle = COLORS.pulley;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Groove
    ctx.beginPath();
    ctx.arc(x, y, r - 4, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(99, 102, 241, 0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Axle
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.pulley;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.bgSecondary;
    ctx.fill();

    // Rotating spokes (show rotation!)
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.strokeStyle = "rgba(99, 102, 241, 0.25)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(5 * Math.cos(a), 5 * Math.sin(a));
      ctx.lineTo((r - 5) * Math.cos(a), (r - 5) * Math.sin(a));
      ctx.stroke();
    }
    ctx.restore();

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    // Label
    if (pulley.label) {
      ctx.fillStyle = COLORS.textSecondary;
      ctx.font = "10px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pulley.label, x, y + r + 16);
    }

    if (isSelected) {
      ctx.strokeStyle = COLORS.pulley;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(x, y, r + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // ── Draw masses ─────────────────────────────
  for (const mass of store.masses) {
    const body = bodyMap.get(mass.id);
    if (!body) continue;
    const { x, y } = body.position;
    const hw = mass.width / 2;
    const hh = mass.height / 2;
    const isSelected = mass.id === selectedId;

    if (isSelected) {
      ctx.shadowColor = COLORS.mass;
      ctx.shadowBlur = 16;
    }

    // Block
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

    // Hook
    ctx.beginPath();
    ctx.arc(x, y - hh, 3, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.mass;
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    // Mass label
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = "bold 13px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${mass.mass}kg`, x, y);

    if (mass.label) {
      ctx.fillStyle = COLORS.textSecondary;
      ctx.font = "10px Inter, sans-serif";
      ctx.fillText(mass.label, x, y + hh + 14);
    }

    if (isSelected) {
      ctx.strokeStyle = COLORS.mass;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(x - hw - 6, y - hh - 6, mass.width + 12, mass.height + 12);
      ctx.setLineDash([]);
    }

    ctx.textBaseline = "alphabetic";
  }
}
