// Shared platform data used by both Player (physics) and World (rendering)

export const GROUND_Y = 0          // top surface of main island
export const PLAYER_HALF_HEIGHT = 0.9  // half of player visual height for feet offset

export const FLOATING_PLATFORMS = [
  { id: 'p1', x: 14,  y: 8,  z: -10, rx: 5,  h: 2,  color: '#7dd3fc', accent: '#38bdf8' },
  { id: 'p2', x: -16, y: 12, z: 6,   rx: 4,  h: 2,  color: '#a5f3fc', accent: '#22d3ee' },
  { id: 'p3', x: 4,   y: 16, z: 18,  rx: 6,  h: 2,  color: '#93c5fd', accent: '#3b82f6' },
  { id: 'p4', x: -8,  y: 20, z: -20, rx: 4.5,h: 2,  color: '#bfdbfe', accent: '#60a5fa' },
]

// Stars scattered beyond the village — collect them and bring them back to the well!
export const STARS = [
  { id: 's1',  position: [55,   1,   20]  },  // East meadow
  { id: 's2',  position: [-60,  1,   15]  },  // West fields
  { id: 's3',  position: [40,   1,  -55]  },  // South valley
  { id: 's4',  position: [-35,  2,  -60]  },  // Southwest slopes
  { id: 's5',  position: [70,   3,   55]  },  // Far northeast
  { id: 's6',  position: [-75,  3,  -50]  },  // Far southwest
  { id: 's7',  position: [90,   4,  -70]  },  // Very far explorer reward
  { id: 's8',  position: [-55,  2,   65]  },  // Far northwest
  { id: 's9',  position: [30,   1,   70]  },  // North forest
  { id: 's10', position: [-80,  3,   30]  },  // West mountains
]

export const NPCS = [
  {
    id: 'yeti',
    name: '🏔️ Yuki the Yeti',
    position: [55, 0, -30],
    bodyColor: '#e0f2fe',
    hatColor: '#7dd3fc',
    skinColor: '#f0f9ff',
    lines: [
      'Welcome to the endless snowlands! ❄️',
      'Your snowboard is magical!',
      'Collect stars and wish at the well!',
      'Crystal fields lie to the east...',
    ],
  },
  {
    id: 'penguin',
    name: '🐧 Captain Waddle',
    position: [-55, 0, 35],
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
    position: [-45, 0, -55],
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
    position: [65, 0, 50],
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
    position: [80, 0, -65],
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
