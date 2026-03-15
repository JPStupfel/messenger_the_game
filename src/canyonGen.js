// ═══════════════════════════════════════════════════════════════════════════
// CANYON MAZE GENERATOR
// Produces a deterministic labyrinth of ice canyons radiating from the village.
// The same seed always yields the same layout so players can memorise routes.
// ═══════════════════════════════════════════════════════════════════════════

import { mulberry32 } from './worldGen'

// ── Canyon dimensions ────────────────────────────────────────────────────────
export const CORRIDOR_WIDTH  = 12    // walkable floor width (units)
export const WALL_HEIGHT     = 18    // canyon cliff height
export const WALL_THICKNESS  = 6     // wall panel thickness
export const HALF_W          = CORRIDOR_WIDTH / 2
export const HALF_WT         = WALL_THICKNESS / 2
export const VILLAGE_OPEN_RADIUS = 36  // village clear zone — no walls inside

// ── Cardinal direction vectors ───────────────────────────────────────────────
// 0 = North (−z), 1 = East (+x), 2 = South (+z), 3 = West (−x)
const DIR_VEC = [
  { dx:  0, dz: -1 },
  { dx:  1, dz:  0 },
  { dx:  0, dz:  1 },
  { dx: -1, dz:  0 },
]

// ── Arm starting positions (one per cardinal direction) ──────────────────────
export const ARM_STARTS = [
  { sx:  0,                     sz: -VILLAGE_OPEN_RADIUS, dir: 0 },  // North
  { sx:  VILLAGE_OPEN_RADIUS,   sz:  0,                   dir: 1 },  // East
  { sx:  0,                     sz:  VILLAGE_OPEN_RADIUS,  dir: 2 },  // South
  { sx: -VILLAGE_OPEN_RADIUS,   sz:  0,                   dir: 3 },  // West
]

export const SEGS_PER_ARM  = 7    // segments per arm
const SEG_LEN_MIN   = 34
const SEG_LEN_MAX   = 55
const TURN_PROB     = 0.50  // chance of turning (50% → turn, split 50/50 L vs R)

// ── Generate the full canyon network ─────────────────────────────────────────
export function generateCanyonNetwork(seed) {
  const rng = mulberry32(seed)

  const segments  = []  // { x1, z1, x2, z2, dir, len, armIdx, segIdx }
  const junctions = []  // { x, z, armIdx, segIdx }  — at every segment end

  ARM_STARTS.forEach((arm, armIdx) => {
    let x   = arm.sx
    let z   = arm.sz
    let dir = arm.dir

    for (let segIdx = 0; segIdx < SEGS_PER_ARM; segIdx++) {
      const len        = SEG_LEN_MIN + Math.floor(rng() * (SEG_LEN_MAX - SEG_LEN_MIN))
      const { dx, dz } = DIR_VEC[dir]
      const x2         = x + dx * len
      const z2         = z + dz * len

      segments.push({ x1: x, z1: z, x2, z2, dir, len, armIdx, segIdx })
      junctions.push({ x: x2, z: z2, armIdx, segIdx })

      x = x2
      z = z2

      // Pick next direction — no U-turns
      const t = rng()
      if (t < TURN_PROB / 2) {
        dir = (dir + 1) % 4   // turn right 90°
      } else if (t < TURN_PROB) {
        dir = (dir + 3) % 4   // turn left 90°
      }
      // else: continue straight
    }
  })

  // ── NPC waypoints (5 total, spread across the 4 arms) ────────────────────
  // Depth (segment index, 0-based) at which each NPC is placed.
  // Two NPCs occupy the North arm (indices 0 and 4) — one mid, one deep.
  const npcConfigs = [
    { armIdx: 0, segIdx: 3 },   // NPC 0 — North arm, mid
    { armIdx: 1, segIdx: 3 },   // NPC 1 — East arm
    { armIdx: 2, segIdx: 4 },   // NPC 2 — South arm
    { armIdx: 3, segIdx: 5 },   // NPC 3 — West arm, far
    { armIdx: 0, segIdx: 6 },   // NPC 4 — North arm, deep
  ]

  const npcWaypoints = npcConfigs.map(({ armIdx, segIdx }) => {
    const flatIdx = armIdx * SEGS_PER_ARM + Math.min(segIdx, SEGS_PER_ARM - 1)
    const seg     = segments[flatIdx]
    return [(seg.x1 + seg.x2) / 2, 0, (seg.z1 + seg.z2) / 2]
  })

  return { segments, junctions, npcWaypoints }
}

// ── Singleton — deterministic per session ────────────────────────────────────
// This seed was chosen to produce a balanced maze with good NPC placement.
// Change it to get a different (but always consistent) canyon layout.
export const CANYON_SEED    = 54321
export const CANYON_NETWORK = generateCanyonNetwork(CANYON_SEED)

// ── Collision tolerance — exported so visual geometry can match ───────────────
// The player may reach up to HALF_W + CORRIDOR_TOL from the corridor centreline.
// Mountain meshes must have their inner edge ≥ this value so the player never
// visually walks inside the mountain.
export const CORRIDOR_TOL = 1.5

// ── Collision helper — is world point (x, z) inside a valid corridor? ────────
export function isInCorridorOrVillage(x, z) {
  // Village open area (always valid)
  if (x * x + z * z < VILLAGE_OPEN_RADIUS * VILLAGE_OPEN_RADIUS) return true

  const tol = CORRIDOR_TOL   // small tolerance to avoid wall-clipping
  for (const seg of CANYON_NETWORK.segments) {
    if (_inSegment(x, z, seg, tol)) return true
  }
  for (const junc of CANYON_NETWORK.junctions) {
    // Junction pad matches the corridor half-width + tolerance so the player
    // cannot legally reach beyond the mountain inner edge (HALF_W + CORRIDOR_TOL).
    const hw = HALF_W + tol
    if (Math.abs(x - junc.x) <= hw && Math.abs(z - junc.z) <= hw) return true
  }
  return false
}

function _inSegment(x, z, seg, tol = 0) {
  const isNS = seg.dir === 0 || seg.dir === 2
  if (isNS) {
    // North-South: x is constant, z varies
    const zMin = Math.min(seg.z1, seg.z2) - tol
    const zMax = Math.max(seg.z1, seg.z2) + tol
    return Math.abs(x - seg.x1) < HALF_W + tol && z >= zMin && z <= zMax
  } else {
    // East-West: z is constant, x varies
    const xMin = Math.min(seg.x1, seg.x2) - tol
    const xMax = Math.max(seg.x1, seg.x2) + tol
    return Math.abs(z - seg.z1) < HALF_W + tol && x >= xMin && x <= xMax
  }
}
