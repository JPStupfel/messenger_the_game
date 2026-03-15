import { useRef, useEffect, forwardRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GROUND_Y, PLAYER_HALF_HEIGHT, FLOATING_PLATFORMS } from '../gameData'
import { keys } from '../keys'

const SPEED = 7
const JUMP_FORCE = 11
const GRAVITY = -22
const MAIN_ISLAND_RADIUS = 23

const Player = forwardRef(function Player(_, ref) {
  const { camera } = useThree()
  const verticalVel = useRef(0)
  const onGround = useRef(true)

  useEffect(() => {
    const down = (e) => keys.add(e.code)
    const up = (e) => keys.delete(e.code)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  useFrame((_, delta) => {
    if (!ref.current) return
    const mesh = ref.current

    // ── Horizontal movement ──────────────────────────────────────────
    const camForward = new THREE.Vector3()
    camera.getWorldDirection(camForward)
    camForward.y = 0
    camForward.normalize()
    const camRight = new THREE.Vector3().crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize()

    const moveDir = new THREE.Vector3()
    if (keys.has('KeyW') || keys.has('ArrowUp'))    moveDir.add(camForward)
    if (keys.has('KeyS') || keys.has('ArrowDown'))  moveDir.sub(camForward)
    if (keys.has('KeyA') || keys.has('ArrowLeft'))  moveDir.sub(camRight)
    if (keys.has('KeyD') || keys.has('ArrowRight')) moveDir.add(camRight)

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize()
      mesh.position.addScaledVector(moveDir, SPEED * delta)

      // Rotate player to face movement direction (smooth)
      const targetAngle = Math.atan2(moveDir.x, moveDir.z)
      let diff = targetAngle - mesh.rotation.y
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      mesh.rotation.y += diff * 0.18
    }

    // ── World boundary (keep on main island disk) ────────────────────
    const horiz = new THREE.Vector2(mesh.position.x, mesh.position.z)
    if (horiz.length() > MAIN_ISLAND_RADIUS) {
      horiz.normalize().multiplyScalar(MAIN_ISLAND_RADIUS)
      mesh.position.x = horiz.x
      mesh.position.z = horiz.y
    }

    // ── Gravity ──────────────────────────────────────────────────────
    verticalVel.current += GRAVITY * delta
    mesh.position.y += verticalVel.current * delta

    // ── Collision: main island ───────────────────────────────────────
    onGround.current = false
    const groundSurface = GROUND_Y + PLAYER_HALF_HEIGHT
    if (mesh.position.y <= groundSurface) {
      mesh.position.y = groundSurface
      verticalVel.current = 0
      onGround.current = true
    }

    // ── Collision: floating platforms ────────────────────────────────
    for (const p of FLOATING_PLATFORMS) {
      const dx = mesh.position.x - p.x
      const dz = mesh.position.z - p.z
      const dist2 = dx * dx + dz * dz
      const platSurface = p.y + p.h / 2 + PLAYER_HALF_HEIGHT
      if (dist2 < p.rx * p.rx && verticalVel.current <= 0 && mesh.position.y >= platSurface - 0.3) {
        mesh.position.y = platSurface
        verticalVel.current = 0
        onGround.current = true
      }
    }

    // ── Fall off world → respawn ──────────────────────────────────────
    if (mesh.position.y < -20) {
      mesh.position.set(0, groundSurface, 0)
      mesh.rotation.y = 0
      verticalVel.current = 0
    }

    // ── Jump ─────────────────────────────────────────────────────────
    if (keys.has('Space') && onGround.current) {
      verticalVel.current = JUMP_FORCE
      onGround.current = false
    }
  })

  return (
    <group ref={ref} position={[0, GROUND_Y + PLAYER_HALF_HEIGHT, 0]}>
      {/* Body */}
      <mesh castShadow position={[0, 0, 0]}>
        <capsuleGeometry args={[0.32, 0.65, 4, 8]} />
        <meshStandardMaterial color="#4ade80" />
      </mesh>

      {/* Head */}
      <mesh castShadow position={[0, 0.78, 0]}>
        <sphereGeometry args={[0.34, 16, 16]} />
        <meshStandardMaterial color="#fde68a" />
      </mesh>

      {/* Ears */}
      {[[-0.32, 0.9, 0], [0.32, 0.9, 0]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color="#fbbf24" />
        </mesh>
      ))}

      {/* Eyes (white) */}
      {[[-0.14, 0.84, -0.29], [0.14, 0.84, -0.29]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color="white" />
        </mesh>
      ))}
      {/* Pupils */}
      {[[-0.14, 0.84, -0.35], [0.14, 0.84, -0.35]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      ))}

      {/* Scarf */}
      <mesh position={[0, 0.32, 0]} castShadow>
        <torusGeometry args={[0.33, 0.1, 8, 16]} />
        <meshStandardMaterial color="#f43f5e" />
      </mesh>

      {/* Cape */}
      <mesh position={[0, 0.1, 0.28]} castShadow rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.62, 0.9, 0.05]} />
        <meshStandardMaterial color="#7c3aed" />
      </mesh>
    </group>
  )
})

export default Player
