// Shared platform data used by both Player (physics) and World (rendering)

export const GROUND_Y = 0          // top surface of main island
export const PLAYER_HALF_HEIGHT = 0.9  // half of player visual height for feet offset

export const FLOATING_PLATFORMS = [
  { id: 'p1', x: 14,  y: 8,  z: -10, rx: 5,  h: 2,  color: '#a78bfa', accent: '#7c3aed' },
  { id: 'p2', x: -16, y: 12, z: 6,   rx: 4,  h: 2,  color: '#f472b6', accent: '#be185d' },
  { id: 'p3', x: 4,   y: 16, z: 18,  rx: 6,  h: 2,  color: '#34d399', accent: '#059669' },
  { id: 'p4', x: -8,  y: 20, z: -20, rx: 4.5,h: 2,  color: '#fb923c', accent: '#c2410c' },
]
