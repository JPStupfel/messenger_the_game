import { useEffect } from 'react'
import { keys } from '../keys'

const DIRECTIONS = [
  { label: '▲', code: 'ArrowUp',    cls: 'col-start-2 row-start-1' },
  { label: '◀', code: 'ArrowLeft',  cls: 'col-start-1 row-start-2' },
  { label: '▼', code: 'ArrowDown',  cls: 'col-start-2 row-start-3' },
  { label: '▶', code: 'ArrowRight', cls: 'col-start-3 row-start-2' },
]

function DPadButton({ label, code, cls }) {
  const press   = (e) => { e.preventDefault(); keys.add(code) }
  const release = (e) => { e.preventDefault(); keys.delete(code) }
  return (
    <button
      className={`${cls} w-14 h-14 rounded-xl bg-white/20 border border-white/30 text-white text-2xl font-bold
        active:bg-white/40 select-none backdrop-blur-sm flex items-center justify-center`}
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
    >
      {label}
    </button>
  )
}

export default function TouchControls() {
  // Clear stuck keys when component unmounts
  useEffect(() => () => keys.clear(), [])

  return (
    // pointer-events-none on the wrapper; each button re-enables it individually
    <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-6 pb-6 pointer-events-none">

      {/* D-pad */}
      <div className="grid grid-cols-3 grid-rows-3 gap-1 pointer-events-auto">
        {DIRECTIONS.map(({ label, code, cls }) => (
          <DPadButton key={code} label={label} code={code} cls={cls} />
        ))}
      </div>

      {/* Jump button */}
      <button
        className="w-20 h-20 rounded-full bg-purple-500/70 border-2 border-purple-300 text-white
          text-3xl font-extrabold shadow-lg active:bg-purple-400/90 select-none backdrop-blur-sm
          pointer-events-auto flex items-center justify-center"
        onPointerDown={(e) => { e.preventDefault(); keys.add('Space') }}
        onPointerUp={(e)   => { e.preventDefault(); keys.delete('Space') }}
        onPointerLeave={(e) => { e.preventDefault(); keys.delete('Space') }}
        onPointerCancel={(e) => { e.preventDefault(); keys.delete('Space') }}
      >
        JUMP
      </button>
    </div>
  )
}
