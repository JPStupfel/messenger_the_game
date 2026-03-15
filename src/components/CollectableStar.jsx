import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const COLLECT_DIST = 2.2

const _starPos   = new THREE.Vector3()
const _playerPos = new THREE.Vector3()

// Burst ring — expands and fades after collection
function Burst({ position }) {
  const ref = useRef()
  const age = useRef(0)

  useFrame((_, delta) => {
    if (!ref.current) return
    age.current += delta
    const t = age.current / 0.55           // 0 → 1 over 0.55 s
    const s = 1 + t * 5
    ref.current.scale.setScalar(s)
    ref.current.children.forEach((c) => {
      if (c.material) c.material.opacity = Math.max(0, 1 - t)
    })
  })

  return (
    <group ref={ref} position={position}>
      {/* Expanding ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.55, 24]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1} transparent opacity={1} depthWrite={false} />
      </mesh>
      {/* Expanding sphere shell */}
      <mesh>
        <sphereGeometry args={[0.45, 10, 10]} />
        <meshStandardMaterial color="#fef08a" emissive="#fbbf24" emissiveIntensity={1} transparent opacity={0.5} depthWrite={false} wireframe />
      </mesh>
    </group>
  )
}

export default function CollectableStar({ data, playerRef, onCollect }) {
  const groupRef    = useRef()
  const [bursting, setBursting]   = useState(false)
  const [collected, setCollected] = useState(false)
  const triggered   = useRef(false)

  useFrame(({ clock }) => {
    if (!groupRef.current || triggered.current) return
    if (!playerRef?.current) return

    // Animate: spin + bob
    groupRef.current.rotation.y = clock.getElapsedTime() * 1.5
    groupRef.current.position.y = data.position[1] + Math.sin(clock.getElapsedTime() * 2.2) * 0.22

    // Proximity check
    _starPos.set(...data.position)
    _playerPos.copy(playerRef.current.position)
    const dist = _starPos.distanceTo(_playerPos)

    if (dist < COLLECT_DIST) {
      triggered.current = true
      setBursting(true)              // show burst at star's world position
      setTimeout(() => {
        setCollected(true)           // hide star + burst
        onCollect(data.id)           // notify parent
      }, 480)
    }
  })

  if (collected) return null

  return (
    <>
      {/* Burst stays at fixed world position while expanding */}
      {bursting && <Burst position={data.position} />}

      {/* Star orb — hidden instantly when bursting */}
      {!bursting && (
        <group ref={groupRef} position={data.position}>
          <mesh castShadow>
            <octahedronGeometry args={[0.4, 0]} />
            <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.9} />
          </mesh>
          {/* Outer sparkle shell */}
          <mesh>
            <octahedronGeometry args={[0.56, 0]} />
            <meshStandardMaterial color="#fef08a" emissive="#fbbf24" emissiveIntensity={0.3} transparent opacity={0.25} depthWrite={false} />
          </mesh>
          <pointLight color="#fbbf24" intensity={1.8} distance={5} />
        </group>
      )}
    </>
  )
}
