// ──────────────────────────────────────────────
// Engine Initializer
// Reads the Zustand build-mode state and creates
// the Matter.js world with bodies and constraints.
// ──────────────────────────────────────────────

import Matter from "matter-js";
import type { SimStore } from "@/store/useSimStore";
import type { ElementId } from "@/types";
import { PIXELS_PER_METER } from "@/lib/constants";
import { buildRopes } from "./ropeBuilder";
import { createRopeController, type RopeSystem } from "./ropeController";

export interface EngineState {
  engine: Matter.Engine;
  runner: Matter.Runner;
  bodyMap: Map<ElementId, Matter.Body>;
  ropeSystems: RopeSystem[]; // Updated from ropeChains
  ropeColors: Map<ElementId, string>;         // ropeId → color string
  cleanup: () => void;
}

/**
 * Initialize the Matter.js engine from the current Zustand state.
 * Creates all bodies, ropes, and starts the runner.
 */
export function initializeEngine(store: SimStore): EngineState {
  // Create engine with gravity
  const engine = Matter.Engine.create({
    gravity: { x: 0, y: 1, scale: 0.001 },
  });

  const world = engine.world;
  const bodyMap = new Map<ElementId, Matter.Body>();

  // ── Create Anchor Bodies (always static) ────
  for (const anchor of store.anchors) {
    const body = Matter.Bodies.circle(anchor.position.x, anchor.position.y, 8, {
      isStatic: true,
      label: `anchor_${anchor.id}`,
      render: { visible: false },
      collisionFilter: { category: 0x0002, mask: 0x0001 },
    });
    Matter.Composite.add(world, body);
    bodyMap.set(anchor.id, body);
  }

  // ── Create Pulley Bodies ────────────────────
  for (const pulley of store.pulleys) {
    const body = Matter.Bodies.circle(pulley.position.x, pulley.position.y, pulley.radius, {
      isStatic: pulley.isFixed,
      label: `pulley_${pulley.id}`,
      friction: 0.05,
      frictionAir: 0.01,
      restitution: 0.1,
      density: 0.002,
      collisionFilter: { category: 0x0001, mask: 0x0001 | 0x0004 },
    });

    // If fixed, add a revolute constraint to keep it spinning in place
    if (pulley.isFixed) {
      const pin = Matter.Constraint.create({
        pointA: { x: pulley.position.x, y: pulley.position.y },
        bodyB: body,
        pointB: { x: 0, y: 0 },
        length: 0,
        stiffness: 1,
      });
      Matter.Composite.add(world, pin);
    }

    Matter.Composite.add(world, body);
    bodyMap.set(pulley.id, body);
  }

  // ── Create Mass Bodies ──────────────────────
  for (const mass of store.masses) {
    const body = Matter.Bodies.rectangle(
      mass.position.x,
      mass.position.y,
      mass.width,
      mass.height,
      {
        label: `mass_${mass.id}`,
        mass: mass.mass,
        friction: 0.3,
        frictionAir: 0.02,
        restitution: 0.1,
        collisionFilter: { category: 0x0001, mask: 0x0001 | 0x0004 },
      }
    );
    // Override inertia so blocks don't rotate wildly
    Matter.Body.setInertia(body, Infinity);
    Matter.Composite.add(world, body);
    bodyMap.set(mass.id, body);
  }

  // ── Build Ropes ─────────────────────────────
  const ropeSystems = buildRopes(store, bodyMap);

  // ── Build rope color lookup ─────────────────
  const ropeColors = new Map<ElementId, string>();
  for (const rope of store.ropes) {
    ropeColors.set(rope.id, rope.color);
  }

  // ── Ground plane ────────────────────────────
  const ground = Matter.Bodies.rectangle(
    2000, 1200, 6000, 60,
    { isStatic: true, label: "ground", friction: 0.8 }
  );
  Matter.Composite.add(world, ground);

  // ── Engine State object ─────────────────────
  // Create state first, so ropeController can use it
  const engineState = {
    engine,
    runner: Matter.Runner.create({ delta: 1000 / 60 }),
    bodyMap,
    ropeSystems,
    ropeColors,
    cleanup: () => {}, // placeholder
  };

  // ── Initialize Rope Controller ──────────────
  const cleanupRopes = createRopeController(engineState, ropeSystems);

  // ── Create Runner ───────────────────────────
  Matter.Runner.run(engineState.runner, engine);

  // ── Cleanup function ────────────────────────
  engineState.cleanup = () => {
    cleanupRopes();
    Matter.Runner.stop(engineState.runner);
    Matter.Engine.clear(engine);
    Matter.Composite.clear(world, false);
  };

  return engineState;
}

/**
 * Pause the engine runner.
 */
export function pauseEngine(runner: Matter.Runner) {
  Matter.Runner.stop(runner);
}

/**
 * Resume the engine runner.
 */
export function resumeEngine(runner: Matter.Runner, engine: Matter.Engine) {
  Matter.Runner.run(runner, engine);
}
