// Design tokens — single source of truth for every UI constant.
// UI components import from here; never hardcode these values inline.
// Game Designer: adjust visual values here, not inside component files.

// ─── Depth / scroll ───────────────────────────────────────────────────────────
export const HUD_DEPTH = 100   // renders above all gameplay layers
export const HUD_SF    = 0     // setScrollFactor — fixed to camera

// ─── Colours (number = Phaser hex, string = CSS hex for Text.setColor) ────────
export const COLOR = {
  // Shared bar background
  barBg:           0x222222,

  // Oxygen bar — three-step gradient
  oxygenHigh:      0x44dd44,    // > 50 %
  oxygenMid:       0xddaa00,    // 25–50 %
  oxygenLow:       0xdd2222,    // ≤ OXYGEN_LOW_THRESHOLD (25 %)

  // Health bar — always crimson
  health:          0xdd2222,

  // Altitude text
  altNormal:       '#ffffff',
  altAmber:        '#ffaa00',   // ≥ ALTITUDE_VERY_HIGH  (7 500 m)
  altRed:          '#ff4444',   // ≥ ALTITUDE_DEATH_ZONE (8 500 m)

  // Karma counter
  karma:           '#ffffff',

  // Weather labels — colour-coded per state
  weatherClear:    '#ffd43b',
  weatherCloud:    '#adb5bd',
  weatherBlizzard: '#74c0fc',
  weatherStorm:    '#9775fa',
} as const

// ─── Typography ───────────────────────────────────────────────────────────────
export const FONT = {
  family: '"Press Start 2P", monospace',
  size:   '8px',
  color:  '#ffffff',
} as const

// ─── Bar geometry ─────────────────────────────────────────────────────────────
export const BAR = {
  x: 16,    // left edge, pixels from viewport left
  w: 160,   // total width in pixels
  h: 12,    // total height in pixels
} as const

// ─── HUD slot positions ───────────────────────────────────────────────────────
export const LAYOUT = {
  // Left column
  o2Y:      16,   // oxygen bar + label top
  hpY:      36,   // health bar top
  altY:     56,   // altitude text top

  // Right column (anchored to scene.scale.width - rightPad)
  karmaY:   16,
  weatherY: 36,
  rightPad: 16,
} as const
