import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { FLOATING_PLATFORMS } from '../gameData'

// ── Decorative geometry helpers ──────────────────────────────────────────────

function SnowTree({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      {/* Trunk */}
      <mesh castShadow position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.16, 0.22, 1.6, 6]} />
        <meshStandardMaterial color="#78350f" />
      </mesh>
      {/* Bottom tier */}
      <mesh castShadow position={[0, 2.2, 0]}>
        <coneGeometry args={[1.2, 2.2, 7]} />
        <meshStandardMaterial color="#15803d" />
      </mesh>
      <mesh castShadow position={[0, 3.12, 0]}>
        <coneGeometry args={[1.2, 0.5, 7]} />
        <meshStandardMaterial color="#f0f9ff" />
      </mesh>
      {/* Middle tier */}
      <mesh castShadow position={[0, 3.5, 0]}>
        <coneGeometry args={[0.85, 1.7, 7]} />
        <meshStandardMaterial color="#166534" />
      </mesh>
      <mesh castShadow position={[0, 4.28, 0]}>
        <coneGeometry args={[0.85, 0.4, 7]} />
        <meshStandardMaterial color="#f0f9ff" />
      </mesh>
      {/* Top tier */}
      <mesh castShadow position={[0, 4.7, 0]}>
        <coneGeometry args={[0.55, 1.3, 7]} />
        <meshStandardMaterial color="#14532d" />
      </mesh>
      <mesh castShadow position={[0, 5.28, 0]}>
        <coneGeometry args={[0.35, 0.4, 7]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
    </group>
  )
}

function IceShard({ position, color = '#93c5fd', height = 2.5, rotation = [0, 0, 0] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <coneGeometry args={[0.28, height, 6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} transparent opacity={0.82} />
      </mesh>
      <mesh position={[0, -height * 0.35, 0]}>
        <coneGeometry args={[0.28, height * 0.55, 6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.1} transparent opacity={0.6} />
      </mesh>
    </group>
  )
}

function IceTower({ position, height = 8, radius = 1.5, color = '#bfdbfe', roofColor = '#38bdf8' }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[radius, radius * 1.1, height, 8]} />
        <meshStandardMaterial color={color} transparent opacity={0.9} />
      </mesh>
      {/* Battlements */}
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2
        return (
          <mesh key={i} castShadow position={[Math.cos(a) * radius, height / 2 + 0.4, Math.sin(a) * radius]}>
            <boxGeometry args={[0.35, 0.7, 0.35]} />
            <meshStandardMaterial color={color} />
          </mesh>
        )
      })}
      {/* Ice cone roof */}
      <mesh castShadow position={[0, height / 2 + 1.3, 0]}>
        <coneGeometry args={[radius + 0.3, 3.2, 8]} />
        <meshStandardMaterial color={roofColor} emissive={roofColor} emissiveIntensity={0.25} transparent opacity={0.88} />
      </mesh>
      {/* Glowing ice window */}
      <mesh position={[0, 1, -(radius - 0.05)]}>
        <boxGeometry args={[0.5, 0.8, 0.1]} />
        <meshStandardMaterial color="#7dd3fc" emissive="#38bdf8" emissiveIntensity={0.8} />
      </mesh>
    </group>
  )
}

function FloatingIceChunk({ position, rx, h, color, accent }) {
  return (
    <group position={position}>
      {/* Ice body */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[rx, rx * 0.82, h, 8]} />
        <meshStandardMaterial color={color} transparent opacity={0.88} />
      </mesh>
      {/* Snow top */}
      <mesh position={[0, h / 2 + 0.12, 0]} receiveShadow>
        <cylinderGeometry args={[rx, rx, 0.25, 8]} />
        <meshStandardMaterial color="#f0f9ff" />
      </mesh>
      {/* Icicle drop */}
      <mesh castShadow position={[0, -h / 2 - 0.9, 0]}>
        <coneGeometry args={[rx * 0.45, 1.8, 6]} />
        <meshStandardMaterial color={accent} transparent opacity={0.75} />
      </mesh>
    </group>
  )
}

// Animated aurora gate (replaces magic portal)
function AuroraGate({ position }) {
  const ref  = useRef()
  const ref2 = useRef()
  useFrame(({ clock }) => {
    if (!ref.current || !ref2.current) return
    ref.current.rotation.z  =  clock.getElapsedTime() * 0.7
    ref2.current.rotation.z = -clock.getElapsedTime() * 0.4
  })
  return (
    <group position={position}>
      <mesh ref={ref}>
        <torusGeometry args={[1.9, 0.15, 8, 40]} />
        <meshStandardMaterial color="#34d399" emissive="#10b981" emissiveIntensity={1.3} />
      </mesh>
      <mesh ref={ref2}>
        <torusGeometry args={[1.6, 0.1, 6, 32]} />
        <meshStandardMaterial color="#67e8f9" emissive="#22d3ee" emissiveIntensity={1.1} />
      </mesh>
      <mesh>
        <circleGeometry args={[1.55, 32]} />
        <meshStandardMaterial color="#0c4a6e" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
      <pointLight color="#34d399" intensity={2.5} distance={7} />
    </group>
  )
}

