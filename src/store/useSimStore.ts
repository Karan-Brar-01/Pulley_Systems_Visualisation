// ──────────────────────────────────────────────
// Pulley System Simulator — Zustand Store
// Single source of truth for all simulation state.
// ──────────────────────────────────────────────

import { create } from 'zustand';
import type {
  SimMode, ToolType, ElementId, Vec2,
  Anchor, Pulley, MassBlock, SimElement,
  RopeRoute, RopeWaypoint, KinematicsData,
} from '@/types';
import {
  DEFAULT_PULLEY_RADIUS, DEFAULT_MASS_WIDTH,
  DEFAULT_MASS_HEIGHT, DEFAULT_MASS_KG, getRopeColor,
} from '@/lib/constants';

// ── Helpers ───────────────────────────────────

let _nextId = 1;
function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${_nextId++}`;
}

// ── Store Interface ───────────────────────────

export interface SimStore {
  // ─── Mode ───────────────────────
  mode: SimMode;
  activeTool: ToolType;

  // ─── Elements ───────────────────
  anchors: Anchor[];
  pulleys: Pulley[];
  masses: MassBlock[];
  ropes: RopeRoute[];

  // ─── Selection ──────────────────
  selectedId: ElementId | null;

  // ─── Rope drawing state ─────────
  ropeDrawing: RopeWaypoint[] | null;   // in-progress waypoints while drawing a rope

  // ─── Run-mode data ──────────────
  kinematics: Record<ElementId, KinematicsData>;
  isPaused: boolean;

  // ─── Drag state ─────────────────
  dragId: ElementId | null;
  dragOffset: Vec2 | null;

  // ─── Actions: Mode ──────────────
  setMode: (mode: SimMode) => void;
  setActiveTool: (tool: ToolType) => void;

  // ─── Actions: Elements ──────────
  addAnchor: (pos: Vec2) => Anchor;
  addPulley: (pos: Vec2) => Pulley;
  addMass: (pos: Vec2) => MassBlock;
  updateElement: (id: ElementId, updates: Partial<Anchor> | Partial<Pulley> | Partial<MassBlock>) => void;
  removeElement: (id: ElementId) => void;

  // ─── Actions: Selection ─────────
  selectElement: (id: ElementId | null) => void;

  // ─── Actions: Drag ──────────────
  startDrag: (id: ElementId, offset: Vec2) => void;
  updateDrag: (pos: Vec2) => void;
  endDrag: () => void;

  // ─── Actions: Rope Drawing ─────
  startRopeDrawing: () => void;
  addRopeWaypoint: (wp: RopeWaypoint) => void;
  finishRopeDrawing: () => void;
  cancelRopeDrawing: () => void;
  removeRope: (id: ElementId) => void;

  // ─── Actions: Run mode ─────────
  setKinematics: (id: ElementId, data: KinematicsData) => void;
  clearKinematics: () => void;
  togglePause: () => void;
  resetSimulation: () => void;

  // ─── Selectors ──────────────────
  getAllElements: () => SimElement[];
  getElementById: (id: ElementId) => SimElement | undefined;
}

// ── Store Implementation ──────────────────────

export const useSimStore = create<SimStore>((set, get) => ({
  // ─── Initial State ──────────────
  mode: 'build',
  activeTool: 'select',
  anchors: [],
  pulleys: [],
  masses: [],
  ropes: [],
  selectedId: null,
  ropeDrawing: null,
  kinematics: {},
  isPaused: false,
  dragId: null,
  dragOffset: null,

  // ─── Mode ───────────────────────
  setMode: (mode) => set({ mode, selectedId: null, ropeDrawing: null }),
  setActiveTool: (tool) => {
    const state = get();
    // Cancel any in-progress rope if switching away from rope tool
    if (state.activeTool === 'rope' && tool !== 'rope' && state.ropeDrawing) {
      set({ activeTool: tool, ropeDrawing: null, selectedId: null });
    } else if (tool === 'select') {
      // Keep selection when switching to select tool
      set({ activeTool: tool });
    } else {
      // Clear selection when switching to placement/action tools
      set({ activeTool: tool, selectedId: null });
    }
  },

  // ─── Add Elements ───────────────
  addAnchor: (pos) => {
    const anchor: Anchor = {
      id: genId('anc'),
      type: 'anchor',
      position: { ...pos },
      anchorType: 'ceiling',
      label: `A${get().anchors.length + 1}`,
    };
    set((s) => ({ anchors: [...s.anchors, anchor] }));
    return anchor;
  },

  addPulley: (pos) => {
    const pulley: Pulley = {
      id: genId('pul'),
      type: 'pulley',
      position: { ...pos },
      radius: DEFAULT_PULLEY_RADIUS,
      isFixed: false,
      label: `P${get().pulleys.length + 1}`,
    };
    set((s) => ({ pulleys: [...s.pulleys, pulley] }));
    return pulley;
  },

  addMass: (pos) => {
    const mass: MassBlock = {
      id: genId('mas'),
      type: 'mass',
      position: { ...pos },
      mass: DEFAULT_MASS_KG,
      width: DEFAULT_MASS_WIDTH,
      height: DEFAULT_MASS_HEIGHT,
      label: `M${get().masses.length + 1}`,
    };
    set((s) => ({ masses: [...s.masses, mass] }));
    return mass;
  },

  // ─── Update / Remove ───────────
  updateElement: (id, updates) => {
    set((s) => ({
      anchors: s.anchors.map((a) => (a.id === id ? { ...a, ...updates } as Anchor : a)),
      pulleys: s.pulleys.map((p) => (p.id === id ? { ...p, ...updates } as Pulley : p)),
      masses:  s.masses.map((m)  => (m.id === id ? { ...m, ...updates } as MassBlock : m)),
    }));
  },

  removeElement: (id) => {
    set((s) => ({
      anchors: s.anchors.filter((a) => a.id !== id),
      pulleys: s.pulleys.filter((p) => p.id !== id),
      masses:  s.masses.filter((m)  => m.id !== id),
      // Also remove any ropes that reference this element
      ropes: s.ropes.filter((r) => !r.waypoints.some((wp) => wp.elementId === id)),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
  },

  // ─── Selection ──────────────────
  selectElement: (id) => set({ selectedId: id }),

  // ─── Drag ───────────────────────
  startDrag: (id, offset) => set({ dragId: id, dragOffset: offset }),
  updateDrag: (pos) => {
    const { dragId, dragOffset } = get();
    if (!dragId || !dragOffset) return;
    const newPos = { x: pos.x - dragOffset.x, y: pos.y - dragOffset.y };
    get().updateElement(dragId, { position: newPos });
  },
  endDrag: () => set({ dragId: null, dragOffset: null }),

  // ─── Rope Drawing ──────────────
  startRopeDrawing: () => set({ ropeDrawing: [] }),

  addRopeWaypoint: (wp) => {
    const { ropeDrawing } = get();
    if (!ropeDrawing) return;
    // Prevent adding the same element twice in a row
    if (ropeDrawing.length > 0 && ropeDrawing[ropeDrawing.length - 1].elementId === wp.elementId) return;
    set({ ropeDrawing: [...ropeDrawing, wp] });
  },

  finishRopeDrawing: () => {
    const { ropeDrawing, ropes } = get();
    if (!ropeDrawing || ropeDrawing.length < 2) {
      set({ ropeDrawing: null });
      return;
    }
    const newRope: RopeRoute = {
      id: genId('rope'),
      waypoints: [...ropeDrawing],
      color: getRopeColor(ropes.length),
      isComplete: true,
    };
    set((s) => ({
      ropes: [...s.ropes, newRope],
      ropeDrawing: null,
    }));
  },

  cancelRopeDrawing: () => set({ ropeDrawing: null }),

  removeRope: (id) => set((s) => ({
    ropes: s.ropes.filter((r) => r.id !== id),
  })),

  // ─── Run Mode ───────────────────
  setKinematics: (id, data) => set((s) => ({
    kinematics: { ...s.kinematics, [id]: data },
  })),
  clearKinematics: () => set({ kinematics: {} }),
  togglePause: () => set((s) => ({ isPaused: !s.isPaused })),

  resetSimulation: () => set({
    mode: 'build',
    selectedId: null,
    ropeDrawing: null,
    kinematics: {},
    isPaused: false,
    dragId: null,
    dragOffset: null,
  }),

  // ─── Selectors ──────────────────
  getAllElements: () => {
    const s = get();
    return [...s.anchors, ...s.pulleys, ...s.masses];
  },

  getElementById: (id) => {
    const s = get();
    return (
      s.anchors.find((a) => a.id === id) ||
      s.pulleys.find((p) => p.id === id) ||
      s.masses.find((m)  => m.id === id)
    );
  },
}));
