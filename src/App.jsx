import { useState, useEffect, useCallback } from 'react'
import Card from './components/Card'

const EMOJI_POOL = ['🐶', '🐱', '🐸', '🦊', '🐼', '🦄', '🐙', '🦋', '🍕', '🌈', '🎈', '⭐']

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5)
}

function buildDeck(numPairs) {
  const chosen = EMOJI_POOL.slice(0, numPairs)
  const pairs = [...chosen, ...chosen]
  return shuffle(pairs).map((emoji, i) => ({ id: i, emoji, pairKey: emoji }))
}

const DIFFICULTY = {
  easy:   { label: '😊 Easy',   pairs: 4,  cols: 'grid-cols-4' },
  medium: { label: '🤔 Medium', pairs: 6,  cols: 'grid-cols-4 sm:grid-cols-6' },
  hard:   { label: '😤 Hard',   pairs: 8,  cols: 'grid-cols-4 sm:grid-cols-8' },
}

export default function App() {
  const [difficulty, setDifficulty] = useState(null)
  const [cards, setCards] = useState([])
  const [flipped, setFlipped] = useState([])   // indices of currently face-up (unmatched) cards
  const [matched, setMatched] = useState([])   // pairKeys of matched pairs
  const [moves, setMoves] = useState(0)
  const [locked, setLocked] = useState(false)
  const [won, setWon] = useState(false)
  const [stars, setStars] = useState([])

  const startGame = useCallback((level) => {
    setDifficulty(level)
    setCards(buildDeck(DIFFICULTY[level].pairs))
    setFlipped([])
    setMatched([])
    setMoves(0)
    setLocked(false)
    setWon(false)
    setStars([])
  }, [])

  const handleCardClick = (index) => {
    if (locked) return
    if (flipped.includes(index)) return
    if (matched.includes(cards[index].pairKey)) return

    const newFlipped = [...flipped, index]
    setFlipped(newFlipped)

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1)
      setLocked(true)
      const [a, b] = newFlipped
      if (cards[a].pairKey === cards[b].pairKey) {
        // Match found!
        const newMatched = [...matched, cards[a].pairKey]
        setTimeout(() => {
          setMatched(newMatched)
          setFlipped([])
          setLocked(false)
          // Win check
          if (newMatched.length === DIFFICULTY[difficulty].pairs) {
            setWon(true)
            spawnStars()
          }
        }, 600)
      } else {
        // No match — flip back
        setTimeout(() => {
          setFlipped([])
          setLocked(false)
        }, 900)
      }
    }
  }

  const spawnStars = () => {
    const newStars = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      top: `${Math.random() * 80 + 5}%`,
      left: `${Math.random() * 90 + 2}%`,
      delay: `${Math.random() * 0.5}s`,
      size: `${Math.random() * 1.5 + 1}rem`,
    }))
    setStars(newStars)
  }

  const isFlipped = (index) => flipped.includes(index)
  const isMatched = (index) => matched.includes(cards[index]?.pairKey)

  // Landing / difficulty select screen
  if (!difficulty) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-300 to-indigo-400 flex flex-col items-center justify-center gap-8 p-6">
        <h1 className="text-5xl sm:text-7xl font-extrabold text-white drop-shadow-lg text-center animate-bounce">
          🧠 Memory Match!
        </h1>
        <p className="text-xl sm:text-2xl font-semibold text-white/90 text-center">
          Flip the cards and find the pairs!
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          {Object.entries(DIFFICULTY).map(([key, val]) => (
            <button
              key={key}
              onClick={() => startGame(key)}
              className="px-8 py-5 rounded-3xl text-2xl font-bold shadow-xl
                bg-white text-indigo-700 hover:scale-110 hover:bg-yellow-200
                active:scale-95 transition-transform duration-150 border-4 border-white"
            >
              {val.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-200 to-purple-300 flex flex-col items-center py-8 px-4 relative overflow-hidden">
      {/* Floating stars on win */}
      {stars.map((s) => (
        <span
          key={s.id}
          className="absolute animate-star-pop pointer-events-none"
          style={{ top: s.top, left: s.left, fontSize: s.size, animationDelay: s.delay }}
        >
          ⭐
        </span>
      ))}

      {/* Header */}
      <h1 className="text-4xl sm:text-5xl font-extrabold text-indigo-800 drop-shadow mb-2">
        🧠 Memory Match!
      </h1>

      {/* Stats bar */}
      <div className="flex gap-6 mb-6 text-lg font-bold text-indigo-700">
        <span>Moves: {moves}</span>
        <span>Pairs: {matched.length} / {DIFFICULTY[difficulty].pairs}</span>
      </div>

      {/* Win Banner */}
      {won && (
        <div className="mb-6 px-8 py-4 rounded-3xl bg-yellow-300 border-4 border-yellow-500 shadow-2xl text-3xl font-extrabold text-yellow-900 text-center animate-bounce-in">
          🎉 You Win! 🎉
          <div className="text-xl font-semibold mt-1">Finished in {moves} moves!</div>
        </div>
      )}

      {/* Card grid */}
      <div className={`grid ${DIFFICULTY[difficulty].cols} gap-3 sm:gap-4`}>
        {cards.map((card, i) => (
          <Card
            key={card.id}
            card={card}
            isFlipped={isFlipped(i)}
            isMatched={isMatched(i)}
            onClick={() => handleCardClick(i)}
          />
        ))}
      </div>

      {/* Buttons */}
      <div className="flex gap-4 mt-8">
        <button
          onClick={() => startGame(difficulty)}
          className="px-6 py-3 rounded-2xl bg-green-400 hover:bg-green-500 text-white text-xl font-bold shadow-lg
            hover:scale-105 active:scale-95 transition-transform border-4 border-green-600"
        >
          🔄 Restart
        </button>
        <button
          onClick={() => setDifficulty(null)}
          className="px-6 py-3 rounded-2xl bg-purple-400 hover:bg-purple-500 text-white text-xl font-bold shadow-lg
            hover:scale-105 active:scale-95 transition-transform border-4 border-purple-600"
        >
          🏠 Menu
        </button>
      </div>
    </div>
  )
}