// Slow-drifting snow cloud
function SnowCloud({ position }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.position.x = position[0] + Math.sin(clock.getElapsedTime() * 0.12) * 4
  })
  const blobs = [[0,0,0],[1.3,0.1,0],[-1.2,0.15,0],[0.6,0.55,0],[-0.5,0.45,0]]
  return (
    <group ref={ref} position={position}>
      {blobs.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[0.95, 8, 8]} />
          <meshStandardMaterial color="#cbd5e1" transparent opacity={0.7} />
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

// Snow jump ramps scattered around the ground
const JUMP_RAMPS = [
  { pos: [9, 0, 8],    rx: 0 },
  { pos: [-10, 0, 5],  rx: 0.15 },
  { pos: [4, 0, -12],  rx: -0.1 },
  { pos: [-5, 0, 16],  rx: 0.1 },
  { pos: [17, 0, -5],  rx: 0.05 },
]

export default function World() {
  return (
    <group>
      {/* Main snowy island */}
      <mesh receiveShadow position={[0, -1.5, 0]}>
        <cylinderGeometry args={[24, 20, 3, 16]} />
        <meshStandardMaterial color="#7ec0d9" />
      </mesh>
      {/* Snow surface */}
      <mesh receiveShadow position={[0, 0.06, 0]}>
        <cylinderGeometry args={[24, 24, 0.12, 16]} />
        <meshStandardMaterial color="#f0f9ff" />
      </mesh>
      {/* Ice underbelly */}
      <mesh castShadow position={[0, -4.5, 0]}>
        <coneGeometry args={[14, 4, 10]} />
        <meshStandardMaterial color="#7dd3fc" transparent opacity={0.8} />
      </mesh>

      {/* Aurora gate — central landmark (no castle) */}
      <AuroraGate position={[0, 4, 0]} />

      {/* Snow trees */}
      {TREE_SPOTS.map(([x, y, z], i) => (
        <SnowTree key={i} position={[x, y, z]} scale={0.65 + (i % 3) * 0.2} />
      ))}

      {/* Snow jump ramps */}
      {JUMP_RAMPS.map(({ pos, rx }, i) => (
        <group key={i} position={pos} rotation={[rx, (i * 1.1) % (Math.PI * 2), 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[2.5, 0.5, 4]} />
            <meshStandardMaterial color="#e0f2fe" />
          </mesh>
          {/* Ramp slope */}
          <mesh castShadow position={[0, 0.38, -2.2]} rotation={[-0.45, 0, 0]}>
            <boxGeometry args={[2.5, 0.2, 1.8]} />
            <meshStandardMaterial color="#f0f9ff" />
          </mesh>
        </group>
      ))}

      {/* Ice shard clusters */}
      <group position={[14, 0, 6]}>
        <IceShard position={[0, 1.2, 0]}      color="#7dd3fc" height={2.4} />
        <IceShard position={[0.8, 0.8, 0]}    color="#bae6fd" height={1.8} rotation={[0.2, 0, 0.3]} />
        <IceShard position={[-0.6, 0.7, 0.5]} color="#93c5fd" height={1.5} rotation={[-0.1, 0, -0.2]} />
      </group>
      <group position={[-15, 0, -10]}>
        <IceShard position={[0, 1, 0]}     color="#a5f3fc" height={2} />
        <IceShard position={[0.9, 0.6, 0]} color="#67e8f9" height={1.4} rotation={[0.3, 0, 0.2]} />
      </group>

      {/* Floating ice platforms */}
      {FLOATING_PLATFORMS.map((p) => (
        <group key={p.id}>
          <FloatingIceChunk position={[p.x, p.y, p.z]} rx={p.rx} h={p.h} color={p.color} accent={p.accent} />
          <SnowTree position={[p.x + 1, p.y + p.h / 2 + 0.3, p.z + 1]} scale={0.45} />
        </group>
      ))}

      {/* Snowstorm clouds */}
      {[
        [30, 18, -20], [-35, 22, 10], [20, 25, 30], [-20, 15, -35], [0, 20, 40],
      ].map(([x, y, z], i) => (
        <SnowCloud key={i} position={[x, y, z]} />
      ))}

      {/* Snow mounds and ice rocks on ground */}
      {[
        [6, 0, -10], [-11, 0, 7], [17, 0, 2], [-4, 0, 18], [13, 0, -15],
      ].map(([x, y, z], i) => (
        <mesh key={i} castShadow position={[x, 0.28, z]}>
          <sphereGeometry args={[0.45 + (i % 2) * 0.2, 8, 8]} />
          <meshStandardMaterial color={['#f0f9ff','#bfdbfe','#e0f2fe','#dbeafe','#f8fafc'][i % 5]} />
        </mesh>
      ))}

      {/* Distant snowy mountains */}
      {[
        [60, -10, 40], [-70, -15, 30], [50, -5, -70], [-60, -8, -50],
      ].map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh>
            <coneGeometry args={[8, 42, 8]} />
            <meshStandardMaterial color="#94a3b8" transparent opacity={0.75} />
          </mesh>
          {/* Snow cap */}
          <mesh position={[0, 18, 0]}>
            <coneGeometry args={[4, 14, 8]} />
            <meshStandardMaterial color="#f8fafc" transparent opacity={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
