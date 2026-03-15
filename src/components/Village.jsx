// ═══════════════════════════════════════════════════════════════════════════
// VILLAGE COMPONENT
// A medium-sized snowy village centered at the origin.
// The town square has a magical wishing well where stars can be deposited.
// ═══════════════════════════════════════════════════════════════════════════

import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { keys } from '../keys'
import { VILLAGE_Y } from '../worldGen'

const WELL_INTERACT_RADIUS = 4.5

// ── Individual snowy house ────────────────────────────────────────────────────
function SnowHouse({ position, rotation = 0, width = 4, depth = 3.5, height = 3, wallColor = '#dde8f0', roofColor = '#8B4513', accentColor = '#c0d4e0' }) {
  const roofHeight = width * 0.55
  const roofOverhang = 0.4

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Foundation */}
      <mesh castShadow receiveShadow position={[0, 0.18, 0]}>
        <boxGeometry args={[width + 0.3, 0.35, depth + 0.3]} />
        <meshStandardMaterial color="#b0bec5" roughness={0.9} />
      </mesh>

      {/* Main walls */}
      <mesh castShadow receiveShadow position={[0, height / 2 + 0.35, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={wallColor} roughness={0.8} />
      </mesh>

      {/* Roof (dark wood, square pyramid via cone with 4 sides) */}
      <mesh castShadow position={[0, height + 0.35 + roofHeight / 2, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[(width + roofOverhang * 2) * 0.72, roofHeight, 4]} />
        <meshStandardMaterial color={roofColor} roughness={0.85} />
      </mesh>

      {/* Snow on roof */}
      <mesh castShadow position={[0, height + 0.35 + roofHeight * 0.78, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[(width + roofOverhang * 2) * 0.68, roofHeight * 0.3, 4]} />
        <meshStandardMaterial color="#f0f8ff" roughness={0.6} />
      </mesh>

      {/* Chimney */}
      <mesh castShadow position={[width * 0.22, height + 0.35 + roofHeight * 0.55, 0]}>
        <cylinderGeometry args={[0.22, 0.26, 1.6, 6]} />
        <meshStandardMaterial color="#888" roughness={0.95} />
      </mesh>
      {/* Chimney cap */}
      <mesh position={[width * 0.22, height + 0.35 + roofHeight * 0.55 + 0.85, 0]}>
        <cylinderGeometry args={[0.32, 0.22, 0.12, 6]} />
        <meshStandardMaterial color="#666" roughness={0.9} />
      </mesh>

      {/* Front door */}
      <mesh position={[0, 0.9 + 0.35, depth / 2 + 0.02]}>
        <boxGeometry args={[0.8, 1.6, 0.06]} />
        <meshStandardMaterial color="#6d4c2a" roughness={0.9} />
      </mesh>
      {/* Door handle */}
      <mesh position={[0.28, 0.9 + 0.35, depth / 2 + 0.06]}>
        <sphereGeometry args={[0.07, 6, 6]} />
        <meshStandardMaterial color="#d4a017" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Front windows (glowing warm) */}
      {[[-width * 0.28, 1.6 + 0.35], [width * 0.28, 1.6 + 0.35]].map(([wx, wy], i) => (
        <group key={i}>
          <mesh position={[wx, wy, depth / 2 + 0.02]}>
            <boxGeometry args={[0.7, 0.7, 0.06]} />
            <meshStandardMaterial color="#ffe4a0" emissive="#ff9800" emissiveIntensity={0.35} roughness={0.3} />
          </mesh>
          {/* Window frame */}
          <mesh position={[wx, wy, depth / 2 + 0.04]}>
            <boxGeometry args={[0.82, 0.82, 0.04]} />
            <meshStandardMaterial color={accentColor} roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* Side window */}
      <mesh position={[width / 2 + 0.02, 1.6 + 0.35, 0]}>
        <boxGeometry args={[0.06, 0.65, 0.65]} />
        <meshStandardMaterial color="#ffe4a0" emissive="#ff9800" emissiveIntensity={0.25} roughness={0.3} />
      </mesh>

      {/* Snow drift at base */}
      <mesh receiveShadow position={[0, 0.22, depth / 2 + 0.3]}>
        <sphereGeometry args={[0.7, 8, 6]} />
        <meshStandardMaterial color="#e8f4ff" roughness={0.7} />
      </mesh>
    </group>
  )
}

// ── Lantern post ──────────────────────────────────────────────────────────────
function LanternPost({ position }) {
  return (
    <group position={position}>
      {/* Post */}
      <mesh castShadow position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 3, 6]} />
        <meshStandardMaterial color="#555" roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Lantern box */}
      <mesh castShadow position={[0, 3.1, 0]}>
        <boxGeometry args={[0.4, 0.5, 0.4]} />
        <meshStandardMaterial color="#ffe0a0" emissive="#ff9800" emissiveIntensity={0.6} roughness={0.2} />
      </mesh>
      {/* Lantern roof */}
      <mesh position={[0, 3.42, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.33, 0.26, 4]} />
        <meshStandardMaterial color="#555" roughness={0.7} metalness={0.3} />
      </mesh>
      {/* Warm point light */}
      <pointLight position={[0, 3.0, 0]} intensity={1.2} color="#ffbb55" distance={12} decay={2} />
    </group>
  )
}

