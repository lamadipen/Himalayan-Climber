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

// ─── Main menu ────────────────────────────────────────────────────────────────

export const MENU_DEPTH = {
  sky:     0,
  stars:   1,
  moon:    2,
  farMtn:  3,    // snow caps live in the same Graphics object as farMtn
  midMtn:  4,
  nearMtn: 5,
  ui:      10,   // titles, buttons
  btnFg:   11,   // button labels above button bg
} as const

export const MENU_COLOR = {
  // Sky and mountains
  sky:        0x0a1628,
  farMtn:     0x253448,
  midMtn:     0x162033,
  nearMtn:    0x0c1521,
  snowCap:    0xe8f0f8,
  moon:       0xf0e6c8,
  moonShadow: 0x0a1628,   // same as sky — creates crescent cutout

  // Title text
  titleEn:    '#e8f4f8',
  titleNe:    '#94b4c8',

  // Buttons
  btnBg:      0x1a3050,
  btnBgHover: 0x2a4a70,
  btnBgDown:  0x0f2035,
  btnBorder:  0x4a90c4,
  btnText:    '#c8dff0',
  btnTextHvr: '#ffffff',

  // Ko-fi link
  kofi:       '#e05050',
  kofiHover:  '#ff7070',
} as const

// ─── Summit screen ────────────────────────────────────────────────────────────

export const SUMMIT_DEPTH = {
  bg:      0,
  panel:   5,
  text:    6,
  badge:   7,
  overlay: 10,
} as const

export const SUMMIT_COLOR = {
  // Background
  sky:           0x0d1a30,
  horizonGlow:   0xb04000,   // warm dawn orange fading up from horizon
  mtnSilhouette: 0x080f1c,

  // Info panels
  panelBg:       0x0d1a2e,
  panelBorder:   0x2a4060,

  // Header
  headerGold:    '#f0c060',

  // Stat rows
  timeColor:     '#e8f4f8',
  karmaColor:    '#ffd700',
  npcColor:      '#90ee90',
  newRecord:     '#ffd700',
  rankColor:     '#94b4c8',

  // Leaderboard
  lbHighlight:   '#74c0fc',   // current player's row
  lbDefault:     '#c0d0e0',
} as const

// ─── Pause menu ───────────────────────────────────────────────────────────────

export const PAUSE_DEPTH = {
  overlay: 50,
  panel:   55,
  text:    56,
  btnFg:   57,
} as const

export const PAUSE_COLOR = {
  overlayFill: 0x000000,
  panelBg:     0x0d1a2e,
  panelBorder: 0x2a4060,
  title:       '#c8dff0',
  subtitle:    '#4a7090',
} as const

// ─── Game over screen ─────────────────────────────────────────────────────────

export const GAMEOVER_DEPTH = {
  bg:   0,
  mtn:  1,
  text: 5,
  btns: 10,
} as const

export const GAMEOVER_COLOR = {
  sky:        0x0d0d1a,
  mtn:        0x060810,
  title:      '#cc2222',
  causeText:  '#c8dff0',
  altColor:   '#74c0fc',
  karmaColor: '#ffd700',
  statLabel:  '#6a8090',
} as const

// ─── Parallax shift multipliers per layer (px per unit of normalised pointer offset)
export const PARALLAX = {
  far:  { x: -6,  y: -2 },
  mid:  { x: -13, y: -4 },
  near: { x: -22, y: -7 },
} as const
