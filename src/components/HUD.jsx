export default function HUD() {
  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {/* Title */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] tracking-wide">
          ✨ Fantasy Island
        </h1>
      </div>

      {/* Controls legend — bottom left */}
      <div className="absolute bottom-5 left-5 bg-black/50 text-white rounded-2xl px-4 py-3 text-sm font-semibold space-y-1 backdrop-blur-sm border border-white/10">
        <div className="text-purple-300 font-bold mb-1 text-base">Controls</div>
        <div><span className="bg-white/20 rounded px-1.5 py-0.5 font-mono text-xs">W A S D</span>  Move</div>
        <div><span className="bg-white/20 rounded px-1.5 py-0.5 font-mono text-xs">SPACE</span>  Jump</div>
        <div><span className="bg-white/20 rounded px-1.5 py-0.5 font-mono text-xs">Mouse</span>  Rotate camera</div>
        <div><span className="bg-white/20 rounded px-1.5 py-0.5 font-mono text-xs">Scroll</span>  Zoom</div>
      </div>

      {/* Tip bubble — bottom right */}
      <div className="absolute bottom-5 right-5 bg-purple-900/60 text-purple-100 rounded-2xl px-4 py-3 text-sm font-semibold backdrop-blur-sm border border-purple-400/30 max-w-[180px] text-center">
        🌟 Collect the golden stars!
        <br />
        <span className="text-purple-300 text-xs">Jump to floating islands</span>
      </div>
    </div>
  )
}
