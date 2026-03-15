// PathTrace — animated glowing-dot path guide for kids.
//
// Two modes:
//   • Seeking mode  (orange dots): player → nearest unrescued NPC
//   • Return mode   (cyan dots):   player → village center (following an NPC)
//
// Dots follow the maze corridor waypoints rather than flying in a straight line,
// so they always guide the player along navigable paths.

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  CANYON_NETWORK,
  ARM_STARTS,
  SEGS_PER_ARM,
  HALF_W,
} from '../canyonGen'

const MAX_DOTS    = 40     // Enough for a full cross-arm path at DOT_SPACING=4
const DOT_SPACING = 4      // World-units between each dot
const DOT_RADIUS  = 0.22   // Sphere radius

const SEEK_COLOR   = new THREE.Color('#fbbf24')   // warm amber — "go find the NPC"
const RETURN_COLOR = new THREE.Color('#38bdf8')   // sky blue  — "come back home"

const _dummy = new THREE.Object3D()
const _col   = new THREE.Color()

// ── Locate which arm+segIdx a world point (x, z) belongs to ──────────────────
// Returns { armIdx, segIdx } or null if the point is in the village / unknown.
function locatePoint(x, z) {
  const { segments } = CANYON_NETWORK
  for (const seg of segments) {
    const isNS = seg.dir === 0 || seg.dir === 2
    const tol  = HALF_W * 1.5
    if (isNS) {
      const zMin = Math.min(seg.z1, seg.z2)
      const zMax = Math.max(seg.z1, seg.z2)
      if (Math.abs(x - seg.x1) < tol && z >= zMin - tol && z <= zMax + tol)
        return { armIdx: seg.armIdx, segIdx: seg.segIdx }
    } else {
      const xMin = Math.min(seg.x1, seg.x2)
      const xMax = Math.max(seg.x1, seg.x2)
      if (Math.abs(z - seg.z1) < tol && x >= xMin - tol && x <= xMax + tol)
        return { armIdx: seg.armIdx, segIdx: seg.segIdx }
    }
  }
  return null  // in village or unclassified open area
}

// ── Build a list of 3-D waypoints from (px,pz) to (tx,tz) through corridors ──
// The path goes: player → corridor junctions back to village → junctions out
// to target arm → target position.
function buildMazePath(px, pz, tx, tz) {
  const { junctions } = CANYON_NETWORK
  const pLoc = locatePoint(px, pz)
  const tLoc = locatePoint(tx, tz)

  const pts = []
  pts.push([px, pz])

  // ── Walk from player back toward the village entry of their arm ────────────
  if (pLoc) {
    // Junctions are indexed: armIdx * SEGS_PER_ARM + segIdx (0-based = segment end)
    for (let s = pLoc.segIdx - 1; s >= 0; s--) {
      const j = junctions[pLoc.armIdx * SEGS_PER_ARM + s]
      pts.push([j.x, j.z])
    }
    // Arm entry from village
    const entry = ARM_STARTS[pLoc.armIdx]
    pts.push([entry.sx, entry.sz])
  }

  if (!tLoc) {
    // Target is in the village — route to centre
    pts.push([0, 0])
    pts.push([tx, tz])
    return pts
  }

  // ── Village centre (only if crossing arms) ─────────────────────────────────
  if (!pLoc || pLoc.armIdx !== tLoc.armIdx) {
    pts.push([0, 0])
    const tEntry = ARM_STARTS[tLoc.armIdx]
    pts.push([tEntry.sx, tEntry.sz])
  }

  // ── Walk from target arm entry toward the target segment ──────────────────
  for (let s = 0; s < tLoc.segIdx; s++) {
    const j = junctions[tLoc.armIdx * SEGS_PER_ARM + s]
    pts.push([j.x, j.z])
  }

  pts.push([tx, tz])
  return pts
}

