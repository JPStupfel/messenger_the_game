// ═══════════════════════════════════════════════════════════════════════════
// PROCEDURAL WORLD GENERATION UTILITIES
// Seeded noise, terrain generation, and chunk management
// ═══════════════════════════════════════════════════════════════════════════

// ── Seeded PRNG (Mulberry32) ─────────────────────────────────────────────────
export function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// ── Simple 2D Simplex-like noise ─────────────────────────────────────────────
// Based on improved Perlin noise, optimized for browser
const GRAD3 = [
  [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
  [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
  [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
]

function buildPermTable(seed) {
  const rng = mulberry32(seed)
  const p = []
  for (let i = 0; i < 256; i++) p[i] = i
  // Fisher-Yates shuffle
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[p[i], p[j]] = [p[j], p[i]]
  }
  // Duplicate for overflow
  return [...p, ...p]
}

function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10) }
function lerp(a, b, t) { return a + t * (b - a) }
function dot2(g, x, y) { return g[0] * x + g[1] * y }

export function createNoise2D(seed = 42) {
  const perm = buildPermTable(seed)
  
  return function noise2D(x, y) {
    // Find unit grid cell
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    // Relative position in cell
    const xf = x - Math.floor(x)
    const yf = y - Math.floor(y)
    // Fade curves
    const u = fade(xf)
    const v = fade(yf)
    // Hash corners
    const aa = perm[perm[X] + Y] % 12
    const ab = perm[perm[X] + Y + 1] % 12
    const ba = perm[perm[X + 1] + Y] % 12
    const bb = perm[perm[X + 1] + Y + 1] % 12
    // Gradient dot products
    const x1 = lerp(dot2(GRAD3[aa], xf, yf), dot2(GRAD3[ba], xf - 1, yf), u)
    const x2 = lerp(dot2(GRAD3[ab], xf, yf - 1), dot2(GRAD3[bb], xf - 1, yf - 1), u)
    return lerp(x1, x2, v)
  }
}

// ── Fractal Brownian Motion (layered noise) ──────────────────────────────────
export function fbm(noise, x, y, octaves = 4, lacunarity = 2, persistence = 0.5) {
  let value = 0
  let amplitude = 1
  let frequency = 1
  let maxValue = 0
  
  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise(x * frequency, y * frequency)
    maxValue += amplitude
    amplitude *= persistence
    frequency *= lacunarity
  }
  
  return value / maxValue
}

// ── Chunk configuration ──────────────────────────────────────────────────────
export const CHUNK_SIZE = 64         // World units per chunk
export const RENDER_DISTANCE = 2     // Chunks in each direction - LOFI
export const UNLOAD_DISTANCE = 4     // Chunks before unloading
export const TERRAIN_SCALE = 0.008   // Noise scale (smaller = bigger features) - SMOOTHER
export const TERRAIN_HEIGHT = 30     // Max terrain height variation - less extreme
export const BASE_HEIGHT = 0         // Base ground level

// ── Biome types ──────────────────────────────────────────────────────────────
export const BIOME = {
  SNOW_PLAINS: 'snow_plains',
  FROZEN_FOREST: 'frozen_forest',
  DENSE_PINE_FOREST: 'dense_pine_forest',
  BIRCH_GROVE: 'birch_grove',
  ICE_MOUNTAINS: 'ice_mountains',
  ALPINE_PEAKS: 'alpine_peaks',
  FROZEN_LAKE: 'frozen_lake',
  CRYSTAL_FIELD: 'crystal_field',
  TUNDRA: 'tundra',
  CANYON: 'canyon',
}

// ── Tree types ───────────────────────────────────────────────────────────────
export const TREE_TYPE = {
  PINE: 'pine',
  TALL_PINE: 'tall_pine',
  BIRCH: 'birch',
  DEAD_TREE: 'dead_tree',
  SHRUB: 'shrub',
  FROZEN_TREE: 'frozen_tree',
}

