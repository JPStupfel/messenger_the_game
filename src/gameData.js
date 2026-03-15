// Shared platform data used by both Player (physics) and World (rendering)

export const GROUND_Y = 0          // top surface of main island
export const PLAYER_HALF_HEIGHT = 0.9  // half of player visual height for feet offset

export const FLOATING_PLATFORMS = [
  { id: 'p1', x: 14,  y: 8,  z: -10, rx: 5,  h: 2,  color: '#7dd3fc', accent: '#38bdf8' },
  { id: 'p2', x: -16, y: 12, z: 6,   rx: 4,  h: 2,  color: '#a5f3fc', accent: '#22d3ee' },
  { id: 'p3', x: 4,   y: 16, z: 18,  rx: 6,  h: 2,  color: '#93c5fd', accent: '#3b82f6' },
  { id: 'p4', x: -8,  y: 20, z: -20, rx: 4.5,h: 2,  color: '#bfdbfe', accent: '#60a5fa' },
]

// Ground-level stars spread across the world (y value is offset above terrain)
export const STARS = [
  { id: 's1', position: [8,    1,    8]   },   // Near spawn
  { id: 's2', position: [-12,  1,   -10]  },   // Nearby
  { id: 's3', position: [20,   1,  -25]   },   // Further out
  { id: 's4', position: [-30,  2,   15]   },   // In a different direction
  { id: 's5', position: [45,   3,   40]   },   // Far exploration reward
  { id: 's6', position: [-50,  3,  -45]   },   // Far corner
  { id: 's7', position: [70,   4,  -60]   },   // Very far - adventure reward
]

export const NPCS = [
  {
    id: 'yeti',
    name: '🏔️ Yuki the Yeti',
    position: [10, 0, -8],
    bodyColor: '#e0f2fe',
    hatColor: '#7dd3fc',
    skinColor: '#f0f9ff',
    lines: [
      'Welcome to the endless snowlands! ❄️',
      'Your snowboard is magical!',
      'Explore far and collect stars!',
      'Crystal fields lie to the east...',
    ],
  },
  {
    id: 'penguin',
    name: '🐧 Captain Waddle',
    position: [-15, 0, 5],
    bodyColor: '#1e293b',
    hatColor: '#f97316',
    skinColor: '#f8fafc',
    lines: [
      'Ahoy, young explorer!',
      'Frozen lakes are to the north!',
      'Keep flying with that spacebar!',
      'Your board glows with magic! ✨',
    ],
  },
  {
    id: 'fox',
    name: '🦊 Frosty',
    position: [-25, 0, -20],
    bodyColor: '#f97316',
    hatColor: '#ea580c',
    skinColor: '#fef3c7',
    lines: [
      'Hi hi! Love your red hair! 🧡',
      'The forest is full of secrets!',
      'Mountains rise to the south!',
      'Race you to the horizon! 🏂',
    ],
  },
  {
    id: 'walrus',
    name: '🦭 Old Whiskers',
    position: [30, 0, 25],
    bodyColor: '#78716c',
    hatColor: '#57534e',
    skinColor: '#d6d3d1',
    lines: [
      'Greetings, little snowboarder!',
      'I\'ve explored for miles!',
      'The world goes on forever...',
      'Ride bravely, young one! 🌟',
    ],
  },
  {
    id: 'owl',
    name: '🦉 Aurora',
    position: [50, 0, -40],
    bodyColor: '#dbeafe',
    hatColor: '#93c5fd',
    skinColor: '#f0f9ff',
    lines: [
      'Hoo! You found me out here!',
      'The crystal fields sparkle! 💎',
      'I watch the northern lights.',
      'Adventure awaits everywhere! ✨',
    ],
  },
]
