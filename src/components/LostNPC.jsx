// LostNPC — a villager lost in the blizzard.
// When the player gets close, the NPC starts following.
// When the NPC reaches the village, it is rescued.

import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

const FIND_DIST     = 3.5   // Player must come this close to trigger following
const FOLLOW_DIST   = 2.5   // How far behind the NPC trails the player
const FOLLOW_SPEED  = 5.0   // Movement speed when following
const RESCUE_RADIUS = 12    // Distance from village origin that counts as "home"
const TALK_DIST     = 6     // Range at which speech bubble appears

const _playerPos = new THREE.Vector3()
const _npcPos    = new THREE.Vector3()
const _dir       = new THREE.Vector3()

export default function LostNPC({ data, playerRef, onRescue, onStartFollowing, isRescued }) {
  const groupRef   = useRef()
  const bodyRef    = useRef()
  const hopPhase   = useRef(0)
  const hasTriggeredFollowing = useRef(false)  // guard — fire onStartFollowing once
  const hasTriggeredRescue    = useRef(false)  // guard — fire onRescue once

  const [isFollowing, setIsFollowing] = useState(false)
  const [near, setNear]               = useState(false)

  // Terrain-adjusted spawn position — canyon floor is flat at Y = 0
  const spawnPosition = [data.position[0], 0, data.position[2]]

  useFrame(({ clock }, delta) => {
    if (!groupRef.current || !playerRef?.current) return

    const npc    = groupRef.current
    const player = playerRef.current

    const terrainY = 0  // canyon floor is always flat at Y = 0

    _playerPos.copy(player.position)
    _npcPos.set(npc.position.x, terrainY, npc.position.z)

    const dist = _playerPos.distanceTo(_npcPos)
    setNear(dist < TALK_DIST)

    // ── Shiver animation while still lost ────────────────────
    if (bodyRef.current && !isFollowing) {
      const t = clock.getElapsedTime()
      bodyRef.current.rotation.z = Math.sin(t * 10) * 0.05
      bodyRef.current.position.y = Math.sin(t * 2) * 0.04
    }

    // ── Player found this NPC — start following ───────────────
    if (!isFollowing && dist < FIND_DIST && !hasTriggeredFollowing.current) {
      hasTriggeredFollowing.current = true
      setIsFollowing(true)
      onStartFollowing?.(data.id)
    }

    // ── Following behavior ────────────────────────────────────
    if (isFollowing) {
      if (bodyRef.current) {
        bodyRef.current.rotation.z = 0
        bodyRef.current.position.y = 0
      }

      // Face player
      _dir.subVectors(_playerPos, _npcPos)
      _dir.y = 0
      if (_dir.lengthSq() > 0.01) {
        const targetAngle = Math.atan2(_dir.x, _dir.z)
        let diff = targetAngle - npc.rotation.y
        diff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI
        npc.rotation.y += diff * 0.12
      }

      // Move toward player if too far
      if (dist > FOLLOW_DIST) {
        _dir.normalize()
        const step = Math.min(FOLLOW_SPEED * delta, dist - FOLLOW_DIST + 0.1)
        npc.position.x += _dir.x * step
        npc.position.z += _dir.z * step
        hopPhase.current += delta * 10
        npc.position.y = terrainY + Math.abs(Math.sin(hopPhase.current)) * 0.15
      } else {
        hopPhase.current = 0
        npc.position.y = terrainY
      }

      // ── Check for village rescue ──────────────────────────
      const distToVillage = Math.sqrt(
        npc.position.x * npc.position.x + npc.position.z * npc.position.z
      )
      if (distToVillage < RESCUE_RADIUS && !hasTriggeredRescue.current) {
        hasTriggeredRescue.current = true
        onRescue?.(data.id)
      }
    }
  })

  // Already rescued — unmount (VillageResident takes over)
  if (isRescued) return null

  return (
    <group ref={groupRef} position={spawnPosition}>
      {/* ── Character mesh ─────────────────────────────────── */}
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

        {/* Eyes */}
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

        {/* Arms */}
        {[[-0.42, 0.6, 0], [0.42, 0.6, 0]].map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]} rotation={[0, 0, i === 0 ? 0.4 : -0.4]} castShadow>
            <capsuleGeometry args={[0.09, 0.38, 4, 6]} />
            <meshStandardMaterial color={data.skinColor} />
          </mesh>
        ))}

        {/* Legs */}
        {[[-0.16, -0.1, 0], [0.16, -0.1, 0]].map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]} castShadow>
            <capsuleGeometry args={[0.1, 0.42, 4, 6]} />
            <meshStandardMaterial color={data.hatColor} />
          </mesh>
        ))}
      </group>

      {/* ── Floating name tag ──────────────────────────────── */}
      <Html center position={[0, 2.5, 0]} distanceFactor={10} occlude={false}>
        <div style={{
          background: isFollowing ? 'rgba(16,85,16,0.9)' : 'rgba(80,10,10,0.88)',
          color: 'white',
          padding: '3px 10px',
          borderRadius: '999px',
          fontSize: '13px',
          fontWeight: '700',
          fontFamily: 'system-ui, sans-serif',
          whiteSpace: 'nowrap',
          border: `1.5px solid ${isFollowing ? '#4ade80' : '#f87171'}`,
          pointerEvents: 'none',
          userSelect: 'none',
        }}>
          {isFollowing ? `🏃 ${data.name} — following!` : `❄️ ${data.name}`}
        </div>
      </Html>

      {/* ── Speech bubble ─────────────────────────────────── */}
      {near && (
        <Html center position={[0, 3.4, 0]} distanceFactor={10} occlude={false}>
          <div style={{
            background: 'white',
            color: '#1e1b4b',
            padding: '8px 14px',
            borderRadius: '16px',
            fontSize: '14px',
            fontWeight: '600',
            fontFamily: 'system-ui, sans-serif',
            maxWidth: '180px',
            textAlign: 'center',
            lineHeight: '1.4',
            boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
            border: `2px solid ${isFollowing ? '#4ade80' : '#f87171'}`,
            pointerEvents: 'none',
            userSelect: 'none',
            animation: 'popIn 0.2s ease',
          }}>
            {isFollowing ? '🏠 Lead me back to the village!' : data.lines[0]}
            <div style={{
              position: 'absolute',
              bottom: '-10px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0, height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: `10px solid ${isFollowing ? '#4ade80' : '#f87171'}`,
            }} />
          </div>
          <style>{`@keyframes popIn{from{transform:scale(0.6);opacity:0}to{transform:scale(1);opacity:1}}`}</style>
        </Html>
      )}

      {/* ── Distress ring on ground when lost ─────────────── */}
      {!isFollowing && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.85, 20]} />
          <meshStandardMaterial color="#f87171" transparent opacity={0.35} />
        </mesh>
      )}
    </group>
  )
}