// ── Distribute N evenly-spaced positions along a polyline ────────────────────
// Returns an array of {x, z} skipping the first `skipDist` units from the start.
function samplePolyline(pts, skipDist, spacing, maxCount) {
  const result = []
  if (pts.length < 2) return result

  let cumLen = 0
  let nextDot = skipDist    // distance at which the next dot should be placed

  for (let i = 1; i < pts.length; i++) {
    const ax = pts[i - 1][0], az = pts[i - 1][1]
    const bx = pts[i][0],     bz = pts[i][1]
    const dx = bx - ax,       dz = bz - az
    const segLen = Math.sqrt(dx * dx + dz * dz)
    if (segLen < 0.001) continue

    const segEnd = cumLen + segLen

    while (nextDot <= segEnd && result.length < maxCount) {
      const t = (nextDot - cumLen) / segLen
      result.push({
        x: ax + dx * t,
        z: az + dz * t,
      })
      nextDot += spacing
    }

    cumLen = segEnd
  }

  return result
}

export default function PathTrace({ playerRef, npcs, rescuedIds, followingIds, showPath }) {
  const meshRef = useRef()

  useFrame(() => {
    if (!meshRef.current) return
    const mesh = meshRef.current

    // ── Hide all dots if path is off or nothing to guide ───────────────────
    if (!showPath || !playerRef?.current) {
      for (let i = 0; i < MAX_DOTS; i++) {
        _dummy.scale.set(0, 0, 0)
        _dummy.updateMatrix()
        mesh.setMatrixAt(i, _dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
      return
    }

    const player = playerRef.current
    const px = player.position.x
    const pz = player.position.z
    const isReturning = followingIds.length > 0

    // ── Determine target position ──────────────────────────────────────────
    let targetX = null
    let targetZ = null

    if (isReturning) {
      targetX = 0
      targetZ = 0
    } else {
      let minDist = Infinity
      for (const npc of npcs) {
        if (rescuedIds.includes(npc.id)) continue
        const dx = npc.position[0] - px
        const dz = npc.position[2] - pz
        const d  = dx * dx + dz * dz
        if (d < minDist) {
          minDist = d
          targetX = npc.position[0]
          targetZ = npc.position[2]
        }
      }
    }

    // ── All NPCs rescued — hide dots ───────────────────────────────────────
    if (targetX === null) {
      for (let i = 0; i < MAX_DOTS; i++) {
        _dummy.scale.set(0, 0, 0)
        _dummy.updateMatrix()
        mesh.setMatrixAt(i, _dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
      return
    }

    // ── Build a maze-aware path ────────────────────────────────────────────
    const pathPts = buildMazePath(px, pz, targetX, targetZ)

    // Sample evenly-spaced dot positions, skipping the first 2.5 units
    const dotPositions = samplePolyline(pathPts, 2.5, DOT_SPACING, MAX_DOTS)
    const numDots = dotPositions.length

    const pulse     = (Date.now() % 1200) / 1200
    const baseColor = isReturning ? RETURN_COLOR : SEEK_COLOR

    for (let i = 0; i < MAX_DOTS; i++) {
      if (i < numDots) {
        const { x: wx, z: wz } = dotPositions[i]
        const wy = 0.45   // hover slightly above flat floor

        const t         = i / Math.max(numDots - 1, 1)
        const phase     = ((pulse - t + 1) % 1)
        const brightness = 0.55 + 0.45 * Math.max(0, Math.sin(phase * Math.PI))
        const scale      = 0.7  + 0.35 * Math.max(0, Math.sin(phase * Math.PI))

        _dummy.position.set(wx, wy, wz)
        _dummy.scale.set(scale, scale, scale)
        _dummy.updateMatrix()
        mesh.setMatrixAt(i, _dummy.matrix)

        _col.copy(baseColor).multiplyScalar(brightness)
        mesh.setColorAt(i, _col)
      } else {
        _dummy.scale.set(0, 0, 0)
        _dummy.updateMatrix()
        mesh.setMatrixAt(i, _dummy.matrix)
      }
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[null, null, MAX_DOTS]}>
      <sphereGeometry args={[DOT_RADIUS, 8, 8]} />
      <meshStandardMaterial
        emissive={SEEK_COLOR}
        emissiveIntensity={0.7}
        roughness={0.3}
        metalness={0.1}
      />
    </instancedMesh>
  )
}
