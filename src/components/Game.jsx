import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Sky, Stars } from '@react-three/drei'
import * as THREE from 'three'
import Player from './Player'
import ProceduralWorld from './ProceduralWorld'
import NPC from './NPC'
import CollectableStar from './CollectableStar'
import YetiFriend from './YetiFriend'
import Village from './Village'
import { NPCS, STARS } from '../gameData'
import { touchInput } from '../keys'

// ── Follow camera ─────────────────────────────────────────────────────────────
const CAM_DISTANCE = 10
const CAM_HEIGHT   = 4
const CAM_LERP     = 0.1

const TOUCH_JOYSTICK_RADIUS = 80  // px — how far to drag for full speed

function FollowCamera({ playerRef }) {
  const { camera, gl } = useThree()
  const yaw   = useRef(0)
  const pitch = useRef(Math.PI * 0.42)  // Start low/behind the player
  const isDragging = useRef(false)
  const lastMouse  = useRef({ x: 0, y: 0 })

  // Touch tracking
  const activeTouches   = useRef({})   // id → {x, y}
  const singleStart     = useRef(null) // {x, y, time, maxMove}
  const twoFingerLast   = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = gl.domElement

    // ── Mouse: camera orbit (desktop) ───────────────────────────────
    const onMouseDown = (e) => {
      isDragging.current = true
      lastMouse.current = { x: e.clientX, y: e.clientY }
    }
    const onMouseMove = (e) => {
      if (!isDragging.current) return
      const dx = e.clientX - lastMouse.current.x
      const dy = e.clientY - lastMouse.current.y
      lastMouse.current = { x: e.clientX, y: e.clientY }
      yaw.current   -= dx * 0.005
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
        singleStart.current = { x: t.clientX, y: t.clientY, time: Date.now(), maxMove: 0 }
      } else {
        // Moving to 2-finger mode — zero movement, prepare camera drag
        touchInput.moveX = 0
        touchInput.moveY = 0
        singleStart.current = null
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

      if (ids.length === 1 && singleStart.current) {
        // ── 1 finger: virtual joystick → player movement ────────────
        const pos = activeTouches.current[ids[0]]
        const dx = pos.x - singleStart.current.x
        const dy = pos.y - singleStart.current.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        singleStart.current.maxMove = Math.max(singleStart.current.maxMove, dist)
        touchInput.moveX = Math.max(-1, Math.min(1, dx / TOUCH_JOYSTICK_RADIUS))
        touchInput.moveY = Math.max(-1, Math.min(1, dy / TOUCH_JOYSTICK_RADIUS)) // +Y = drag down = backward

      } else if (ids.length >= 2) {
        // ── 2 fingers: camera rotation ──────────────────────────────
        touchInput.moveX = 0
        touchInput.moveY = 0
        const midX = (activeTouches.current[ids[0]].x + activeTouches.current[ids[1]].x) / 2
        const midY = (activeTouches.current[ids[0]].y + activeTouches.current[ids[1]].y) / 2
        const dx = midX - twoFingerLast.current.x
        const dy = midY - twoFingerLast.current.y
        twoFingerLast.current = { x: midX, y: midY }
        yaw.current   -= dx * 0.005
        pitch.current  = Math.max(0.05, Math.min(Math.PI * 0.45, pitch.current + dy * 0.005))
      }
    }

    const onTouchEnd = (e) => {
      for (const t of e.changedTouches)
        delete activeTouches.current[t.identifier]

      const remaining = Object.keys(activeTouches.current).length
      if (remaining === 0) {
        // Detect tap → jump
        if (singleStart.current) {
          const elapsed = Date.now() - singleStart.current.time
          if (elapsed < 250 && singleStart.current.maxMove < 15) {
            touchInput.jump = true
            setTimeout(() => { touchInput.jump = false }, 150)
          }
        }
        touchInput.moveX = 0
        touchInput.moveY = 0
        singleStart.current = null
      } else if (remaining === 1) {
        // Dropped back to 1 finger — restart joystick from current position
        touchInput.moveX = 0
        touchInput.moveY = 0
        const id = Object.keys(activeTouches.current)[0]
        const pos = activeTouches.current[id]
        singleStart.current = { x: pos.x, y: pos.y, time: Date.now(), maxMove: 0 }
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

  useFrame(() => {
    if (!playerRef.current) return
    const player = playerRef.current.position

    // Spherical offset from player
    const x = CAM_DISTANCE * Math.sin(pitch.current) * Math.sin(yaw.current)
    const y = CAM_DISTANCE * Math.cos(pitch.current) + CAM_HEIGHT
    const z = CAM_DISTANCE * Math.sin(pitch.current) * Math.cos(yaw.current)

    _desired.set(player.x + x, player.y + y, player.z + z)
    camera.position.lerp(_desired, CAM_LERP)

    _lookAt.set(player.x, player.y + 1, player.z)
    camera.lookAt(_lookAt)
  })

  return null
}

// ── Game scene ────────────────────────────────────────────────────────────────
export default function Game({ onStarCollect, carrying, onDeposit, onNearWellChange, returnTriggerRef }) {
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
      <Village
        playerRef={playerRef}
        carrying={carrying}
        onDeposit={onDeposit}
        onNearWellChange={onNearWellChange}
      />
      {STARS.map((star) => (
        <CollectableStar key={star.id} data={star} playerRef={playerRef} onCollect={onStarCollect} />
      ))}
      {NPCS.map((npc) => (
        <NPC key={npc.id} data={npc} playerRef={playerRef} />
      ))}

      {/* Little yeti companion — befriend it and it follows you! */}
      <YetiFriend startPosition={[5, 0, 6]} playerRef={playerRef} />
    </>
  )
}
