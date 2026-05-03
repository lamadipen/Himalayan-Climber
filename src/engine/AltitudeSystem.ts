import Phaser from 'phaser'
import type { Player } from '../entities/Player'
import {
  LEVEL_ALTITUDE_SCALES,
  ALTITUDE_HIGH,
  ALTITUDE_VERY_HIGH,
  ALTITUDE_DEATH_ZONE,
  OXYGEN_DRAIN_HIGH,
  OXYGEN_DRAIN_VERY_HIGH,
  OXYGEN_DRAIN_DEATH_ZONE,
  OXYGEN_LOW_THRESHOLD,
  HP_DRAIN_NO_OXYGEN,
  SPEED_MULT_HIGH,
  SPEED_MULT_VERY_HIGH,
  SPEED_MULT_DEATH_ZONE,
  INPUT_DELAY_DEATH_ZONE,
} from '../config/balance'

export type AltitudeZone = 'foothills' | 'high' | 'veryHigh' | 'deathZone'

// Per-zone constants bundled so the switch in update() stays readable
const ZONE_CONFIG: Record<AltitudeZone, {
  drainPerSec:   number
  speedMult:     number
  inputDelayMs:  number
}> = {
  foothills: { drainPerSec: 0,                    speedMult: 1.0,                  inputDelayMs: 0                    },
  high:      { drainPerSec: OXYGEN_DRAIN_HIGH,     speedMult: SPEED_MULT_HIGH,      inputDelayMs: 0                    },
  veryHigh:  { drainPerSec: OXYGEN_DRAIN_VERY_HIGH, speedMult: SPEED_MULT_VERY_HIGH, inputDelayMs: 0                    },
  deathZone: { drainPerSec: OXYGEN_DRAIN_DEATH_ZONE, speedMult: SPEED_MULT_DEATH_ZONE, inputDelayMs: INPUT_DELAY_DEATH_ZONE },
}

export class AltitudeSystem {
  private readonly scene:      Phaser.Scene
  private readonly player:     Player
  private readonly scale:      { yMin: number; yMax: number; altMin: number; altMax: number }

  private altitude    = 0
  private zone:       AltitudeZone = 'foothills'
  private oxygen      = 100

  // Edge-trigger state: tracks whether we were already below the threshold
  // so 'oxygen-low' fires once on descent, not every frame.
  // Resets automatically when oxygen recovers above the threshold.
  private wasOxygenLow = false

  constructor(scene: Phaser.Scene, levelIndex: number, player: Player) {
    this.scene  = scene
    this.player = player
    // Fall back to level 1 scale if designer hasn't added the level yet
    this.scale  = LEVEL_ALTITUDE_SCALES[levelIndex] ?? LEVEL_ALTITUDE_SCALES[1]
  }

  // ─── Main tick — call from GameScene.update() ─────────────────────────────

  update(playerY: number, delta: number): AltitudeZone {
    // 1. Map Phaser Y to real altitude.
    //    In Phaser, Y increases downward. The scale is defined so that
    //    yMin (top of level) = altMin (highest altitude) and
    //    yMax (bottom) = altMax (lowest altitude), making the lerp inverted.
    const { yMin, yMax, altMin, altMax } = this.scale
    const t       = Phaser.Math.Clamp((playerY - yMin) / (yMax - yMin), 0, 1)
    this.altitude = altMin + (altMax - altMin) * t

    // 2. Classify altitude zone
    this.zone = this.classifyZone(this.altitude)
    const cfg = ZONE_CONFIG[this.zone]

    // 3. Drain oxygen at zone rate (delta is ms, rate is per second)
    if (cfg.drainPerSec > 0) {
      this.oxygen = Math.max(0, this.oxygen - cfg.drainPerSec * (delta / 1000))
    }

    // 4. Oxygen-low event — edge-triggered on threshold crossing so listeners
    //    (HUD vignette, audio cue) fire once per descent, not every frame.
    //    Resets when oxygen recovers above threshold so it fires again next time.
    const isLow = this.oxygen < OXYGEN_LOW_THRESHOLD
    if (isLow && !this.wasOxygenLow) {
      this.scene.events.emit('oxygen-low', this.oxygen)
    }
    this.wasOxygenLow = isLow

    // 5. At 0% oxygen, drain HP. GameScene subscribes to 'altitude-hp-drain'
    //    and calls player.takeDamage() to keep damage routing through Entity.
    if (this.oxygen <= 0) {
      const hpDrain = HP_DRAIN_NO_OXYGEN * (delta / 1000)
      this.scene.events.emit('altitude-hp-drain', hpDrain)
    }

    // 6. Push altitude-derived values to player every tick.
    //    Player.handleMovement() and handleInputDelay() read these fields.
    this.player.oxygen         = this.oxygen
    this.player.speedMultiplier = cfg.speedMult
    this.player.inputDelayMs   = cfg.inputDelayMs

    return this.zone
  }

  // ─── Getters — read by HUD, CheckpointSystem, tests ──────────────────────

  getCurrentAltitude(): number      { return Math.round(this.altitude) }
  getCurrentZone():     AltitudeZone { return this.zone }
  getOxygen():          number       { return this.oxygen }

  // ─── Oxygen restoration — called by CheckpointSystem / oxygen-cache pickup ─

  restoreOxygen(amount: number): void {
    this.oxygen = Math.min(100, this.oxygen + amount)
    // If restoration pushes oxygen back above threshold, reset the edge trigger
    // so 'oxygen-low' fires again the next time the player dips below it.
    if (this.oxygen >= OXYGEN_LOW_THRESHOLD) {
      this.wasOxygenLow = false
    }
  }

  restoreOxygenFull(): void {
    this.oxygen       = 100
    this.wasOxygenLow = false
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private classifyZone(alt: number): AltitudeZone {
    if (alt >= ALTITUDE_DEATH_ZONE) return 'deathZone'
    if (alt >= ALTITUDE_VERY_HIGH)  return 'veryHigh'
    if (alt >= ALTITUDE_HIGH)       return 'high'
    return 'foothills'
  }
}