// ── Get biome at world position (LOFI - simplified) ─────────────────────────
export function getBiome(noise, x, z) {
  // Simple 2-layer biome determination
  const elevation = fbm(noise, x * 0.003, z * 0.003, 1)
  const moisture = fbm(noise, x * 0.004 + 500, z * 0.004 + 500, 1)
  
  // High elevation = mountains
  if (elevation > 0.4) return BIOME.ALPINE_PEAKS
  if (elevation > 0.25) return BIOME.ICE_MOUNTAINS
  
  // Low elevation = lake or canyon
  if (elevation < -0.3) {
    if (moisture > 0) return BIOME.FROZEN_LAKE
    return BIOME.CANYON
  }
  
  // Mid elevations - forests and plains
  if (moisture > 0.25) return BIOME.DENSE_PINE_FOREST
  if (moisture > 0) return BIOME.FROZEN_FOREST
  if (moisture < -0.2) return BIOME.CRYSTAL_FIELD
  
  return BIOME.SNOW_PLAINS
}

// ── Ridge noise for mountain ridges ──────────────────────────────────────────
function ridgeNoise(noise, x, z, scale) {
  const n = fbm(noise, x * scale, z * scale, 3)
  return 1 - Math.abs(n) * 2  // Creates sharp ridges
}

// ── Cliff/step function for terrain park features ───────────────────────────
function stepNoise(noise, x, z, steps = 4) {
  const n = fbm(noise, x * 0.008, z * 0.008, 2)
  return Math.floor((n + 1) * steps) / steps - 0.5
}

// ── Get terrain height at world position ─────────────────────────────────────
export function getTerrainHeight(noise, x, z) {
  const biome = getBiome(noise, x, z)
  let height = BASE_HEIGHT
  
  // LOFI: Simple terrain using FBM with fewer octaves
  const baseNoise = fbm(noise, x * TERRAIN_SCALE, z * TERRAIN_SCALE, 2, 2.0, 0.5)
  
  // Simple ridge noise for some variety
  const ridges = ridgeNoise(noise, x, z, 0.004)
  
  switch (biome) {
    case BIOME.ALPINE_PEAKS:
      height += baseNoise * TERRAIN_HEIGHT * 2.0
      height += Math.max(0, ridges) * 25
      break
      
    case BIOME.ICE_MOUNTAINS:
      height += baseNoise * TERRAIN_HEIGHT * 1.5
      height += Math.max(0, ridges * 0.6) * 20
      break
      
    case BIOME.CANYON:
      height -= Math.abs(baseNoise) * 20
      break
      
    case BIOME.FROZEN_LAKE:
      height += baseNoise * 0.5
      height -= 10
      break
      
    case BIOME.DENSE_PINE_FOREST:
      height += baseNoise * TERRAIN_HEIGHT * 1.2
      break
      
    case BIOME.FROZEN_FOREST:
      height += baseNoise * TERRAIN_HEIGHT * 1.0
      break
      
    case BIOME.BIRCH_GROVE:
      height += baseNoise * TERRAIN_HEIGHT * 0.7
      break
      
    case BIOME.CRYSTAL_FIELD:
      height += baseNoise * TERRAIN_HEIGHT * 0.6
      height += Math.max(0, ridges) * 8
      break
      
    case BIOME.SNOW_PLAINS:
    default:
      height += baseNoise * TERRAIN_HEIGHT * 0.5
      break
  }
  
  return height
}

// ── Get terrain gradient (slope direction and steepness) ────────────────────
const GRADIENT_SAMPLE = 0.5  // Sample distance for gradient calculation
export function getTerrainGradient(noise, x, z) {
  const h = getTerrainHeight(noise, x, z)
  const hx = getTerrainHeight(noise, x + GRADIENT_SAMPLE, z)
  const hz = getTerrainHeight(noise, x, z + GRADIENT_SAMPLE)
  
  // Gradient points downhill (negative of surface normal horizontal component)
  const dx = (hx - h) / GRADIENT_SAMPLE
  const dz = (hz - h) / GRADIENT_SAMPLE
  
  return {
    x: -dx,  // Direction to slide
    z: -dz,
    steepness: Math.sqrt(dx * dx + dz * dz)  // 0 = flat, 1 = 45°, 2 = ~63°
  }
}

