// ═══════════════════════════════════════════════════════════════════════════
// PROCEDURAL WORLD COMPONENT
// Manages chunk loading/unloading and efficient instanced rendering
// ═══════════════════════════════════════════════════════════════════════════

import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  createNoise2D,
  fbm,
  getTerrainHeight,
  getBiome,
  generateChunkObjects,
  chunkKey,
  worldToChunk,
  CHUNK_SIZE,
  RENDER_DISTANCE,
  UNLOAD_DISTANCE,
  BIOME,
} from '../worldGen'

// ── World seed (could be randomized or user-provided) ────────────────────────
const WORLD_SEED = 12345

// ── Geometry pools (created once, reused) ────────────────────────────────────
const TREE_SEGMENTS = 5
const MAX_INSTANCES_PER_TYPE = 800

// ═══════════════════════════════════════════════════════════════════════════
// TERRAIN CHUNK - Uses a plane geometry with displaced vertices
// ═══════════════════════════════════════════════════════════════════════════
function TerrainChunk({ cx, cz, noise }) {
  const meshRef = useRef()
  const resolution = 12 // Vertices per side - LOFI
  
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(
      CHUNK_SIZE, CHUNK_SIZE,
      resolution - 1, resolution - 1
    )
    geo.rotateX(-Math.PI / 2)
    
    const positions = geo.attributes.position.array
    const colors = new Float32Array(positions.length)
    
    const worldX0 = cx * CHUNK_SIZE - CHUNK_SIZE / 2
    const worldZ0 = cz * CHUNK_SIZE - CHUNK_SIZE / 2
    
    for (let i = 0; i < positions.length; i += 3) {
      const localX = positions[i]
      const localZ = positions[i + 2]
      const worldX = worldX0 + localX + CHUNK_SIZE / 2
      const worldZ = worldZ0 + localZ + CHUNK_SIZE / 2
      
      // Set height
      const height = getTerrainHeight(noise, worldX, worldZ)
      positions[i + 1] = height
      
      // Set color based on biome
      const biome = getBiome(noise, worldX, worldZ)
      let r, g, b
      
      switch (biome) {
        case BIOME.ALPINE_PEAKS:
          // Harsh white/grey rock and ice
          r = 0.82 + Math.random() * 0.12
          g = 0.85 + Math.random() * 0.1
          b = 0.9 + Math.random() * 0.1
          break
        case BIOME.ICE_MOUNTAINS:
          // White/blue ice
          r = 0.85 + Math.random() * 0.1
          g = 0.9 + Math.random() * 0.08
          b = 0.95 + Math.random() * 0.05
          break
        case BIOME.CANYON:
          // Rocky brown/grey
          r = 0.55 + Math.random() * 0.15
          g = 0.5 + Math.random() * 0.12
          b = 0.48 + Math.random() * 0.1
          break
        case BIOME.FROZEN_LAKE:
          // Deep blue ice
          r = 0.55 + Math.random() * 0.1
          g = 0.75 + Math.random() * 0.1
          b = 0.92 + Math.random() * 0.08
          break
        case BIOME.DENSE_PINE_FOREST:
          // Dark forest floor with snow patches
          r = 0.85 + Math.random() * 0.08
          g = 0.88 + Math.random() * 0.08
          b = 0.9 + Math.random() * 0.08
          break
        case BIOME.FROZEN_FOREST:
          // Slightly darker snow (shadows from trees)
          r = 0.9 + Math.random() * 0.06
          g = 0.92 + Math.random() * 0.05
          b = 0.94 + Math.random() * 0.05
          break
        case BIOME.BIRCH_GROVE:
          // Lighter, slightly golden tint
          r = 0.95 + Math.random() * 0.05
          g = 0.94 + Math.random() * 0.04
          b = 0.88 + Math.random() * 0.06
          break
        case BIOME.CRYSTAL_FIELD:
          // Slight purple/pink tint
          r = 0.88 + Math.random() * 0.08
          g = 0.82 + Math.random() * 0.1
          b = 0.95 + Math.random() * 0.05
          break
        case BIOME.TUNDRA:
          // Grey-brown with sparse snow
          r = 0.75 + Math.random() * 0.12
          g = 0.78 + Math.random() * 0.1
          b = 0.8 + Math.random() * 0.1
          break
        default: // SNOW_PLAINS
          // Pure white snow
          r = 0.95 + Math.random() * 0.05
          g = 0.97 + Math.random() * 0.03
          b = 0.98 + Math.random() * 0.02
      }
      
      colors[i] = r
      colors[i + 1] = g
      colors[i + 2] = b
    }
    
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    
    return geo
  }, [cx, cz, noise])
  
  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={[cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE]}
      receiveShadow
    >
      <meshStandardMaterial
        vertexColors
        roughness={0.9}
        metalness={0.1}
        flatShading={false}
      />
    </mesh>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// INSTANCED TREES - Snow-covered pines using InstancedMesh
