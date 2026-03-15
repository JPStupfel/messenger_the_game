import { Canvas } from '@react-three/fiber'
import Game from './components/Game'
import HUD from './components/HUD'

export default function App() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-black">
      <Canvas
        shadows
        camera={{ position: [0, 6, 12], fov: 60, near: 0.1, far: 500 }}
        gl={{ antialias: true }}
      >
        <Game />
      </Canvas>
      <HUD />
    </div>
  )
}