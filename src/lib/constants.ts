// ──────────────────────────────────────────────
// Pulley System Simulator — Constants
// ──────────────────────────────────────────────

/** Grid snap size in pixels */
export const GRID_SIZE = 20;

/** Pixels per meter for physics ↔ display conversion */
export const PIXELS_PER_METER = 50;

/** Canvas defaults */
export const CANVAS_BG = '#111827';        // gray-900
export const GRID_COLOR = 'rgba(55, 65, 81, 0.35)'; // gray-700 at 35%

/** Element default dimensions */
export const DEFAULT_PULLEY_RADIUS = 30;   // px
export const DEFAULT_MASS_WIDTH = 60;      // px
export const DEFAULT_MASS_HEIGHT = 50;     // px
export const DEFAULT_MASS_KG = 5;          // kg
export const ANCHOR_RADIUS = 8;            // px (visual only)

/** Rope chain parameters (Phase 3) */
export const ROPE_SEGMENT_LENGTH = 6;      // px between chain links
export const ROPE_STIFFNESS = 0.95;
export const ROPE_DAMPING = 0.05;

/** Physics engine settings */
export const GRAVITY = { x: 0, y: 1 };    // Matter.js default scale
export const ENGINE_TIMESTEP = 1000 / 60;  // ~16.67ms

/** Color palette */
export const COLORS = {
  // UI surfaces
  bgPrimary:    '#0F172A',   // slate-900
  bgSecondary:  '#1E293B',   // slate-800
  bgTertiary:   '#334155',   // slate-700
  border:       '#475569',   // slate-600
  textPrimary:  '#F1F5F9',   // slate-100
  textSecondary:'#94A3B8',   // slate-400
  textMuted:    '#64748B',   // slate-500

  // Accent
  accent:       '#3B82F6',   // blue-500
  accentLight:  '#60A5FA',   // blue-400
  accentDark:   '#2563EB',   // blue-600
  violet:       '#8B5CF6',   // violet-500

  // Semantic
  success:      '#10B981',   // emerald-500
  successDark:  '#059669',   // emerald-600
  danger:       '#EF4444',   // red-500
  dangerDark:   '#DC2626',   // red-600
  warning:      '#F59E0B',   // amber-500

  // Element-specific
  anchor:       '#F59E0B',   // amber-500
  anchorGlow:   'rgba(245, 158, 11, 0.3)',
  pulley:       '#6366F1',   // indigo-500
  pulleyGlow:   'rgba(99, 102, 241, 0.3)',
  mass:         '#EC4899',   // pink-500
  massGlow:     'rgba(236, 72, 153, 0.3)',

  // Rope colors (cycle through for multiple ropes)
  ropes: [
    '#A3E635',   // lime-400
    '#22D3EE',   // cyan-400
    '#FB923C',   // orange-400
    '#F472B6',   // pink-400
    '#818CF8',   // indigo-400
  ],
} as const;

/** Rope color by index */
export function getRopeColor(index: number): string {
  return COLORS.ropes[index % COLORS.ropes.length];
}

/** Snap a coordinate to the nearest grid point */
export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

/** Convert pixel distance to meters */
export function pxToMeters(px: number): number {
  return px / PIXELS_PER_METER;
}

/** Convert meters to pixel distance */
export function metersToPx(m: number): number {
  return m * PIXELS_PER_METER;
}
