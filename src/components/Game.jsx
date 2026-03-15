import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Sky, Stars } from '@react-three/drei'
import * as THREE from 'three'
import Player from './Player'
import ProceduralWorld from './ProceduralWorld'
import LostNPC from './LostNPC'
import VillageResident from './VillageResident'
import PathTrace from './PathTrace'
import YetiFriend from './YetiFriend'
import Village from './Village'
import { NPCS } from '../gameData'
import { touchInput } from '../keys'

// ── Follow camera ─────────────────────────────────────────────────────────────
const CAM_DISTANCE    = 10
const CAM_HEIGHT      = 4
const CAM_LERP        = 0.1
const CAM_FOLLOW_RATE = 10   // rad/s — how fast yaw locks behind the player

const TAP_MAX_MS = 250   // Tap must be shorter than this to count as a jump
const TAP_MAX_PX = 15    // Tap must move less than this to count as a jump

function FollowCamera({ playerRef }) {
  const { camera, gl } = useThree()
  const yaw   = useRef(0)
  const pitch = useRef(Math.PI * 0.42)  // Start low/behind the player
  const isDragging = useRef(false)
  const lastMouse  = useRef({ x: 0, y: 0 })

  // Touch tracking
  const activeTouches = useRef({})   // id → {x, y}
  const tapStart      = useRef(null) // {x, y, time, maxMove} — for tap-to-jump detection
  const twoFingerLast = useRef({ x: 0, y: 0 })

  // Raycasting helpers — stable refs so no per-frame GC pressure
  const _raycaster   = useRef(new THREE.Raycaster())
  const _groundPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const _touchWorld  = useRef(new THREE.Vector3())
  const _ndcPt       = useRef(new THREE.Vector2())

  useEffect(() => {
    const canvas = gl.domElement

    // ── Mouse: camera pitch only (desktop) ──────────────────────────
    const onMouseDown = (e) => {
      isDragging.current = true
      lastMouse.current = { x: e.clientX, y: e.clientY }
    }
    const onMouseMove = (e) => {
      if (!isDragging.current) return
      const dy = e.clientY - lastMouse.current.y
      lastMouse.current = { x: e.clientX, y: e.clientY }
      pitch.current  = Math.max(0.05, Math.min(Math.PI * 0.45, pitch.current + dy * 0.005))
    }
    const onMouseUp = () => { isDragging.current = false }

    // ── Touch ────────────────────────────────────────────────────────
    const onTouchStart = (e) => {
      for (const t of e.changedTouches)
        activeTouches.current[t.identifier] = { x: t.clientX, y: t.clientY }

      const count = Object.keys(activeTouches.current).length
      if (count === 1) {
        const t = e.changedTouches[0]
        // Store screen position — world target is projected in useFrame
        touchInput._screenPos = { x: t.clientX, y: t.clientY }
        // Track tap start for jump detection
        tapStart.current = { x: t.clientX, y: t.clientY, time: Date.now(), maxMove: 0 }
      } else {
        // Moving to 2-finger mode — stop navigation, prepare camera drag
        touchInput._screenPos = null
        tapStart.current = null
        const ids = Object.keys(activeTouches.current)
        twoFingerLast.current = {
          x: (activeTouches.current[ids[0]].x + activeTouches.current[ids[1]].x) / 2,
          y: (activeTouches.current[ids[0]].y + activeTouches.current[ids[1]].y) / 2,
        }
      }
    }

    const onTouchMove = (e) => {
      for (const t of e.changedTouches)
        if (activeTouches.current[t.identifier])
          activeTouches.current[t.identifier] = { x: t.clientX, y: t.clientY }

      const ids = Object.keys(activeTouches.current)

      if (ids.length === 1) {
        // ── 1 finger: update navigation target position ──────────────
        const pos = activeTouches.current[ids[0]]
        touchInput._screenPos = { x: pos.x, y: pos.y }
        // Track movement for tap detection
        if (tapStart.current) {
          const dx = pos.x - tapStart.current.x
          const dy = pos.y - tapStart.current.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          tapStart.current.maxMove = Math.max(tapStart.current.maxMove, dist)
        }

      } else if (ids.length >= 2) {
        // ── 2 fingers: camera pitch ──────────────────────────────────
        touchInput._screenPos = null
        const midX = (activeTouches.current[ids[0]].x + activeTouches.current[ids[1]].x) / 2
        const midY = (activeTouches.current[ids[0]].y + activeTouches.current[ids[1]].y) / 2
        const dy = midY - twoFingerLast.current.y
        twoFingerLast.current = { x: midX, y: midY }
        pitch.current  = Math.max(0.05, Math.min(Math.PI * 0.45, pitch.current + dy * 0.005))
      }
    }

    const onTouchEnd = (e) => {
      for (const t of e.changedTouches)
        delete activeTouches.current[t.identifier]

      const remaining = Object.keys(activeTouches.current).length
      if (remaining === 0) {
        // Detect tap → jump
        if (tapStart.current) {
          const elapsed = Date.now() - tapStart.current.time
          if (elapsed < TAP_MAX_MS && tapStart.current.maxMove < TAP_MAX_PX) {
            touchInput.jump = true
            setTimeout(() => { touchInput.jump = false }, 150)
          }
        }
        touchInput._screenPos = null
        tapStart.current = null
      } else if (remaining === 1) {
        // Dropped back to 1 finger — resume navigation from remaining finger
        const id = Object.keys(activeTouches.current)[0]
        const pos = activeTouches.current[id]
        touchInput._screenPos = { x: pos.x, y: pos.y }
        tapStart.current = { x: pos.x, y: pos.y, time: Date.now(), maxMove: 0 }
      }
    }

    canvas.addEventListener('mousedown',  onMouseDown)
    canvas.addEventListener('mousemove',  onMouseMove)
    canvas.addEventListener('mouseup',    onMouseUp)
    canvas.addEventListener('mouseleave', onMouseUp)
    canvas.addEventListener('touchstart', onTouchStart, { passive: true })
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: true })
    canvas.addEventListener('touchend',   onTouchEnd)
    canvas.addEventListener('touchcancel', onTouchEnd)
    return () => {
      canvas.removeEventListener('mousedown',  onMouseDown)
      canvas.removeEventListener('mousemove',  onMouseMove)
      canvas.removeEventListener('mouseup',    onMouseUp)
      canvas.removeEventListener('mouseleave', onMouseUp)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove',  onTouchMove)
      canvas.removeEventListener('touchend',   onTouchEnd)
      canvas.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [gl])

  const _desired = new THREE.Vector3()
  const _lookAt  = new THREE.Vector3()

  useFrame((_, delta) => {
    if (!playerRef.current) return
    const player = playerRef.current
    const pos = player.position

    // ── Project 1-finger screen position → 3-D world navigation target ──────
    if (touchInput._screenPos) {
      const rect = gl.domElement.getBoundingClientRect()
      _ndcPt.current.set(
        ((touchInput._screenPos.x - rect.left) / rect.width)  *  2 - 1,
        -((touchInput._screenPos.y - rect.top)  / rect.height) *  2 + 1,
      )
      _raycaster.current.setFromCamera(_ndcPt.current, camera)
      if (_raycaster.current.ray.intersectPlane(_groundPlane.current, _touchWorld.current)) {
        touchInput.worldTarget = { x: _touchWorld.current.x, z: _touchWorld.current.z }
      }
    } else {
      touchInput.worldTarget = null
    }

    // Always track directly behind the player's facing direction
    const targetYaw = player.rotation.y + Math.PI
    let diff = targetYaw - yaw.current
    // Normalise to [-π, π] for shortest-arc rotation
    while (diff >  Math.PI) diff -= 2 * Math.PI
    while (diff < -Math.PI) diff += 2 * Math.PI
    yaw.current += diff * Math.min(1, CAM_FOLLOW_RATE * delta)

    // Spherical offset from player
    const x = CAM_DISTANCE * Math.sin(pitch.current) * Math.sin(yaw.current)
    const y = CAM_DISTANCE * Math.cos(pitch.current) + CAM_HEIGHT
    const z = CAM_DISTANCE * Math.sin(pitch.current) * Math.cos(yaw.current)

    _desired.set(pos.x + x, pos.y + y, pos.z + z)
    camera.position.lerp(_desired, CAM_LERP)

    _lookAt.set(pos.x, pos.y + 1, pos.z)
    camera.lookAt(_lookAt)
  })

  return null
}

