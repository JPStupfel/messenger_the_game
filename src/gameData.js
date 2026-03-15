// Shared platform data used by both Player (physics) and World (rendering)

export const GROUND_Y = 0          // top surface of main island
export const PLAYER_HALF_HEIGHT = 0.9  // half of player visual height for feet offset

export const FLOATING_PLATFORMS = [
  { id: 'p1', x: 14,  y: 8,  z: -10, rx: 5,  h: 2,  color: '#7dd3fc', accent: '#38bdf8' },
  { id: 'p2', x: -16, y: 12, z: 6,   rx: 4,  h: 2,  color: '#a5f3fc', accent: '#22d3ee' },
  { id: 'p3', x: 4,   y: 16, z: 18,  rx: 6,  h: 2,  color: '#93c5fd', accent: '#3b82f6' },
  { id: 'p4', x: -8,  y: 20, z: -20, rx: 4.5,h: 2,  color: '#bfdbfe', accent: '#60a5fa' },
]

// Villagers lost in last night's blizzard — find them and lead them home!
// villageSpot: [x, z] where each NPC hangs out once rescued
export const NPCS = [
  {
    id: 'yeti',
    name: '🏔️ Yuki',
    position: [192, 0, -105],
    villageSpot: [5, -4],
    bodyColor: '#e0f2fe',
    hatColor: '#7dd3fc',
    skinColor: '#f0f9ff',
    lines: [
      'I\'m so lost! The blizzard took me! 😰',
      'Please help me find the village!',
      'I can\'t feel my toes... brr! 🥶',
      'The snow all looks the same! Help!',
    ],
    rescuedLines: [
      'Thank you for finding me! ❄️',
      'Home sweet home at last! 🏠',
      'You\'re the best explorer ever! ⭐',
      'Warm fires and hot cocoa! ☕',
    ],
  },
  {
    id: 'penguin',
    name: '🐧 Captain Waddle',
    position: [-193, 0, 123],
    villageSpot: [-5, 3],
    bodyColor: '#1e293b',
    hatColor: '#f97316',
    skinColor: '#f8fafc',
    lines: [
      'Mayday! I\'m adrift in the snow! 🆘',
      'Even a captain can get lost!',
      'Lead the way, young explorer!',
      'I can\'t find the lighthouse! 🌊',
    ],
    rescuedLines: [
      'Land ho! Back to the village! ⚓',
      'You navigated perfectly! 🧭',
      'Ahoy, safe and sound! 🐧',
      'You\'re my hero! 🎖️',
    ],
  },
  {
    id: 'fox',
    name: '🦊 Frostpaw',
    position: [-158, 0, -193],
    villageSpot: [4, 5],
    bodyColor: '#f97316',
    hatColor: '#ea580c',
    skinColor: '#fef3c7',
    lines: [
      'Oh no, I\'m lost in the storm! 😿',
      'My paws are frozen! 🥶',
      'I can\'t smell the village anymore!',
      'Please take me home! 🏠',
    ],
    rescuedLines: [
      'Yay yay yay! I\'m home! 🧡',
      'You found me! You\'re amazing!',
      'My paws are warming up! 🦊',
      'Let\'s never go out in a blizzard again!',
    ],
  },
  {
    id: 'walrus',
    name: '🦭 Old Whiskers',
    position: [228, 0, 175],
    villageSpot: [-4, -5],
    bodyColor: '#78716c',
    hatColor: '#57534e',
    skinColor: '#d6d3d1',
    lines: [
      'In 40 years, I\'ve never been this lost!',
      'The blizzard came so suddenly... 🌨️',
      'My old bones are freezing! 🥶',
      'Young one, please guide me home!',
    ],
    rescuedLines: [
      'Back home at my age! 🎉',
      'Bless you, kind snowboarder! 🌟',
      'I\'ll make you my famous fish stew!',
      'The finest explorer I ever met! 🦭',
    ],
  },
  {
    id: 'owl',
    name: '🦉 Aurora',
    position: [280, 0, -228],
    villageSpot: [6, 1],
    bodyColor: '#dbeafe',
    hatColor: '#93c5fd',
    skinColor: '#f0f9ff',
    lines: [
      'Hoo hoo! I can\'t see in this blizzard!',
      'Even my owl eyes are useless! 😱',
      'The snow swallowed my path home!',
      'Please lead me back, brave one! 🦉',
    ],
    rescuedLines: [
      'Hoo hoo hooray! I\'m home! 🎊',
      'You guided me through the storm! ✨',
      'Wisest snowboarder I\'ve ever met!',
      'The northern lights welcome you! 💎',
    ],
  },
]
