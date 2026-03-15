// Shared platform data used by both Player (physics) and World (rendering)

export const GROUND_Y = 0          // top surface of main island
export const PLAYER_HALF_HEIGHT = 0.9  // half of player visual height for feet offset

export const FLOATING_PLATFORMS = [
  { id: 'p1', x: 14,  y: 8,  z: -10, rx: 5,  h: 2,  color: '#7dd3fc', accent: '#38bdf8' },
  { id: 'p2', x: -16, y: 12, z: 6,   rx: 4,  h: 2,  color: '#a5f3fc', accent: '#22d3ee' },
  { id: 'p3', x: 4,   y: 16, z: 18,  rx: 6,  h: 2,  color: '#93c5fd', accent: '#3b82f6' },
  { id: 'p4', x: -8,  y: 20, z: -20, rx: 4.5,h: 2,  color: '#bfdbfe', accent: '#60a5fa' },
]

// Ground-level stars + one per floating platform
export const STARS = [
  { id: 's1', position: [8,    3,    8]   },
  { id: 's2', position: [-9,   3,   -7]   },
  { id: 's3', position: [2,    3,  -17]   },
  { id: 's4', position: [12.5, 11.5, -10] },
  { id: 's5', position: [-17.5,15.5,  6]  },
  { id: 's6', position: [2.5,  19.5, 18]  },
  { id: 's7', position: [-9.5, 23.5,-20]  },
]

export const NPCS = [
  {
    id: 'yeti',
    name: '🏔️ Yuki the Yeti',
    position: [7, 0, -3],
    bodyColor: '#e0f2fe',
    hatColor: '#7dd3fc',
    skinColor: '#f0f9ff',
    lines: [
      'Welcome to the Frozen Peaks! ❄️',
      'Your snowboard is magical!',
      'Collect those golden stars!',
      'The ice palace holds secrets...',
    ],
  },
  {
    id: 'penguin',
    name: '🐧 Captain Waddle',
    position: [-7, 0, -3],
    bodyColor: '#1e293b',
    hatColor: '#f97316',
    skinColor: '#f8fafc',
    lines: [
      'Ahoy, young explorer!',
      'I sailed the frozen seas!',
      'Watch out for slippery slopes!',
      'Your board glows with magic! ✨',
    ],
  },
  {
    id: 'fox',
    name: '🦊 Frosty',
    position: [-14, 0, 10],
    bodyColor: '#f97316',
    hatColor: '#ea580c',
    skinColor: '#fef3c7',
    lines: [
      'Hi hi! Love your red hair! 🧡',
      'I know all the best jumps!',
      'The aurora is so pretty tonight!',
      'Race you to the top! 🏂',
    ],
  },
  {
    id: 'walrus',
    name: '🦭 Old Whiskers',
    position: [14, 0, 10],
    bodyColor: '#78716c',
    hatColor: '#57534e',
    skinColor: '#d6d3d1',
    lines: [
      'Greetings, little snowboarder!',
      'I\'ve seen a hundred winters.',
      'The floating ice holds treasures.',
      'Ride bravely, young one! 🌟',
    ],
  },
  {
    // On floating platform p1: x=14, y=8, z=-10  surface y=9
    id: 'owl',
    name: '🦉 Aurora',
    position: [14, 9, -10],
    bodyColor: '#dbeafe',
    hatColor: '#93c5fd',
    skinColor: '#f0f9ff',
    lines: [
      'Hoo! You made it up here!',
      'The view is breathtaking! 🌄',
      'I watch the northern lights.',
      'Your magic board amazes me! ✨',
    ],
  },
]
