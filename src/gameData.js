// Shared platform data used by both Player (physics) and World (rendering)

export const GROUND_Y = 0          // top surface of main island
export const PLAYER_HALF_HEIGHT = 0.9  // half of player visual height for feet offset

export const FLOATING_PLATFORMS = [
  { id: 'p1', x: 14,  y: 8,  z: -10, rx: 5,  h: 2,  color: '#a78bfa', accent: '#7c3aed' },
  { id: 'p2', x: -16, y: 12, z: 6,   rx: 4,  h: 2,  color: '#f472b6', accent: '#be185d' },
  { id: 'p3', x: 4,   y: 16, z: 18,  rx: 6,  h: 2,  color: '#34d399', accent: '#059669' },
  { id: 'p4', x: -8,  y: 20, z: -20, rx: 4.5,h: 2,  color: '#fb923c', accent: '#c2410c' },
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
    id: 'wizard',
    name: '🧙 Merlin',
    position: [7, 0, -3],
    bodyColor: '#6d28d9',
    hatColor: '#4c1d95',
    skinColor: '#fde68a',
    lines: [
      'Welcome to Fantasy Island! ✨',
      'Collect all the golden stars!',
      'The floating islands hold secrets...',
      'Jump high and explore everywhere!',
    ],
  },
  {
    id: 'knight',
    name: '⚔️ Sir Bravely',
    position: [-7, 0, -3],
    bodyColor: '#94a3b8',
    hatColor: '#64748b',
    skinColor: '#fed7aa',
    lines: [
      'Halt! Who goes there?',
      'Oh, a young adventurer! Welcome!',
      'I guard this castle day and night.',
      'Be careful near the cliff edges!',
    ],
  },
  {
    id: 'fairy',
    name: '🧚 Twinkle',
    position: [-14, 0, 10],
    bodyColor: '#f472b6',
    hatColor: '#db2777',
    skinColor: '#d1fae5',
    lines: [
      'Hiii! Isn\'t this island magical?',
      'I love dancing in the starlight! 💫',
      'The crystals over there glow at night!',
      'You\'re my new best friend! 🌸',
    ],
  },
  {
    id: 'merchant',
    name: '🎩 Otto',
    position: [14, 0, 10],
    bodyColor: '#b45309',
    hatColor: '#92400e',
    skinColor: '#fef3c7',
    lines: [
      'Psst! Care to trade some star gems?',
      'I\'ve traveled across five islands!',
      'The portal leads to the sky realm.',
      'Adventure awaits around every corner!',
    ],
  },
  {
    // On floating platform p1: x=14, y=8, z=-10  surface y=9
    id: 'sprite',
    name: '🌟 Zara',
    position: [14, 9, -10],
    bodyColor: '#34d399',
    hatColor: '#059669',
    skinColor: '#a7f3d0',
    lines: [
      'You made it up here! Impressive!',
      'The view from up here is amazing! 🌄',
      'I\'ve never seen anyone jump so high!',
      'You must be very brave! 🌟',
    ],
  },
]
