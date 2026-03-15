import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import Game from './components/Game'
import HUD from './components/HUD'
import { STARS } from './gameData'

export default function App() {
  const [collected, setCollected] = useState(0)

  return (
    <div className="w-screen h-screen overflow-hidden bg-black">
      <Canvas
        shadows
        camera={{ position: [0, 6, 12], fov: 60, near: 0.1, far: 500 }}
        gl={{ antialias: true }}
      >
        <Game onStarCollect={() => setCollected((c) => c + 1)} />
      </Canvas>
      <HUD collected={collected} total={STARS.length} />
    </div>
  )
}