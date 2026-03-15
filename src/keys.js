// Shared virtual key set — written by keyboard listeners
export const keys = new Set()

// Shared touch input state — written by FollowCamera gesture handler, read by Player
export const touchInput = { moveX: 0, moveY: 0, jump: false }
