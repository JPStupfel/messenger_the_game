import { useRef, useState, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { createNoise2D, getTerrainHeight, WORLD_SEED } from './ProceduralWorld'

const TALK_DISTANCE = 5
const LINE_INTERVAL = 3.2   // seconds per line

const _playerPos = new THREE.Vector3()
const _npcPos    = new THREE.Vector3()
const _faceDir   = new THREE.Vector3()

export default function NPC({ data, playerRef }) {
  const groupRef   = useRef()
  const bodyRef    = useRef()
  const lineTimer  = useRef(0)
  const lineIndex  = useRef(0)
  const [near, setNear]       = useState(false)
  const [lineText, setLineText] = useState(data.lines[0])
  
  // Calculate position on terrain
  const noise = useMemo(() => createNoise2D(WORLD_SEED), [])
  const position = useMemo(() => {
    const [x, _y, z] = data.position
    const terrainY = getTerrainHeight(noise, x, z)
    return [x, terrainY, z]
  }, [data.position, noise])

  useFrame(({ clock }, delta) => {
    if (!groupRef.current || !playerRef?.current) return
    const npc    = groupRef.current
    const player = playerRef.current

    // ── Idle bobbing ─────────────────────────────────────────
    if (bodyRef.current) {
      bodyRef.current.position.y = Math.sin(clock.getElapsedTime() * 1.8 + data.id.length) * 0.06
    }

    // ── Distance check ───────────────────────────────────────
    _playerPos.copy(player.position)
    _npcPos.setFromMatrixPosition(npc.matrixWorld)

    const dist = _playerPos.distanceTo(_npcPos)
    const isNear = dist < TALK_DISTANCE
    setNear(isNear)

    // ── Rotate to face player when nearby ────────────────────
    if (isNear) {
      _faceDir.subVectors(_playerPos, _npcPos)
      _faceDir.y = 0
      if (_faceDir.lengthSq() > 0.001) {
        const targetAngle = Math.atan2(_faceDir.x, _faceDir.z)
        let diff = targetAngle - npc.rotation.y
        while (diff >  Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2
        npc.rotation.y += diff * 0.1
      }

      // ── Cycle dialogue lines ──────────────────────────────
      lineTimer.current += delta
      if (lineTimer.current >= LINE_INTERVAL) {
        lineTimer.current = 0
        lineIndex.current = (lineIndex.current + 1) % data.lines.length
        setLineText(data.lines[lineIndex.current])
      }
    } else {
      lineTimer.current = 0
      // reset to first line when player walks away
      if (lineIndex.current !== 0) {
        lineIndex.current = 0
        setLineText(data.lines[0])
      }
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {/* ── Character mesh ─────────────────────────────────────── */}
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

      {/* ── Floating name tag (always visible) ─────────────────── */}
      <Html
        center
        position={[0, 2.5, 0]}
        distanceFactor={10}
        occlude={false}
      >
        <div
          style={{
            background: 'rgba(15,10,40,0.82)',
            color: 'white',
            padding: '3px 10px',
            borderRadius: '999px',
            fontSize: '13px',
            fontWeight: '700',
            fontFamily: 'system-ui, sans-serif',
            whiteSpace: 'nowrap',
            border: '1.5px solid rgba(167,139,250,0.6)',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {data.name}
        </div>
      </Html>

      {/* ── Speech bubble (only when near) ─────────────────────── */}
      {near && (
        <Html
          center
          position={[0, 3.4, 0]}
          distanceFactor={10}
          occlude={false}
        >
          <div
            style={{
              position: 'relative',
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
              border: '2px solid #a78bfa',
              pointerEvents: 'none',
              userSelect: 'none',
              animation: 'popIn 0.2s ease',
            }}
          >
            {lineText}
            {/* Tail */}
            <div
              style={{
                position: 'absolute',
                bottom: '-10px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderTop: '10px solid #a78bfa',
              }}
            />
          </div>
          <style>{`@keyframes popIn { from { transform: scale(0.6); opacity:0; } to { transform:scale(1); opacity:1; } }`}</style>
        </Html>
      )}

      {/* Proximity indicator ring on ground when near */}
      {near && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[TALK_DISTANCE - 0.15, TALK_DISTANCE, 40]} />
          <meshStandardMaterial color="#a78bfa" transparent opacity={0.18} />
        </mesh>
      )}
    </group>
  )
}
