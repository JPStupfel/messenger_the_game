import { useState, useEffect } from 'react'

export default function HUD({ rescuedCount, totalCount, followingCount, showPath, onTogglePath, onReturnToVillage }) {
  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  const allRescued = rescuedCount >= totalCount

  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {/* Accessible live region for screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {allRescued
          ? 'Everyone is home safe! All villagers rescued!'
          : `${rescuedCount} of ${totalCount} villagers rescued.${followingCount > 0 ? ` ${followingCount} following you — head back to the village!` : ''}`
        }
      </div>

      {/* Title */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] tracking-wide">
          ❄️ Snowfall Village
        </h1>
      </div>

      {/* Rescue counter — top right */}
      <div className="absolute top-4 right-5 flex flex-col items-end gap-1.5">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-lg shadow-lg border backdrop-blur-sm transition-all
          ${ allRescued
            ? 'bg-green-400/90 text-green-900 border-green-500 scale-105 animate-bounce'
            : 'bg-black/50 text-sky-200 border-sky-400/40'
          }`}>
          🏠 {rescuedCount} / {totalCount} rescued
        </div>

        {/* Following indicator */}
        {followingCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-base shadow-lg border backdrop-blur-sm bg-green-600/80 text-green-100 border-green-400/60 animate-pulse">
            🏃 {followingCount} following you — head home!
          </div>
        )}

        {/* All rescued celebration */}
        {allRescued && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-base shadow-lg border backdrop-blur-sm bg-yellow-400/90 text-yellow-900 border-yellow-500">
            🎉 Everyone is home safe!
          </div>
        )}
      </div>

      {/* Controls legend */}
      <div className="absolute bottom-5 left-5 bg-black/50 text-white rounded-2xl px-4 py-3 text-sm font-semibold space-y-1 backdrop-blur-sm border border-white/10">
        <div className="text-purple-300 font-bold mb-1 text-base">Controls</div>
        {isTouch ? (
          <>
            <div>👆 <span className="text-white/80">Hold to move toward finger</span></div>
            <div>✌️ <span className="text-white/80">Two fingers to tilt camera</span></div>
            <div>👇 <span className="text-white/80">Quick tap to jump</span></div>
          </>
        ) : (
          <>
            <div><span className="bg-white/20 rounded px-1.5 py-0.5 font-mono text-xs">W A S D</span>  Move</div>
            <div><span className="bg-white/20 rounded px-1.5 py-0.5 font-mono text-xs">SPACE</span>  Jump</div>
            <div><span className="bg-white/20 rounded px-1.5 py-0.5 font-mono text-xs">Drag</span>  Rotate camera</div>
          </>
        )}
      </div>

      {/* Bottom right — return + path toggle */}
      <div className="absolute bottom-5 right-5 flex flex-col items-end gap-2 pointer-events-auto">
        <button
          onClick={onReturnToVillage}
          className="px-5 py-3 rounded-2xl font-bold text-base shadow-lg border border-sky-400/60 bg-sky-800/80 text-sky-100 hover:bg-sky-700/90 active:scale-95 transition-all backdrop-blur-sm"
        >
          🏠 Return to Village
        </button>

        {/* Path trace toggle */}
        <button
          onClick={onTogglePath}
          className={`px-5 py-3 rounded-2xl font-bold text-base shadow-lg border transition-all backdrop-blur-sm active:scale-95
            ${ showPath
              ? 'bg-amber-400/90 text-amber-900 border-amber-500 hover:bg-amber-300/90'
              : 'bg-black/50 text-amber-300 border-amber-500/40 hover:bg-black/70'
            }`}
        >
          {showPath ? '🟡 Path Guide: ON' : '⚪ Path Guide: OFF'}
        </button>

        <div className="bg-sky-900/60 text-sky-100 rounded-2xl px-4 py-2 text-sm font-semibold backdrop-blur-sm border border-sky-400/30 max-w-[210px] text-center">
          ❄️ Find lost villagers in the blizzard!
          <br />
          <span className="text-sky-300 text-xs">Lead them back to the village 🏠</span>
        </div>
      </div>
    </div>
  )
}

