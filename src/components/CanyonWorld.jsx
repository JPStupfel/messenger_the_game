// ═══════════════════════════════════════════════════════════════════════════
// ICE CANYON WORLD
// Renders the deterministic labyrinth of ice-carved canyons that extends
// from the village. Each corridor has towering ice walls, a snow-covered
// floor, snow caps on the wall tops, and hanging icicles for atmosphere.
// ═══════════════════════════════════════════════════════════════════════════

import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import {
  CANYON_NETWORK,
  CORRIDOR_WIDTH,
  WALL_HEIGHT,
  WALL_THICKNESS,
  HALF_W,
  HALF_WT,
} from '../canyonGen'
import { mulberry32 } from '../worldGen'

// ── Shared material colours ───────────────────────────────────────────────────
const WALL_COLOR   = '#4e6272'   // blue-grey icy rock
const FLOOR_COLOR  = '#c5dded'   // pale ice blue
const SNOW_COLOR   = '#e8f4ff'   // wall-top snow
const ICICLE_COLOR = '#9dcde8'   // translucent ice blue

const ICICLE_SEED = 77777

// ── Segment: floor strip + 2 wall panels + 2 snow caps ───────────────────────
function CanyonSegment({ seg }) {
  const isNS = seg.dir === 0 || seg.dir === 2
  const cx   = (seg.x1 + seg.x2) / 2
  const cz   = (seg.z1 + seg.z2) / 2
  const len  = seg.len

  const HH  = WALL_HEIGHT / 2
  const SNH = 0.6   // snow cap height

  // Geometry dimensions
  const floorSize = isNS ? [CORRIDOR_WIDTH, 0.3, len]        : [len, 0.3, CORRIDOR_WIDTH]
  const wallSize  = isNS ? [WALL_THICKNESS, WALL_HEIGHT, len] : [len, WALL_HEIGHT, WALL_THICKNESS]
  const snowSize  = isNS ? [WALL_THICKNESS + 2, SNH, len + 1] : [len + 1, SNH, WALL_THICKNESS + 2]

  // Wall 1 (West for NS, North for EW)
  const w1 = isNS
    ? [cx - HALF_W - HALF_WT, HH,             cz]
    : [cx,                    HH,             cz - HALF_W - HALF_WT]
  // Wall 2 (East for NS, South for EW)
  const w2 = isNS
    ? [cx + HALF_W + HALF_WT, HH,             cz]
    : [cx,                    HH,             cz + HALF_W + HALF_WT]
  // Snow caps
  const s1 = isNS
    ? [cx - HALF_W - HALF_WT, WALL_HEIGHT + SNH / 2, cz]
    : [cx,                    WALL_HEIGHT + SNH / 2, cz - HALF_W - HALF_WT]
  const s2 = isNS
    ? [cx + HALF_W + HALF_WT, WALL_HEIGHT + SNH / 2, cz]
    : [cx,                    WALL_HEIGHT + SNH / 2, cz + HALF_W + HALF_WT]

  return (
    <group>
      {/* Floor */}
      <mesh position={[cx, 0.15, cz]} receiveShadow>
        <boxGeometry args={floorSize} />
        <meshStandardMaterial color={FLOOR_COLOR} roughness={0.75} metalness={0.1} />
      </mesh>

      {/* Wall 1 */}
      <mesh position={w1} castShadow receiveShadow>
        <boxGeometry args={wallSize} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.88} metalness={0.05} />
      </mesh>

      {/* Wall 2 */}
      <mesh position={w2} castShadow receiveShadow>
        <boxGeometry args={wallSize} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.88} metalness={0.05} />
      </mesh>

      {/* Snow cap 1 */}
      <mesh position={s1} castShadow>
        <boxGeometry args={snowSize} />
        <meshStandardMaterial color={SNOW_COLOR} roughness={0.6} />
      </mesh>

      {/* Snow cap 2 */}
      <mesh position={s2} castShadow>
        <boxGeometry args={snowSize} />
        <meshStandardMaterial color={SNOW_COLOR} roughness={0.6} />
      </mesh>
    </group>
  )
}

