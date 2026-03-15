// Card.jsx — a single memory card

export default function Card({ card, isFlipped, isMatched, onClick }) {
  return (
    <div
      className="card-flip w-20 h-20 sm:w-24 sm:h-24 cursor-pointer select-none"
      onClick={onClick}
      aria-label={isFlipped || isMatched ? card.emoji : 'Hidden card'}
      role="button"
    >
      <div className={`card-inner ${isFlipped || isMatched ? 'flipped' : ''}`}>
        {/* Back face — shown when card is face-down */}
        <div className="card-face card-back bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg border-4 border-purple-300">
          <span className="text-3xl">⭐</span>
        </div>

        {/* Front face — shown when card is flipped */}
        <div
          className={`card-face card-front shadow-lg border-4 text-4xl sm:text-5xl
            ${isMatched
              ? 'bg-gradient-to-br from-green-300 to-emerald-400 border-green-400 animate-bounce-in'
              : 'bg-gradient-to-br from-yellow-100 to-orange-100 border-yellow-300'
            }`}
        >
          {card.emoji}
        </div>
      </div>
    </div>
  )
}
