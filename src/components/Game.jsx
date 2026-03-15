import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Sky, Stars } from '@react-three/drei'
import * as THREE from 'three'
import Player from './Player'
import World from './World'

// ── Follow camera ─────────────────────────────────────────────────────────────
const CAM_DISTANCE = 10
const CAM_HEIGHT   = 4
const CAM_LERP     = 0.1

function FollowCamera({ playerRef }) {
  const { camera, gl } = useThree()
  const yaw   = useRef(0)
  const pitch = useRef(0.25)
  const isDragging = useRef(false)
  const lastMouse  = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = gl.domElement

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

    // Touch support
    const onTouchStart = (e) => {
      isDragging.current = true
      lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    const onTouchMove = (e) => {
      if (!isDragging.current) return
      const dx = e.touches[0].clientX - lastMouse.current.x
      const dy = e.touches[0].clientY - lastMouse.current.y
      lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      yaw.current   -= dx * 0.005
      pitch.current  = Math.max(0.05, Math.min(Math.PI * 0.45, pitch.current + dy * 0.005))
    }
    const onTouchEnd = () => { isDragging.current = false }

    // Scroll to zoom
    const onWheel = (e) => {
      // handled by adjusting distance — simple approach: shift pitch
    }

    canvas.addEventListener('mousedown',  onMouseDown)
    canvas.addEventListener('mousemove',  onMouseMove)
    canvas.addEventListener('mouseup',    onMouseUp)
    canvas.addEventListener('mouseleave', onMouseUp)
    canvas.addEventListener('touchstart', onTouchStart, { passive: true })
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: true })
    canvas.addEventListener('touchend',   onTouchEnd)
    return () => {
      canvas.removeEventListener('mousedown',  onMouseDown)
      canvas.removeEventListener('mousemove',  onMouseMove)
      canvas.removeEventListener('mouseup',    onMouseUp)
      canvas.removeEventListener('mouseleave', onMouseUp)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove',  onTouchMove)
      canvas.removeEventListener('touchend',   onTouchEnd)
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
export default function Game() {
  const playerRef = useRef()

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.55} color="#ede9fe" />
      <directionalLight
        castShadow
        position={[40, 60, 30]}
        intensity={1.4}
        color="#fff7ed"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={200}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
      />
      <pointLight position={[-20, 30, -20]} intensity={1.2} color="#a78bfa" distance={90} />
      <pointLight position={[20, 10, 20]}   intensity={0.8} color="#f472b6" distance={60} />

      {/* Sky */}
      <Sky
        distance={450}
        sunPosition={[10, 0.4, -1]}
        inclination={0.52}
        azimuth={0.25}
        turbidity={7}
        rayleigh={1}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
      <Stars radius={120} depth={50} count={3000} factor={3} saturation={0.5} fade speed={0.5} />

      {/* Follow camera (no OrbitControls) */}
      <FollowCamera playerRef={playerRef} />

      {/* Scene */}
      <Player ref={playerRef} />
      <World />
    </>
  )
}
