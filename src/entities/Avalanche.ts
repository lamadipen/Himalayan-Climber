import Phaser from 'phaser'
import type { Player } from './Player'
import { AVALANCHE_SPEED, AVALANCHE_RUN_WINDOW } from '../config/balance'

// Avalanche is a scene-level manager, not an Entity — it has no HP.
// GameScene constructs one instance, calls update() each frame, and calls
// destroy() on scene shutdown.
//
// Integration checklist for GameScene:
//   1. new Avalanche(this, player, safeZoneLayer, map.widthInPixels, map.heightInPixels)
//   2. avalanche.update(delta) EACH FRAME (in GameScene.update)
//   3. avalanche.destroy() in GameScene.shutdown / on scene change
//   4. Set up physics overlap between player + avalanche-trigger tiles;
//      when overlap fires while WeatherSystem.getCurrentWeather() === 'blizzard',
//      emit 'avalanche-trigger' on scene.events.

export class Avalanche {
  private readonly scene:         Phaser.Scene
  private readonly player:        Player
  private readonly safeZoneLayer: Phaser.Tilemaps.TilemapLayer | null
  private readonly levelWidth:    number
  private readonly levelHeight:   number

  private active    = false
  private overlayX  = 0
  private overlay:  Phaser.GameObjects.Rectangle | null = null
  private emitter:  Phaser.GameObjects.Particles.ParticleEmitter | null = null
  private timer:    Phaser.Time.TimerEvent | null = null

  constructor(
    scene:         Phaser.Scene,
    player:        Player,
    safeZoneLayer: Phaser.Tilemaps.TilemapLayer | null,
    levelWidth:    number,
    levelHeight:   number,
  ) {
    this.scene         = scene
    this.player        = player
    this.safeZoneLayer = safeZoneLayer
    this.levelWidth    = levelWidth
    this.levelHeight   = levelHeight

    this.ensureSnowTexture()
    scene.events.on('avalanche-trigger', this.trigger, this)
  }

  // Public entry point — safe to call unconditionally from physics overlap callbacks.
  trigger(): void {
    if (this.active) return
    this.start()
  }

  // Call from GameScene.update() each frame.
  update(delta: number): void {
    if (!this.active || !this.overlay) return

    // Advance the leading edge of the snow wall rightward.
    // The overlay uses origin(1,0) so this.overlayX is the RIGHT edge.
    this.overlayX += AVALANCHE_SPEED * (delta / 1000)
    this.overlay.setX(this.overlayX)

    // Keep the particle burst locked to the leading edge + camera midpoint.
    if (this.emitter) {
      const camMidY = this.scene.cameras.main.scrollY + this.scene.cameras.main.height * 0.5
      this.emitter.setPosition(this.overlayX, camMidY)
    }
  }

  // Call from GameScene shutdown / scene change to remove listeners and visuals.
  destroy(): void {
    this.scene.events.off('avalanche-trigger', this.trigger, this)
    this.cleanup()
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private start(): void {
    this.active   = true
    this.overlayX = 0   // leading (right) edge begins at left of level

    // White/grey snow wall — origin(1,0) means x tracks the right edge.
    // As overlayX increases the covered area grows from the left.
    this.overlay = this.scene.add
      .rectangle(0, 0, this.levelWidth, this.levelHeight, 0xd4dce6, 0.84)
      .setOrigin(1, 0)
      .setDepth(20)

    // Particle burst at the leading edge — shoots rightward/downward like
    // spindrift off a breaking snow wave.
    const camMidY = this.scene.cameras.main.scrollY + this.scene.cameras.main.height * 0.5
    this.emitter = this.scene.add.particles(0, camMidY, 'snow-particle', {
      speed:    { min: 100, max: 320 },
      angle:    { min: -25, max: 35  },   // 0 = right; spread ±30° above/below
      scale:    { start: 1.4, end: 0  },
      alpha:    { start: 0.9, end: 0  },
      tint:     [0xffffff, 0xe8edf2],
      lifespan: { min: 400, max: 1000 },
      quantity: 10,
      frequency: 35,
    }).setDepth(21)

    this.scene.events.emit('avalanche-start')
    this.scene.cameras.main.shake(300, 0.02)

    this.timer = this.scene.time.delayedCall(
      AVALANCHE_RUN_WINDOW,
      this.onTimerExpired,
      [],
      this,
    )
  }

  // Runs when AVALANCHE_RUN_WINDOW expires.
  // Outcome is determined by player position — not by whether the snow wall
  // has physically reached the player, so the run window is the mechanic.
  private onTimerExpired(): void {
    const safe = this.isPlayerInSafeZone()
    this.end()   // cleans up visuals before emitting outcome event

    if (safe) {
      this.scene.events.emit('avalanche-cleared')
    } else {
      this.scene.events.emit('player-died')
    }
  }

  private end(): void {
    this.active = false
    this.scene.events.emit('avalanche-end')
    this.cleanup()
  }

  private cleanup(): void {
    this.overlay?.destroy()
    this.overlay = null
    this.emitter?.destroy()
    this.emitter = null
    this.timer?.remove(false)   // false = do not call the callback
    this.timer = null
  }

  // Checks whether the player is currently standing on a tile whose Tiled
  // custom property 'safe_zone' is true. Returns false when no layer supplied
  // (designer hasn't placed the layer yet) — treated as not in safe zone.
  private isPlayerInSafeZone(): boolean {
    if (!this.safeZoneLayer) return false
    const tile = this.safeZoneLayer.getTileAtWorldXY(this.player.x, this.player.y)
    return tile?.properties?.safe_zone === true
  }

  // Generates a 4×4 white square texture used by the particle emitter.
  // Cached by Phaser's texture manager so it is created only once per game.
  private ensureSnowTexture(): void {
    if (this.scene.textures.exists('snow-particle')) return
    const g = this.scene.add.graphics()
    g.fillStyle(0xffffff)
    g.fillRect(0, 0, 4, 4)
    g.generateTexture('snow-particle', 4, 4)
    g.destroy()
  }
}
