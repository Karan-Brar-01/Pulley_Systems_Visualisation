// ──────────────────────────────────────────────
// Rope Builder
// Converts Zustand ropes into RopeSystem definitions
// for the custom Atwood machine physics controller.
// ──────────────────────────────────────────────

import Matter from "matter-js";
import type { SimStore } from "@/store/useSimStore";
import type { ElementId } from "@/types";
import type { RopeSystem } from "./ropeController";

/**
 * Build all rope systems from the store's rope routes.
 */
export function buildRopes(
  store: SimStore,
  bodyMap: Map<ElementId, Matter.Body>
): RopeSystem[] {
  const ropeSystems: RopeSystem[] = [];

  for (const rope of store.ropes) {
    if (!rope.isComplete || rope.waypoints.length < 2) continue;

    const waypoints: { body: Matter.Body; localOffset: { x: number; y: number } }[] = [];
    let targetLength = 0;

    for (let i = 0; i < rope.waypoints.length; i++) {
      const wp = rope.waypoints[i];
      const body = bodyMap.get(wp.elementId);
      if (!body) continue;

      const localOffset = getLocalAttachPoint(wp.elementId, store);
      waypoints.push({ body, localOffset });

      if (i > 0) {
        const prevBody = waypoints[i - 1].body;
        const prevOffset = waypoints[i - 1].localOffset;
        
        const posA = { x: prevBody.position.x + prevOffset.x, y: prevBody.position.y + prevOffset.y };
        const posB = { x: body.position.x + localOffset.x, y: body.position.y + localOffset.y };
        
        const dx = posB.x - posA.x;
        const dy = posB.y - posA.y;
        targetLength += Math.sqrt(dx * dx + dy * dy);
      }
    }

    if (waypoints.length >= 2) {
      ropeSystems.push({
        id: rope.id,
        targetLength,
        color: rope.color,
        waypoints,
      });
    }
  }

  return ropeSystems;
}

/**
 * Get the local-space attachment point on a body.
 */
function getLocalAttachPoint(
  elementId: ElementId,
  store: SimStore
): { x: number; y: number } {
  const massEl = store.masses.find((m) => m.id === elementId);
  if (massEl) {
    return { x: 0, y: -massEl.height / 2 };
  }
  return { x: 0, y: 0 };
}
