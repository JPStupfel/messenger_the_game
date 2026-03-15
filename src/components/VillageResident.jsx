// VillageResident — a rescued NPC hanging out happily in the village.
// Uses the same character geometry as LostNPC but with a joyful idle animation
// and a green "rescued" name badge.

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { VILLAGE_Y } from '../worldGen'

export default function VillageResident({ data, index = 0 }) {
  const bodyRef = useRef()
  const armLRef = useRef()
  const armRRef = useRef()

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const offset = index * 1.26   // evenly spread phase (≈2π/5) per NPC

    if (bodyRef.current) {
      // Happy gentle bob
      bodyRef.current.position.y = Math.sin(t * 1.6 + offset) * 0.06
    }
    // Wave one arm
    if (armLRef.current) {
      armLRef.current.rotation.z = 0.4 + Math.sin(t * 2.2 + offset) * 0.4
    }
    if (armRRef.current) {
      armRRef.current.rotation.z = -(0.4 + Math.sin(t * 2.2 + offset + Math.PI) * 0.3)
    }
  })

  const [sx, sz] = data.villageSpot
  const position = [sx, VILLAGE_Y, sz]

  return (
    <group position={position}>
      <group ref={bodyRef}>
        {/* Body */}
        <mesh castShadow position={[0, 0.55, 0]}>
          <boxGeometry args={[0.55, 0.9, 0.38]} />
          <meshStandardMaterial color={data.bodyColor} />
        </mesh>

        {/* Head */}
        <mesh castShadow position={[0, 1.3, 0]}>
          <sphereGeometry args={[0.3, 14, 14]} />
          <meshStandardMaterial color={data.skinColor} />
        </mesh>

        {/* Eyes — slightly squinted (happy) */}
        {[[-0.1, 1.35, -0.27], [0.1, 1.35, -0.27]].map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[0.055, 8, 8]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>
        ))}

        {/* Hat */}
        <mesh castShadow position={[0, 1.63, 0]}>
          <cylinderGeometry args={[0.18, 0.32, 0.12, 10]} />
          <meshStandardMaterial color={data.hatColor} />
        </mesh>
        <mesh castShadow position={[0, 1.82, 0]}>
          <cylinderGeometry args={[0.12, 0.18, 0.38, 10]} />
          <meshStandardMaterial color={data.hatColor} />
        </mesh>

        {/* Left arm — animated */}
        <mesh ref={armLRef} position={[-0.42, 0.6, 0]} rotation={[0, 0, 0.4]} castShadow>
          <capsuleGeometry args={[0.09, 0.38, 4, 6]} />
          <meshStandardMaterial color={data.skinColor} />
        </mesh>

        {/* Right arm — animated */}
        <mesh ref={armRRef} position={[0.42, 0.6, 0]} rotation={[0, 0, -0.4]} castShadow>
          <capsuleGeometry args={[0.09, 0.38, 4, 6]} />
          <meshStandardMaterial color={data.skinColor} />
        </mesh>

        {/* Legs */}
        {[[-0.16, -0.1, 0], [0.16, -0.1, 0]].map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]} castShadow>
            <capsuleGeometry args={[0.1, 0.42, 4, 6]} />
            <meshStandardMaterial color={data.hatColor} />
          </mesh>
        ))}
      </group>

      {/* ── Rescued badge ────────────────────────────────── */}
      <Html center position={[0, 2.5, 0]} distanceFactor={10} occlude={false}>
        <div style={{
          background: 'rgba(16,85,16,0.9)',
          color: 'white',
          padding: '3px 10px',
          borderRadius: '999px',
          fontSize: '13px',
          fontWeight: '700',
          fontFamily: 'system-ui, sans-serif',
          whiteSpace: 'nowrap',
          border: '1.5px solid #4ade80',
          pointerEvents: 'none',
          userSelect: 'none',
        }}>
          ✓ {data.name} — home safe!
        </div>
      </Html>
    </group>
  )
}