// ═══════════════════════════════════════════════════════════════════════════
function InstancedTrees({ trees }) {
  const trunkRef = useRef()
  const foliageRefs = [useRef(), useRef(), useRef()]
  const snowCapRefs = [useRef(), useRef(), useRef()]
  
  const count = Math.min(trees.length, MAX_INSTANCES_PER_TYPE)
  
  useEffect(() => {
    if (count === 0) return
    
    const dummy = new THREE.Object3D()
    
    for (let i = 0; i < count; i++) {
      const t = trees[i]
      dummy.position.set(t.x, t.y, t.z)
      dummy.rotation.set(0, t.rotation, 0)
      dummy.scale.setScalar(t.scale)
      dummy.updateMatrix()
      
      // Trunk
      if (trunkRef.current) {
        trunkRef.current.setMatrixAt(i, dummy.matrix)
      }
      
      // Foliage layers (3 cones) - SCALED UP
      foliageRefs.forEach((ref, layer) => {
        if (ref.current) {
          dummy.position.set(t.x, t.y + 3.0 + layer * 2.0, t.z)
          dummy.scale.set(t.scale * (1 - layer * 0.2), t.scale, t.scale * (1 - layer * 0.2))
          dummy.updateMatrix()
          ref.current.setMatrixAt(i, dummy.matrix)
        }
      })
      
      // Snow caps
      snowCapRefs.forEach((ref, layer) => {
        if (ref.current) {
          dummy.position.set(t.x, t.y + 3.8 + layer * 2.0, t.z)
          dummy.scale.set(t.scale * (0.9 - layer * 0.18), t.scale * 0.3, t.scale * (0.9 - layer * 0.18))
          dummy.updateMatrix()
          ref.current.setMatrixAt(i, dummy.matrix)
        }
      })
    }
    
    // Update matrices
    if (trunkRef.current) trunkRef.current.instanceMatrix.needsUpdate = true
    foliageRefs.forEach(ref => {
      if (ref.current) ref.current.instanceMatrix.needsUpdate = true
    })
    snowCapRefs.forEach(ref => {
      if (ref.current) ref.current.instanceMatrix.needsUpdate = true
    })
  }, [trees, count])
  
  if (count === 0) return null
  
  return (
    <group>
      {/* Tree trunks - SCALED UP */}
      <instancedMesh ref={trunkRef} args={[null, null, count]} castShadow>
        <cylinderGeometry args={[0.4, 0.6, 3.0, TREE_SEGMENTS]} />
        <meshStandardMaterial color="#5d4037" roughness={0.9} />
      </instancedMesh>
      
      {/* Foliage layers - SCALED UP */}
      {foliageRefs.map((ref, i) => (
        <instancedMesh key={`foliage-${i}`} ref={ref} args={[null, null, count]} castShadow>
          <coneGeometry args={[3.0 - i * 0.6, 3.5 - i * 0.4, TREE_SEGMENTS]} />
          <meshStandardMaterial color="#1b5e20" roughness={0.8} />
        </instancedMesh>
      ))}
      
      {/* Snow caps - SCALED UP */}
      {snowCapRefs.map((ref, i) => (
        <instancedMesh key={`snow-${i}`} ref={ref} args={[null, null, count]} castShadow>
          <coneGeometry args={[2.8 - i * 0.55, 1.0, TREE_SEGMENTS]} />
          <meshStandardMaterial color="#ffffff" roughness={0.8} />
        </instancedMesh>
      ))}
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// INSTANCED ROCKS - Ice-covered boulders
// ═══════════════════════════════════════════════════════════════════════════
function InstancedRocks({ rocks }) {
  const meshRef = useRef()
  const count = Math.min(rocks.length, MAX_INSTANCES_PER_TYPE)
  
  useEffect(() => {
    if (count === 0 || !meshRef.current) return
    
    const dummy = new THREE.Object3D()
    
    for (let i = 0; i < count; i++) {
      const r = rocks[i]
      dummy.position.set(r.x, r.y + r.scale * 0.3, r.z)
      dummy.rotation.set(0, r.rotation, 0)
      dummy.scale.set(r.scale, r.scale * 0.7, r.scale * 0.8)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [rocks, count])
  
  if (count === 0) return null
  
  return (
    <instancedMesh ref={meshRef} args={[null, null, count]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#78909c" roughness={0.7} metalness={0.2} />
    </instancedMesh>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// INSTANCED CRYSTALS - Glowing ice crystals
// ═══════════════════════════════════════════════════════════════════════════
function InstancedCrystals({ crystals }) {
  const meshRef = useRef()
  const glowRef = useRef()
  const count = Math.min(crystals.length, MAX_INSTANCES_PER_TYPE)
  
  useEffect(() => {
    if (count === 0) return
    
    const dummy = new THREE.Object3D()
    
    for (let i = 0; i < count; i++) {
      const c = crystals[i]
      dummy.position.set(c.x, c.y + c.scale * 0.8, c.z)
      dummy.rotation.set(0, c.rotation, Math.PI * 0.05)
      dummy.scale.set(c.scale * 0.4, c.scale * 1.5, c.scale * 0.4)
      dummy.updateMatrix()
      
      if (meshRef.current) meshRef.current.setMatrixAt(i, dummy.matrix)
      if (glowRef.current) glowRef.current.setMatrixAt(i, dummy.matrix)
    }
    
    if (meshRef.current) meshRef.current.instanceMatrix.needsUpdate = true
    if (glowRef.current) glowRef.current.instanceMatrix.needsUpdate = true
  }, [crystals, count])
  
  if (count === 0) return null
  
  return (
    <group>
      <instancedMesh ref={meshRef} args={[null, null, count]} castShadow>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#a855f7"
          emissive="#7c3aed"
          emissiveIntensity={0.5}
          transparent
          opacity={0.85}
          roughness={0.2}
          metalness={0.3}
        />
      </instancedMesh>
      
      {/* Glow effect */}
      <instancedMesh ref={glowRef} args={[null, null, count]}>
        <octahedronGeometry args={[1.2, 0]} />
        <meshBasicMaterial
          color="#c4b5fd"
          transparent
          opacity={0.15}
        />
      </instancedMesh>
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// INSTANCED SNOW DRIFTS
// ═══════════════════════════════════════════════════════════════════════════
function InstancedSnowDrifts({ drifts }) {
  const meshRef = useRef()
  const count = Math.min(drifts.length, MAX_INSTANCES_PER_TYPE)
  
  useEffect(() => {
    if (count === 0 || !meshRef.current) return
    
    const dummy = new THREE.Object3D()
    
    for (let i = 0; i < count; i++) {
      const d = drifts[i]
      dummy.position.set(d.x, d.y + 0.1, d.z)
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0)
      dummy.scale.set(d.scale, d.scale * 0.3, d.scale * 0.8)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [drifts, count])
  
  if (count === 0) return null
  
  return (
    <instancedMesh ref={meshRef} args={[null, null, count]} receiveShadow>
      <sphereGeometry args={[1, 8, 6]} />
      <meshStandardMaterial color="#f0f4f8" roughness={0.95} />
    </instancedMesh>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// INSTANCED TALL PINES - Taller, more majestic pine trees
// ═══════════════════════════════════════════════════════════════════════════
function InstancedTallPines({ trees }) {
  const trunkRef = useRef()
  const foliageRefs = [useRef(), useRef(), useRef(), useRef()]
  const snowCapRefs = [useRef(), useRef(), useRef(), useRef()]
  
  const count = Math.min(trees.length, MAX_INSTANCES_PER_TYPE)
  
  useEffect(() => {
    if (count === 0) return
    
    const dummy = new THREE.Object3D()
    
    for (let i = 0; i < count; i++) {
      const t = trees[i]
      
      // Trunk - TALL
      dummy.position.set(t.x, t.y + 2.5, t.z)
      dummy.rotation.set(0, t.rotation, 0)
      dummy.scale.set(t.scale * 0.9, t.scale * 1.6, t.scale * 0.9)
      dummy.updateMatrix()
      if (trunkRef.current) trunkRef.current.setMatrixAt(i, dummy.matrix)
      
      // Foliage layers (4 cones for taller tree) - SCALED UP
      foliageRefs.forEach((ref, layer) => {
        if (ref.current) {
          dummy.position.set(t.x, t.y + 5.0 + layer * 2.5, t.z)
          dummy.scale.set(t.scale * (1.1 - layer * 0.18), t.scale * 1.2, t.scale * (1.1 - layer * 0.18))
          dummy.updateMatrix()
          ref.current.setMatrixAt(i, dummy.matrix)
        }
      })
      
      // Snow caps
      snowCapRefs.forEach((ref, layer) => {
        if (ref.current) {
          dummy.position.set(t.x, t.y + 6.0 + layer * 2.5, t.z)
          dummy.scale.set(t.scale * (0.95 - layer * 0.15), t.scale * 0.3, t.scale * (0.95 - layer * 0.15))
          dummy.updateMatrix()
          ref.current.setMatrixAt(i, dummy.matrix)
        }
      })
    }
    
    if (trunkRef.current) trunkRef.current.instanceMatrix.needsUpdate = true
    foliageRefs.forEach(ref => { if (ref.current) ref.current.instanceMatrix.needsUpdate = true })
    snowCapRefs.forEach(ref => { if (ref.current) ref.current.instanceMatrix.needsUpdate = true })
  }, [trees, count])
  
  if (count === 0) return null
  
  return (
    <group>
      <instancedMesh ref={trunkRef} args={[null, null, count]} castShadow>
        <cylinderGeometry args={[0.3, 0.55, 5.0, 6]} />
        <meshStandardMaterial color="#4a3728" roughness={0.95} />
      </instancedMesh>
      {foliageRefs.map((ref, i) => (
        <instancedMesh key={`foliage-${i}`} ref={ref} args={[null, null, count]} castShadow>
          <coneGeometry args={[3.5 - i * 0.7, 4.5 - i * 0.6, TREE_SEGMENTS]} />
          <meshStandardMaterial color="#0d3d0d" roughness={0.85} />
        </instancedMesh>
      ))}
      {snowCapRefs.map((ref, i) => (
        <instancedMesh key={`snow-${i}`} ref={ref} args={[null, null, count]} castShadow>
          <coneGeometry args={[3.2 - i * 0.65, 0.9, TREE_SEGMENTS]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.8} />
        </instancedMesh>
      ))}
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// INSTANCED BIRCH TREES - Elegant white-bark trees
// ═══════════════════════════════════════════════════════════════════════════
function InstancedBirchTrees({ trees }) {
  const trunkRef = useRef()
  const branchRefs = [useRef(), useRef(), useRef()]
  const foliageRef = useRef()
  
  const count = Math.min(trees.length, MAX_INSTANCES_PER_TYPE)
  
  useEffect(() => {
    if (count === 0) return
    
    const dummy = new THREE.Object3D()
    
    for (let i = 0; i < count; i++) {
      const t = trees[i]
      
      // White trunk - TALL
      dummy.position.set(t.x, t.y + 4.0, t.z)
      dummy.rotation.set(0, t.rotation, 0)
      dummy.scale.set(t.scale * 0.6, t.scale * 1.8, t.scale * 0.6)
      dummy.updateMatrix()
      if (trunkRef.current) trunkRef.current.setMatrixAt(i, dummy.matrix)
      
      // Branches at different heights - SCALED UP
      branchRefs.forEach((ref, layer) => {
        if (ref.current) {
          const angle = t.rotation + layer * 2.1
          dummy.position.set(
            t.x + Math.cos(angle) * 1.0 * t.scale,
            t.y + 5.5 + layer * 2.0,
            t.z + Math.sin(angle) * 1.0 * t.scale
          )
          dummy.rotation.set(0.3, angle, 0.5 - layer * 0.15)
          dummy.scale.set(t.scale * 0.3, t.scale * (1.2 - layer * 0.2), t.scale * 0.3)
          dummy.updateMatrix()
          ref.current.setMatrixAt(i, dummy.matrix)
        }
      })
      
      // Sparse foliage crown - SCALED UP
      if (foliageRef.current) {
        dummy.position.set(t.x, t.y + 9.0, t.z)
        dummy.rotation.set(0, t.rotation, 0)
        dummy.scale.set(t.scale * 2.5, t.scale * 1.8, t.scale * 2.5)
        dummy.updateMatrix()
        foliageRef.current.setMatrixAt(i, dummy.matrix)
      }
    }
    
    if (trunkRef.current) trunkRef.current.instanceMatrix.needsUpdate = true
    branchRefs.forEach(ref => { if (ref.current) ref.current.instanceMatrix.needsUpdate = true })
    if (foliageRef.current) foliageRef.current.instanceMatrix.needsUpdate = true
  }, [trees, count])
  
  if (count === 0) return null
  
  return (
    <group>
      <instancedMesh ref={trunkRef} args={[null, null, count]} castShadow>
        <cylinderGeometry args={[0.2, 0.35, 8.0, 6]} />
        <meshStandardMaterial color="#e8e4df" roughness={0.7} />
      </instancedMesh>
      {branchRefs.map((ref, i) => (
        <instancedMesh key={`branch-${i}`} ref={ref} args={[null, null, count]} castShadow>
          <cylinderGeometry args={[0.08, 0.12, 2.5, 4]} />
          <meshStandardMaterial color="#d4cdc5" roughness={0.75} />
        </instancedMesh>
      ))}
      <instancedMesh ref={foliageRef} args={[null, null, count]} castShadow>
        <dodecahedronGeometry args={[2.5, 1]} />
        <meshStandardMaterial color="#9ca38f" roughness={0.9} transparent opacity={0.85} />
      </instancedMesh>
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// INSTANCED DEAD TREES - Bare, skeletal trees
// ═══════════════════════════════════════════════════════════════════════════
function InstancedDeadTrees({ trees }) {
  const trunkRef = useRef()
  const branchRefs = [useRef(), useRef(), useRef(), useRef()]
  
  const count = Math.min(trees.length, MAX_INSTANCES_PER_TYPE)
  
  useEffect(() => {
    if (count === 0) return
    
    const dummy = new THREE.Object3D()
    
    for (let i = 0; i < count; i++) {
      const t = trees[i]
      
      // Gnarled trunk - BIGGER
      dummy.position.set(t.x, t.y + 2.5, t.z)
      dummy.rotation.set(0.05, t.rotation, 0.08)
      dummy.scale.set(t.scale * 1.5, t.scale * 3.0, t.scale * 1.5)
      dummy.updateMatrix()
      if (trunkRef.current) trunkRef.current.setMatrixAt(i, dummy.matrix)
      
      // Bare branches pointing up - BIGGER
      branchRefs.forEach((ref, layer) => {
        if (ref.current) {
          const angle = t.rotation + layer * 1.57
          const tilt = 0.3 + layer * 0.2
          dummy.position.set(
            t.x + Math.cos(angle) * 0.4 * t.scale,
            t.y + 4.0 + layer * 0.8,
            t.z + Math.sin(angle) * 0.4 * t.scale
          )
          dummy.rotation.set(tilt, angle, 0)
          dummy.scale.set(t.scale * 0.4, t.scale * (1.8 - layer * 0.25), t.scale * 0.4)
          dummy.updateMatrix()
          ref.current.setMatrixAt(i, dummy.matrix)
        }
      })
    }
    
    if (trunkRef.current) trunkRef.current.instanceMatrix.needsUpdate = true
    branchRefs.forEach(ref => { if (ref.current) ref.current.instanceMatrix.needsUpdate = true })
  }, [trees, count])
  
  if (count === 0) return null
  
  return (
    <group>
      <instancedMesh ref={trunkRef} args={[null, null, count]} castShadow>
        <cylinderGeometry args={[0.15, 0.4, 5.0, 5]} />
        <meshStandardMaterial color="#3d3229" roughness={0.95} />
      </instancedMesh>
      {branchRefs.map((ref, i) => (
        <instancedMesh key={`branch-${i}`} ref={ref} args={[null, null, count]} castShadow>
          <cylinderGeometry args={[0.05, 0.1, 2.5, 4]} />
          <meshStandardMaterial color="#4a3f35" roughness={0.9} />
        </instancedMesh>
      ))}
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// INSTANCED SHRUBS - Small snow-covered bushes
// ═══════════════════════════════════════════════════════════════════════════
function InstancedShrubs({ shrubs }) {
  const baseRef = useRef()
  const snowRef = useRef()
  
  const count = Math.min(shrubs.length, MAX_INSTANCES_PER_TYPE)
  
  useEffect(() => {
    if (count === 0) return
    
    const dummy = new THREE.Object3D()
    
    for (let i = 0; i < count; i++) {
      const s = shrubs[i]
      
      // Bush base - BIGGER
      dummy.position.set(s.x, s.y + s.scale * 0.6, s.z)
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0)
      dummy.scale.set(s.scale * 2.5, s.scale * 1.5, s.scale * 2.5)
      dummy.updateMatrix()
      if (baseRef.current) baseRef.current.setMatrixAt(i, dummy.matrix)
      
      // Snow cap - BIGGER
      if (snowRef.current) {
        dummy.position.set(s.x, s.y + s.scale * 1.0, s.z)
        dummy.scale.set(s.scale * 2.1, s.scale * 0.75, s.scale * 2.1)
        dummy.updateMatrix()
        snowRef.current.setMatrixAt(i, dummy.matrix)
      }
    }
    
    if (baseRef.current) baseRef.current.instanceMatrix.needsUpdate = true
    if (snowRef.current) snowRef.current.instanceMatrix.needsUpdate = true
  }, [shrubs, count])
  
  if (count === 0) return null
  
  return (
    <group>
      <instancedMesh ref={baseRef} args={[null, null, count]} castShadow>
        <dodecahedronGeometry args={[1.3, 0]} />
        <meshStandardMaterial color="#2d4a2d" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={snowRef} args={[null, null, count]}>
        <sphereGeometry args={[1.3, 6, 5]} />
        <meshStandardMaterial color="#f0f5f0" roughness={0.85} />
      </instancedMesh>
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// INSTANCED FROZEN TREES - Ice-encased trees
// ═══════════════════════════════════════════════════════════════════════════
function InstancedFrozenTrees({ trees }) {
  const trunkRef = useRef()
  const iceRef = useRef()
  const foliageRef = useRef()
  
  const count = Math.min(trees.length, MAX_INSTANCES_PER_TYPE)
  
  useEffect(() => {
    if (count === 0) return
    
    const dummy = new THREE.Object3D()
    
    for (let i = 0; i < count; i++) {
      const t = trees[i]
      
      // Frozen trunk - BIGGER
      dummy.position.set(t.x, t.y + 2.0, t.z)
      dummy.rotation.set(0, t.rotation, 0)
      dummy.scale.setScalar(t.scale * 2.5)
      dummy.updateMatrix()
      if (trunkRef.current) trunkRef.current.setMatrixAt(i, dummy.matrix)
      
      // Ice coating - BIGGER
      if (iceRef.current) {
        dummy.position.set(t.x, t.y + 3.5, t.z)
        dummy.scale.set(t.scale * 2.8, t.scale * 3.3, t.scale * 2.8)
        dummy.updateMatrix()
        iceRef.current.setMatrixAt(i, dummy.matrix)
      }
      
      // Frozen foliage - BIGGER
      if (foliageRef.current) {
        dummy.position.set(t.x, t.y + 5.0, t.z)
        dummy.scale.set(t.scale * 2.3, t.scale * 2.5, t.scale * 2.3)
        dummy.updateMatrix()
        foliageRef.current.setMatrixAt(i, dummy.matrix)
      }
    }
    
    if (trunkRef.current) trunkRef.current.instanceMatrix.needsUpdate = true
    if (iceRef.current) iceRef.current.instanceMatrix.needsUpdate = true
    if (foliageRef.current) foliageRef.current.instanceMatrix.needsUpdate = true
  }, [trees, count])
  
  if (count === 0) return null
  
  return (
    <group>
      <instancedMesh ref={trunkRef} args={[null, null, count]} castShadow>
        <cylinderGeometry args={[0.25, 0.45, 4.0, 6]} />
        <meshStandardMaterial color="#8ba5b5" roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={iceRef} args={[null, null, count]} castShadow>
        <coneGeometry args={[2.0, 4.0, 6]} />
        <meshStandardMaterial 
          color="#a5d8ff" 
          roughness={0.2} 
          metalness={0.3}
          transparent
          opacity={0.7}
        />
      </instancedMesh>
      <instancedMesh ref={foliageRef} args={[null, null, count]} castShadow>
        <coneGeometry args={[1.8, 3.0, 6]} />
        <meshStandardMaterial color="#4a7c94" roughness={0.75} />
      </instancedMesh>
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// INSTANCED ICE SHARDS - Crystalline ice formations
// ═══════════════════════════════════════════════════════════════════════════
function InstancedIceShards({ shards }) {
  const mainRef = useRef()
  const secondaryRef = useRef()
  
  const count = Math.min(shards.length, MAX_INSTANCES_PER_TYPE)
  
  useEffect(() => {
    if (count === 0) return
    
    const dummy = new THREE.Object3D()
    
    for (let i = 0; i < count; i++) {
      const s = shards[i]
      
      // Main shard - BIGGER
      dummy.position.set(s.x, s.y + s.scale * 2.0, s.z)
      dummy.rotation.set(0.1, s.rotation, 0.15)
      dummy.scale.set(s.scale * 0.75, s.scale * 3.0, s.scale * 0.75)
      dummy.updateMatrix()
      if (mainRef.current) mainRef.current.setMatrixAt(i, dummy.matrix)
      
      // Secondary smaller shard - BIGGER
      if (secondaryRef.current) {
        dummy.position.set(s.x + 0.8, s.y + s.scale * 1.3, s.z + 0.5)
        dummy.rotation.set(-0.2, s.rotation + 0.8, 0.3)
        dummy.scale.set(s.scale * 0.5, s.scale * 1.8, s.scale * 0.5)
        dummy.updateMatrix()
        secondaryRef.current.setMatrixAt(i, dummy.matrix)
      }
    }
    
    if (mainRef.current) mainRef.current.instanceMatrix.needsUpdate = true
    if (secondaryRef.current) secondaryRef.current.instanceMatrix.needsUpdate = true
  }, [shards, count])
  
  if (count === 0) return null
  
  return (
    <group>
      <instancedMesh ref={mainRef} args={[null, null, count]} castShadow>
        <coneGeometry args={[1.3, 5.0, 4]} />
        <meshStandardMaterial 
          color="#bae6fd" 
          emissive="#7dd3fc"
          emissiveIntensity={0.15}
          roughness={0.15} 
          metalness={0.4}
          transparent
          opacity={0.85}
        />
      </instancedMesh>
      <instancedMesh ref={secondaryRef} args={[null, null, count]} castShadow>
        <coneGeometry args={[1.0, 3.8, 4]} />
        <meshStandardMaterial 
          color="#e0f2fe" 
          emissive="#a5d8ff"
          emissiveIntensity={0.1}
          roughness={0.2} 
          metalness={0.35}
          transparent
          opacity={0.8}
        />
      </instancedMesh>
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// CHUNK CONTAINER - Renders terrain + objects for one chunk
// ═══════════════════════════════════════════════════════════════════════════
function Chunk({ cx, cz, noise, seed }) {
  const objects = useMemo(() => {
    return generateChunkObjects(noise, cx, cz, seed)
  }, [cx, cz, noise, seed])
  
  return (
    <group>
      <TerrainChunk cx={cx} cz={cz} noise={noise} />
      <InstancedTrees trees={objects.trees} />
      <InstancedTallPines trees={objects.tallPines} />
      <InstancedBirchTrees trees={objects.birchTrees} />
      <InstancedDeadTrees trees={objects.deadTrees} />
      <InstancedShrubs shrubs={objects.shrubs} />
      <InstancedFrozenTrees trees={objects.frozenTrees} />
      <InstancedRocks rocks={objects.rocks} />
      <InstancedCrystals crystals={objects.crystals} />
      <InstancedIceShards shards={objects.iceShards} />
      <InstancedSnowDrifts drifts={objects.snowDrifts} />
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PROCEDURAL WORLD - Main component that manages chunk loading
// ═══════════════════════════════════════════════════════════════════════════
export default function ProceduralWorld({ playerRef }) {
  const [loadedChunks, setLoadedChunks] = useState(new Map())
  const lastPlayerChunk = useRef({ cx: null, cz: null })
  
  // Create noise function once
  const noise = useMemo(() => createNoise2D(WORLD_SEED), [])
  
  // Check and update chunks based on player position
  useFrame(() => {
    if (!playerRef?.current) return
    
    const pos = playerRef.current.position
    const { cx, cz } = worldToChunk(pos.x, pos.z)
    
    // Only recalculate if player moved to a new chunk
    if (cx === lastPlayerChunk.current.cx && cz === lastPlayerChunk.current.cz) {
      return
    }
    lastPlayerChunk.current = { cx, cz }
    
    // Determine which chunks should be loaded
    const shouldExist = new Set()
    for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
      for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
        shouldExist.add(chunkKey(cx + dx, cz + dz))
      }
    }
    
    // Calculate new chunks map
    setLoadedChunks(prev => {
      const next = new Map()
      
      // Keep existing chunks that are still in range
      for (const [key, chunk] of prev) {
        const [chunkCx, chunkCz] = key.split(',').map(Number)
        const dist = Math.max(Math.abs(chunkCx - cx), Math.abs(chunkCz - cz))
        if (dist <= UNLOAD_DISTANCE) {
          next.set(key, chunk)
        }
      }
      
      // Add new chunks
      for (const key of shouldExist) {
        if (!next.has(key)) {
          const [chunkCx, chunkCz] = key.split(',').map(Number)
          next.set(key, { cx: chunkCx, cz: chunkCz })
        }
      }
      
      return next
    })
  })
  
  // Render chunks
  const chunks = Array.from(loadedChunks.values())
  
  return (
    <group>
      {chunks.map(chunk => (
        <Chunk
          key={chunkKey(chunk.cx, chunk.cz)}
          cx={chunk.cx}
          cz={chunk.cz}
          noise={noise}
          seed={WORLD_SEED}
        />
      ))}
    </group>
  )
}

// Export for player terrain collision
export { WORLD_SEED, createNoise2D, getTerrainHeight }

// Import and re-export getTerrainGradient
import { getTerrainGradient as _getTG } from '../worldGen'
export const getTerrainGradient = _getTG