// ── Town square cobblestone circle ────────────────────────────────────────────
function TownSquare() {
  return (
    <>
      {/* Cobblestone floor */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, VILLAGE_Y + 0.01, 0]}>
        <circleGeometry args={[9, 32]} />
        <meshStandardMaterial color="#b0a090" roughness={0.95} />
      </mesh>
      {/* Inner ring — lighter stones */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, VILLAGE_Y + 0.02, 0]}>
        <ringGeometry args={[3.8, 5.5, 32]} />
        <meshStandardMaterial color="#c8b8a0" roughness={0.9} />
      </mesh>
      {/* Snowy paths to each house direction */}
      {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, i) => (
        <mesh key={i} receiveShadow rotation={[-Math.PI / 2, 0, angle]} position={[0, VILLAGE_Y + 0.015, 0]}>
          <planeGeometry args={[2.5, 14]} />
          <meshStandardMaterial color="#ddeef8" roughness={0.8} />
        </mesh>
      ))}
    </>
  )
}

// ── Wishing well ──────────────────────────────────────────────────────────────
function WishingWell({ playerRef, carrying, onDeposit, onNearWellChange }) {
  const wellRef = useRef()
  const glowRef = useRef()
  const [near, setNear] = useState(false)
  const [wishing, setWishing] = useState(false)
  const wasNear = useRef(false)
  const wishTimer = useRef(0)

  const _playerPos = new THREE.Vector3()
  const _wellPos = new THREE.Vector3()

  // Key-press deposit handler
  useEffect(() => {
    const handleKey = (e) => {
      if (e.code === 'KeyE' && near && carrying > 0 && !wishing) {
        triggerWish()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [near, carrying, wishing])

  function triggerWish() {
    if (wishing || carrying === 0) return
    setWishing(true)
    onDeposit()
    wishTimer.current = 0
  }

  useFrame((_, delta) => {
    if (!playerRef?.current || !wellRef.current) return

    // Proximity check
    _playerPos.copy(playerRef.current.position)
    _wellPos.setFromMatrixPosition(wellRef.current.matrixWorld)
    const dist = _playerPos.distanceTo(_wellPos)
    const isNear = dist < WELL_INTERACT_RADIUS

    if (isNear !== wasNear.current) {
      wasNear.current = isNear
      setNear(isNear)
      onNearWellChange(isNear)
    }

    // Wish animation timer
    if (wishing) {
      wishTimer.current += delta
      if (wishTimer.current > 2.5) {
        setWishing(false)
      }
    }

    // Animate glow when player is near and carrying stars
    if (glowRef.current) {
      const t = Date.now() * 0.003
      const shouldGlow = carrying > 0
      glowRef.current.intensity = shouldGlow
        ? 1.2 + Math.sin(t * 3) * 0.6
        : 0.2 + Math.sin(t) * 0.1
    }
  })

  return (
    <group ref={wellRef} position={[0, VILLAGE_Y, 0]}>
      {/* Well base — stone cylinder */}
      <mesh castShadow receiveShadow position={[0, 0.55, 0]}>
        <cylinderGeometry args={[1.1, 1.2, 1.1, 12]} />
        <meshStandardMaterial color="#9e9a90" roughness={0.95} />
      </mesh>
      {/* Inner well mouth */}
      <mesh receiveShadow position={[0, 1.12, 0]}>
        <cylinderGeometry args={[0.75, 0.78, 0.15, 12]} />
        <meshStandardMaterial color="#6e6a60" roughness={0.9} />
      </mesh>
      {/* Water surface (glowing magic) */}
      <mesh position={[0, 1.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.72, 20]} />
        <meshStandardMaterial
          color="#00ccff"
          emissive="#0099ff"
          emissiveIntensity={wishing ? 1.8 : 0.5}
          roughness={0.1}
          metalness={0.3}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Arch posts */}
      {[[-0.85, 0], [0.85, 0]].map(([px, pz], i) => (
        <mesh key={i} castShadow position={[px, 2.0, pz]}>
          <cylinderGeometry args={[0.11, 0.13, 2.8, 7]} />
          <meshStandardMaterial color="#6d4c2a" roughness={0.85} />
        </mesh>
      ))}
      {/* Arch beam (horizontal crossbar) */}
      <mesh castShadow position={[0, 3.45, 0]}>
        <boxGeometry args={[2.1, 0.22, 0.22]} />
        <meshStandardMaterial color="#6d4c2a" roughness={0.85} />
      </mesh>
      {/* Roof over arch */}
      <mesh castShadow position={[0, 3.72, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.25, 0.6, 4]} />
        <meshStandardMaterial color="#8B4513" roughness={0.8} />
      </mesh>
      {/* Snow on well roof */}
      <mesh castShadow position={[0, 3.95, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.15, 0.25, 4]} />
        <meshStandardMaterial color="#e8f4ff" roughness={0.6} />
      </mesh>
      {/* Bucket chain */}
      <mesh position={[0, 2.7, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 1.6, 5]} />
        <meshStandardMaterial color="#aaa" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Bucket */}
      <mesh castShadow position={[0, 1.85, 0]}>
        <cylinderGeometry args={[0.19, 0.14, 0.35, 8]} />
        <meshStandardMaterial color="#8B4513" roughness={0.85} />
      </mesh>

      {/* Magic glow light from the water */}
      <pointLight ref={glowRef} position={[0, 1.5, 0]} color="#55eeff" distance={12} decay={2} />

      {/* Proximity ring */}
      {near && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[WELL_INTERACT_RADIUS - 0.15, WELL_INTERACT_RADIUS, 40]} />
          <meshStandardMaterial color={carrying > 0 ? '#ffd700' : '#55eeff'} transparent opacity={0.22} />
        </mesh>
      )}

      {/* Well speech bubble / interaction prompt */}
      {near && (
        <Html center position={[0, 4.6, 0]} distanceFactor={10} occlude={false}>
          <div
            style={{
              background: wishing ? 'rgba(255,215,0,0.95)' : 'white',
              color: wishing ? '#7a5800' : '#1e1b4b',
              padding: '8px 16px',
              borderRadius: '16px',
              fontSize: '14px',
              fontWeight: '700',
              fontFamily: 'system-ui, sans-serif',
              textAlign: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
              border: `2px solid ${wishing ? '#ffd700' : '#55eeff'}`,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              userSelect: 'none',
              animation: 'popIn 0.2s ease',
            }}
          >
            {wishing
              ? '✨ Wish granted! ✨'
              : carrying > 0
                ? `⭐ ${carrying} star${carrying > 1 ? 's' : ''} to wish on!\nPress E to grant!`
                : '🌊 The Wishing Well'}
          </div>
          <style>{`@keyframes popIn { from { transform: scale(0.6); opacity:0; } to { transform:scale(1); opacity:1; } }`}</style>
        </Html>
      )}

      {/* Wish burst animation */}
      {wishing && (
        <mesh position={[0, 2.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 1.2, 32]} />
          <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={2} transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  )
}

// ── Main Village component ────────────────────────────────────────────────────
export default function Village({ playerRef, carrying, onDeposit, onNearWellChange }) {
  const BASE = VILLAGE_Y

  // House layout: position [x, z], rotation (y-axis radians), optional overrides
  const houses = [
    { pos: [-14,  -8], rot: 0.3,  color: '#dde8f0', roof: '#6d4c2a' },
    { pos: [ 13, -10], rot: -0.2, color: '#e8ddd0', roof: '#8B4513' },
    { pos: [ 16,   8], rot: -0.8, color: '#d0dde8', roof: '#7a3b1e' },
    { pos: [  0,  14], rot: Math.PI, color: '#e0e8d8', roof: '#5c3317' },
    { pos: [-13,   9], rot: 0.9,  color: '#e8e0d0', roof: '#8B4513' },
    { pos: [-18,   0], rot: 0.5,  color: '#dde4e0', roof: '#6d4c2a' },
    { pos: [ 18,  -1], rot: -0.5, color: '#e4dde8', roof: '#7a3b1e' },
  ]

  // Lantern positions around the town square
  const lanterns = [
    [ 7,  7], [-7,  7], [ 7, -7], [-7, -7],
    [10,  0], [-10, 0], [ 0,  10], [ 0, -10],
  ]

  return (
    <group>
      {/* Ground snow layer for village */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, BASE - 0.02, 0]}>
        <circleGeometry args={[34, 48]} />
        <meshStandardMaterial color="#deeef8" roughness={0.85} />
      </mesh>

      {/* Town square */}
      <TownSquare />

      {/* Wishing well */}
      <WishingWell
        playerRef={playerRef}
        carrying={carrying}
        onDeposit={onDeposit}
        onNearWellChange={onNearWellChange}
      />

      {/* Village sign near well */}
      <group position={[2.8, BASE, 2.8]}>
        {/* Post */}
        <mesh castShadow position={[0, 1.1, 0]}>
          <cylinderGeometry args={[0.07, 0.08, 2.2, 6]} />
          <meshStandardMaterial color="#8B6340" roughness={0.9} />
        </mesh>
        {/* Sign board */}
        <mesh castShadow position={[0, 2.25, 0]}>
          <boxGeometry args={[1.6, 0.55, 0.1]} />
          <meshStandardMaterial color="#c8a060" roughness={0.85} />
        </mesh>
        <Html center position={[0, 2.25, 0.1]} distanceFactor={8} occlude={false}>
          <div style={{
            fontSize: '11px', fontWeight: '800', color: '#3b2200',
            fontFamily: 'system-ui', whiteSpace: 'nowrap',
            pointerEvents: 'none', userSelect: 'none',
          }}>
            ❄️ Snowfall Village
          </div>
        </Html>
      </group>

      {/* Houses */}
      {houses.map((h, i) => (
        <SnowHouse
          key={i}
          position={[h.pos[0], BASE, h.pos[1]]}
          rotation={h.rot}
          wallColor={h.color}
          roofColor={h.roof}
          accentColor="#c0d4e0"
        />
      ))}

      {/* Lantern posts */}
      {lanterns.map(([lx, lz], i) => (
        <LanternPost key={i} position={[lx, BASE, lz]} />
      ))}

      {/* Decorative snow trees around village border */}
      {[
        [ 22,  12], [-22,  14], [ 24, -12], [-24, -10],
        [ 10,  22], [-12,  22], [ 12, -22], [-10, -22],
        [ 26,   2], [-26,   4],
      ].map(([tx, tz], i) => (
        <group key={i} position={[tx, BASE, tz]}>
          {/* Trunk */}
          <mesh castShadow position={[0, 1.1, 0]}>
            <cylinderGeometry args={[0.18, 0.24, 2.2, 7]} />
            <meshStandardMaterial color="#6d4c2a" roughness={0.9} />
          </mesh>
          {/* Foliage layers */}
          {[0, 1, 2].map((layer) => (
            <mesh key={layer} castShadow position={[0, 2.2 + layer * 0.9, 0]}>
              <coneGeometry args={[1.4 - layer * 0.35, 1.5, 7]} />
              <meshStandardMaterial color="#1a5e20" roughness={0.8} />
            </mesh>
          ))}
          {/* Snow caps */}
          <mesh position={[0, 4.15, 0]}>
            <coneGeometry args={[0.85, 0.6, 7]} />
            <meshStandardMaterial color="#e8f4ff" roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
