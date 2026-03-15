// ═══════════════════════════════════════════════════════════════════════════
// ICE CANYON WORLD
// Renders the deterministic labyrinth of snowy mountain corridors radiating
// from the village, plus branch corridors with dead ends and special zones:
//   • Forest clearing  — pine trees around a snow-free glade
//   • Frozen lake      — reflective ice disc with snow surround
//   • Abandoned church — ruined stone chapel with bell tower and cross
//   • Valley clearing  — wide open alpine valley with rock formations
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
// Works for both main arm segments (armIdx/segIdx) and branch segments (branchIdx/segIdx).
function CanyonSegment({ seg }) {
  const isNS = seg.dir === 0 || seg.dir === 2
  const cx   = (seg.x1 + seg.x2) / 2
  const cz   = (seg.z1 + seg.z2) / 2
  const len  = seg.len

  const floorSize = isNS
    ? [CORRIDOR_WIDTH, 0.08, len]
    : [len, 0.08, CORRIDOR_WIDTH]

  // Deterministic RNG seed: main arms use armIdx, branches use branchIdx offset by 10
  const peaks = useMemo(() => {
    const seedBase = seg.armIdx !== undefined
      ? seg.armIdx * 1000 + seg.segIdx * 7 + 42
      : 10000 + (seg.branchIdx ?? 0) * 1000 + seg.segIdx * 7 + 42
    const rng   = mulberry32(seedBase)
    const left  = mountainsForSide(seg, 0, rng)
    const right = mountainsForSide(seg, 1, rng)
    return [...left, ...right]
  }, [seg])

  return (
    <group>
      {/* Snow floor strip */}
      <mesh position={[cx, 0, cz]} receiveShadow>
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
    <mesh position={[junc.x, 0, junc.z]} receiveShadow>
      <boxGeometry args={[padSize, 0.08, padSize]} />
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
        <mesh key={i} position={[arm.sx, 0, arm.sz]} receiveShadow>
          <boxGeometry args={[padSize, 0.08, padSize]} />
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
    const { segments, branchSegments } = CANYON_NETWORK
    const allSegs = [...segments, ...branchSegments]

    allSegs.forEach((seg) => {
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

// Forest tree counts
const FOREST_PERIMETER_TREES = 38  // ring of pines around and beyond the clearing edge
const FOREST_INTERIOR_TREES  = 8   // scattered trees inside the glade for depth
// A circular glade with earthy floor and a ring of snow-capped pine trees.
function ForestZone({ zone }) {
  const trees = useMemo(() => {
    const rng = mulberry32(Math.round(zone.x * 100 + zone.z * 7 + 77777))
    const result = []

    // Dense ring of pines around the clearing perimeter and beyond
    for (let i = 0; i < FOREST_PERIMETER_TREES; i++) {
      const angle  = (i / FOREST_PERIMETER_TREES) * Math.PI * 2 + (rng() - 0.5) * 0.35
      const dist   = zone.radius + 1 + rng() * 14
      result.push({
        x:      zone.x + Math.cos(angle) * dist,
        z:      zone.z + Math.sin(angle) * dist,
        height: 5 + rng() * 7,
        scale:  0.6 + rng() * 0.8,
      })
    }

    // A few scattered trees inside the glade for depth
    for (let i = 0; i < FOREST_INTERIOR_TREES; i++) {
      const angle = rng() * Math.PI * 2
      const dist  = 4 + rng() * (zone.radius - 7)
      result.push({
        x:      zone.x + Math.cos(angle) * dist,
        z:      zone.z + Math.sin(angle) * dist,
        height: 3.5 + rng() * 4,
        scale:  0.45 + rng() * 0.5,
      })
    }

    return result
  }, [zone])

  return (
    <group>
      {/* Earthy glade floor */}
      <mesh position={[zone.x, 0, zone.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[zone.radius, 20]} />
        <meshStandardMaterial color="#3d5c38" roughness={0.9} />
      </mesh>

      {/* Pine trees */}
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]}>
          {/* Trunk */}
          <mesh castShadow position={[0, t.height * 0.28, 0]}>
            <cylinderGeometry args={[0.22 * t.scale, 0.38 * t.scale, t.height * 0.56, 6]} />
            <meshStandardMaterial color="#4a2e0e" roughness={0.98} />
          </mesh>
          {/* Lower canopy layer */}
          <mesh castShadow position={[0, t.height * 0.52, 0]}>
            <coneGeometry args={[2.4 * t.scale, t.height * 0.65, 7]} />
            <meshStandardMaterial color="#1e4d1a" roughness={0.88} />
          </mesh>
          {/* Mid canopy */}
          <mesh castShadow position={[0, t.height * 0.73, 0]}>
            <coneGeometry args={[1.65 * t.scale, t.height * 0.45, 6]} />
            <meshStandardMaterial color="#255e20" roughness={0.85} />
          </mesh>
          {/* Snow-dusted tip */}
          <mesh castShadow position={[0, t.height * 0.91, 0]}>
            <coneGeometry args={[0.8 * t.scale, t.height * 0.22, 6]} />
            <meshStandardMaterial color={SNOW_COLOR} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ── Frozen Lake ──────────────────────────────────────────────────────────────
// A frozen lake disc with reflective ice and a snow-covered shore.
function FrozenLake({ zone }) {
  return (
    <group>
      {/* Snow shore */}
      <mesh position={[zone.x, 0, zone.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[zone.radius, 20]} />
        <meshStandardMaterial color="#d0e8f5" roughness={0.65} />
      </mesh>
      {/* Ice surface — slightly raised, reflective blue-white */}
      <mesh position={[zone.x, 0.02, zone.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[zone.radius - 3, 20]} />
        <meshStandardMaterial color="#a8d4f0" roughness={0.05} metalness={0.7} transparent opacity={0.9} />
      </mesh>
      {/* Ice crack accent lines */}
      {[0, 0.4, 0.9, 1.6, 2.4].map((rot, i) => (
        <mesh key={i} position={[zone.x, 0.04, zone.z]} rotation={[-Math.PI / 2, rot, 0]}>
          <planeGeometry args={[(zone.radius - 4) * 1.6, 0.4 + (i % 2) * 0.3]} />
          <meshStandardMaterial color="#c8e8f8" roughness={0.1} transparent opacity={0.55} />
        </mesh>
      ))}
      {/* Thin ice rim */}
      <mesh position={[zone.x, 0.01, zone.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[zone.radius - 3.2, zone.radius - 2.5, 20]} />
        <meshStandardMaterial color="#b8dff5" roughness={0.3} />
      </mesh>
    </group>
  )
}

// ── Abandoned Church ──────────────────────────────────────────────────────────
// A ruined stone chapel with bell tower, cross, and scattered rubble.
function AbandonedChurch({ zone }) {
  const STONE      = '#787878'
  const DARK_STONE = '#505050'
  const ROOF_COL   = '#3e3535'

  return (
    <group position={[zone.x, 0, zone.z]}>
      {/* Snow-covered churchyard */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[zone.radius, 16]} />
        <meshStandardMaterial color={SNOW_COLOR} roughness={0.82} />
      </mesh>

      {/* Nave — main hall */}
      <mesh castShadow receiveShadow position={[0, 4, 1]}>
        <boxGeometry args={[7, 8, 13]} />
        <meshStandardMaterial color={STONE} roughness={0.95} />
      </mesh>

      {/* Pitched roof over nave */}
      <mesh castShadow position={[0, 9.5, 1]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[6.2, 4, 4]} />
        <meshStandardMaterial color={ROOF_COL} roughness={0.92} />
      </mesh>
      {/* Snow on nave roof */}
      <mesh position={[0, 10.8, 1]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[3.5, 1.8, 4]} />
        <meshStandardMaterial color={SNOW_COLOR} roughness={0.72} />
      </mesh>

      {/* Bell tower */}
      <mesh castShadow receiveShadow position={[0, 7, -7.5]}>
        <boxGeometry args={[4, 14, 4]} />
        <meshStandardMaterial color={DARK_STONE} roughness={0.97} />
      </mesh>
      {/* Tower peaked roof */}
      <mesh castShadow position={[0, 15, -7.5]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[3.4, 4.5, 4]} />
        <meshStandardMaterial color={ROOF_COL} roughness={0.92} />
      </mesh>

      {/* Cross — vertical beam */}
      <mesh castShadow position={[0, 18.5, -7.5]}>
        <boxGeometry args={[0.45, 3.5, 0.45]} />
        <meshStandardMaterial color="#888888" roughness={0.85} />
      </mesh>
      {/* Cross — horizontal beam */}
      <mesh castShadow position={[0, 19.5, -7.5]}>
        <boxGeometry args={[2.2, 0.45, 0.45]} />
        <meshStandardMaterial color="#888888" roughness={0.85} />
      </mesh>

      {/* Dark arched doorway (painted-on approximation) */}
      <mesh position={[0, 2.8, 7.6]}>
        <boxGeometry args={[2.6, 4.5, 0.4]} />
        <meshStandardMaterial color="#1a1a1a" roughness={1} />
      </mesh>

      {/* Broken stone wall rubble around the churchyard */}
      {[
        [-5.5, 2, 4], [5.5, 1.5, 2], [5.5, 2.5, -3],
        [-5.5, 1.8, -4], [0, 2, 9], [-3, 1.5, 9],
      ].map(([wx, wh, wz], i) => (
        <mesh key={i} castShadow receiveShadow position={[wx, wh * 0.5, wz]}>
          <boxGeometry args={[1.6 + (i % 2) * 0.6, wh, 1.6]} />
          <meshStandardMaterial color={DARK_STONE} roughness={0.99} />
        </mesh>
      ))}

      {/* Scattered snow-covered rubble stones */}
      {[[-4, 8], [4, -5], [-6, -1], [6, 6], [2, 10]].map(([rx, rz], i) => (
        <mesh key={i} castShadow position={[rx, 0.5, rz]}>
          <dodecahedronGeometry args={[0.8 + (i % 3) * 0.3, 0]} />
          <meshStandardMaterial color={STONE} roughness={0.98} />
        </mesh>
      ))}
    </group>
  )
}

// ── Valley Clearing ───────────────────────────────────────────────────────────
// A wide open alpine valley with icy floor and surrounding rock formations.
function ValleyClearing({ zone }) {
  return (
    <group>
      {/* Wide valley floor */}
      <mesh position={[zone.x, 0, zone.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[zone.radius, 24]} />
        <meshStandardMaterial color={FLOOR_COLOR} roughness={0.68} metalness={0.08} />
      </mesh>

      {/* Rock formations ringing the valley edge */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const angle  = (i / 8) * Math.PI * 2 + 0.4
        const dist   = zone.radius - 3 + (i % 2) * 5
        const height = 3 + (i % 4)
        return (
          <group key={i} position={[zone.x + Math.cos(angle) * dist, 0, zone.z + Math.sin(angle) * dist]}>
            <mesh castShadow receiveShadow position={[0, height * 0.5, 0]}>
              <dodecahedronGeometry args={[1.8 + (i % 3) * 0.6, 0]} />
              <meshStandardMaterial color={ROCK_COLOR} roughness={0.96} />
            </mesh>
            {/* Snow dusting on rock tops */}
            <mesh position={[0, height * 0.9, 0]}>
              <sphereGeometry args={[1.0 + (i % 2) * 0.3, 6, 4]} />
              <meshStandardMaterial color={SNOW_COLOR} roughness={0.7} />
            </mesh>
          </group>
        )
      })}

      {/* Central icy patch — extra shimmer at valley floor center */}
      <mesh position={[zone.x, 0.01, zone.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[zone.radius * 0.45, 16]} />
        <meshStandardMaterial color="#c8e4f4" roughness={0.1} metalness={0.4} transparent opacity={0.7} />
      </mesh>
    </group>
  )
}

// ── Dispatch the right special zone component ─────────────────────────────────
function SpecialZone({ zone }) {
  switch (zone.type) {
    case 'forest':  return <ForestZone zone={zone} />
    case 'lake':    return <FrozenLake zone={zone} />
    case 'church':  return <AbandonedChurch zone={zone} />
    case 'valley':  return <ValleyClearing zone={zone} />
    default:        return null
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function CanyonWorld() {
  const { segments, junctions, branchSegments, branchJunctions, specialZones } = CANYON_NETWORK

  return (
    <group>
      {/* Vast flat ice sheet underneath everything */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[3000, 3000]} />
        <meshStandardMaterial color="#b5cfe0" roughness={0.85} />
      </mesh>

      {/* ── Main arm corridor segments (floor + mountain walls) ── */}
      {segments.map((seg, i) => (
        <CanyonSegment key={i} seg={seg} />
      ))}

      {/* ── Main arm junction floor pads ── */}
      {junctions.map((junc, i) => (
        <CanyonJunction key={i} junc={junc} />
      ))}

      {/* ── Branch corridor segments (floor + mountain walls) ── */}
      {branchSegments.map((seg, i) => (
        <CanyonSegment key={`b${i}`} seg={seg} />
      ))}

      {/* ── Branch junction floor pads ── */}
      {branchJunctions.map((junc, i) => (
        <CanyonJunction key={`bj${i}`} junc={junc} />
      ))}

      {/* Entry pads at the mouth of each arm (village → corridor) */}
      <EntryPads />

      {/* Snow drift accents along all corridor floors */}
      <SnowDrifts />

      {/* ── Special zones at branch endpoints ── */}
      {specialZones.map((zone, i) => (
        <SpecialZone key={i} zone={zone} />
      ))}
    </group>
  )
}
