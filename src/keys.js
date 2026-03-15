// Shared virtual key set — written by keyboard listeners
export const keys = new Set()

// Shared touch input state — written by FollowCamera gesture handler, read by Player
// worldTarget: {x, z} world-space point the player should walk toward (tap-and-hold)
// _screenPos:  {x, y} current touch pixel position on canvas (used to recompute worldTarget each frame)
export const touchInput = { jump: false, worldTarget: null, _screenPos: null }
