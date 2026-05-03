// balance-additions.ts — Himalayan Climber additions to src/config/balance.ts
// [Game Designer owns this file]
// Paste these exports into your existing balance.ts

// ─── Player (Himalayan overrides) ─────────────────────────────────────────────
export const PLAYER_SPEED_BASE        = 180    // px/s at sea level
export const PLAYER_JUMP_FORCE        = -440   // variable height — hold longer = more
export const PLAYER_GRAVITY           = 800
export const PLAYER_MAX_HP            = 100
export const PLAYER_SPRITE_W          = 32
export const PLAYER_SPRITE_H          = 48

// ─── Ice axe & rope ───────────────────────────────────────────────────────────
export const ICE_AXE_USES             = 8      // replenished at every checkpoint
export const ROPE_THROW_USES          = 3
export const ROPE_THROW_RANGE         = 240    // px — max grapple distance
export const ICE_WALL_SLIDE_SPEED     = 60     // px/s downward if not grabbing

// ─── Altitude zones ───────────────────────────────────────────────────────────
export const ALTITUDE_HIGH            = 6000   // metres — oxygen drain starts
export const ALTITUDE_VERY_HIGH       = 7500
export const ALTITUDE_DEATH_ZONE      = 8500

export const OXYGEN_DRAIN_HIGH        = 0.8    // % per second (6,000–7,500m)
export const OXYGEN_DRAIN_VERY_HIGH   = 2.2    // % per second (7,500–8,500m)
export const OXYGEN_DRAIN_DEATH_ZONE  = 5.0    // % per second (8,500m+)

export const OXYGEN_LOW_THRESHOLD     = 25     // % — vignette starts
export const OXYGEN_CRITICAL          = 10     // % — blur + input delay
export const HP_DRAIN_NO_OXYGEN       = 5      // HP per second at 0% oxygen

export const SPEED_MULT_HIGH          = 0.90   // movement speed modifier
export const SPEED_MULT_VERY_HIGH     = 0.75
export const SPEED_MULT_DEATH_ZONE    = 0.65

export const INPUT_DELAY_DEATH_ZONE   = 80     // ms — simulates altitude confusion

// ─── Karma system ─────────────────────────────────────────────────────────────
export const KARMA_HELP_CLIMBER       = 15
export const KARMA_PRAYER_FLAG        = 5
export const KARMA_YETI_FOOTPRINT     = 3
export const KARMA_ABANDON_NPC        = -20
export const KARMA_SKIP_SHRINE        = -5
export const KARMA_SUMMIT_ALL_SAFE    = 2.0    // multiplier — applied at summit

export const KARMA_GOOD_ENDING        = 51     // minimum karma for good ending
export const KARMA_TRUE_ENDING        = 151    // minimum karma for true ending (L5)

// ─── Hazards ──────────────────────────────────────────────────────────────────
export const AVALANCHE_SPEED          = 800    // px/s
export const AVALANCHE_RUN_WINDOW     = 4200   // ms to reach safe zone
export const ROCKFALL_DAMAGE          = 25     // HP per hit
export const ROCKFALL_INTERVAL_MIN    = 3000   // ms between rock falls
export const ROCKFALL_INTERVAL_MAX    = 7000

export const CREVASSE_DEATH           = true   // instant kill
export const WHITEOUT_VISIBILITY_PX   = 60     // radius in pixels

export const YAK_CHARGE_DAMAGE        = 20
export const YAK_KNOCKBACK_FORCE      = 350

// ─── Blizzard / weather ───────────────────────────────────────────────────────
export const BLIZZARD_WIND_FORCE      = 120    // px/s applied to player X
export const BLIZZARD_AVALANCHE_MULT  = 3.0    // avalanche chance multiplier
export const STORM_WAIT_TIME          = 15000  // ms trapped in tent during storm

// ─── Oxygen pickups ───────────────────────────────────────────────────────────
export const OXYGEN_CACHE_RESTORE     = 35     // % oxygen restored per cache
export const CHECKPOINT_OXYGEN_RESTORE = 100  // % — full restore at checkpoint
export const CHECKPOINT_HP_RESTORE    = 50    // HP restored at checkpoint

// ─── Level altitude scales ────────────────────────────────────────────────────
// Maps Phaser Y coordinate to real altitude in metres
// (used by AltitudeSystem to determine oxygen drain rate)
export const LEVEL_ALTITUDE_SCALES: Record<number, { yMin: number; yMax: number; altMin: number; altMax: number }> = {
  1: { yMin: 0, yMax: 3000, altMin: 4600, altMax: 3500 }, // Langtang
  2: { yMin: 0, yMax: 4000, altMin: 5416, altMax: 4000 }, // Annapurna
  3: { yMin: 0, yMax: 5000, altMin: 8163, altMax: 5500 }, // Manaslu
  4: { yMin: 0, yMax: 6000, altMin: 8849, altMax: 6000 }, // Everest
  5: { yMin: 0, yMax: 5000, altMin: 8586, altMax: 5000 }, // Kanchenjunga
}
