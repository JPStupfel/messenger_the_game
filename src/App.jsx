import { useState, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import Game from './components/Game'
import HUD from './components/HUD'
import { NPCS } from './gameData'

export default function App() {
  const [rescuedIds, setRescuedIds]   = useState([])   // NPC ids that have been rescued
  const [followingIds, setFollowingIds] = useState([]) // NPC ids currently following player
  const [showPath, setShowPath]        = useState(true) // Path guide on by default

  const returnTriggerRef = useRef(false)

  const onStartFollowing = (id) => {
    setFollowingIds((prev) => prev.includes(id) ? prev : [...prev, id])
  }

  const onRescue = (id) => {
    setRescuedIds((prev)   => prev.includes(id) ? prev : [...prev, id])
    setFollowingIds((prev) => prev.filter((fid) => fid !== id))
  }

  const onReturnToVillage = () => { returnTriggerRef.current = true }
  const onTogglePath      = () => setShowPath((p) => !p)

  return (
    <div className="w-screen h-screen overflow-hidden bg-black">
      <Canvas
        shadows
        camera={{ position: [0, 6, 12], fov: 60, near: 0.1, far: 500 }}
        gl={{ antialias: true }}
      >
        <Game
          rescuedIds={rescuedIds}
          followingIds={followingIds}
          showPath={showPath}
          onStartFollowing={onStartFollowing}
          onRescue={onRescue}
          returnTriggerRef={returnTriggerRef}
        />
      </Canvas>
      <HUD
        rescuedCount={rescuedIds.length}
        totalCount={NPCS.length}
        followingCount={followingIds.length}
        showPath={showPath}
        onTogglePath={onTogglePath}
        onReturnToVillage={onReturnToVillage}
      />
    </div>
  )
}