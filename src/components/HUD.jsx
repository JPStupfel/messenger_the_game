import { useState, useEffect } from 'react'

export default function HUD({ carrying, wishes, total, nearWell, onDeposit, onReturnToVillage }) {
  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  const canDeposit = nearWell && carrying > 0

  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {/* Title */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] tracking-wide">
          ❄️ Snowfall Village
        </h1>
      </div>

      {/* Stars carrying counter — top right */}
      <div className={`absolute top-4 right-5 flex flex-col items-end gap-1.5`}>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-lg shadow-lg border backdrop-blur-sm transition-all
          ${ carrying > 0
            ? 'bg-yellow-400/90 text-yellow-900 border-yellow-500 scale-105'
            : 'bg-black/50 text-yellow-300 border-yellow-500/40'
          }`}>
          ⭐ {carrying} / {total}
          {carrying > 0 && <span className="text-sm font-semibold opacity-80">carrying</span>}
        </div>
        {wishes > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl font-bold text-lg shadow-lg border backdrop-blur-sm bg-purple-600/80 text-purple-100 border-purple-400/60">
            ✨ {wishes} {wishes === 1 ? 'wish' : 'wishes'} granted!
          </div>
        )}
      </div>

      {/* Make a wish button — appears when near well and carrying stars */}
      {canDeposit && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3 pointer-events-auto">
          <button
            onClick={onDeposit}
            className="px-8 py-4 rounded-3xl font-extrabold text-2xl shadow-2xl border-2 border-yellow-300 bg-yellow-400 text-yellow-900 hover:bg-yellow-300 active:scale-95 transition-all animate-bounce"
          >
            ✨ Make a Wish! ✨
          </button>
          <div className="text-white text-base font-semibold bg-black/50 px-4 py-1.5 rounded-full backdrop-blur-sm">
            or press <kbd className="bg-white/20 rounded px-2 py-0.5 font-mono">E</kbd>
          </div>
        </div>
      )}

      {/* Controls legend */}
      <div className="absolute bottom-5 left-5 bg-black/50 text-white rounded-2xl px-4 py-3 text-sm font-semibold space-y-1 backdrop-blur-sm border border-white/10">
        <div className="text-purple-300 font-bold mb-1 text-base">Controls</div>
        {isTouch ? (
          <>
            <div>👆 <span className="text-white/80">Drag to move</span></div>
            <div>✌️ <span className="text-white/80">Two fingers to turn</span></div>
            <div>👇 <span className="text-white/80">Tap to jump</span></div>
          </>
        ) : (
          <>
            <div><span className="bg-white/20 rounded px-1.5 py-0.5 font-mono text-xs">W A S D</span>  Move</div>
            <div><span className="bg-white/20 rounded px-1.5 py-0.5 font-mono text-xs">SPACE</span>  Jump</div>
            <div><span className="bg-white/20 rounded px-1.5 py-0.5 font-mono text-xs">Drag</span>  Rotate camera</div>
            <div><span className="bg-white/20 rounded px-1.5 py-0.5 font-mono text-xs">E</span>  Wish at well</div>
          </>
        )}
      </div>

      {/* Return to Village button — bottom right, always available */}
      <div className="absolute bottom-5 right-5 flex flex-col items-end gap-2 pointer-events-auto">
        <button
          onClick={onReturnToVillage}
          className="px-5 py-3 rounded-2xl font-bold text-base shadow-lg border border-sky-400/60 bg-sky-800/80 text-sky-100 hover:bg-sky-700/90 active:scale-95 transition-all backdrop-blur-sm"
        >
          🏠 Return to Village
        </button>
        <div className="bg-sky-900/60 text-sky-100 rounded-2xl px-4 py-2 text-sm font-semibold backdrop-blur-sm border border-sky-400/30 max-w-[190px] text-center">
          ❄️ Collect stars out in the world!
          <br />
          <span className="text-sky-300 text-xs">Bring them back to the well 🌊</span>
        </div>
      </div>
    </div>
  )
}