// ── Game scene ────────────────────────────────────────────────────────────────
export default function Game({ rescuedIds, followingIds, showPath, onStartFollowing, onRescue, returnTriggerRef }) {
  const playerRef = useRef()

  return (
    <>
      {/* Lighting — cool arctic tones */}
      <ambientLight intensity={0.6} color="#e0f2fe" />
      <directionalLight
        castShadow
        position={[40, 60, 30]}
        intensity={1.3}
        color="#f0f9ff"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={200}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />
      <pointLight position={[-20, 30, -20]} intensity={1.4} color="#7dd3fc" distance={90} />
      <pointLight position={[20, 10, 20]}   intensity={0.9} color="#67e8f9" distance={60} />

      {/* Arctic sky */}
      <Sky
        distance={450}
        sunPosition={[10, 0.8, -1]}
        inclination={0.48}
        azimuth={0.25}
        turbidity={4}
        rayleigh={0.6}
        mieCoefficient={0.003}
        mieDirectionalG={0.7}
      />
      <Stars radius={120} depth={50} count={4000} factor={3.5} saturation={0.2} fade speed={0.3} />

      {/* Follow camera (no OrbitControls) */}
      <FollowCamera playerRef={playerRef} />

      {/* Scene */}
      <Player ref={playerRef} returnTriggerRef={returnTriggerRef} />
      <ProceduralWorld playerRef={playerRef} />
      <Village playerRef={playerRef} />

      {/* Lost NPCs — go find them and lead them home! */}
      {NPCS.map((npc) => (
        <LostNPC
          key={npc.id}
          data={npc}
          playerRef={playerRef}
          isRescued={rescuedIds.includes(npc.id)}
          onStartFollowing={onStartFollowing}
          onRescue={onRescue}
        />
      ))}

      {/* Rescued NPCs hanging out in the village */}
      {NPCS.filter((npc) => rescuedIds.includes(npc.id)).map((npc) => (
        <VillageResident key={`resident-${npc.id}`} data={npc} index={NPCS.indexOf(npc)} />
      ))}

      {/* Path guide dots — shows route to next NPC or back to village */}
      <PathTrace
        playerRef={playerRef}
        npcs={NPCS}
        rescuedIds={rescuedIds}
        followingIds={followingIds}
        showPath={showPath}
      />

      {/* Little yeti companion — always following! */}
      <YetiFriend startPosition={[5, 0, 6]} playerRef={playerRef} />
    </>
  )
}
