import Matter from "matter-js";
import type { ElementId } from "@/types";
import type { EngineState } from "./initializer";
import { PIXELS_PER_METER } from "@/lib/constants";

export interface RopeSystem {
  id: ElementId;
  targetLength: number;
  color: string;
  waypoints: {
    body: Matter.Body;
    localOffset: { x: number; y: number };
  }[];
}

export function createRopeController(engineState: EngineState, ropeSystems: RopeSystem[]) {
  const onBeforeUpdate = () => {
    const engine = engineState.engine;
    const gravityAcc = {
      x: engine.gravity.x * engine.gravity.scale,
      y: engine.gravity.y * engine.gravity.scale,
    };

    // We will solve each rope system independently.
    // For interacting ropes, a global solver would be needed,
    // but for simple Atwood machines, isolated solving works well.
    for (const rope of ropeSystems) {
      const n = rope.waypoints.length;
      if (n < 2) continue;

      const positions = rope.waypoints.map(wp => ({
        x: wp.body.position.x + wp.localOffset.x,
        y: wp.body.position.y + wp.localOffset.y,
      }));

      // Calculate segments and unit vectors
      let currentLength = 0;
      const u = []; // Unit vectors for each segment
      for (let i = 0; i < n - 1; i++) {
        const dx = positions[i + 1].x - positions[i].x;
        const dy = positions[i + 1].y - positions[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        currentLength += dist;
        u.push({
          x: dist > 0.0001 ? dx / dist : 0,
          y: dist > 0.0001 ? dy / dist : 0,
        });
      }

      const C = rope.targetLength - currentLength;

      // Calculate Jacobians (J_k)
      const J = [];
      for (let k = 0; k < n; k++) {
        let jx = 0;
        let jy = 0;
        if (k < n - 1) {
          jx += u[k].x;
          jy += u[k].y;
        }
        if (k > 0) {
          jx -= u[k - 1].x;
          jy -= u[k - 1].y;
        }
        J.push({ x: jx, y: jy });
      }

      // Calculate Effective Mass
      let m_eff = 0;
      for (let k = 0; k < n; k++) {
        const body = rope.waypoints[k].body;
        const invMass = body.isStatic ? 0 : body.inverseMass;
        const j2 = J[k].x * J[k].x + J[k].y * J[k].y;
        m_eff += j2 * invMass;
      }

      if (m_eff < 0.000001) continue; // All bodies are static

      // Calculate C_dot (rate of change of constraint)
      let C_dot = 0;
      for (let k = 0; k < n; k++) {
        const body = rope.waypoints[k].body;
        // Since blocks don't rotate, velocity of attach point = body velocity
        C_dot += J[k].x * body.velocity.x + J[k].y * body.velocity.y;
      }

      // Calculate W (net external acceleration along the rope)
      let W = 0;
      for (let k = 0; k < n; k++) {
        const body = rope.waypoints[k].body;
        if (body.isStatic) continue;
        
        // Acceleration = gravity + (force / mass)
        const accX = gravityAcc.x + body.force.x * body.inverseMass;
        const accY = gravityAcc.y + body.force.y * body.inverseMass;
        W += J[k].x * accX + J[k].y * accY;
      }

      // PD Controller gains for drift correction
      // Matter.js integrates forces with dt^2 (approx 277).
      // So a force of 1 unit produces 277 px/tick^2 acceleration.
      // We must use very small gains to avoid explicit Euler explosion!
      const kp = 0.0001; 
      const kd = 0.001;

      // Calculate Tension lambda
      let lambda = (-W - kp * C - kd * C_dot) / m_eff;

      // Rope can only pull (tension must be positive)
      if (lambda < 0 || isNaN(lambda)) {
        lambda = 0;
      }

      // Clamp extreme forces to prevent physics explosion
      if (lambda > 100) {
        lambda = 100;
      }

      // Apply forces
      for (let k = 0; k < n; k++) {
        const body = rope.waypoints[k].body;
        if (body.isStatic) continue;

        const forceX = lambda * J[k].x;
        const forceY = lambda * J[k].y;

        Matter.Body.applyForce(body, body.position, {
          x: forceX,
          y: forceY
        });
      }
      
      // Store tension for kinematics dashboard (convert to Newtons)
      // lambda is a force in Matter.js units. To get Newtons, we scale it.
      // Matter.js force = Mass * (px/tick^2).
      // We convert it to m/s^2.
      const dt = 1 / 60;
      const forceNewtons = lambda * (1 / PIXELS_PER_METER) * (1 / (dt * dt));
      
      // We store it on the first body to make it accessible to kinematicsCalc
      const firstBody = rope.waypoints[0].body;
      if (!firstBody.plugin) firstBody.plugin = {};
      if (!firstBody.plugin.ropeTensions) firstBody.plugin.ropeTensions = {};
      firstBody.plugin.ropeTensions[rope.id] = forceNewtons;
    }
  };

  Matter.Events.on(engineState.engine, 'beforeUpdate', onBeforeUpdate);

  return () => {
    Matter.Events.off(engineState.engine, 'beforeUpdate', onBeforeUpdate);
  };
}