// ── Generate objects for a chunk ─────────────────────────────────────────────
export function generateChunkObjects(noise, chunkX, chunkZ, seed) {
  const objects = { 
    trees: [],           // Pine trees
    tallPines: [],       // Tall pine trees  
    birchTrees: [],      // Birch/aspen trees
    deadTrees: [],       // Dead/bare trees
    shrubs: [],          // Small bushes
    frozenTrees: [],     // Ice-covered trees
    rocks: [], 
    crystals: [], 
    snowDrifts: [],
    iceShards: [],       // New: ice formations
  }
  const rng = mulberry32(seed + chunkX * 73856093 + chunkZ * 19349663)
  
  const worldX0 = chunkX * CHUNK_SIZE
  const worldZ0 = chunkZ * CHUNK_SIZE
  
  // Sample points within chunk - LOFI: less dense
  const SAMPLE_DENSITY = 12 // Check every N units (higher = fewer objects)
  
  for (let lx = 0; lx < CHUNK_SIZE; lx += SAMPLE_DENSITY) {
    for (let lz = 0; lz < CHUNK_SIZE; lz += SAMPLE_DENSITY) {
      const wx = worldX0 + lx + rng() * SAMPLE_DENSITY
      const wz = worldZ0 + lz + rng() * SAMPLE_DENSITY
      const biome = getBiome(noise, wx, wz)
      const height = getTerrainHeight(noise, wx, wz)
      const roll = rng()
      const roll2 = rng()
      
      switch (biome) {
        case BIOME.DENSE_PINE_FOREST:
          // Dense evergreen forest - lots of tall pines
          if (roll < 0.55) {
            if (roll2 < 0.6) {
              objects.tallPines.push({
                x: wx, y: height, z: wz,
                scale: 1.0 + rng() * 0.8,
                rotation: rng() * Math.PI * 2
              })
            } else {
              objects.trees.push({
                x: wx, y: height, z: wz,
                scale: 0.7 + rng() * 0.5,
                rotation: rng() * Math.PI * 2
              })
            }
          } else if (roll < 0.62) {
            objects.shrubs.push({
              x: wx, y: height, z: wz,
              scale: 0.4 + rng() * 0.4
            })
          } else if (roll < 0.68) {
            objects.snowDrifts.push({
              x: wx, y: height, z: wz,
              scale: 0.8 + rng() * 1.5
            })
          }
          break
          
        case BIOME.FROZEN_FOREST:
          // Mixed forest with variety
          if (roll < 0.38) {
            const treeRoll = rng()
            if (treeRoll < 0.5) {
              objects.trees.push({
                x: wx, y: height, z: wz,
                scale: 0.8 + rng() * 0.6,
                rotation: rng() * Math.PI * 2
              })
            } else if (treeRoll < 0.75) {
              objects.frozenTrees.push({
                x: wx, y: height, z: wz,
                scale: 0.7 + rng() * 0.6,
                rotation: rng() * Math.PI * 2
              })
            } else {
              objects.deadTrees.push({
                x: wx, y: height, z: wz,
                scale: 0.6 + rng() * 0.5,
                rotation: rng() * Math.PI * 2
              })
            }
          } else if (roll < 0.48) {
            objects.shrubs.push({
              x: wx, y: height, z: wz,
              scale: 0.3 + rng() * 0.5
            })
          } else if (roll < 0.55) {
            objects.snowDrifts.push({
              x: wx, y: height, z: wz,
              scale: 1 + rng() * 2
            })
          }
          break
          
        case BIOME.BIRCH_GROVE:
          // Birch/aspen forest - elegant, sparse
          if (roll < 0.35) {
            objects.birchTrees.push({
              x: wx, y: height, z: wz,
              scale: 0.9 + rng() * 0.5,
              rotation: rng() * Math.PI * 2
            })
          } else if (roll < 0.42) {
            objects.shrubs.push({
              x: wx, y: height, z: wz,
              scale: 0.3 + rng() * 0.4
            })
          }
          break
          
        case BIOME.ALPINE_PEAKS:
          // Sparse, harsh - mostly rocks and ice
          if (roll < 0.12) {
            objects.rocks.push({
              x: wx, y: height, z: wz,
              scale: 1.5 + rng() * 4,
              rotation: rng() * Math.PI * 2
            })
          } else if (roll < 0.18) {
            objects.iceShards.push({
              x: wx, y: height, z: wz,
              scale: 1 + rng() * 2,
              rotation: rng() * Math.PI * 2
            })
          }
          break
          
        case BIOME.ICE_MOUNTAINS:
          // Scattered rocks and frozen trees at lower elevations
          if (roll < 0.12) {
            objects.rocks.push({
              x: wx, y: height, z: wz,
              scale: 1 + rng() * 3,
              rotation: rng() * Math.PI * 2
            })
          } else if (roll < 0.18 && height < 20) {
            objects.frozenTrees.push({
              x: wx, y: height, z: wz,
              scale: 0.5 + rng() * 0.4,
              rotation: rng() * Math.PI * 2
            })
          }
          break
          
        case BIOME.CANYON:
          // Rocky walls, dead trees
          if (roll < 0.2) {
            objects.rocks.push({
              x: wx, y: height, z: wz,
              scale: 0.8 + rng() * 2,
              rotation: rng() * Math.PI * 2
            })
          } else if (roll < 0.28) {
            objects.deadTrees.push({
              x: wx, y: height, z: wz,
              scale: 0.5 + rng() * 0.4,
              rotation: rng() * Math.PI * 2
            })
          }
          break
          
        case BIOME.CRYSTAL_FIELD:
          // Crystals and strange formations
          if (roll < 0.3) {
            objects.crystals.push({
              x: wx, y: height, z: wz,
              scale: 0.5 + rng() * 2,
              rotation: rng() * Math.PI * 2,
              hue: rng()
            })
          } else if (roll < 0.38) {
            objects.iceShards.push({
              x: wx, y: height, z: wz,
              scale: 0.8 + rng() * 1.5,
              rotation: rng() * Math.PI * 2
            })
          }
          break
          
        case BIOME.TUNDRA:
          // Low shrubs and occasional dead trees
          if (roll < 0.15) {
            objects.shrubs.push({
              x: wx, y: height, z: wz,
              scale: 0.2 + rng() * 0.3
            })
          } else if (roll < 0.2) {
            objects.deadTrees.push({
              x: wx, y: height, z: wz,
              scale: 0.4 + rng() * 0.3,
              rotation: rng() * Math.PI * 2
            })
          } else if (roll < 0.25) {
            objects.rocks.push({
              x: wx, y: height, z: wz,
              scale: 0.3 + rng() * 0.6,
              rotation: rng() * Math.PI * 2
            })
          }
          break
          
        case BIOME.SNOW_PLAINS:
          // Sparse trees and drifts
          if (roll < 0.06) {
            objects.trees.push({
              x: wx, y: height, z: wz,
              scale: 0.6 + rng() * 0.4,
              rotation: rng() * Math.PI * 2
            })
          } else if (roll < 0.1) {
            objects.shrubs.push({
              x: wx, y: height, z: wz,
              scale: 0.3 + rng() * 0.3
            })
          } else if (roll < 0.16) {
            objects.snowDrifts.push({
              x: wx, y: height, z: wz,
              scale: 2 + rng() * 3
            })
          }
          break
          
        case BIOME.FROZEN_LAKE:
          // Mostly empty, occasional ice formations
          if (roll < 0.03) {
            objects.iceShards.push({
              x: wx, y: height + 0.1, z: wz,
              scale: 0.3 + rng() * 0.8,
              rotation: rng() * Math.PI * 2
            })
          }
          break
      }
    }
  }
  
  return objects
}

// ── Chunk key helper ─────────────────────────────────────────────────────────
export function chunkKey(cx, cz) {
  return `${cx},${cz}`
}

export function worldToChunk(worldX, worldZ) {
  return {
    cx: Math.floor(worldX / CHUNK_SIZE),
    cz: Math.floor(worldZ / CHUNK_SIZE)
  }
}
