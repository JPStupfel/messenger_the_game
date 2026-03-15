import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

const BEFRIEND_DIST = 3.5   // get this close to befriend
const FOLLOW_DIST   = 2.5   // how close yeti stays when following
const FOLLOW_SPEED  = 4.5   // movement speed
const HOP_HEIGHT    = 0.2

const _playerPos = new THREE.Vector3()
const _yetiPos   = new THREE.Vector3()
const _dir       = new THREE.Vector3()

export default function YetiFriend({ startPosition, playerRef }) {
  const groupRef = useRef()
  const [befriended, setBefriended] = useState(true)  // Always following!
  const [showHeart, setShowHeart]   = useState(false)
  const hopPhase = useRef(0)

  useFrame(({ clock }, delta) => {
    if (!groupRef.current || !playerRef?.current) return
    const yeti   = groupRef.current
    const player = playerRef.current

    // Canyon floor is flat at Y = 0
    const terrainY = 0

    _playerPos.copy(player.position)
    _yetiPos.set(yeti.position.x, terrainY, yeti.position.z)

    const dist = _playerPos.distanceTo(_yetiPos)

    // ── Befriend trigger ─────────────────────────────────────
    if (!befriended && dist < BEFRIEND_DIST) {
      setBefriended(true)
      setShowHeart(true)
      setTimeout(() => setShowHeart(false), 2000)
    }

    // ── Idle bounce ──────────────────────────────────────────
    const bounce = Math.sin(clock.getElapsedTime() * 3) * 0.08
    yeti.position.y = terrainY + 0.45 + bounce

    // ── Following behavior ───────────────────────────────────
    if (befriended) {
      // Face player
      _dir.subVectors(_playerPos, _yetiPos)
      _dir.y = 0
      if (_dir.lengthSq() > 0.01) {
        const targetAngle = Math.atan2(_dir.x, _dir.z)
        let diff = targetAngle - yeti.rotation.y
        while (diff >  Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2
        yeti.rotation.y += diff * 0.12
      }

      // Move toward player if too far
      if (dist > FOLLOW_DIST) {
        _dir.normalize()
        const step = Math.min(FOLLOW_SPEED * delta, dist - FOLLOW_DIST + 0.1)
        yeti.position.x += _dir.x * step
        yeti.position.z += _dir.z * step

        // Hopping while moving
        hopPhase.current += delta * 12
        yeti.position.y = terrainY + 0.45 + Math.abs(Math.sin(hopPhase.current)) * HOP_HEIGHT
      } else {
        hopPhase.current = 0
      }
    } else {
      // Idle: slowly look around
      yeti.rotation.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.4
    }
  })

  // Initial position on flat canyon floor
  const initialPosition = [startPosition[0], 0.45, startPosition[2]]

  return (
    <group ref={groupRef} position={initialPosition}>
      {/* ══ BODY — round fluffy yeti ══ */}
      <mesh castShadow>
        <sphereGeometry args={[0.38, 12, 12]} />
        <meshStandardMaterial color="#e0f2fe" />
      </mesh>
      {/* Belly tuft */}
      <mesh castShadow position={[0, -0.05, -0.28]}>
        <sphereGeometry args={[0.22, 10, 10]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>

      {/* ══ HEAD ══ */}
      <mesh castShadow position={[0, 0.42, 0]}>
        <sphereGeometry args={[0.28, 12, 12]} />
        <meshStandardMaterial color="#e0f2fe" />
      </mesh>
      {/* Fluffy cheeks */}
      {[[-0.22, 0.38, -0.08], [0.22, 0.38, -0.08]].map(([x,y,z], i) => (
        <mesh key={i} castShadow position={[x, y, z]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color="#f0f9ff" />
        </mesh>
      ))}

      {/* Big cute eyes */}
      {[[-0.1, 0.48, -0.22], [0.1, 0.48, -0.22]].map(([x,y,z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      ))}
      {/* Eye highlights */}
      {[[-0.08, 0.5, -0.28], [0.12, 0.5, -0.28]].map(([x,y,z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[0.025, 6, 6]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
        </mesh>
      ))}

      {/* Little horn nubs */}
      {[[-0.14, 0.68, 0], [0.14, 0.68, 0]].map(([x,y,z], i) => (
        <mesh key={i} castShadow position={[x, y, z]}>
          <coneGeometry args={[0.06, 0.15, 6]} />
          <meshStandardMaterial color="#7dd3fc" />
        </mesh>
      ))}

      {/* Tiny smile */}
      <mesh position={[0, 0.38, -0.26]} rotation={[-0.15, 0, 0]}>
        <torusGeometry args={[0.05, 0.015, 6, 12, Math.PI]} />
        <meshStandardMaterial color="#f472b6" />
      </mesh>

      {/* ══ ARMS — stubby ══ */}
      {[[-0.38, 0.05, 0], [0.38, 0.05, 0]].map(([x,y,z], i) => (
        <mesh key={i} castShadow position={[x, y, z]} rotation={[0, 0, i === 0 ? 0.5 : -0.5]}>
          <capsuleGeometry args={[0.1, 0.18, 4, 6]} />
          <meshStandardMaterial color="#e0f2fe" />
        </mesh>
      ))}

      {/* ══ FEET — round stumpy ══ */}
      {[[-0.15, -0.4, 0], [0.15, -0.4, 0]].map(([x,y,z], i) => (
        <mesh key={i} castShadow position={[x, y, z]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color="#bfdbfe" />
        </mesh>
      ))}

      {/* ══ TAIL — tiny puff ══ */}
      <mesh castShadow position={[0, -0.1, 0.35]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#f0f9ff" />
      </mesh>

      {/* ══ UI ══ */}
      <Html center position={[0, 1.1, 0]} style={{ pointerEvents: 'none' }}>
        {showHeart && (
          <div className="text-3xl animate-bounce">💙</div>
        )}
        {befriended && !showHeart && (
          <div className="bg-sky-900/70 text-white text-xs px-2 py-1 rounded-full font-bold whitespace-nowrap backdrop-blur-sm">
            ❄️ Frosty
          </div>
        )}
        {!befriended && (
          <div className="bg-black/50 text-sky-200 text-xs px-2 py-1 rounded-full whitespace-nowrap backdrop-blur-sm animate-pulse">
            Come say hi! 👋
          </div>
        )}
      </Html>
    </group>
  )
}
