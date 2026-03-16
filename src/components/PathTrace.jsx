// PathTrace — animated glowing-dot path guide for kids.
//
// Two modes:
//   • Seeking mode  (orange dots): player → nearest unrescued NPC
//   • Return mode   (cyan dots):   player → village center (following an NPC)
//
// A pulse wave travels along the dots from start to destination,
// giving kids a clear "follow me" visual cue.

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createNoise2D, getTerrainHeight, WORLD_SEED } from './ProceduralWorld'

const MAX_DOTS    = 28     // Enough for ~110-unit path at DOT_SPACING=4; keeps GPU cost low
const DOT_SPACING = 4      // World-units between each dot
const DOT_RADIUS  = 0.22   // Sphere radius

const SEEK_COLOR   = new THREE.Color('#fbbf24')   // warm amber — "go find the NPC"
const RETURN_COLOR = new THREE.Color('#38bdf8')   // sky blue  — "come back home"

const _dummy = new THREE.Object3D()
const _col   = new THREE.Color()

export default function PathTrace({ playerRef, npcs, rescuedIds, followingIds, showPath }) {
  const meshRef = useRef()
  const noise   = useMemo(() => createNoise2D(WORLD_SEED), [])

  useFrame(() => {
    if (!meshRef.current) return

    const mesh = meshRef.current
    // ── Hide all dots if path is off or nothing to guide ───
    if (!showPath || !playerRef?.current) {
      for (let i = 0; i < MAX_DOTS; i++) {
        _dummy.scale.set(0, 0, 0)
        _dummy.updateMatrix()
        mesh.setMatrixAt(i, _dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
      return
    }

    const player     = playerRef.current
    const isReturning = followingIds.length > 0

    // ── Determine target position ───────────────────────────
    let targetX = null
    let targetZ = null

    if (isReturning) {
      // Return home to village center
      targetX = 0
      targetZ = 0
    } else {
      // Find the nearest unrescued NPC
      let minDist = Infinity
      for (const npc of npcs) {
        if (rescuedIds.includes(npc.id)) continue
        const dx = npc.position[0] - player.position.x
        const dz = npc.position[2] - player.position.z
        const d  = dx * dx + dz * dz
        if (d < minDist) {
          minDist = d
          targetX = npc.position[0]
          targetZ = npc.position[2]
        }
      }
    }

    // ── All NPCs rescued — hide dots ───────────────────────
    if (targetX === null) {
      for (let i = 0; i < MAX_DOTS; i++) {
        _dummy.scale.set(0, 0, 0)
        _dummy.updateMatrix()
        mesh.setMatrixAt(i, _dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
      return
    }

    const sx = player.position.x
    const sz = player.position.z
    const dx = targetX - sx
    const dz = targetZ - sz
    const totalDist = Math.sqrt(dx * dx + dz * dz)

    // Start dots just ahead of the player so they don't overlap the character
    const startOffset = 1.5
    const visibleDist = Math.max(0, totalDist - startOffset)
    // Always show at least 1 dot while the target is reachable so the guide
    // never vanishes before the player reaches the NPC / village.
    const minDots = totalDist > startOffset ? 1 : 0
    const numDots = Math.min(MAX_DOTS, Math.max(minDots, Math.floor(visibleDist / DOT_SPACING)))

    const nx = totalDist > 0 ? dx / totalDist : 0   // normalised direction
    const nz = totalDist > 0 ? dz / totalDist : 0

    const pulse = (Date.now() % 1200) / 1200  // 0→1 every 1.2 s
    const baseColor = isReturning ? RETURN_COLOR : SEEK_COLOR

    for (let i = 0; i < MAX_DOTS; i++) {
      if (i < numDots) {
        const rawDist = startOffset + (i + 1) * DOT_SPACING
        // Clamp so the last dot never overshoots the target position
        const dist = Math.min(rawDist, totalDist * 0.97)
        const wx = sx + nx * dist
        const wz = sz + nz * dist
        const wy = getTerrainHeight(noise, wx, wz) + 0.45

        // Sequential pulse: wave travels from player toward target
        const t = i / Math.max(numDots - 1, 1)   // 0 at start, 1 at end
        const phase = ((pulse - t + 1) % 1)        // phase shifts with wave
        const brightness = 0.55 + 0.45 * Math.max(0, Math.sin(phase * Math.PI))
        const scale = 0.7 + 0.35 * Math.max(0, Math.sin(phase * Math.PI))

        _dummy.position.set(wx, wy, wz)
        _dummy.scale.set(scale, scale, scale)
        _dummy.updateMatrix()
        mesh.setMatrixAt(i, _dummy.matrix)

        _col.copy(baseColor).multiplyScalar(brightness)
        mesh.setColorAt(i, _col)
      } else {
        // Hide unused instances
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
