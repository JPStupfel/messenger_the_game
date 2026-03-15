// ═══════════════════════════════════════════════════════════════════════════
// CANYON MAZE GENERATOR
// Produces a deterministic labyrinth of ice canyons radiating from the village.
// The same seed always yields the same layout so players can memorise routes.
//
// Structure:
//   • 4 main arms (N, E, S, W) × 10 corridor segments each
//   • 8 branch corridors (2 per main arm) — some are dead ends, some lead to
//     special zones: forest clearing, frozen lake, abandoned church, valley
//   • 5 NPC waypoints spread across the main arms
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

export const SEGS_PER_ARM  = 10   // corridor segments per main arm (was 7)
const SEG_LEN_MIN   = 30
const SEG_LEN_MAX   = 50
const TURN_PROB     = 0.50  // chance of turning (50% → turn, split 50/50 L vs R)

// Branch segment lengths — slightly shorter minimum so dead-end branches don't extend
// too far from the main arm (keeps the overall maze footprint manageable).
const BRANCH_LEN_MIN = 28
const BRANCH_LEN_MAX = 50

// ── Branch specifications ─────────────────────────────────────────────────────
// Each branch stems from the END junction of a specific main arm segment.
//   fromArm    : 0=North 1=East 2=South 3=West
//   fromSeg    : segment index (0-based) whose end junction is the branch origin
//   turnRight  : true = 90° clockwise from the main arm direction at that point
//   segCount   : number of branch corridor segments
//   special    : null (dead end) | 'forest' | 'lake' | 'church' | 'valley'
const BRANCH_SPECS = [
  { fromArm: 0, fromSeg: 3, turnRight: true,  segCount: 3, special: 'forest'  },
  { fromArm: 0, fromSeg: 7, turnRight: false, segCount: 3, special: null       },
  { fromArm: 1, fromSeg: 4, turnRight: false, segCount: 3, special: 'lake'     },
  { fromArm: 1, fromSeg: 8, turnRight: true,  segCount: 2, special: null       },
  { fromArm: 2, fromSeg: 3, turnRight: false, segCount: 2, special: null       },
  { fromArm: 2, fromSeg: 7, turnRight: true,  segCount: 3, special: 'church'   },
  { fromArm: 3, fromSeg: 3, turnRight: false, segCount: 3, special: 'valley'   },
  { fromArm: 3, fromSeg: 7, turnRight: true,  segCount: 2, special: null       },
]

// Open-area radius for each special zone type (the circular walkable clearing)
const SPECIAL_RADII = { forest: 20, lake: 16, church: 14, valley: 24 }

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

// Each branch uses its own independent seeded RNG so branches don't affect
// each other's random sequences and the layout is fully deterministic.
const BRANCH_SEED_OFFSET     = 7777   // keeps branch seeds well away from main arm seed
const BRANCH_SEED_MULTIPLIER = 1337   // prime-ish multiplier so each branch has a unique sequence
  // ── Branch corridors ──────────────────────────────────────────────────────
  const branchSegments  = []  // { x1,z1,x2,z2, dir,len, branchIdx,segIdx }
  const branchJunctions = []  // { x, z, branchIdx, segIdx }
  const specialZones    = []  // { type, x, z, radius }

  BRANCH_SPECS.forEach((spec, branchIdx) => {
    const bRng       = mulberry32(seed + BRANCH_SEED_OFFSET + branchIdx * BRANCH_SEED_MULTIPLIER)
    const juncFlat   = spec.fromArm * SEGS_PER_ARM + spec.fromSeg
    const fromJunc   = junctions[juncFlat]
    const mainSeg    = segments[juncFlat]

    // Turn 90° left or right from the main arm's direction at this junction
    const branchDir0 = spec.turnRight
      ? (mainSeg.dir + 1) % 4
      : (mainSeg.dir + 3) % 4

    let bx   = fromJunc.x
    let bz   = fromJunc.z
    let bdir = branchDir0

    for (let bsIdx = 0; bsIdx < spec.segCount; bsIdx++) {
      const blen      = BRANCH_LEN_MIN + Math.floor(bRng() * (BRANCH_LEN_MAX - BRANCH_LEN_MIN))
      const { dx, dz } = DIR_VEC[bdir]
      const bx2        = bx + dx * blen
      const bz2        = bz + dz * blen

      branchSegments.push({ x1: bx, z1: bz, x2: bx2, z2: bz2, dir: bdir, len: blen, branchIdx, segIdx: bsIdx })
      branchJunctions.push({ x: bx2, z: bz2, branchIdx, segIdx: bsIdx })

      bx = bx2
      bz = bz2

      // Consume two rng values for turn logic on every iteration so the count
      // is constant regardless of whether a turn actually occurs.
      const turnChance = bRng()
      const turnDir    = bRng()
      if (bsIdx < spec.segCount - 1 && turnChance < 0.35) {
        bdir = turnDir < 0.5 ? (bdir + 1) % 4 : (bdir + 3) % 4
      }
    }

    // Special zone clearing at the branch end point
    if (spec.special) {
      specialZones.push({ type: spec.special, x: bx, z: bz, radius: SPECIAL_RADII[spec.special] })
    }
  })

  // ── NPC waypoints (5 total, spread across the 4 main arms) ───────────────
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

  return { segments, junctions, branchSegments, branchJunctions, specialZones, npcWaypoints }
}

// ── Singleton — deterministic per session ────────────────────────────────────
export const CANYON_SEED    = 54321
export const CANYON_NETWORK = generateCanyonNetwork(CANYON_SEED)

// ── Collision tolerance — exported so visual geometry can match ───────────────
// The player may reach up to HALF_W + CORRIDOR_TOL from the corridor centreline.
// Mountain meshes must have their inner edge ≥ this value so the player never
// visually walks inside the mountain.
export const CORRIDOR_TOL = 1.5

// ── Collision helper — is world point (x, z) inside any walkable area? ───────
export function isInCorridorOrVillage(x, z) {
  // Village open area (always valid)
  if (x * x + z * z < VILLAGE_OPEN_RADIUS * VILLAGE_OPEN_RADIUS) return true

  const tol = CORRIDOR_TOL
  const hw  = HALF_W + tol

  // Main arm segments
  for (const seg of CANYON_NETWORK.segments) {
    if (_inSegment(x, z, seg, tol)) return true
  }
  // Main arm junction pads
  for (const junc of CANYON_NETWORK.junctions) {
    if (Math.abs(x - junc.x) <= hw && Math.abs(z - junc.z) <= hw) return true
  }
  // Branch segments
  for (const seg of CANYON_NETWORK.branchSegments) {
    if (_inSegment(x, z, seg, tol)) return true
  }
  // Branch junction pads
  for (const junc of CANYON_NETWORK.branchJunctions) {
    if (Math.abs(x - junc.x) <= hw && Math.abs(z - junc.z) <= hw) return true
  }
  // Special zone clearings (circular open areas)
  for (const zone of CANYON_NETWORK.specialZones) {
    const ddx = x - zone.x
    const ddz = z - zone.z
    if (ddx * ddx + ddz * ddz < zone.radius * zone.radius) return true
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
