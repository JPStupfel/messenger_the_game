import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FLOATING_PLATFORMS } from '../gameData'

// ── Decorative geometry helpers ──────────────────────────────────────────────

function Tree({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow position={[0, 1, 0]}>
        <cylinderGeometry args={[0.22, 0.32, 2, 7]} />
        <meshStandardMaterial color="#78350f" />
      </mesh>
      <mesh castShadow position={[0, 3.2, 0]}>
        <coneGeometry args={[1.4, 2.8, 7]} />
        <meshStandardMaterial color="#16a34a" />
      </mesh>
      <mesh castShadow position={[0, 4.6, 0]}>
        <coneGeometry args={[1.0, 2.2, 7]} />
        <meshStandardMaterial color="#15803d" />
      </mesh>
      <mesh castShadow position={[0, 5.7, 0]}>
        <coneGeometry args={[0.65, 1.6, 7]} />
        <meshStandardMaterial color="#166534" />
      </mesh>
    </group>
  )
}

function Crystal({ position, color = '#a78bfa', height = 2.5, rotation = [0, 0, 0] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <coneGeometry args={[0.3, height, 6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, -height * 0.35, 0]}>
        <coneGeometry args={[0.3, height * 0.6, 6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} transparent opacity={0.7} />
      </mesh>
    </group>
  )
}

function CastleTower({ position, height = 8, radius = 1.5, color = '#94a3b8', roofColor = '#7c3aed' }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[radius, radius * 1.1, height, 10]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Battlements */}
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2
        return (
          <mesh key={i} castShadow position={[Math.cos(a) * radius, height / 2 + 0.4, Math.sin(a) * radius]}>
            <boxGeometry args={[0.4, 0.8, 0.4]} />
            <meshStandardMaterial color={color} />
          </mesh>
        )
      })}
      {/* Roof */}
      <mesh castShadow position={[0, height / 2 + 1.1, 0]}>
        <coneGeometry args={[radius + 0.3, 2.5, 10]} />
        <meshStandardMaterial color={roofColor} />
      </mesh>
      {/* Window */}
      <mesh position={[0, 1, -(radius - 0.05)]}>
        <boxGeometry args={[0.5, 0.8, 0.1]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}

function FloatingRock({ position, rx, h, color, accent }) {
  return (
    <group position={position}>
      {/* Island top */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[rx, rx * 0.85, h, 10]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Grass top layer */}
      <mesh position={[0, h / 2 + 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[rx, rx, 0.3, 10]} />
        <meshStandardMaterial color="#4ade80" />
      </mesh>
      {/* Dangling stalactite */}
      <mesh castShadow position={[0, -h / 2 - 1, 0]}>
        <coneGeometry args={[rx * 0.6, 2, 8]} />
        <meshStandardMaterial color={accent} />
      </mesh>
    </group>
  )
}

// Spinning star collectible
function StarOrb({ position }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = clock.getElapsedTime() * 1.5
    ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2) * 0.2
  })
  return (
    <group ref={ref} position={position}>
      <mesh castShadow>
        <octahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.8} />
      </mesh>
      <pointLight color="#fbbf24" intensity={1.5} distance={4} />
    </group>
  )
}

// Animated magic portal ring
function Portal({ position }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.z = clock.getElapsedTime()
  })
  return (
    <group position={position}>
      <mesh ref={ref}>
        <torusGeometry args={[1.8, 0.18, 8, 40]} />
        <meshStandardMaterial color="#a78bfa" emissive="#7c3aed" emissiveIntensity={1} />
      </mesh>
      <mesh>
        <circleGeometry args={[1.6, 32]} />
        <meshStandardMaterial color="#4c1d95" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      <pointLight color="#a78bfa" intensity={2} distance={6} />
    </group>
  )
}

// Clouds floating in background
function Cloud({ position }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.position.x = position[0] + Math.sin(clock.getElapsedTime() * 0.15) * 3
  })
  const blobs = [[0,0,0],[1.2,0.2,0],[-1.1,0.1,0],[0.5,0.5,0],[-0.4,0.4,0]]
  return (
    <group ref={ref} position={position}>
      {blobs.map(([x, y, z], i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.9 + Math.random() * 0.4, 8, 8]} />
          <meshStandardMaterial color="white" transparent opacity={0.75} />
        </mesh>
      ))}
    </group>
  )
}

// ── Main World ───────────────────────────────────────────────────────────────
const TREE_SPOTS = [
  [-8, 0, -8], [10, 0, -6], [-14, 0, 4], [6, 0, 14], [-6, 0, 15],
  [16, 0, 8],  [-18, 0, -2], [12, 0, 12], [-10, 0, -16], [4, 0, -18],
  [18, 0, -12],[0, 0, -20],  [-16, 0, 14],[8, 0, -14],
]

