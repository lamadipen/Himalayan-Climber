// src/config/balance.ts
// [Game Designer owns this file]
// All tunable game values live here. Never hardcode numbers in game code.
// Add a comment when changing a value explaining why.

// ─── Player ───────────────────────────────────────────────────────────────────
export const PLAYER_SPEED         = 220    // px/s (2D) or units/s (3D)
export const PLAYER_JUMP_VELOCITY = 480    // 2D arcade physics
export const PLAYER_MAX_HP        = 100
export const PLAYER_DASH_SPEED    = 600
export const PLAYER_DASH_DURATION = 180    // ms
export const PLAYER_DASH_COOLDOWN = 1200   // ms
export const PLAYER_INVINCIBILITY = 500    // ms after taking damage

// ─── Enemies ──────────────────────────────────────────────────────────────────
export const ENEMY_BASIC_HP       = 40
export const ENEMY_BASIC_SPEED    = 90
export const ENEMY_BASIC_DAMAGE   = 10
export const ENEMY_BASIC_POINTS   = 100

export const ENEMY_RANGED_HP      = 25
export const ENEMY_RANGED_SPEED   = 60
export const ENEMY_RANGED_DAMAGE  = 15
export const ENEMY_RANGED_RANGE   = 280    // px — detection + attack range
export const ENEMY_RANGED_POINTS  = 150

export const ENEMY_BOSS_HP        = 800
export const ENEMY_BOSS_SPEED     = 70
export const ENEMY_BOSS_DAMAGE    = 30
export const ENEMY_BOSS_POINTS    = 2000

// ─── Projectiles ──────────────────────────────────────────────────────────────
export const BULLET_SPEED         = 600    // px/s
export const BULLET_DAMAGE        = 25
export const BULLET_LIFETIME      = 1500   // ms before auto-destroy
export const BULLET_POOL_SIZE     = 30     // max simultaneous bullets

// ─── Pickups ──────────────────────────────────────────────────────────────────
export const PICKUP_HEAL_AMOUNT   = 25
export const PICKUP_DESPAWN_TIME  = 8000   // ms
export const PICKUP_SPAWN_WEIGHT  = 0.3    // 0–1 chance per enemy death

// ─── Waves / Difficulty ───────────────────────────────────────────────────────
export const WAVE_ENEMY_COUNT_BASE      = 5
export const WAVE_ENEMY_COUNT_SCALE     = 1.4   // multiplier per wave
export const WAVE_SPAWN_INTERVAL        = 2000  // ms between spawns
export const DIFFICULTY_SPEED_MULTIPLIER = 1.08  // per level
export const DIFFICULTY_HP_MULTIPLIER   = 1.12  // per level

// ─── Scoring ──────────────────────────────────────────────────────────────────
export const COMBO_THRESHOLD      = 5      // kills to activate combo
export const COMBO_MULTIPLIER     = 2.0
export const COMBO_WINDOW         = 3000   // ms — combo resets after this idle time
