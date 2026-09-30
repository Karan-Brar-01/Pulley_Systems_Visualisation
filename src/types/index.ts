// ──────────────────────────────────────────────
// Pulley System Simulator — Type Definitions
// ──────────────────────────────────────────────

/** Simple 2D vector */
export interface Vec2 {
  x: number;
  y: number;
}

/** Unique identifier for every element */
export type ElementId = string;

/** Types of elements that can be placed on the canvas */
export type ElementType = 'anchor' | 'pulley' | 'mass';

/** Tools available in the toolbar */
export type ToolType = 'select' | 'anchor' | 'pulley' | 'mass' | 'rope' | 'delete';

/** Simulation mode */
export type SimMode = 'build' | 'run';

// ── Element Interfaces ────────────────────────

/** Base properties shared by all canvas elements */
export interface BaseElement {
  id: ElementId;
  type: ElementType;
  position: Vec2;
  label?: string;
}

/**
 * Fixed anchor point — mounted to ceiling, floor, or wall.
 * Always static (never affected by gravity).
 */
export interface Anchor extends BaseElement {
  type: 'anchor';
  anchorType: 'ceiling' | 'floor' | 'wall';
}

/**
 * Pulley — a circular body with a groove.
 * Can be fixed to an anchor or free-hanging (movable).
 */
export interface Pulley extends BaseElement {
  type: 'pulley';
  radius: number;       // pixels (default: 30)
  isFixed: boolean;      // true = bolted in place, false = movable
}

/**
 * Mass block — rectangular body with adjustable weight.
 */
export interface MassBlock extends BaseElement {
  type: 'mass';
  mass: number;          // kg (default: 5)
  width: number;         // pixels (default: 60)
  height: number;        // pixels (default: 50)
}

/** Union of all placeable elements */
export type SimElement = Anchor | Pulley | MassBlock;

// ── Rope / Connection ─────────────────────────

/** A single waypoint in a rope route */
export interface RopeWaypoint {
  elementId: ElementId;
  elementType: ElementType;
  contactAngle?: number; // radians — where rope contacts a pulley groove
}

/** A complete rope path from start to end */
export interface RopeRoute {
  id: ElementId;
  waypoints: RopeWaypoint[];
  color: string;
  isComplete: boolean;   // false while user is still drawing the route
}

// ── Run-mode Kinematics ───────────────────────

/** Real-time kinematics data for a selected body */
export interface KinematicsData {
  velocity: Vec2;          // m/s
  speed: number;           // |v| in m/s
  acceleration: Vec2;      // m/s²
  accelerationMag: number; // |a| in m/s²
  tensions: TensionInfo[]; // tension per connected rope segment
}

/** Tension in a single rope segment */
export interface TensionInfo {
  ropeId: ElementId;
  ropeColor: string;
  tension: number;         // Newtons
}

// ── Engine Mapping ────────────────────────────

/** Maps a Zustand element ID to its Matter.js body */
export interface BodyMapping {
  elementId: ElementId;
  matterBodyId: number;
}