export default function World() {
  return (
    <group>
      {/* Sky fog color via background */}
      {/* Main island */}
      <mesh receiveShadow position={[0, -1.5, 0]}>
        <cylinderGeometry args={[24, 20, 3, 16]} />
        <meshStandardMaterial color="#15803d" />
      </mesh>
      {/* Grass top */}
      <mesh receiveShadow position={[0, 0.05, 0]}>
        <cylinderGeometry args={[24, 24, 0.1, 16]} />
        <meshStandardMaterial color="#4ade80" />
      </mesh>
      {/* Underbelly rock */}
      <mesh castShadow position={[0, -4.5, 0]}>
        <coneGeometry args={[14, 4, 10]} />
        <meshStandardMaterial color="#78716c" />
      </mesh>

      {/* Castle complex */}
      <CastleTower position={[0, 0, 0]} height={14} radius={2.2} roofColor="#7c3aed" />
      <CastleTower position={[5, 0, 0]}  height={9}  radius={1.3} roofColor="#db2777" />
      <CastleTower position={[-5, 0, 0]} height={9}  radius={1.3} roofColor="#0891b2" />
      <CastleTower position={[0, 0, 5]}  height={9}  radius={1.3} roofColor="#ca8a04" />
      <CastleTower position={[0, 0, -5]} height={9}  radius={1.3} roofColor="#059669" />

      {/* Castle walls connecting towers */}
      {[
        [2.6, 4.5, -2.6, 0, Math.PI * 0.25],
        [-2.6, 4.5, -2.6, 0, -Math.PI * 0.25],
        [2.6, 4.5, 2.6, 0, -Math.PI * 0.25],
        [-2.6, 4.5, 2.6, 0, Math.PI * 0.25],
      ].map(([x, y, z, , rot], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, rot, 0]} castShadow>
          <boxGeometry args={[4, 9, 0.5]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
      ))}

      {/* Portal */}
      <Portal position={[0, 8.5, -6]} />

      {/* Trees */}
      {TREE_SPOTS.map(([x, y, z], i) => (
        <Tree key={i} position={[x, y, z]} scale={0.7 + Math.random() * 0.5} />
      ))}

      {/* Crystal clusters */}
      <group position={[14, 0, 6]}>
        <Crystal position={[0, 1.2, 0]}   color="#a78bfa" height={2.4} />
        <Crystal position={[0.8, 0.8, 0]} color="#c084fc" height={1.8} rotation={[0.2, 0, 0.3]} />
        <Crystal position={[-0.6, 0.7, 0.5]} color="#818cf8" height={1.5} rotation={[-0.1, 0, -0.2]} />
      </group>
      <group position={[-15, 0, -10]}>
        <Crystal position={[0, 1, 0]}    color="#f472b6" height={2} />
        <Crystal position={[0.9, 0.6, 0]} color="#fb7185" height={1.4} rotation={[0.3, 0, 0.2]} />
      </group>

      {/* Floating star orbs scattered around */}
      <StarOrb position={[8, 3, 8]}  />
      <StarOrb position={[-9, 3, -7]} />
      <StarOrb position={[2, 3, -17]} />

      {/* Floating island platforms */}
      {FLOATING_PLATFORMS.map((p) => (
        <group key={p.id}>
          <FloatingRock position={[p.x, p.y, p.z]} rx={p.rx} h={p.h} color={p.color} accent={p.accent} />
          {/* Small tree on each platform */}
          <Tree position={[p.x + 1, p.y + p.h / 2 + 0.3, p.z + 1]} scale={0.5} />
          <StarOrb position={[p.x - 1.5, p.y + p.h / 2 + 2.5, p.z]} />
        </group>
      ))}

      {/* Clouds */}
      {[
        [30, 18, -20], [-35, 22, 10], [20, 25, 30], [-20, 15, -35], [0, 20, 40],
      ].map(([x, y, z], i) => (
        <Cloud key={i} position={[x, y, z]} />
      ))}

      {/* Ground flowers / bushes */}
      {[
        [6, 0, -10], [-11, 0, 7], [17, 0, 2], [-4, 0, 18], [13, 0, -15],
      ].map(([x, y, z], i) => (
        <mesh key={i} castShadow position={[x, 0.3, z]}>
          <sphereGeometry args={[0.5, 8, 8]} />
          <meshStandardMaterial
            color={['#fbbf24','#f87171','#fb923c','#a78bfa','#67e8f9'][i % 5]}
            emissive={['#fbbf24','#f87171','#fb923c','#a78bfa','#67e8f9'][i % 5]}
            emissiveIntensity={0.15}
          />
        </mesh>
      ))}

      {/* Distant mountains / pillars in the void */}
      {[
        [60, -10, 40], [-70, -15, 30], [50, -5, -70], [-60, -8, -50],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <coneGeometry args={[6, 35, 8]} />
          <meshStandardMaterial color={['#6d28d9','#be185d','#0369a1','#047857'][i]} transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  )
}
