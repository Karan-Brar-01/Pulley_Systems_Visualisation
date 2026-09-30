// ──────────────────────────────────────────────
// Kinematics Calculator
// Extracts real-time velocity, acceleration, and
// tension from Matter.js bodies and constraints.
// ──────────────────────────────────────────────

import Matter from "matter-js";
import type { ElementId, KinematicsData, TensionInfo } from "@/types";
import { PIXELS_PER_METER } from "@/lib/constants";
import type { EngineState } from "./initializer";

/** Previous frame velocities for acceleration computation */
const prevVelocities = new Map<number, { vx: number; vy: number }>();

/**
 * Compute kinematics data for a given element body.
 * The `ropes` array is passed in so we don't need to import the store here.
 */
export function computeKinematics(
  elementId: ElementId,
  engineState: EngineState,
  dt: number = 1 / 60
): KinematicsData | null {
  const body = engineState.bodyMap.get(elementId);
  if (!body) return null;

  // ── Velocity ────────────────────────────────
  // Matter.js body.velocity = displacement in px per timestep
  // Convert: px/tick → px/s → m/s
  const fps = 1 / dt; // frames per second
  const vxMs = (body.velocity.x * fps) / PIXELS_PER_METER;
  const vyMs = (body.velocity.y * fps) / PIXELS_PER_METER;
  const speed = Math.sqrt(vxMs * vxMs + vyMs * vyMs);

  // ── Acceleration (finite difference) ────────
  const prev = prevVelocities.get(body.id) || { vx: 0, vy: 0 };
  const axMs = (vxMs - prev.vx) * fps; // Δv/Δt in m/s²
  const ayMs = (vyMs - prev.vy) * fps;
  const aMag = Math.sqrt(axMs * axMs + ayMs * ayMs);

  prevVelocities.set(body.id, { vx: vxMs, vy: vyMs });

  // ── Tension ─────────────────────────────────
  const tensions = computeTensions(elementId, body, engineState);

  return {
    velocity: { x: vxMs, y: vyMs },
    speed,
    acceleration: { x: axMs, y: ayMs },
    accelerationMag: aMag,
    tensions,
  };
}

/**
 * Compute tension in rope segments connected to this body.
 * Tension is extracted from the rope controller's calculated values.
 */
function computeTensions(
  elementId: ElementId,
  body: Matter.Body,
  engineState: EngineState
): TensionInfo[] {
  const tensions: TensionInfo[] = [];
  const { ropeSystems, ropeColors } = engineState;

  if (!ropeSystems) return tensions; // Fallback

  for (const rope of ropeSystems) {
    // Check if this body is part of the rope
    const isAttached = rope.waypoints.some(wp => wp.body === body);
    if (!isAttached) continue;

    const firstBody = rope.waypoints[0].body;
    let tension = 0;
    
    if (firstBody.plugin && firstBody.plugin.ropeTensions) {
      tension = firstBody.plugin.ropeTensions[rope.id] || 0;
    }

    const color = ropeColors?.get(rope.id) || rope.color || "#A3E635";

    tensions.push({
      ropeId: rope.id,
      ropeColor: color,
      tension: Math.abs(tension),
    });
  }

  return tensions;
}

/**
 * Clear stored velocity history (call on reset).
 */
export function clearKinematicsHistory() {
  prevVelocities.clear();
}
