// ═══════════════════════════════════════════════════════════════════════════
// ICE CANYON WORLD
// Renders the deterministic labyrinth of snowy mountain corridors radiating
// from the village. Each corridor is flanked by rows of cone-shaped snowy
// mountain peaks with a flat ice floor between them.
// ═══════════════════════════════════════════════════════════════════════════

import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import {
  CANYON_NETWORK,
  CORRIDOR_WIDTH,
  HALF_W,
  CORRIDOR_TOL,
  ARM_STARTS,
  SEGS_PER_ARM,
  isInCorridorOrVillage,
} from '../canyonGen'
import { mulberry32 } from '../worldGen'

// ── Shared material colours ───────────────────────────────────────────────────
const FLOOR_COLOR  = '#c5dded'   // pale ice blue
const SNOW_COLOR   = '#eef6ff'   // bright snow white
const ROCK_COLOR   = '#8fa8bc'   // blue-grey icy rock for mountain base

// Mountain geometry constants
const MTN_SPACING  = 11   // units between mountain centres along the wall
const MTN_R_MIN    = 6.5  // minimum base radius
const MTN_R_MAX    = 9.5  // maximum base radius
const MTN_H_MIN    = 14   // minimum height
const MTN_H_MAX    = 22   // maximum height
// Mountains are centred this far from the corridor centre line.
// Inner edge lands at HALF_W + CORRIDOR_TOL so the player collision boundary
// (which allows up to HALF_W + CORRIDOR_TOL from centre) never visually
// intersects the mountain mesh.
const MTN_INNER_OFFSET = HALF_W + CORRIDOR_TOL  // 6 + 1.5 = 7.5

// ── Build mountain peak data for one wall side of a segment ──────────────────
function mountainsForSide(seg, side, rng) {
  const isNS  = seg.dir === 0 || seg.dir === 2
  const sign  = side === 0 ? -1 : 1
  const count = Math.max(2, Math.ceil(seg.len / MTN_SPACING))
  const peaks = []

  for (let k = 0; k < count; k++) {
    const t  = (k + 0.5 + (rng() - 0.5) * 0.3) / count   // 0..1 along segment; ±0.3 jitter avoids perfect regularity
    const r  = MTN_R_MIN + rng() * (MTN_R_MAX - MTN_R_MIN)
    const h  = MTN_H_MIN + rng() * (MTN_H_MAX - MTN_H_MIN)
    const jitter = (rng() - 0.5) * 2   // slight along-axis jitter

    // Mountain centre: inner edge at MTN_INNER_OFFSET, centre at inner + r
    const lateralOff = MTN_INNER_OFFSET + r

    let x, z
    if (isNS) {
      x = (seg.x1 * (1 - t) + seg.x2 * t) + sign * lateralOff
      z = seg.z1 * (1 - t) + seg.z2 * t + jitter
    } else {
      x = seg.x1 * (1 - t) + seg.x2 * t + jitter
      z = (seg.z1 * (1 - t) + seg.z2 * t) + sign * lateralOff
    }
    // Skip mountains whose centre is inside the explorable corridor/village area
    if (isInCorridorOrVillage(x, z)) continue
    peaks.push({ x, z, r, h })
  }
  return peaks
}

