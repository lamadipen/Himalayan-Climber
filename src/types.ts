import type RAPIER from '@dimforge/rapier3d-compat'

// ── Rapier module alias ──────────────────────────────────────────────────────
export type RapierType = typeof RAPIER

// ── Platform types ───────────────────────────────────────────────────────────
export type PlatformType = 'stone' | 'ice' | 'snow' | 'ice_bridge'

export interface PlatformDef {
  /** World-space center position [x, y, z] */
  pos: [number, number, number]
  /** Full extents [width, height, depth] */
  size: [number, number, number]
  type: PlatformType
}

// ── Hazard types ─────────────────────────────────────────────────────────────
export type HazardType = 'avalanche' | 'wind_zone' | 'serac'

export interface HazardDef {
  type: HazardType
  /** World-space spawn position */
  pos: [number, number, number]
  /** Horizontal direction of effect (for wind_zone) */
  direction?: [number, number, number]
  /** Spawn interval in ms (for avalanche / serac) */
  interval?: number
  /** Width of the zone (for wind_zone) */
  width?: number
}

// ── Collectible types ────────────────────────────────────────────────────────
export type CollectibleType = 'oxygen' | 'warmth'

export interface CollectibleDef {
  type: CollectibleType
  pos: [number, number, number]
}

// ── Environment config ───────────────────────────────────────────────────────
export interface EnvironmentConfig {
  skyColor: number        // 0xRRGGBB
  fogColor: number
  fogNear: number
  fogFar: number
  ambientColor: number
  ambientIntensity: number
  sunColor: number
  sunIntensity: number
  sunPosition: [number, number, number]
  windForce: number       // 0 = calm, 1 = extreme
  snowIntensity: number   // 0 = none, 1 = blizzard
  oxygenDrainRate: number // multiplier; 1 = sea-level baseline
  blizzard: boolean
}

// ── Story beat shown between levels ─────────────────────────────────────────
export interface StoryBeat {
  title: string
  lines: string[]
  continueLabel?: string
}

// ── Full level configuration ─────────────────────────────────────────────────
export interface LevelConfig {
  id: number
  name: string
  mountain: string
  altitudeMeters: number
  startPos: [number, number, number]
  summitPos: [number, number, number]
  checkpoints: [number, number, number][]
  platforms: PlatformDef[]
  hazards: HazardDef[]
  collectibles: CollectibleDef[]
  env: EnvironmentConfig
  story: StoryBeat
}

// ── Leaderboard ──────────────────────────────────────────────────────────────
export interface LeaderboardEntry {
  name: string
  time: number   // seconds
  level: number
  date: string   // ISO
}

// ── Top-level game state ─────────────────────────────────────────────────────
export type GameScreen =
  | 'loading'
  | 'menu'
  | 'story'
  | 'playing'
  | 'paused'
  | 'summit'
  | 'gameover'
  | 'leaderboard'

export interface GameState {
  screen: GameScreen
  currentLevel: number        // 1-based
  oxygen: number              // 0–1
  lives: number               // 0–3
  altitudeSickness: number    // 0–1
  checkpointPos: [number, number, number] | null
  playerName: string
}

// ── Key constants ────────────────────────────────────────────────────────────
export const TOTAL_LEVELS = 5
export const MAX_LIVES = 3
export const OXYGEN_MAX = 1.0
export const GRAVITY = -18
export const JUMP_SPEED = 11
export const MOVE_SPEED = 5.5
export const PLAYER_HALF_HEIGHT = 0.5  // capsule half-height
export const PLAYER_RADIUS = 0.28      // capsule radius
export const DEATH_PLANE_Y = -8        // respawn below this Y
