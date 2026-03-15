import { useRef, useEffect, forwardRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PLAYER_HALF_HEIGHT  } from '../gameData'
import { keys, touchInput } from '../keys'
import { createNoise2D, getTerrainHeight, WORLD_SEED } from './ProceduralWorld'

const MOVE_SPEED = 8              // Direct movement speed
const JUMP_FORCE = 14
const GRAVITY = -28
const GLIDE_GRAVITY = -6
const COAST_FRICTION = 0.92       // How quickly coasting slows down

// Skin material with subtle warmth
const skinMat = { color: '#f5d0c5', roughness: 0.7, metalness: 0 }
const skinCheek = { color: '#f8b4b4', roughness: 0.8, metalness: 0 }
// Hair colors - gradient from root to tip
const hairRoot = '#b91c1c'
const hairMid = '#dc2626'
const hairTip = '#f87171'
const hairHighlight = '#fca5a5'

const Player = forwardRef(function Player({ returnTriggerRef }, ref) {
  const { camera } = useThree()
  const verticalVel = useRef(0)
  const velocity = useRef({ x: 0, z: 0 })  // Horizontal momentum
  const onGround = useRef(true)
  const canJump = useRef(true)  // Tracks if space has been released
  
  // Noise function for terrain height (same seed as world)
  const noise = useMemo(() => createNoise2D(WORLD_SEED), [])
  
  // Animation refs
  const bodyRef = useRef()
  const hairRef = useRef()
  const scarfRef = useRef()
  const breathePhase = useRef(0)
  const swayPhase = useRef(0)
  const isMoving = useRef(false)

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
    // Touch virtual joystick: +moveY = dragged down = backward
    if (touchInput.moveX !== 0 || touchInput.moveY !== 0) {
      moveDir.addScaledVector(camRight,   touchInput.moveX)
      moveDir.addScaledVector(camForward, -touchInput.moveY)
    }

    // Direct movement + coast
    if (moveDir.lengthSq() > 0) {
      moveDir.normalize()
      // Direct movement - move at fixed speed
      mesh.position.x += moveDir.x * MOVE_SPEED * delta
      mesh.position.z += moveDir.z * MOVE_SPEED * delta
      // Store last direction for coasting
      velocity.current.x = moveDir.x * MOVE_SPEED * 0.5
      velocity.current.z = moveDir.z * MOVE_SPEED * 0.5
      isMoving.current = true

      // Rotate player to face movement direction (smooth)
      const targetAngle = Math.atan2(moveDir.x, moveDir.z)
      let diff = targetAngle - mesh.rotation.y
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      mesh.rotation.y += diff * 0.18
    } else {
      // Coast when no input
      mesh.position.x += velocity.current.x * delta
      mesh.position.z += velocity.current.z * delta
      velocity.current.x *= COAST_FRICTION
      velocity.current.z *= COAST_FRICTION
      // Kill tiny velocities
      if (Math.abs(velocity.current.x) < 0.1) velocity.current.x = 0
      if (Math.abs(velocity.current.z) < 0.1) velocity.current.z = 0
      isMoving.current = false
    }

    // ── Animate body ─────────────────────────────────────────────────
    breathePhase.current += delta * 2.5
    swayPhase.current += delta * (isMoving.current ? 8 : 3)
    
    if (bodyRef.current) {
      // Subtle breathing - scale chest
      const breathe = Math.sin(breathePhase.current) * 0.015
      bodyRef.current.scale.set(1 + breathe, 1 + breathe * 0.5, 1 + breathe)
      // Slight sway while riding
      bodyRef.current.rotation.z = Math.sin(swayPhase.current) * (isMoving.current ? 0.06 : 0.02)
    }
    
    if (hairRef.current) {
      // Hair flows more when moving
      const hairSway = isMoving.current ? 0.15 : 0.05
      hairRef.current.rotation.x = -0.3 + Math.sin(swayPhase.current * 0.7) * hairSway
      hairRef.current.rotation.z = Math.sin(swayPhase.current * 1.1) * hairSway * 0.5
    }
    
    if (scarfRef.current) {
      // Scarf flutters
      const scarfSway = isMoving.current ? 0.2 : 0.08
      scarfRef.current.rotation.x = -0.5 + Math.sin(swayPhase.current * 1.3) * scarfSway
      scarfRef.current.rotation.y = Math.sin(swayPhase.current * 0.9) * scarfSway * 0.3
    }

    // ── Gravity ──────────────────────────────────────────────────────
    verticalVel.current += GRAVITY * delta
    mesh.position.y += verticalVel.current * delta

    // ── Collision: procedural terrain ────────────────────────────────
    onGround.current = false
    const terrainHeight = getTerrainHeight(noise, mesh.position.x, mesh.position.z)
    const groundSurface = terrainHeight + PLAYER_HALF_HEIGHT
    if (mesh.position.y <= groundSurface) {
      mesh.position.y = groundSurface
      verticalVel.current = 0
      onGround.current = true
    }



    // ── Fall off world → respawn ──────────────────────────────────────
    if (mesh.position.y < -50) {
      const spawnHeight = getTerrainHeight(noise, 0, 0) + PLAYER_HALF_HEIGHT
      mesh.position.set(0, spawnHeight + 2, 0)
      mesh.rotation.y = 0
      verticalVel.current = 0
      velocity.current.x = 0
      velocity.current.z = 0
    }

    // ── Return to village button ──────────────────────────────────────
    if (returnTriggerRef?.current) {
      returnTriggerRef.current = false
      const villageY = getTerrainHeight(noise, 0, 0) + PLAYER_HALF_HEIGHT + 0.5
      mesh.position.set(0, villageY, 0)
      mesh.rotation.y = 0
      verticalVel.current = 0
      velocity.current.x = 0
      velocity.current.z = 0
    }

    // ── Gliding behavior when falling ─────────────────────────────────
    const isFalling = verticalVel.current < 0 && !onGround.current
    if (isFalling) {
      // Apply reduced gravity for gliding effect
      verticalVel.current -= GLIDE_GRAVITY * delta  // Counteract some gravity
      // Tilt board forward slightly for glide effect
      if (bodyRef.current) {
        bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0.15, 0.1)
      }
    } else if (bodyRef.current) {
      bodyRef.current.rotation.x = THREE.MathUtils.lerp(bodyRef.current.rotation.x, 0, 0.15)
    }

    // ── Jump / Fly ───────────────────────────────────────────────────
    const wantsJump = keys.has('Space') || touchInput.jump
    if (wantsJump && canJump.current) {
      // Allow jumping both on ground AND in air (flying!)
      verticalVel.current = JUMP_FORCE
      onGround.current = false
      canJump.current = false
      touchInput.jump = false
    }
    // Reset jump ability when space released
    if (!keys.has('Space') && !touchInput.jump) {
      canJump.current = true
    }
  })

  return (
    <group ref={ref} position={[0, 5, 0]}>
      
      {/* ════════════════════════════════════════════════════════════════
          MAGIC SNOWBOARD - detailed with bindings and glow effects
          ════════════════════════════════════════════════════════════════ */}
      {/* Main board body */}
      <mesh castShadow position={[0, -0.78, 0]}>
        <boxGeometry args={[0.52, 0.09, 1.75]} />
        <meshStandardMaterial color="#7c3aed" emissive="#a855f7" emissiveIntensity={0.9} roughness={0.3} metalness={0.1} />
      </mesh>
      {/* Board top graphic stripe */}
      <mesh position={[0, -0.73, 0]}>
        <boxGeometry args={[0.35, 0.02, 1.5]} />
        <meshStandardMaterial color="#c4b5fd" emissive="#a855f7" emissiveIntensity={0.5} />
      </mesh>
      {/* Curved nose */}
      <mesh castShadow position={[0, -0.72, -0.95]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[0.5, 0.07, 0.35]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#a855f7" emissiveIntensity={0.8} roughness={0.3} />
      </mesh>
      {/* Curved tail */}
      <mesh castShadow position={[0, -0.72, 0.95]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.5, 0.07, 0.35]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#a855f7" emissiveIntensity={0.8} roughness={0.3} />
      </mesh>
      {/* Board edge rails */}
      {[[-0.24, -0.78, 0], [0.24, -0.78, 0]].map(([x,y,z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <boxGeometry args={[0.04, 0.1, 1.7]} />
          <meshStandardMaterial color="#6d28d9" metalness={0.3} roughness={0.4} />
        </mesh>
      ))}
      {/* Bindings */}
      {[[-0.08, -0.72, -0.3], [0.08, -0.72, 0.3]].map(([x,y,z], i) => (
        <group key={i} position={[x, y, z]} rotation={[0, i === 0 ? 0.3 : -0.3, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.16, 0.04, 0.28]} />
            <meshStandardMaterial color="#1e293b" roughness={0.6} />
          </mesh>
          {/* Binding straps */}
          <mesh position={[0, 0.03, -0.08]}>
            <boxGeometry args={[0.18, 0.025, 0.05]} />
            <meshStandardMaterial color="#f97316" />
          </mesh>
          <mesh position={[0, 0.03, 0.08]}>
            <boxGeometry args={[0.18, 0.025, 0.05]} />
            <meshStandardMaterial color="#f97316" />
          </mesh>
        </group>
      ))}
      {/* Magic glow orbs */}
      {[[-0.12, -0.88, -0.6], [0.12, -0.88, 0.5], [0, -0.88, 0], [-0.15, -0.88, 0.2], [0.15, -0.88, -0.3]].map(([x,y,z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <sphereGeometry args={[0.06 + (i % 2) * 0.03, 8, 8]} />
          <meshStandardMaterial color="#e9d5ff" emissive="#a855f7" emissiveIntensity={2 + i * 0.3} transparent opacity={0.75} />
        </mesh>
      ))}
      <pointLight position={[0, -0.82, 0]} color="#c4b5fd" intensity={2.5} distance={4.5} />
      <pointLight position={[0, -0.82, -0.7]} color="#a855f7" intensity={1} distance={2} />
      <pointLight position={[0, -0.82, 0.7]} color="#a855f7" intensity={1} distance={2} />


      {/* ════════════════════════════════════════════════════════════════
          RIDER BODY — rotated sideways for authentic snowboard stance
          ════════════════════════════════════════════════════════════════ */}
      <group ref={bodyRef} rotation={[0, -1.15, 0]}>

        {/* ══════ LEGS — parallel stance ══════ */}
        {/* Left leg - thigh */}
        <mesh castShadow position={[-0.1, -0.38, 0]}>
          <capsuleGeometry args={[0.085, 0.22, 6, 8]} />
          <meshStandardMaterial color="#1e40af" roughness={0.8} />
        </mesh>
        {/* Left leg - calf */}
        <mesh castShadow position={[-0.1, -0.58, 0]}>
          <capsuleGeometry args={[0.075, 0.18, 6, 8]} />
          <meshStandardMaterial color="#1e3a8a" roughness={0.8} />
        </mesh>
        {/* Right leg - thigh */}
        <mesh castShadow position={[0.1, -0.38, 0]}>
          <capsuleGeometry args={[0.085, 0.22, 6, 8]} />
          <meshStandardMaterial color="#1e40af" roughness={0.8} />
        </mesh>
        {/* Right leg - calf */}
        <mesh castShadow position={[0.1, -0.58, 0]}>
          <capsuleGeometry args={[0.075, 0.18, 6, 8]} />
          <meshStandardMaterial color="#1e3a8a" roughness={0.8} />
        </mesh>
        
        {/* Boots — parallel, counter-rotated to align with board */}
        {[[-0.1, -0.72, 0], [0.1, -0.72, 0]].map(([x,y,z], i) => (
          <group key={i} position={[x, y, z]} rotation={[0, 1.15, 0]}>
            {/* Boot base */}
            <mesh castShadow>
              <boxGeometry args={[0.13, 0.11, 0.24]} />
              <meshStandardMaterial color="#7f1d1d" roughness={0.7} />
            </mesh>
            {/* Boot ankle cuff */}
            <mesh castShadow position={[0, 0.07, -0.02]}>
              <cylinderGeometry args={[0.07, 0.075, 0.06, 8]} />
              <meshStandardMaterial color="#991b1b" roughness={0.6} />
            </mesh>
            {/* Boot sole */}
            <mesh position={[0, -0.055, 0]}>
              <boxGeometry args={[0.14, 0.02, 0.26]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
          </group>
        ))}


        {/* ══════ TORSO — layered puffy jacket ══════ */}
        {/* Lower jacket / hips */}
        <mesh castShadow position={[0, -0.18, 0]}>
          <sphereGeometry args={[0.24, 12, 12]} />
          <meshStandardMaterial color="#1d4ed8" roughness={0.75} />
        </mesh>
        {/* Mid jacket */}
        <mesh castShadow position={[0, -0.02, 0]}>
          <sphereGeometry args={[0.26, 12, 12]} />
          <meshStandardMaterial color="#2563eb" roughness={0.7} />
        </mesh>
        {/* Upper chest */}
        <mesh castShadow position={[0, 0.12, 0]}>
          <sphereGeometry args={[0.22, 12, 12]} />
          <meshStandardMaterial color="#3b82f6" roughness={0.65} />
        </mesh>
        {/* Jacket shoulder puffs */}
        {[[-0.22, 0.08, 0], [0.22, 0.08, 0]].map(([x,y,z], i) => (
          <mesh key={i} castShadow position={[x, y, z]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial color="#2563eb" roughness={0.7} />
          </mesh>
        ))}
        {/* Jacket collar / hood base */}
        <mesh castShadow position={[0, 0.22, -0.02]}>
          <torusGeometry args={[0.14, 0.055, 8, 16]} />
          <meshStandardMaterial color="#60a5fa" roughness={0.5} />
        </mesh>
        {/* Hood back (down) */}
        <mesh castShadow position={[0, 0.18, -0.12]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color="#3b82f6" roughness={0.6} />
        </mesh>
        {/* Jacket zipper */}
        <mesh position={[0, 0, 0.22]}>
          <boxGeometry args={[0.025, 0.35, 0.01]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Zipper pull */}
        <mesh position={[0, 0.12, 0.23]}>
          <boxGeometry args={[0.04, 0.025, 0.015]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.7} roughness={0.3} />
        </mesh>


        {/* ══════ ARMS — realistic pose for balance ══════ */}
        {/* Left arm - upper */}
        <mesh castShadow position={[-0.32, 0.02, -0.04]} rotation={[-0.4, 0.2, 0.75]}>
          <capsuleGeometry args={[0.065, 0.2, 6, 8]} />
          <meshStandardMaterial color="#3b82f6" roughness={0.7} />
        </mesh>
        {/* Left arm - forearm */}
        <mesh castShadow position={[-0.48, 0.1, -0.12]} rotation={[-0.6, 0.3, 0.5]}>
          <capsuleGeometry args={[0.055, 0.18, 6, 8]} />
          <meshStandardMaterial color="#2563eb" roughness={0.7} />
        </mesh>
        {/* Left glove */}
        <group position={[-0.58, 0.15, -0.18]}>
          <mesh castShadow>
            <sphereGeometry args={[0.065, 10, 10]} />
            <meshStandardMaterial color="#ea580c" roughness={0.6} />
          </mesh>
          {/* Glove cuff */}
          <mesh position={[0.04, -0.02, 0.02]} rotation={[0, 0, 0.5]}>
            <cylinderGeometry args={[0.045, 0.055, 0.04, 8]} />
            <meshStandardMaterial color="#f97316" roughness={0.5} />
          </mesh>
          {/* Thumb */}
          <mesh castShadow position={[0.04, 0.02, 0.04]}>
            <sphereGeometry args={[0.025, 6, 6]} />
            <meshStandardMaterial color="#ea580c" roughness={0.6} />
          </mesh>
        </group>
        
        {/* Right arm - upper */}
        <mesh castShadow position={[0.32, 0.04, 0.04]} rotation={[0.3, -0.2, -0.7]}>
          <capsuleGeometry args={[0.065, 0.2, 6, 8]} />
          <meshStandardMaterial color="#3b82f6" roughness={0.7} />
        </mesh>
        {/* Right arm - forearm */}
        <mesh castShadow position={[0.48, 0.14, 0.1]} rotation={[0.4, -0.3, -0.45]}>
          <capsuleGeometry args={[0.055, 0.18, 6, 8]} />
          <meshStandardMaterial color="#2563eb" roughness={0.7} />
        </mesh>
        {/* Right glove */}
        <group position={[0.58, 0.2, 0.14]}>
          <mesh castShadow>
            <sphereGeometry args={[0.065, 10, 10]} />
            <meshStandardMaterial color="#ea580c" roughness={0.6} />
          </mesh>
          <mesh position={[-0.04, -0.02, 0.02]} rotation={[0, 0, -0.5]}>
            <cylinderGeometry args={[0.045, 0.055, 0.04, 8]} />
            <meshStandardMaterial color="#f97316" roughness={0.5} />
          </mesh>
          <mesh castShadow position={[-0.04, 0.02, 0.04]}>
            <sphereGeometry args={[0.025, 6, 6]} />
            <meshStandardMaterial color="#ea580c" roughness={0.6} />
          </mesh>
        </group>


        {/* ════════════════════════════════════════════════════════════════
            HEAD — detailed face with realistic features
            ════════════════════════════════════════════════════════════════ */}
        <group position={[0, 0.42, 0]}>
          {/* Head base */}
          <mesh castShadow>
            <sphereGeometry args={[0.19, 20, 20]} />
            <meshStandardMaterial {...skinMat} />
          </mesh>
          
          {/* Chin - slightly defined */}
          <mesh position={[0, -0.12, 0.08]}>
            <sphereGeometry args={[0.08, 10, 10]} />
            <meshStandardMaterial {...skinMat} />
          </mesh>

          {/* Cheeks with rosy color */}
          {[[-0.12, -0.02, 0.12], [0.12, -0.02, 0.12]].map(([x,y,z], i) => (
            <mesh key={i} position={[x, y, z]}>
              <sphereGeometry args={[0.055, 8, 8]} />
              <meshStandardMaterial {...skinCheek} />
            </mesh>
          ))}

          {/* Nose bridge */}
          <mesh position={[0, 0.02, 0.16]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshStandardMaterial {...skinMat} />
          </mesh>
          {/* Nose tip */}
          <mesh position={[0, -0.02, 0.18]}>
            <sphereGeometry args={[0.032, 8, 8]} />
            <meshStandardMaterial color="#f5c4b8" roughness={0.7} />
          </mesh>

          {/* Eyebrows */}
          {[[-0.07, 0.1, 0.15], [0.07, 0.1, 0.15]].map(([x,y,z], i) => (
            <mesh key={i} position={[x, y, z]} rotation={[0.3, i === 0 ? 0.15 : -0.15, i === 0 ? -0.1 : 0.1]}>
              <capsuleGeometry args={[0.012, 0.045, 4, 6]} />
              <meshStandardMaterial color={hairRoot} roughness={0.9} />
            </mesh>
          ))}

          {/* Eyes - full detail */}
          {[[-0.065, 0.04, 0.14], [0.065, 0.04, 0.14]].map(([x,y,z], i) => (
            <group key={i} position={[x, y, z]}>
              {/* Eyeball white */}
              <mesh>
                <sphereGeometry args={[0.045, 12, 12]} />
                <meshStandardMaterial color="#fefefe" roughness={0.2} />
              </mesh>
              {/* Iris */}
              <mesh position={[0, 0, 0.032]}>
                <circleGeometry args={[0.028, 16]} />
                <meshStandardMaterial color="#4a9079" roughness={0.4} />
              </mesh>
              {/* Pupil */}
              <mesh position={[0, 0, 0.036]}>
                <circleGeometry args={[0.015, 12]} />
                <meshStandardMaterial color="#1a1a1a" />
              </mesh>
              {/* Eye highlight */}
              <mesh position={[i === 0 ? 0.012 : -0.012, 0.012, 0.042]}>
                <circleGeometry args={[0.008, 8]} />
                <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
              </mesh>
              {/* Second smaller highlight */}
              <mesh position={[i === 0 ? -0.008 : 0.008, -0.008, 0.04]}>
                <circleGeometry args={[0.004, 6]} />
                <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.2} />
              </mesh>
              {/* Upper eyelid */}
              <mesh position={[0, 0.025, 0.02]} rotation={[0.4, 0, 0]}>
                <capsuleGeometry args={[0.025, 0.035, 4, 8]} />
                <meshStandardMaterial {...skinMat} />
              </mesh>
            </group>
          ))}

          {/* Eyelashes (subtle) */}
          {[[-0.065, 0.07, 0.16], [0.065, 0.07, 0.16]].map(([x,y,z], i) => (
            <mesh key={i} position={[x, y, z]} rotation={[0.5, 0, 0]}>
              <boxGeometry args={[0.05, 0.008, 0.008]} />
              <meshStandardMaterial color="#4a2c2a" />
            </mesh>
          ))}

          {/* Smile */}
          <mesh position={[0, -0.06, 0.16]} rotation={[0.15, 0, 0]}>
            <torusGeometry args={[0.035, 0.01, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#e57373" roughness={0.5} />
          </mesh>
          {/* Upper lip */}
          <mesh position={[0, -0.04, 0.165]}>
            <torusGeometry args={[0.025, 0.008, 6, 12, Math.PI * 0.8]} />
            <meshStandardMaterial color="#d4837a" roughness={0.6} />
          </mesh>

          {/* Ears */}
          {[[-0.17, 0, 0.02], [0.17, 0, 0.02]].map(([x,y,z], i) => (
            <mesh key={i} castShadow position={[x, y, z]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshStandardMaterial {...skinMat} />
            </mesh>
          ))}


          {/* ══════ GOGGLES — pushed up on forehead ══════ */}
          <group position={[0, 0.14, 0.04]}>
            {/* Goggle strap */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.17, 0.025, 6, 24]} />
              <meshStandardMaterial color="#1e293b" roughness={0.7} />
            </mesh>
            {/* Goggle frame */}
            <mesh position={[0, 0, 0.1]}>
              <boxGeometry args={[0.18, 0.07, 0.06]} />
              <meshStandardMaterial color="#f97316" roughness={0.4} />
            </mesh>
            {/* Left lens */}
            <mesh position={[-0.05, 0, 0.13]}>
              <sphereGeometry args={[0.04, 12, 12]} />
              <meshStandardMaterial color="#67e8f9" emissive="#22d3ee" emissiveIntensity={0.4} transparent opacity={0.8} metalness={0.2} roughness={0.1} />
            </mesh>
            {/* Right lens */}
            <mesh position={[0.05, 0, 0.13]}>
              <sphereGeometry args={[0.04, 12, 12]} />
              <meshStandardMaterial color="#67e8f9" emissive="#22d3ee" emissiveIntensity={0.4} transparent opacity={0.8} metalness={0.2} roughness={0.1} />
            </mesh>
            {/* Lens reflection */}
            {[[-0.05, 0.01, 0.16], [0.05, 0.01, 0.16]].map(([x,y,z], i) => (
              <mesh key={i} position={[x, y, z]}>
                <circleGeometry args={[0.015, 8]} />
                <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} transparent opacity={0.6} />
              </mesh>
            ))}
          </group>


          {/* ══════ HAIR — flowing red with volume ══════ */}
          {/* Hair base - covers top of head */}
          <mesh castShadow position={[0, 0.1, -0.02]}>
            <sphereGeometry args={[0.17, 14, 14]} />
            <meshStandardMaterial color={hairRoot} roughness={0.85} />
          </mesh>
          {/* Hair volume top */}
          <mesh castShadow position={[0, 0.18, -0.04]}>
            <sphereGeometry args={[0.12, 10, 10]} />
            <meshStandardMaterial color={hairMid} roughness={0.8} />
          </mesh>
          {/* Side hair volume */}
          {[[-0.14, 0.05, -0.02], [0.14, 0.05, -0.02]].map(([x,y,z], i) => (
            <mesh key={i} castShadow position={[x, y, z]}>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshStandardMaterial color={hairRoot} roughness={0.85} />
            </mesh>
          ))}
          {/* Bangs / fringe */}
          <mesh castShadow position={[0, 0.12, 0.12]} rotation={[0.6, 0, 0]}>
            <capsuleGeometry args={[0.06, 0.08, 6, 8]} />
            <meshStandardMaterial color={hairMid} roughness={0.8} />
          </mesh>
          {/* Side bangs */}
          {[[-0.1, 0.08, 0.1], [0.1, 0.08, 0.1]].map(([x,y,z], i) => (
            <mesh key={i} castShadow position={[x, y, z]} rotation={[0.4, i === 0 ? 0.3 : -0.3, i === 0 ? 0.2 : -0.2]}>
              <capsuleGeometry args={[0.035, 0.08, 4, 6]} />
              <meshStandardMaterial color={hairMid} roughness={0.8} />
            </mesh>
          ))}
        </group>


        {/* ════════════════════════════════════════════════════════════════
            FLOWING HAIR — trails behind with animation ref
            ════════════════════════════════════════════════════════════════ */}
        <group ref={hairRef} position={[0, 0.52, -0.15]}>
          {/* Main hair mass */}
          <mesh castShadow position={[0, 0, 0]}>
            <capsuleGeometry args={[0.1, 0.25, 8, 10]} />
            <meshStandardMaterial color={hairRoot} roughness={0.85} />
          </mesh>
          
          {/* Primary flowing strands */}
          <mesh castShadow position={[0, -0.08, -0.22]} rotation={[-0.4, 0, 0]}>
            <capsuleGeometry args={[0.08, 0.32, 6, 10]} />
            <meshStandardMaterial color={hairMid} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0, -0.2, -0.48]} rotation={[-0.7, 0, 0]}>
            <capsuleGeometry args={[0.06, 0.28, 6, 10]} />
            <meshStandardMaterial color={hairMid} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0, -0.32, -0.72]} rotation={[-0.9, 0, 0]}>
            <capsuleGeometry args={[0.045, 0.22, 6, 8]} />
            <meshStandardMaterial color={hairTip} roughness={0.75} />
          </mesh>
          
          {/* Left flowing strands */}
          <mesh castShadow position={[-0.1, -0.04, -0.18]} rotation={[-0.35, -0.25, 0.15]}>
            <capsuleGeometry args={[0.055, 0.26, 6, 8]} />
            <meshStandardMaterial color={hairRoot} roughness={0.85} />
          </mesh>
          <mesh castShadow position={[-0.16, -0.18, -0.42]} rotation={[-0.65, -0.2, 0.2]}>
            <capsuleGeometry args={[0.04, 0.22, 6, 8]} />
            <meshStandardMaterial color={hairMid} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[-0.2, -0.32, -0.62]} rotation={[-0.85, -0.15, 0.25]}>
            <capsuleGeometry args={[0.03, 0.18, 4, 6]} />
            <meshStandardMaterial color={hairTip} roughness={0.75} />
          </mesh>
          
          {/* Right flowing strands */}
          <mesh castShadow position={[0.1, -0.04, -0.18]} rotation={[-0.35, 0.25, -0.15]}>
            <capsuleGeometry args={[0.055, 0.26, 6, 8]} />
            <meshStandardMaterial color={hairRoot} roughness={0.85} />
          </mesh>
          <mesh castShadow position={[0.16, -0.18, -0.42]} rotation={[-0.65, 0.2, -0.2]}>
            <capsuleGeometry args={[0.04, 0.22, 6, 8]} />
            <meshStandardMaterial color={hairMid} roughness={0.8} />
          </mesh>
          <mesh castShadow position={[0.2, -0.32, -0.62]} rotation={[-0.85, 0.15, -0.25]}>
            <capsuleGeometry args={[0.03, 0.18, 4, 6]} />
            <meshStandardMaterial color={hairTip} roughness={0.75} />
          </mesh>
          
          {/* Wispy ends */}
          {[
            [0, -0.42, -0.88, -1.0, 0, hairHighlight],
            [-0.08, -0.38, -0.8, -0.95, 0.12, hairTip],
            [0.08, -0.38, -0.8, -0.95, -0.12, hairTip],
            [-0.18, -0.35, -0.68, -0.85, 0.2, hairHighlight],
            [0.18, -0.35, -0.68, -0.85, -0.2, hairHighlight],
          ].map(([x, y, z, rx, rz, color], i) => (
            <mesh key={i} castShadow position={[x, y, z]} rotation={[rx, 0, rz]}>
              <capsuleGeometry args={[0.018, 0.14, 4, 6]} />
              <meshStandardMaterial color={color} roughness={0.7} />
            </mesh>
          ))}
        </group>


        {/* ════════════════════════════════════════════════════════════════
            SCARF — wrapped around neck with flowing tail
            ════════════════════════════════════════════════════════════════ */}
        {/* Scarf wrap around neck */}
        <mesh castShadow position={[0, 0.28, 0]}>
          <torusGeometry args={[0.16, 0.045, 10, 20]} />
          <meshStandardMaterial color="#f97316" roughness={0.6} />
        </mesh>
        {/* Second wrap */}
        <mesh castShadow position={[0, 0.24, 0.06]} rotation={[0.3, 0, 0]}>
          <torusGeometry args={[0.14, 0.04, 8, 16]} />
          <meshStandardMaterial color="#ea580c" roughness={0.6} />
        </mesh>
        {/* Scarf knot */}
        <mesh castShadow position={[0.08, 0.26, 0.14]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial color="#f97316" roughness={0.55} />
        </mesh>
        
        {/* Flowing scarf tail */}
        <group ref={scarfRef} position={[0.06, 0.22, -0.12]}>
          <mesh castShadow position={[0, 0, -0.15]} rotation={[-0.5, 0.15, 0]}>
            <boxGeometry args={[0.1, 0.03, 0.35]} />
            <meshStandardMaterial color="#f97316" roughness={0.55} />
          </mesh>
          <mesh castShadow position={[0.02, -0.04, -0.42]} rotation={[-0.75, 0.2, 0.1]}>
            <boxGeometry args={[0.09, 0.025, 0.3]} />
            <meshStandardMaterial color="#fb923c" roughness={0.5} />
          </mesh>
          <mesh castShadow position={[0.05, -0.1, -0.65]} rotation={[-0.9, 0.25, 0.15]}>
            <boxGeometry args={[0.08, 0.02, 0.22]} />
            <meshStandardMaterial color="#fdba74" roughness={0.5} />
          </mesh>
          {/* Scarf fringe */}
          {[-0.025, 0, 0.025].map((x, i) => (
            <mesh key={i} castShadow position={[x + 0.06, -0.14, -0.75]} rotation={[-1.0, 0.1 * (i - 1), 0]}>
              <capsuleGeometry args={[0.008, 0.06, 4, 4]} />
              <meshStandardMaterial color="#fdba74" roughness={0.5} />
            </mesh>
          ))}
        </group>

      </group>{/* end rider body */}
    </group>
  )
})

export default Player