// ── Corridor segment: snow floor + mountain rows on each side ─────────────────
function CanyonSegment({ seg }) {
  const isNS = seg.dir === 0 || seg.dir === 2
  const cx   = (seg.x1 + seg.x2) / 2
  const cz   = (seg.z1 + seg.z2) / 2
  const len  = seg.len

  const floorSize = isNS
    ? [CORRIDOR_WIDTH, 0.3, len]
    : [len, 0.3, CORRIDOR_WIDTH]

  // Deterministic RNG seeded per segment so appearance is always the same
  const peaks = useMemo(() => {
    const rng   = mulberry32(seg.armIdx * 1000 + seg.segIdx * 7 + 42)
    const left  = mountainsForSide(seg, 0, rng)
    const right = mountainsForSide(seg, 1, rng)
    return [...left, ...right]
  }, [seg])

  return (
    <group>
      {/* Snow floor strip */}
      <mesh position={[cx, 0.15, cz]} receiveShadow>
        <boxGeometry args={floorSize} />
        <meshStandardMaterial color={FLOOR_COLOR} roughness={0.75} metalness={0.1} />
      </mesh>

      {/* Mountain peaks flanking the corridor */}
      {peaks.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]}>
          {/* Rocky base cone */}
          <mesh castShadow receiveShadow position={[0, p.h * 0.5, 0]}>
            <coneGeometry args={[p.r, p.h, 8]} />
            <meshStandardMaterial color={ROCK_COLOR} roughness={0.92} />
          </mesh>
          {/* Snow cap — upper 40% of the cone */}
          <mesh castShadow position={[0, p.h * 0.78, 0]}>
            <coneGeometry args={[p.r * 0.48, p.h * 0.44, 8]} />
            <meshStandardMaterial color={SNOW_COLOR} roughness={0.55} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ── Junction floor pad — smooth tile at every segment end / turn ──────────────
// Corner wall blocks are intentionally removed so all openings stay navigable.
function CanyonJunction({ junc }) {
  const padSize = CORRIDOR_WIDTH + 4   // slightly wider than corridor for visual continuity
  return (
    <mesh position={[junc.x, 0.15, junc.z]} receiveShadow>
      <boxGeometry args={[padSize, 0.3, padSize]} />
      <meshStandardMaterial color={FLOOR_COLOR} roughness={0.75} metalness={0.1} />
    </mesh>
  )
}

// ── Entry pad — placed at each arm's start (village→canyon threshold) ─────────
// Gives a smooth floor tile at the corridor mouth so the opening looks inviting.
function EntryPads() {
  const padSize = CORRIDOR_WIDTH + 4
  return (
    <>
      {ARM_STARTS.map((arm, i) => (
        <mesh key={i} position={[arm.sx, 0.15, arm.sz]} receiveShadow>
          <boxGeometry args={[padSize, 0.3, padSize]} />
          <meshStandardMaterial color={FLOOR_COLOR} roughness={0.75} metalness={0.1} />
        </mesh>
      ))}
    </>
  )
}

// ── Instanced snow drifts along corridor floors ───────────────────────────────
function SnowDrifts() {
  const meshRef = useRef()

  const { positions, count } = useMemo(() => {
    const rng = mulberry32(88888)
    const pts = []
    const { segments } = CANYON_NETWORK

    segments.forEach((seg) => {
      const isNS = seg.dir === 0 || seg.dir === 2
      for (let side = 0; side < 2; side++) {
        const sign = side === 0 ? -1 : 1
        for (let k = 0; k < 3; k++) {
          const t  = (k + 0.2 + rng() * 0.6) / 3
          const sc = 1.2 + rng() * 2.0
          const wallEdge = HALF_W - 1.5   // edge of walkable floor

          let x, z
          if (isNS) {
            x = (seg.x1 * (1 - t) + seg.x2 * t) + sign * wallEdge
            z = seg.z1 * (1 - t) + seg.z2 * t
          } else {
            x = seg.x1 * (1 - t) + seg.x2 * t
            z = (seg.z1 * (1 - t) + seg.z2 * t) + sign * wallEdge
          }
          pts.push({ x, z, sc })
        }
      }
    })

    return { positions: pts, count: pts.length }
  }, [])

  useEffect(() => {
    if (!meshRef.current || count === 0) return
    const dummy = new THREE.Object3D()
    positions.forEach((p, i) => {
      dummy.position.set(p.x, 0.22, p.z)
      dummy.scale.set(p.sc, p.sc * 0.35, p.sc)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [positions, count])

  if (count === 0) return null

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]} receiveShadow>
      <sphereGeometry args={[0.9, 7, 6]} />
      <meshStandardMaterial color={SNOW_COLOR} roughness={0.75} />
    </instancedMesh>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function CanyonWorld() {
  const { segments, junctions } = CANYON_NETWORK

  return (
    <group>
      {/* Vast flat ice sheet underneath everything */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[3000, 3000]} />
        <meshStandardMaterial color="#b5cfe0" roughness={0.85} />
      </mesh>

      {/* Canyon corridor segments (floor + mountain walls) */}
      {segments.map((seg, i) => (
        <CanyonSegment key={i} seg={seg} />
      ))}

      {/* Junction floor pads at every segment turn */}
      {junctions.map((junc, i) => (
        <CanyonJunction key={i} junc={junc} />
      ))}

      {/* Entry pads at the mouth of each arm (village → corridor) */}
      <EntryPads />

      {/* Snow drift accents along corridor floors */}
      <SnowDrifts />
    </group>
  )
}
