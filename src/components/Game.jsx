import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls, Sky, Stars } from '@react-three/drei'
import * as THREE from 'three'
import Player from './Player'
import World from './World'

const _target = new THREE.Vector3()

export default function Game() {
  const controlsRef = useRef()
  const playerRef = useRef()

  // Keep OrbitControls target locked onto the player
  useFrame(() => {
    if (!controlsRef.current || !playerRef.current) return
    _target.copy(playerRef.current.position)
    controlsRef.current.target.lerp(_target, 0.14)
    controlsRef.current.update()
  })

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
      {/* Magical purple rim light */}
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

      {/* Camera controls */}
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minDistance={5}
        maxDistance={18}
        minPolarAngle={Math.PI * 0.08}
        maxPolarAngle={Math.PI * 0.48}
        enableDamping
        dampingFactor={0.08}
      />

      {/* Scene */}
      <Player ref={playerRef} />
      <World />
    </>
  )
}