// ── Junction: floor pad + corner wall blocks ─────────────────────────────────
function CanyonJunction({ junc }) {
  const padSize = CORRIDOR_WIDTH + WALL_THICKNESS * 2  // 12 + 12 = 24 units
  const HH      = WALL_HEIGHT / 2
  const SNH     = 0.6
  const off     = HALF_W + HALF_WT   // corner offset from junction centre

  return (
    <group>
      {/* Floor pad */}
      <mesh position={[junc.x, 0.15, junc.z]} receiveShadow>
        <boxGeometry args={[padSize, 0.3, padSize]} />
        <meshStandardMaterial color={FLOOR_COLOR} roughness={0.75} metalness={0.1} />
      </mesh>

      {/* 4 corner wall blocks (fills gaps at turns) */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <group key={i}>
          <mesh
            position={[junc.x + sx * off, HH, junc.z + sz * off]}
            castShadow receiveShadow
          >
            <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS]} />
            <meshStandardMaterial color={WALL_COLOR} roughness={0.88} metalness={0.05} />
          </mesh>
          {/* Snow on corner */}
          <mesh position={[junc.x + sx * off, WALL_HEIGHT + SNH / 2, junc.z + sz * off]}>
            <boxGeometry args={[WALL_THICKNESS + 2, SNH, WALL_THICKNESS + 2]} />
            <meshStandardMaterial color={SNOW_COLOR} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// ── Icicles — instanced mesh over all wall tops ───────────────────────────────
function Icicles() {
  const meshRef = useRef()

  // Build all icicle transforms once
  const { positions, count } = useMemo(() => {
    const rng = mulberry32(ICICLE_SEED)
    const pts = []
    const { segments } = CANYON_NETWORK

    segments.forEach((seg) => {
      const isNS = seg.dir === 0 || seg.dir === 2
      const len  = seg.len

      // 8 icicles per wall side per segment
      for (let side = 0; side < 2; side++) {
        const sign = side === 0 ? -1 : 1
        for (let k = 0; k < 8; k++) {
          const t       = (k + 0.3 + rng() * 0.4) / 8   // 0..1 along segment
          const height  = 1.2 + rng() * 2.8              // icicle length
          const spread  = (rng() - 0.5) * 1.0            // slight lateral spread
          const wallOff = HALF_W + HALF_WT + spread

          let x, z
          if (isNS) {
            x = (seg.x1 * (1 - t) + seg.x2 * t) + sign * wallOff
            z = seg.z1 * (1 - t) + seg.z2 * t
          } else {
            x = seg.x1 * (1 - t) + seg.x2 * t
            z = (seg.z1 * (1 - t) + seg.z2 * t) + sign * wallOff
          }

          pts.push({ x, z, height })
        }
      }
    })

    return { positions: pts, count: pts.length }
  }, [])

  useEffect(() => {
    if (!meshRef.current || count === 0) return
    const dummy = new THREE.Object3D()
    positions.forEach((p, i) => {
      // Icicle tip hangs down from wall top
      dummy.position.set(p.x, WALL_HEIGHT - p.height / 2 + 0.3, p.z)
      dummy.scale.set(0.15, p.height, 0.15)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [positions, count])

  if (count === 0) return null

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]} castShadow>
      <coneGeometry args={[1, 1, 5]} />
      <meshStandardMaterial
        color={ICICLE_COLOR}
        roughness={0.15}
        metalness={0.3}
        transparent
        opacity={0.88}
      />
    </instancedMesh>
  )
}

// ── Snow drift accent strips along wall bases ─────────────────────────────────
function SnowDrifts() {
  const meshRef = useRef()

  const { positions, count } = useMemo(() => {
    const rng = mulberry32(ICICLE_SEED + 1)
    const pts = []
    const { segments } = CANYON_NETWORK

    segments.forEach((seg) => {
      const isNS = seg.dir === 0 || seg.dir === 2
      for (let side = 0; side < 2; side++) {
        const sign = side === 0 ? -1 : 1
        // 3 drifts per wall side
        for (let k = 0; k < 3; k++) {
          const t    = (k + 0.2 + rng() * 0.6) / 3
          const sc   = 1.5 + rng() * 2.5
          const wallEdge = HALF_W + 0.3

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
      dummy.position.set(p.x, 0.25, p.z)
      dummy.scale.set(p.sc, p.sc * 0.4, p.sc)
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

      {/* Canyon corridor segments */}
      {segments.map((seg, i) => (
        <CanyonSegment key={i} seg={seg} />
      ))}

      {/* Junction pads at every turn */}
      {junctions.map((junc, i) => (
        <CanyonJunction key={i} junc={junc} />
      ))}

      {/* Decorative elements */}
      <Icicles />
      <SnowDrifts />
    </group>
  )
}
