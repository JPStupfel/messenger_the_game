import { useState, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import Game from './components/Game'
import HUD from './components/HUD'
import { STARS } from './gameData'

export default function App() {
  const [carrying, setCarrying] = useState(0)   // Stars player is currently carrying
  const [wishes, setWishes] = useState(0)        // Total wishes granted at the well
  const [nearWell, setNearWell] = useState(false)

  const returnTriggerRef = useRef(false)

  const onStarCollect = () => setCarrying((c) => c + 1)
  const onDeposit = () => {
    setWishes((w) => w + carrying)
    setCarrying(0)
  }
  const onReturnToVillage = () => { returnTriggerRef.current = true }

  return (
    <div className="w-screen h-screen overflow-hidden bg-black">
      <Canvas
        shadows
        camera={{ position: [0, 6, 12], fov: 60, near: 0.1, far: 500 }}
        gl={{ antialias: true }}
      >
        <Game
          onStarCollect={onStarCollect}
          carrying={carrying}
          onDeposit={onDeposit}
          onNearWellChange={setNearWell}
          returnTriggerRef={returnTriggerRef}
        />
      </Canvas>
      <HUD
        carrying={carrying}
        wishes={wishes}
        total={STARS.length}
        nearWell={nearWell}
        onDeposit={onDeposit}
        onReturnToVillage={onReturnToVillage}
      />
    </div>
  )
}